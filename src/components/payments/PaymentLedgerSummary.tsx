import { Landmark } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { computeAccruedInterest } from "@/lib/proximity-pay";
import { computeAgreementDisbursedTotal, computeRoleShare } from "@/lib/payment-ledger-summary";
import { cn, formatCurrency } from "@/lib/utils";
import { PARTICIPANT_ROLE_LABELS, PARTICIPANT_ROLE_DOT_CLASSES } from "@/lib/payments-labels";
import type { PaymentAgreementDetail } from "@/lib/queries";
import type { ParticipantRole } from "@/types";

export type LedgerViewerRole = "investor" | "registry" | ParticipantRole;

/** The role-scoped counterpart to the full "Agreement terms / Revenue split / Escrow" panel —
 * shown to anyone who isn't this agreement's org management (investor party, registry party, a
 * ground partner filing claims, or any other org member without manage-tier access). Surfaces only
 * the viewer's own numbers: never another participant's split percentage or identity. */
export function PaymentLedgerSummary({ detail, viewerRole }: { detail: PaymentAgreementDetail; viewerRole: LedgerViewerRole }) {
  if (viewerRole === "registry") {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink">Your role</h2>
        </CardHeader>
        <CardBody>
          <p className="text-[13px] text-ink-soft">
            You&apos;re the registry verifier on this agreement — confirm monitoring-cycle milestones as evidence is filed below.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (viewerRole === "investor") {
    const disbursedTotal = computeAgreementDisbursedTotal(detail);
    const remaining = Math.max(0, Math.round((detail.agreement.totalValue - disbursedTotal) * 100) / 100);
    return (
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Landmark className="size-3.5" /> Your escrow
          </h2>
        </CardHeader>
        <CardBody className="flex flex-col gap-2.5 text-[13px]">
          {detail.escrow ? (
            <>
              <div className="flex justify-between">
                <span className="text-ink-soft">Held</span>
                <span className="tabular font-medium text-ink">{formatCurrency(detail.escrow.heldAmount, detail.escrow.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Core portion</span>
                <span className="tabular text-ink">{formatCurrency(detail.escrow.corePortionBalance, detail.escrow.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Interest accrued</span>
                <span className="tabular text-good-text">{formatCurrency(computeAccruedInterest(detail.escrow), detail.escrow.currency)}</span>
              </div>
              <p className="text-[11.5px] text-ink-soft/70">Simulated core-portion accrual — Proximity Pay, not a real bank balance.</p>
            </>
          ) : (
            <p className="text-ink-soft">Escrow hasn&apos;t been funded yet.</p>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-2.5">
            <span className="text-ink-soft">Released to date</span>
            <span className="tabular font-medium text-ink">{formatCurrency(disbursedTotal, detail.agreement.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Remaining in escrow</span>
            <span className="tabular text-ink">{formatCurrency(remaining, detail.agreement.currency)}</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // developer | farmer_community | platform — a plain "your cut" summary, never anyone else's %.
  const share = computeRoleShare(detail, viewerRole);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-ink">Your payment summary</h2>
      </CardHeader>
      <CardBody className="flex flex-col gap-2.5 text-[13px]">
        <div className="flex justify-between">
          <span className="text-ink-soft">Role</span>
          <span className="flex items-center gap-1.5 text-ink">
            <span className={cn("size-1.5 shrink-0 rounded-full", PARTICIPANT_ROLE_DOT_CLASSES[viewerRole])} />
            {PARTICIPANT_ROLE_LABELS[viewerRole] ?? viewerRole}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Your allocation</span>
          <span className="tabular font-medium text-ink">{formatCurrency(share.allocated, detail.agreement.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Disbursed to date</span>
          <span className="tabular text-good-text">{formatCurrency(share.disbursed, detail.agreement.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Pending</span>
          <span className="tabular text-hold-text">{formatCurrency(share.pending, detail.agreement.currency)}</span>
        </div>
        {share.percentByMilestone.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
            {share.percentByMilestone.map((m) => (
              <div key={m.milestoneId} className="flex justify-between text-[12px]">
                <span className="text-ink-soft">{m.label}</span>
                <span className="tabular text-ink">{m.percent}%</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
