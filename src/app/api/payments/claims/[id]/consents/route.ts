import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePaymentOpsAccess, requirePaymentPartyAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { calculateSplit, runGateCheck } from "@/lib/proximity-pay";
import { toPayoutRecipient, toSplitRule } from "@/lib/mappers";
import { genId } from "@/lib/utils";

/** Records one required stakeholder's consent (or rejection) on a claim. Once every required
 * consent is approved, this is the moment the design doc calls "invoice issued" (§8) — rather than
 * modeling a separate Invoice entity, that transition is exactly when PayoutInstructions (one per
 * revenue-split participant, §12) are created and immediately gate-checked (§13). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: claimId } = await params;
  const body = await request.json();
  const consentId: string | undefined = body.consentId;
  const status: string | undefined = body.status;
  const rejectionReason: string | undefined = body.rejectionReason;
  if (typeof consentId !== "string" || (status !== "approved" && status !== "rejected")) {
    return NextResponse.json({ error: "consentId and status ('approved' | 'rejected') are required" }, { status: 400 });
  }

  const claim = await prisma.milestoneClaim.findUnique({ where: { id: claimId }, include: { milestone: true, consents: true } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  const targetConsent = claim.consents.find((c) => c.id === consentId);
  if (!targetConsent) return NextResponse.json({ error: "Consent not found on this claim" }, { status: 404 });
  if (targetConsent.status !== "pending") return NextResponse.json({ error: "This consent was already recorded" }, { status: 409 });

  const agreement = await prisma.paymentAgreement.findUnique({ where: { id: claim.milestone.paymentAgreementId } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

  const access =
    targetConsent.requiredRole === "investor"
      ? await requirePaymentPartyAccess(agreement.id, "investor")
      : targetConsent.requiredRole === "registry"
        ? await requirePaymentPartyAccess(agreement.id, "registry")
        : await requirePaymentOpsAccess();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  // Segregation of duties (design doc §25): the ground partner who filed the claim can never also
  // be a required consenter on it — enforced structurally here, not left to process discipline.
  if (access.userId === claim.submittedByUserId) {
    return NextResponse.json({ error: "You can't consent on a claim you submitted yourself" }, { status: 403 });
  }

  // Pre-compute what the "all approved" branch needs (pure calculation, no DB) before opening the
  // transaction, then read the two remaining tables in parallel and batch-insert the payout
  // instructions via createMany — one round trip instead of one per split participant. This
  // transaction does more sequential round trips than most in this app (consent update + 2 audit
  // entries + reads + writes), so it also gets a generous explicit timeout rather than Prisma's
  // 5s interactive-transaction default, which real network latency to a remote Postgres can exceed.
  const otherConsents = claim.consents.filter((c) => c.id !== consentId);
  const willConsent = status === "approved" && otherConsents.every((c) => c.status === "approved");

  await prisma.$transaction(
    async (tx) => {
      await tx.stakeholderConsent.update({
        where: { id: consentId },
        data: {
          status,
          consentedByUserId: access.userId,
          consentedAt: new Date(),
          rejectionReason: status === "rejected" ? rejectionReason : null,
        },
      });
      await appendAuditEntry(tx, agreement.id, "consent.recorded", { claimId, consentId, requiredRole: targetConsent.requiredRole, status });

      if (status === "rejected") {
        await tx.milestoneClaim.update({ where: { id: claimId }, data: { status: "rejected" } });
        await tx.milestone.update({ where: { id: claim.milestoneId }, data: { status: "not_due" } });
        await appendAuditEntry(tx, agreement.id, "claim.rejected", { claimId, rejectionReason });
        return;
      }
      if (!willConsent) return;

      // Template-based agreements snapshot a distinct split per milestone (milestoneId set), so a
      // claim's payout must only ever sum that milestone's own rows — never every milestone's rows
      // on the agreement. Pre-template agreements never set milestoneId, so those fall back to the
      // one agreement-wide split they were created with.
      const [milestoneSplitRuleRows, agreementSplitRuleRows, recipientRows] = await Promise.all([
        tx.splitRule.findMany({ where: { milestoneId: claim.milestoneId } }),
        tx.splitRule.findMany({ where: { paymentAgreementId: agreement.id, milestoneId: null } }),
        tx.payoutRecipient.findMany({ where: { paymentAgreementId: agreement.id } }),
      ]);
      const splitRuleRows = milestoneSplitRuleRows.length > 0 ? milestoneSplitRuleRows : agreementSplitRuleRows;
      const shares = calculateSplit(claim.claimedAmount, splitRuleRows.map(toSplitRule));
      const recipientByRole = new Map(recipientRows.map(toPayoutRecipient).map((r) => [r.role, r]));

      await tx.payoutInstruction.createMany({
        data: shares.map((share) => {
          const recipient = recipientByRole.get(share.participantRole as "developer" | "farmer_community");
          return {
            id: genId("payout"),
            milestoneId: claim.milestoneId,
            claimId,
            recipientId: recipient?.id,
            participantRole: share.participantRole,
            amount: share.amount,
            currency: agreement.currency,
            status: runGateCheck(true, recipient),
          };
        }),
      });
      await tx.milestoneClaim.update({ where: { id: claimId }, data: { status: "consented" } });
      await tx.milestone.update({ where: { id: claim.milestoneId }, data: { status: "consented" } });
      await appendAuditEntry(tx, agreement.id, "claim.consented", { claimId, payoutInstructionsCreated: shares.length });
    },
    { timeout: 20000 }
  );

  return NextResponse.json({ ok: true });
}
