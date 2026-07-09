import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePaymentOpsAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { notifyPayoutPaid } from "@/lib/notifications";
import { routePayout } from "@/lib/proximity-pay";
import type { ParticipantRole } from "@/types";

/** Releases a "ready" payout instruction through the simulated PSP. Routes and settles in one
 * request (see src/lib/proximity-pay.ts's module comment on why this is synchronous rather than a
 * real async job) — the audit trail still records routing and settlement as two distinct events,
 * matching §17's "settlement confirmation, not initiation, marks paid" principle even though both
 * happen in the same call here. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requirePaymentOpsAccess();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const instruction = await prisma.payoutInstruction.findUnique({ where: { id }, include: { milestone: true, claim: true } });
  if (!instruction) return NextResponse.json({ error: "Payout instruction not found" }, { status: 404 });
  if (instruction.status !== "ready") return NextResponse.json({ error: "This payout isn't ready for release" }, { status: 409 });

  const agreement = await prisma.paymentAgreement.findUnique({ where: { id: instruction.milestone.paymentAgreementId } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });

  const route = routePayout(instruction.participantRole as ParticipantRole);
  const paidAt = new Date();

  await prisma.$transaction(
    async (tx) => {
      await tx.payoutInstruction.update({ where: { id }, data: { status: "paid", proximityPayRef: route.reference, paidAt } });
      await appendAuditEntry(tx, agreement.id, "payout.routed", { payoutInstructionId: id, provider: route.provider, reference: route.reference });
      await appendAuditEntry(tx, agreement.id, "payout.settled", { payoutInstructionId: id, reference: route.reference, amount: instruction.amount });

      const [remainingForMilestone, remainingForClaim, escrow] = await Promise.all([
        tx.payoutInstruction.count({ where: { milestoneId: instruction.milestoneId, id: { not: id }, status: { not: "paid" } } }),
        tx.payoutInstruction.count({ where: { claimId: instruction.claimId, id: { not: id }, status: { not: "paid" } } }),
        tx.escrowAccount.findUnique({ where: { paymentAgreementId: agreement.id } }),
      ]);

      const updates: Promise<unknown>[] = [];
      if (remainingForMilestone === 0) {
        updates.push(tx.milestone.update({ where: { id: instruction.milestoneId }, data: { status: "paid" } }));
      }
      if (remainingForClaim === 0) {
        updates.push(tx.milestoneClaim.update({ where: { id: instruction.claimId }, data: { status: "paid" } }));
      }
      if (escrow) {
        const newHeld = Math.max(0, escrow.heldAmount - instruction.amount);
        updates.push(
          tx.escrowAccount.update({
            where: { id: escrow.id },
            data: {
              heldAmount: newHeld,
              corePortionBalance: Math.min(escrow.corePortionBalance, newHeld),
              status: newHeld === 0 ? "fully_released" : "partially_released",
            },
          })
        );
      }
      await Promise.all(updates);
    },
    { timeout: 20000 }
  );

  await notifyPayoutPaid(agreement.id, instruction.claim.submittedByUserId, instruction.milestone.label, instruction.amount, instruction.currency).catch((error) =>
    console.error("Failed to notify payout paid", error)
  );

  return NextResponse.json({ ok: true, provider: route.provider, reference: route.reference });
}
