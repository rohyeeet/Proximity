import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FlowSummary } from "@/types";

const DOT_TONE_CLASSES = {
  good: "bg-good-text",
  warn: "bg-warn-text",
  critical: "bg-critical-text",
} as const;

function firstFormIdForStage(summary: FlowSummary, stageId: string): string | undefined {
  return summary.forms.find((f) => f.stageId === stageId)?.formTemplateId;
}

/** A compact vertical pipeline view of a flow's stages, in sequence — Cula/Carbonfuture-style,
 * complementing FlowSummaryTable's per-form table with an at-a-glance read of where the flow's
 * volume actually is right now. Every number is the same live StageFlowSummary data the table
 * uses, just read top-to-bottom instead of row-by-row. */
export function StageTracker({ summary }: { summary: FlowSummary }) {
  if (summary.stages.length === 0) return null;

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface px-4 py-3.5">
      {summary.stages.map((stage, i) => {
        const isDropoff = stage.stageId === summary.mostDropoffStageId;
        const isBottleneck = stage.stageId === summary.mostPendingStageId;
        const tone = isDropoff ? "critical" : isBottleneck ? "warn" : "good";
        const href = firstFormIdForStage(summary, stage.stageId);

        return (
          <div key={stage.stageId} className="relative flex gap-3 pb-5 last:pb-0">
            {i < summary.stages.length - 1 && <span className="absolute left-[4.5px] top-3 h-full w-px bg-border" />}
            <span className={cn("relative z-10 mt-1 size-2.5 shrink-0 rounded-full", DOT_TONE_CLASSES[tone])} />
            <div className="min-w-0 flex-1">
              {href ? (
                <Link href={`/records/${href}`} className="text-[13.5px] font-medium text-ink hover:underline">
                  {stage.stageName}
                </Link>
              ) : (
                <p className="text-[13.5px] font-medium text-ink">{stage.stageName}</p>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-soft">
                <span className="tabular">{stage.total} total</span>
                {stage.pending > 0 && <span className={cn("tabular", isBottleneck && "font-medium text-warn-text")}>{stage.pending} pending</span>}
                {stage.dropoffRatePct !== null && (
                  <span className={cn("tabular", isDropoff && "font-medium text-critical-text")}>{stage.dropoffRatePct}% returned</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
