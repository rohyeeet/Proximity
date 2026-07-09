"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import type { AnalyticsCard, Submission } from "@/types";

export default function OverviewPage() {
  const { session } = useSession();
  const { forms, flows } = useStudio();
  const orgId = session.organization.id;
  const domainPackId = session.organization.domainPackId;

  const [attention, setAttention] = useState<Submission[]>([]);
  const [cards, setCards] = useState<AnalyticsCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/domain-packs/${domainPackId}/attention?organizationId=${orgId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: Submission[]) => {
        if (!cancelled) setAttention(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error("Failed to load attention queue", error));
    return () => {
      cancelled = true;
    };
  }, [domainPackId, orgId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organizations/${orgId}/analytics`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: { cards: AnalyticsCard[] }) => {
        if (!cancelled) setCards(data.cards ?? []);
      })
      .catch((error) => console.error("Failed to load analytics cards", error));
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const orgForms = forms.filter((form) => form.domainPackId === domainPackId);
  const orgFlow = flows.find((flow) => flow.domainPackId === domainPackId);
  const needsFix = attention.filter((s) => s.reviewStatus === "needs_fix");
  const needsCheck = attention.filter((s) => s.reviewStatus === "needs_check");

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Overview"
        description="Current flow health, what's blocked, and where to look next."
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <MetricCard key={card.key} card={card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-semibold text-ink">Active flow</h2>
            {orgFlow && (
              <Link href={`/flows/${orgFlow.id}`} className="flex items-center gap-1 text-[13px] font-medium text-brand-500 hover:underline">
                Open flow <ArrowRight className="size-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardBody>
            {orgFlow ? (
              <>
                <p className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{orgFlow.name}</span> · triggers on {orgFlow.triggerLabel.toLowerCase()}
                </p>
                <p className="mt-1 text-[13px] text-ink-soft">
                  {orgFlow.nodes.length} nodes · {orgFlow.edges.length} edges · v{orgFlow.versionNo}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-soft">No flow published yet for this domain pack.</p>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {orgForms.slice(0, 6).map((form) => (
                <Link
                  key={form.id}
                  href={`/records/${form.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-[13px] hover:bg-sunken"
                >
                  <span className="text-ink">{form.name}</span>
                  <span className="flex items-center gap-2">
                    {form.needsFixCount > 0 && <StatusChip label={`${form.needsFixCount} Needs Fix`} tone="critical" />}
                    {form.needsCheckCount > 0 && <StatusChip label={`${form.needsCheckCount} Needs Check`} tone="accent" />}
                  </span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warn-text" strokeWidth={2} />
              <h2 className="text-sm font-semibold text-ink">Needs your attention</h2>
            </div>
          </CardHeader>
          <div className="flex flex-col divide-y divide-border">
            {[...needsFix, ...needsCheck].slice(0, 6).map((submission) => (
              <Link
                key={submission.id}
                href={`/records/${submission.formTemplateId}?highlight=${submission.id}`}
                className="flex items-center justify-between px-5 py-3 text-[13px] hover:bg-sunken"
              >
                <div>
                  <p className="font-medium text-ink">{submission.displayId}</p>
                  <p className="text-ink-soft">{submission.flowNodeLabel}</p>
                </div>
                <StatusChip
                  label={submission.reviewStatus === "needs_fix" ? "Needs Fix" : "Needs Check"}
                  tone={submission.reviewStatus === "needs_fix" ? "critical" : "accent"}
                />
              </Link>
            ))}
            {needsFix.length === 0 && needsCheck.length === 0 && (
              <p className="px-5 py-6 text-[13px] text-ink-soft">Nothing waiting on you right now.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
