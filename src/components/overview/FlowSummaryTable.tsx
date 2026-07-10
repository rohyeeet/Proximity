import Link from "next/link";
import { AlertOctagon, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FlowSummary } from "@/types";

function formatSlaHours(hours: number | null): string {
  if (hours === null) return "—";
  return hours < 24 ? `${hours.toFixed(1)} hrs` : `${(hours / 24).toFixed(1)} days`;
}

function formatTracker(tracker: FlowSummary["forms"][number]["tracker"]): string {
  if (!tracker) return "—";
  const rounded = Number.isInteger(tracker.value) ? tracker.value : Number(tracker.value.toFixed(1));
  return `${tracker.label}: ${rounded.toLocaleString()}${tracker.unit ? ` ${tracker.unit}` : ""}`;
}

function firstFormIdForStage(summary: FlowSummary, stageId: string): string | undefined {
  return summary.forms.find((f) => f.stageId === stageId)?.formTemplateId;
}

/** The Overview page's per-form/per-stage roll-up — SLA, rejection reasons, accept/reject/pending,
 * which stage is the current bottleneck, and which stage has the highest drop-off rate. Computed
 * live server-side (see src/lib/analytics.ts's getFlowSummary) from this org's own submissions
 * against the forms the active flow actually references — never every form in the domain pack. */
export function FlowSummaryTable({ summary }: { summary: FlowSummary }) {
  if (summary.forms.length === 0) {
    return (
      <EmptyState
        title="No forms in this flow yet"
        description="Link a form to a node in Flow Studio to see its SLA, rejection reasons, and pending/approved breakdown here."
      />
    );
  }

  const mostPendingStage = summary.stages.find((s) => s.stageId === summary.mostPendingStageId);
  const mostDropoffStage = summary.stages.find((s) => s.stageId === summary.mostDropoffStageId);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {(mostPendingStage || mostDropoffStage) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mostPendingStage && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <Clock className="size-5 shrink-0 text-hold-text" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-soft">Most pending — current bottleneck</p>
                  <Link
                    href={`/records/${firstFormIdForStage(summary, mostPendingStage.stageId)}`}
                    className="truncate text-[13.5px] font-semibold text-ink hover:underline"
                  >
                    {mostPendingStage.stageName} · {mostPendingStage.pending} waiting
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
          {mostDropoffStage && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <AlertOctagon className="size-5 shrink-0 text-critical-text" strokeWidth={2} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-soft">Most drop-off</p>
                  <Link
                    href={`/records/${firstFormIdForStage(summary, mostDropoffStage.stageId)}`}
                    className="truncate text-[13.5px] font-semibold text-ink hover:underline"
                  >
                    {mostDropoffStage.stageName} · {mostDropoffStage.dropoffRatePct}% returned
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-max border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {["Form", "Stage", "Approved / Pending / Rejected", "Approval rate", "Avg. SLA", "Top rejection reason", "Tracker"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-sunken px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.forms.map((form) => (
              <tr key={form.formTemplateId}>
                <td className="px-4 py-3">
                  <Link href={`/records/${form.formTemplateId}`} className="font-medium text-ink hover:underline">
                    {form.formName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{form.stageName ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusChip label={String(form.approved)} tone="good" />
                    <StatusChip label={String(form.pending)} tone="hold" />
                    <StatusChip label={String(form.needsFix)} tone="critical" />
                  </div>
                </td>
                <td className="tabular px-4 py-3 text-ink">{form.approvalRatePct === null ? "—" : `${form.approvalRatePct}%`}</td>
                <td className="tabular px-4 py-3 text-ink">{formatSlaHours(form.avgSlaHours)}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-ink-soft" title={form.topRejectionReasons.map((r) => `${r.reason} (${r.count})`).join(", ")}>
                  {form.topRejectionReasons.length === 0
                    ? "—"
                    : `${form.topRejectionReasons[0]!.reason}${form.topRejectionReasons.length > 1 ? ` +${form.topRejectionReasons.length - 1} more` : ""}`}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-ink-soft" title={formatTracker(form.tracker)}>
                  {formatTracker(form.tracker)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
