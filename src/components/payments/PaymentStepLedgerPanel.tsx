"use client";

import { useEffect, useState } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { PARTICIPANT_ROLE_LABELS, PARTICIPANT_ROLE_DOT_CLASSES } from "@/lib/payments-labels";
import type { MilestoneLedger } from "@/lib/queries";

/** "Asynchronously open the milestone and check the ledger" — a compact, live rollup of what
 * this milestone template has actually escrowed vs. disbursed, per role, across every real
 * agreement running it. Shown inline on a payment_step node's inspector and reused on the
 * Payments Ledger tab. */
export function PaymentStepLedgerPanel({ milestoneTemplateId }: { milestoneTemplateId: string }) {
  const [ledger, setLedger] = useState<MilestoneLedger | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLedger(undefined);
    fetch(`/api/milestone-templates/${milestoneTemplateId}/ledger`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data: MilestoneLedger | null) => {
        if (!cancelled) setLedger(data);
      })
      .catch((err) => {
        console.error("Failed to load milestone ledger", err);
        if (!cancelled) setLedger(null);
      });
    return () => {
      cancelled = true;
    };
  }, [milestoneTemplateId]);

  if (ledger === undefined) return <p className="text-[12px] text-ink-soft">Loading ledger…</p>;
  if (!ledger) return <p className="text-[12px] text-ink-soft">Ledger unavailable.</p>;

  if (ledger.agreementCount === 0) {
    return (
      <p className="text-[12px] text-ink-soft">
        No real agreements have run this milestone yet — the ledger will populate once one is signed and escrow is funded.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-ink-soft">
          Across {ledger.agreementCount} agreement{ledger.agreementCount === 1 ? "" : "s"}
        </span>
        <span className="tabular font-medium text-ink">{formatCurrency(ledger.totalAllocated, ledger.currency)} allocated</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {ledger.roles.map((role) => {
          const disbursedPct = role.allocated > 0 ? Math.min(100, Math.round((role.disbursed / role.allocated) * 100)) : 0;
          return (
            <div key={role.participantRole} className="flex flex-col gap-1 rounded-md bg-sunken px-2.5 py-1.5">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-1.5 text-ink">
                  <span className={cn("size-1.5 shrink-0 rounded-full", PARTICIPANT_ROLE_DOT_CLASSES[role.participantRole])} />
                  {PARTICIPANT_ROLE_LABELS[role.participantRole] ?? role.participantRole}
                </span>
                <span className="tabular text-ink-soft">{role.percent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className={cn("h-full rounded-full", PARTICIPANT_ROLE_DOT_CLASSES[role.participantRole])} style={{ width: `${disbursedPct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-good-text">{formatCurrency(role.disbursed, ledger.currency)} disbursed</span>
                <span className="text-hold-text">{formatCurrency(role.pending, ledger.currency)} pending</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-1.5 text-[12px]">
        <span className="text-good-text">{formatCurrency(ledger.totalDisbursed, ledger.currency)} disbursed</span>
        <span className="text-hold-text">{formatCurrency(ledger.totalPending, ledger.currency)} in escrow</span>
      </div>
    </div>
  );
}
