import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePaymentOpsAccess, requirePaymentOrgAccess, requirePaymentPartyAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { genId } from "@/lib/utils";

class OverrideNotFoundError extends Error {}
class OverrideAlreadyResolvedError extends Error {}
class OverrideAlreadyPendingError extends Error {}

/** Dual-authorization override for a KYC/BAV-blocked payout (§14) — a maker-checker exception
 * path, never a single-approver bypass. `action: "request"` opens it (partner-org staff or ops);
 * `action: "approve_partner" | "approve_investor"` records one required co-signer's approval. Once
 * both signers are on record, the override auto-grants and the payout instruction clears to "ready"
 * — no separate ops "finalize" click is needed on top of the two required approvals. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: payoutInstructionId } = await params;
  const body = await request.json();
  const action: string | undefined = body.action;

  const instruction = await prisma.payoutInstruction.findUnique({ where: { id: payoutInstructionId }, include: { milestone: true } });
  if (!instruction) return NextResponse.json({ error: "Payout instruction not found" }, { status: 404 });
  const agreement = await prisma.paymentAgreement.findUnique({ where: { id: instruction.milestone.paymentAgreementId } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

  if (action === "request") {
    if (instruction.status !== "blocked_awaiting_kyc" && instruction.status !== "blocked_awaiting_bav") {
      return NextResponse.json({ error: "This payout isn't blocked on KYC or BAV" }, { status: 409 });
    }
    const justification: string | undefined = body.justification;
    if (typeof justification !== "string" || justification.trim() === "") {
      return NextResponse.json({ error: "A justification is required" }, { status: 400 });
    }
    const orgAccess = await requirePaymentOrgAccess(agreement.organizationId);
    const access = orgAccess.ok ? orgAccess : await requirePaymentOpsAccess();
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

    const overriddenGate = instruction.status === "blocked_awaiting_kyc" ? "kyc" : "bav";
    const overrideId = genId("override");
    try {
      // The "no pending override already exists" check and the create must be one atomic unit —
      // same reasoning as the approve branch below — otherwise two people clicking "Request
      // override" within the same race window can both pass the check and create two pending rows.
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.gateOverride.findFirst({ where: { payoutInstructionId, status: "pending" } });
          if (existing) throw new OverrideAlreadyPendingError();
          await tx.gateOverride.create({ data: { id: overrideId, payoutInstructionId, overriddenGate, justification, status: "pending" } });
          await appendAuditEntry(tx, agreement.id, "override.requested", { payoutInstructionId, overrideId, overriddenGate, justification });
        },
        { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof OverrideAlreadyPendingError) return NextResponse.json({ error: "An override is already pending on this payout" }, { status: 409 });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        return NextResponse.json({ error: "Another request just started an override on this payout. Please retry." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ id: overrideId }, { status: 201 });
  }

  if (action === "approve_partner" || action === "approve_investor") {
    const overrideId: string | undefined = body.overrideId;
    if (typeof overrideId !== "string") return NextResponse.json({ error: "overrideId is required" }, { status: 400 });

    const access =
      action === "approve_partner" ? await requirePaymentOrgAccess(agreement.organizationId) : await requirePaymentPartyAccess(agreement.id, "investor");
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

    // Partner and investor can sign within moments of each other — the read and the write must be
    // one atomic unit (read the override, decide bothSigned, write) or a concurrent second signer
    // can silently overwrite the first signer's approval with their own stale pre-write snapshot.
    // Serializable isolation makes Postgres abort one of the two racing transactions instead
    // (caught below as P2034), the same pattern already used for the linked-record exclusivity
    // check in src/lib/queries.ts's assertLinksStillAvailable.
    let bothSigned = false;
    try {
      await prisma.$transaction(
        async (tx) => {
          const override = await tx.gateOverride.findUnique({ where: { id: overrideId } });
          if (!override || override.payoutInstructionId !== payoutInstructionId) throw new OverrideNotFoundError();
          if (override.status !== "pending") throw new OverrideAlreadyResolvedError();

          const partnerApprovalByUserId = action === "approve_partner" ? access.userId : override.partnerApprovalByUserId;
          const investorApprovalByUserId = action === "approve_investor" ? access.userId : override.investorApprovalByUserId;
          bothSigned = !!partnerApprovalByUserId && !!investorApprovalByUserId;

          await tx.gateOverride.update({
            where: { id: overrideId },
            data: { partnerApprovalByUserId, investorApprovalByUserId, status: bothSigned ? "granted" : "pending" },
          });
          await appendAuditEntry(tx, agreement.id, "override.signed", { payoutInstructionId, overrideId, signedBy: access.userId, action });
          if (bothSigned) {
            await tx.payoutInstruction.update({ where: { id: payoutInstructionId }, data: { status: "ready" } });
            await appendAuditEntry(tx, agreement.id, "override.granted", { payoutInstructionId, overrideId });
          }
        },
        { timeout: 20000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (error instanceof OverrideNotFoundError) return NextResponse.json({ error: "Override not found on this payout" }, { status: 404 });
      if (error instanceof OverrideAlreadyResolvedError) return NextResponse.json({ error: "This override was already resolved" }, { status: 409 });
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        return NextResponse.json({ error: "Another signer just updated this override. Please retry." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ granted: bothSigned });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
