"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PaymentAgreementStatusChip } from "@/components/ui/StatusChip";
import { MilestoneCard } from "@/components/payments/MilestoneCard";
import { AuditTrailPanel } from "@/components/payments/AuditTrailPanel";
import { PaymentLedgerSummary, type LedgerViewerRole } from "@/components/payments/PaymentLedgerSummary";
import { computeAccruedInterest } from "@/lib/proximity-pay";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PARTICIPANT_ROLE_LABELS, PARTICIPANT_ROLE_DOT_CLASSES } from "@/lib/payments-labels";
import type { PaymentAgreementDetail } from "@/lib/queries";

const ESCROW_ALLOCATION_LABELS: Record<string, string> = { pool: "Distributable pool", buyer: "Credited to buyer", platform: "Platform revenue" };
const FX_POLICY_LABELS: Record<string, string> = { apply_at_execution: "Apply at execution", lock_at_consent: "Lock at consent" };

interface Capabilities {
  canManage: boolean;
  canActAsOps: boolean;
  canActAsInvestor: boolean;
  canActAsRegistry: boolean;
  canFileClaim: boolean;
}

export function PaymentAgreementDetailClient({
  detail,
  currentUserId,
  capabilities,
  viewerRole,
}: {
  detail: PaymentAgreementDetail;
  currentUserId: string;
  capabilities: Capabilities;
  /** "manager" (org admin/sub-admin, or platform admin) sees the full agreement terms/split/escrow
   * panel. Everyone else — investor/registry party, ground partner, or any other org member —
   * gets the role-scoped PaymentLedgerSummary instead: their own numbers, nobody else's. */
  viewerRole: "manager" | LedgerViewerRole;
}) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { agreement, splitRules, milestones, escrow, auditEntries, usersById } = detail;

  async function activate() {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/agreements/${agreement.id}/activate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to activate");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setActivating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PaymentAgreementStatusChip status={agreement.status} />
          <span className="tabular text-[12.5px] text-ink-soft">Created {formatDate(agreement.createdAt)}</span>
        </div>
        {agreement.status === "draft" && capabilities.canManage && (
          <Button variant="primary" size="sm" onClick={activate} disabled={activating}>
            <Zap className="size-3.5" /> {activating ? "Activating…" : "Activate agreement"}
          </Button>
        )}
      </div>
      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              currency={agreement.currency}
              agreementStatus={agreement.status}
              milestone={milestone}
              usersById={usersById}
              currentUserId={currentUserId}
              capabilities={capabilities}
            />
          ))}
          <AuditTrailPanel entries={auditEntries} />
        </div>

        <div className="flex flex-col gap-4">
          {viewerRole === "manager" ? (
            <>
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-ink">Agreement terms</h2>
                </CardHeader>
                <CardBody className="flex flex-col gap-2.5 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Total value</span>
                    <span className="tabular font-medium text-ink">{formatCurrency(agreement.totalValue, agreement.currency)}</span>
                  </div>
                  {agreement.pricePerCredit !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Price per credit</span>
                      <span className="tabular text-ink">{formatCurrency(agreement.pricePerCredit, agreement.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Escrow interest</span>
                    <span className="text-ink">{ESCROW_ALLOCATION_LABELS[agreement.escrowInterestAllocation] ?? agreement.escrowInterestAllocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-soft">FX policy</span>
                    <span className="text-ink">{FX_POLICY_LABELS[agreement.fxRateTimingPolicy] ?? agreement.fxRateTimingPolicy}</span>
                  </div>
                </CardBody>
              </Card>

              {splitRules.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-ink">Revenue split</h2>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-2">
                    <p className="text-[11.5px] text-ink-soft/70">Applies to every milestone on this agreement.</p>
                    {splitRules.map((rule) => (
                      <div key={rule.id} className="flex justify-between text-[13px]">
                        <span className="flex items-center gap-1.5 text-ink-soft">
                          <span className={cn("size-1.5 shrink-0 rounded-full", PARTICIPANT_ROLE_DOT_CLASSES[rule.participantRole])} />
                          {PARTICIPANT_ROLE_LABELS[rule.participantRole] ?? rule.participantRole}
                        </span>
                        <span className="tabular text-ink">{rule.percent}%</span>
                      </div>
                    ))}
                  </CardBody>
                </Card>
              )}

              {escrow && (
                <Card>
                  <CardHeader>
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <Landmark className="size-3.5" /> Escrow
                    </h2>
                  </CardHeader>
                  <CardBody className="flex flex-col gap-2.5 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Held</span>
                      <span className="tabular font-medium text-ink">{formatCurrency(escrow.heldAmount, escrow.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Core portion</span>
                      <span className="tabular text-ink">{formatCurrency(escrow.corePortionBalance, escrow.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Interest accrued</span>
                      <span className="tabular text-good-text">{formatCurrency(computeAccruedInterest(escrow), escrow.currency)}</span>
                    </div>
                    <p className="text-[11.5px] text-ink-soft/70">Simulated core-portion accrual — Proximity Pay, not a real bank balance.</p>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            <PaymentLedgerSummary detail={detail} viewerRole={viewerRole} />
          )}
        </div>
      </div>
    </div>
  );
}
