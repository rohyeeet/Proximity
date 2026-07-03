import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { flowNodeMetaByType } from "./flow-node-catalog";
import type { FlowNodeType } from "@/types";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: FlowNodeType;
  detail?: string;
  unlinked?: boolean;
  /** Owned by the stage-sync engine — rendered with a small link badge. */
  fromStage?: boolean;
}

const handleClasses =
  "!size-3.5 !border-2 !border-border-strong !bg-surface transition-transform hover:!scale-125 hover:!border-brand-500";

export function FlowNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as FlowNodeData;
  const meta = flowNodeMetaByType[nodeData.nodeType];
  const Icon = meta.icon;
  const isInverted = nodeData.nodeType === "milestone" || nodeData.nodeType === "start";

  return (
    <div
      className={cn(
        "w-[260px] rounded-lg border px-4 py-3 shadow-sm transition-shadow",
        meta.className,
        selected && "ring-2 ring-brand-500 ring-offset-2 ring-offset-sunken"
      )}
    >
      {nodeData.nodeType !== "start" && (
        <Handle type="target" position={Position.Left} className={handleClasses} />
      )}
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4 shrink-0", isInverted ? "text-white" : "text-ink-soft")} strokeWidth={2} />
        <p className={cn("truncate text-[11.5px] font-medium uppercase tracking-wide", isInverted ? "text-white/80" : "text-ink-soft")}>
          {meta.label}
        </p>
        {nodeData.fromStage && (
          <span className="ml-auto" title="Synced from a stage">
            <Link2 className="size-3.5 shrink-0 text-brand-600" />
          </span>
        )}
        {nodeData.unlinked && <span className="ml-auto size-2 shrink-0 rounded-full bg-warn-text" title="Not linked to a form yet" />}
      </div>
      <p className={cn("mt-1.5 text-[14px] font-medium leading-snug", isInverted ? "text-white" : "text-ink")}>{nodeData.label}</p>
      {nodeData.detail && <p className={cn("mt-0.5 text-[12px]", isInverted ? "text-white/70" : "text-ink-soft")}>{nodeData.detail}</p>}
      {nodeData.nodeType !== "milestone" && (
        <Handle type="source" position={Position.Right} className={handleClasses} />
      )}
    </div>
  );
}
