"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio, pickActiveFlow } from "@/lib/studio";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { FlowSummaryTable } from "@/components/overview/FlowSummaryTable";
import { StageTracker } from "@/components/overview/StageTracker";
import type { AnalyticsCard, FlowSummary, Submission } from "@/types";

export default function OverviewPage() {
  const { session } = useSession();
  const { flows, projects } = useStudio();
  const orgId = session.organization.id;
  const domainPackId = session.organization.domainPackId;
  const orgProjects = projects.filter((p) => p.organizationId === orgId);

  const [attention, setAttention] = useState<Submission[]>([]);
  const [cards, setCards] = useState<AnalyticsCard[]>([]);
  const [flowSummary, setFlowSummary] = useState<FlowSummary | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(undefined);
  const selectedProjectId = activeProjectId ?? orgProjects[0]?.id;

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

  const orgFlow = selectedProjectId ? pickActiveFlow(flows, selectedProjectId) : undefined;

  const orgFlowId = orgFlow?.id;
  useEffect(() => {
    if (!orgFlowId) return;
    let cancelled = false;
    setFlowSummary(null);
    fetch(`/api/flows/${orgFlowId}/summary?organizationId=${orgId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: FlowSummary) => {
        if (!cancelled) setFlowSummary(data);
      })
      .catch((error) => console.error("Failed to load flow summary", error));
    return () => {
      cancelled = true;
    };
  }, [orgFlowId, orgId]);

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

      <Card className="mb-6">
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Flow summary</h2>
              {orgProjects.length > 1 && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="rounded-md border border-border-strong bg-paper px-2 py-1 text-[12.5px] text-ink"
                >
                  {orgProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {orgFlow ? (
              <p className="mt-0.5 text-[13px] text-ink-soft">
                <span className="font-medium text-ink">{orgFlow.name}</span> · triggers on {orgFlow.triggerLabel.toLowerCase()} · {orgFlow.nodes.length}{" "}
                nodes · v{orgFlow.versionNo}
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] text-ink-soft">No flow published yet for this project.</p>
            )}
          </div>
          {orgFlow && (
            <Link href={`/flows/${orgFlow.id}`} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-500 hover:underline">
              Open flow <ArrowRight className="size-3.5" />
            </Link>
          )}
        </CardHeader>
        <CardBody>
          {orgFlow ? (
            flowSummary ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
                <StageTracker summary={flowSummary} />
                <FlowSummaryTable summary={flowSummary} />
              </div>
            ) : (
              <p className="text-[13px] text-ink-soft">Loading flow summary…</p>
            )
          ) : (
            <p className="text-[13px] text-ink-soft">Publish a flow to see its per-form SLA, rejection reasons, and stage bottlenecks here.</p>
          )}
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
  );
}
