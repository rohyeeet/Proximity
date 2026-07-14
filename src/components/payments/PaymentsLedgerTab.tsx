"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentStepLedgerPanel } from "@/components/payments/PaymentStepLedgerPanel";
import { MILESTONE_TYPE_LABELS } from "@/lib/payments-labels";
import type { MilestoneTemplate } from "@/types";

/** One row per milestone template — the same live ledger a payment_step node's inspector shows,
 * surfaced here so a project developer can check every milestone's escrow/disbursement status
 * without having to open Flow Studio. */
export function PaymentsLedgerTab({ projectId }: { projectId: string }) {
  const [templates, setTemplates] = useState<MilestoneTemplate[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTemplates(null);
    fetch(`/api/projects/${projectId}/milestone-templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data: MilestoneTemplate[]) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to load milestone templates", err);
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (templates === null) return <p className="text-[13px] text-ink-soft">Loading ledger…</p>;
  if (templates.length === 0) {
    return <EmptyState title="No milestone templates yet" description="Define milestone templates first — the ledger rolls up against them." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">{MILESTONE_TYPE_LABELS[template.type]}</p>
              <h3 className="text-[14px] font-semibold text-ink">{template.label}</h3>
            </div>
            <span className="tabular text-[14px] font-semibold text-ink">{template.percentOfTotal}%</span>
          </CardHeader>
          <CardBody>
            <PaymentStepLedgerPanel milestoneTemplateId={template.id} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
