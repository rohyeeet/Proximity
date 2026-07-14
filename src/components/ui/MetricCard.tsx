import { cn } from "@/lib/utils";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { AnalyticsCard } from "@/types";

const toneTextClasses: Record<string, string> = {
  good: "text-good-text",
  warn: "text-warn-text",
  critical: "text-critical-text",
  neutral: "text-ink-soft",
};

const deltaDirectionClasses: Record<"up" | "down" | "flat", string> = {
  up: "text-good-text",
  down: "text-critical-text",
  flat: "text-ink-soft",
};

export function MetricCard({ card }: { card: AnalyticsCard }) {
  const TrendIcon = card.trend === "up" ? ArrowUp : card.trend === "down" ? ArrowDown : ArrowRight;
  const DeltaIcon = card.delta?.direction === "up" ? ArrowUp : card.delta?.direction === "down" ? ArrowDown : ArrowRight;
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <p className="text-xs font-medium text-ink-soft">{card.label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="tabular text-2xl font-semibold text-ink">{card.value}</span>
        {card.trend && (
          <TrendIcon className={cn("size-3.5", toneTextClasses[card.tone ?? "neutral"])} strokeWidth={2.5} />
        )}
      </div>
      {card.delta && (
        <p className={cn("mt-1 flex items-center gap-1 text-[11.5px] font-medium", deltaDirectionClasses[card.delta.direction])}>
          <DeltaIcon className="size-3" strokeWidth={2.5} />
          {card.delta.label}
        </p>
      )}
    </div>
  );
}
