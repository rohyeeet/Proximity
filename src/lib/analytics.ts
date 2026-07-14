import { prisma } from "@/lib/db";
import { getFlowTemplate, getFormTemplate, getProject, getStagesByDomainPack, getSubmissionsByForm } from "@/lib/queries";
import type {
  AnalyticsCard,
  AnalyticsSeries,
  FlowNodeDefinition,
  FlowSummary,
  FormFlowSummary,
  ReviewActionRecord,
  StageFlowSummary,
  SubmissionVersionRecord,
  TrackerAggregation,
} from "@/types";

/**
 * Every number here is computed from this organization's real Submission/Device rows — nothing
 * hardcoded, nothing keyed by a literal org id. An org with no activity yet gets an empty list
 * (rendered as an empty state), never a fabricated percentage.
 */
async function orgSubmissions(organizationId: string) {
  return prisma.submission.findMany({
    where: { isTest: false, submittedBy: { memberships: { some: { organizationId, status: "active" } } } },
    orderBy: { updatedAt: "desc" },
    take: 2000,
  });
}

function submittedAt(versions: unknown): number {
  const list = versions as SubmissionVersionRecord[];
  const first = list.find((v) => v.versionNo === 1) ?? list[0];
  return first ? new Date(first.createdAt).getTime() : Date.now();
}

export async function getAnalyticsCards(organizationId: string): Promise<AnalyticsCard[]> {
  const [submissions, devices] = await Promise.all([
    orgSubmissions(organizationId),
    prisma.device.findMany({ where: { connector: { organizationId } }, select: { coveragePct: true } }),
  ]);

  const cards: AnalyticsCard[] = [];
  const decided = submissions.filter((s) => s.reviewStatus !== "draft");

  if (submissions.length > 0) {
    const now = Date.now();
    const thisWeek = submissions.filter((s) => now - submittedAt(s.versions) < WEEK_MS).length;
    const lastWeek = submissions.filter((s) => {
      const age = now - submittedAt(s.versions);
      return age >= WEEK_MS && age < WEEK_MS * 2;
    }).length;
    const diff = thisWeek - lastWeek;
    cards.push({
      key: "submissions_this_week",
      label: "Submissions this week",
      value: String(thisWeek),
      tone: "neutral",
      delta: { label: diff === 0 ? "flat vs last week" : `${diff > 0 ? "+" : ""}${diff} vs last week`, direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat" },
    });
  }

  if (decided.length > 0) {
    const approved = decided.filter((s) => s.reviewStatus === "approved").length;
    cards.push({ key: "approval_rate", label: "Submissions approved", value: `${Math.round((approved / decided.length) * 100)}%`, tone: "good" });
  }

  const needsFix = submissions.filter((s) => s.reviewStatus === "needs_fix").length;
  if (submissions.length > 0) {
    cards.push({ key: "returned_submissions", label: "Returned submissions", value: String(needsFix), tone: needsFix > 0 ? "warn" : "neutral" });
  }

  const onHold = submissions.filter((s) => s.reviewStatus === "on_hold").length;
  if (onHold > 0) cards.push({ key: "blocked_steps", label: "Blocked steps", value: String(onHold), tone: "critical" });

  const turnaroundsMs: number[] = [];
  for (const row of submissions) {
    const reviewActions = row.reviewActions as unknown as ReviewActionRecord[];
    const versions = row.versions as unknown as SubmissionVersionRecord[];
    for (const action of reviewActions) {
      if (action.outcome !== "returned_for_correction") continue;
      const returnedAt = new Date(action.createdAt).getTime();
      const resubmission = versions.find((v) => new Date(v.createdAt).getTime() > returnedAt);
      if (resubmission) turnaroundsMs.push(new Date(resubmission.createdAt).getTime() - returnedAt);
    }
  }
  if (turnaroundsMs.length > 0) {
    const avgHours = turnaroundsMs.reduce((a, b) => a + b, 0) / turnaroundsMs.length / (1000 * 60 * 60);
    cards.push({
      key: "correction_turnaround",
      label: "Avg. correction turnaround",
      value: avgHours < 24 ? `${avgHours.toFixed(1)} hrs` : `${(avgHours / 24).toFixed(1)} days`,
      tone: "neutral",
    });
  }

  if (submissions.length > 0) {
    const withEvidence = submissions.filter((s) => Array.isArray(s.evidence) && (s.evidence as unknown[]).length > 0).length;
    cards.push({
      key: "evidence_attached",
      label: "Submissions with evidence",
      value: `${Math.round((withEvidence / submissions.length) * 100)}%`,
      tone: "neutral",
    });
  }

  if (devices.length > 0) {
    const avgCoverage = devices.reduce((sum, d) => sum + d.coveragePct, 0) / devices.length;
    cards.push({ key: "device_coverage", label: "Device coverage (avg.)", value: `${avgCoverage.toFixed(1)}%`, tone: avgCoverage >= 90 ? "good" : "warn" });
  }

  return cards;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 6;

function weekLabel(startMs: number): string {
  return new Date(startMs).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function getAnalyticsSeries(organizationId: string): Promise<AnalyticsSeries[]> {
  const submissions = await orgSubmissions(organizationId);
  if (submissions.length === 0) return [];

  const now = Date.now();
  const buckets = Array.from({ length: WEEKS }, (_, i) => {
    const end = now - (WEEKS - 1 - i) * WEEK_MS;
    const start = end - WEEK_MS;
    return { start, end, label: weekLabel(start) };
  });

  const submissionCounts = buckets.map((bucket) => ({
    period: bucket.label,
    value: submissions.filter((s) => {
      const ts = submittedAt(s.versions);
      return ts >= bucket.start && ts < bucket.end;
    }).length,
  }));

  const correctionRates = buckets.map((bucket) => {
    let returned = 0;
    let total = 0;
    for (const row of submissions) {
      for (const action of row.reviewActions as unknown as ReviewActionRecord[]) {
        const ts = new Date(action.createdAt).getTime();
        if (ts < bucket.start || ts >= bucket.end) continue;
        total += 1;
        if (action.outcome === "returned_for_correction") returned += 1;
      }
    }
    return { period: bucket.label, value: total > 0 ? Math.round((returned / total) * 100) : 0 };
  });

  return [
    { key: "submissions_per_week", label: "Submissions per week", points: submissionCounts },
    { key: "correction_rate", label: "Correction rate (%)", unit: "%", points: correctionRates },
  ];
}

const AGGREGATION_LABELS: Record<TrackerAggregation, string> = { sum: "SUM", avg: "AVG", min: "MIN", max: "MAX" };

function aggregate(values: number[], kind: TrackerAggregation): number {
  switch (kind) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
  }
}

/**
 * Per-form (and per-stage) roll-up for the Overview page's flow summary: SLA, top rejection
 * reasons, accept/reject/pending counts, which stage is the current bottleneck, and which stage
 * has the highest drop-off rate — computed live from this organization's real submissions against
 * the forms actually referenced by the flow's own nodes (never every form in the domain pack).
 */
export async function getFlowSummary(flowId: string, organizationId: string): Promise<FlowSummary | undefined> {
  const flow = await getFlowTemplate(flowId);
  if (!flow) return undefined;
  const project = await getProject(flow.projectId);
  if (!project) return undefined;

  const stages = await getStagesByDomainPack(project.domainPackId);
  const stageByFormTemplateId = new Map<string, string>();
  for (const stage of stages) {
    for (const formTemplateId of stage.formTemplateIds) stageByFormTemplateId.set(formTemplateId, stage.id);
  }
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));

  // One node per form, in flow order — a hand-added node sharing a form with a stage-synced node
  // would otherwise double-count that form's submissions in both the form list and stage roll-up.
  const nodesByForm = new Map<string, FlowNodeDefinition>();
  for (const node of flow.nodes) {
    if (node.formTemplateId && !nodesByForm.has(node.formTemplateId)) nodesByForm.set(node.formTemplateId, node);
  }

  const forms: FormFlowSummary[] = [];
  for (const [formTemplateId, node] of nodesByForm) {
    const form = await getFormTemplate(formTemplateId);
    if (!form) continue;
    const submissions = await getSubmissionsByForm(formTemplateId, organizationId);

    const total = submissions.length;
    const approved = submissions.filter((s) => s.reviewStatus === "approved").length;
    const needsFix = submissions.filter((s) => s.reviewStatus === "needs_fix").length;
    const pending = submissions.filter((s) => s.reviewStatus === "needs_check" || s.reviewStatus === "on_hold" || s.reviewStatus === "draft").length;
    const decided = total - submissions.filter((s) => s.reviewStatus === "draft").length;
    const approvalRatePct = decided > 0 ? Math.round((approved / decided) * 100) : null;

    const slaHours: number[] = [];
    const reasonCounts = new Map<string, number>();
    for (const submission of submissions) {
      const reviewActions = submission.reviewActions;
      const firstApproval = reviewActions.find((a) => a.outcome === "approved");
      if (firstApproval) {
        const hours = (new Date(firstApproval.createdAt).getTime() - submittedAt(submission.versions)) / (1000 * 60 * 60);
        if (hours >= 0) slaHours.push(hours);
      }
      for (const action of reviewActions) {
        if (action.outcome !== "returned_for_correction" || !action.reason) continue;
        reasonCounts.set(action.reason, (reasonCounts.get(action.reason) ?? 0) + 1);
      }
    }
    const avgSlaHours = slaHours.length > 0 ? slaHours.reduce((a, b) => a + b, 0) / slaHours.length : null;
    const topRejectionReasons = [...reasonCounts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    let tracker: FormFlowSummary["tracker"];
    if (node.tracker) {
      const field = form.currentVersion.fields.find((f) => f.fieldCode === node.tracker!.fieldCode);
      const values = submissions
        .map((s) => s.answers.find((a) => a.fieldCode === node.tracker!.fieldCode)?.value)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));
      if (values.length > 0) {
        tracker = {
          label: node.tracker.label ?? `${AGGREGATION_LABELS[node.tracker.aggregation]} of ${field?.label ?? node.tracker.fieldCode}`,
          value: aggregate(values, node.tracker.aggregation),
          unit: field?.unit,
        };
      }
    }

    const stageId = node.sourceStageId ?? stageByFormTemplateId.get(formTemplateId);
    forms.push({
      formTemplateId,
      formName: form.name,
      stageId,
      stageName: stageId ? stageNameById.get(stageId) : undefined,
      total,
      approved,
      needsFix,
      pending,
      approvalRatePct,
      avgSlaHours,
      topRejectionReasons,
      tracker,
    });
  }

  const stageTotals = new Map<string, { pending: number; total: number; needsFix: number }>();
  for (const f of forms) {
    if (!f.stageId) continue;
    const entry = stageTotals.get(f.stageId) ?? { pending: 0, total: 0, needsFix: 0 };
    entry.pending += f.pending;
    entry.total += f.total;
    entry.needsFix += f.needsFix;
    stageTotals.set(f.stageId, entry);
  }
  const stageSummaries: StageFlowSummary[] = [...stageTotals.entries()].map(([stageId, t]) => ({
    stageId,
    stageName: stageNameById.get(stageId) ?? stageId,
    pending: t.pending,
    total: t.total,
    dropoffRatePct: t.total > 0 ? Math.round((t.needsFix / t.total) * 100) : null,
  }));

  const mostPendingStageId = stageSummaries.reduce<StageFlowSummary | undefined>(
    (best, s) => (s.pending > 0 && (!best || s.pending > best.pending) ? s : best),
    undefined
  )?.stageId;
  const mostDropoffStageId = stageSummaries
    .filter((s) => s.total > 0 && (s.dropoffRatePct ?? 0) > 0)
    .reduce<StageFlowSummary | undefined>((best, s) => (!best || (s.dropoffRatePct ?? 0) > (best.dropoffRatePct ?? 0) ? s : best), undefined)?.stageId;

  return { flowId: flow.id, flowName: flow.name, forms, stages: stageSummaries, mostPendingStageId, mostDropoffStageId };
}
