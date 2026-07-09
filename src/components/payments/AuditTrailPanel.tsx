"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { verifyAuditChain } from "@/lib/payment-audit";
import { formatDateTime } from "@/lib/utils";
import type { PaymentAuditLogEntry } from "@/types";

const EVENT_LABELS: Record<string, string> = {
  "agreement.created": "Agreement created",
  "agreement.activated": "Agreement activated — escrow funded",
  "claim.submitted": "Claim submitted",
  "evidence.attached": "Evidence attached",
  "consent.recorded": "Consent recorded",
  "claim.rejected": "Claim rejected",
  "claim.consented": "Claim consented — payouts created",
  "payout.routed": "Payout routed via Proximity Pay",
  "payout.settled": "Payout settled",
  "override.requested": "Override requested",
  "override.signed": "Override co-signed",
  "override.granted": "Override granted",
};

/** Hash-chain, rendered — the design doc's §18 "tamper-evident, never a public blockchain"
 * principle made visible: recomputes every entry's hash client-side and confirms the sequence
 * hasn't been altered. */
export function AuditTrailPanel({ entries }: { entries: PaymentAuditLogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const [verification, setVerification] = useState<{ valid: boolean; brokenAtId?: string } | null>(null);
  const sorted = useMemo(() => [...entries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [entries]);

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 className="text-sm font-semibold text-ink">Audit trail</h2>
          <p className="text-[12px] text-ink-soft">{entries.length} hash-chained entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setVerification(verifyAuditChain(sorted))}>
            Verify chain
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>
      {verification && (
        <div
          className={`flex items-center gap-2 border-b border-border px-5 py-2.5 text-[12.5px] ${verification.valid ? "text-good-text" : "text-critical-text"}`}
        >
          {verification.valid ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
          {verification.valid ? "Chain verified — every entry's hash matches." : `Chain broken at entry ${verification.brokenAtId}.`}
        </div>
      )}
      {expanded && (
        <CardBody className="flex flex-col gap-0 p-0">
          <div className="flex flex-col divide-y divide-border">
            {sorted.map((entry) => (
              <div key={entry.id} className="px-5 py-2.5 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{EVENT_LABELS[entry.eventType] ?? entry.eventType}</span>
                  <span className="tabular text-[11px] text-ink-soft">{formatDateTime(entry.timestamp)}</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink-soft/70" title={entry.hash}>
                  {entry.hash.slice(0, 16)}…
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      )}
    </Card>
  );
}
