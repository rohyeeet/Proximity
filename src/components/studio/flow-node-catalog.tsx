import { PlayCircle, FileText, GitBranch, CheckCircle2, RotateCcw, Zap, GitFork, Clock, FileSignature, Flag, type LucideIcon } from "lucide-react";
import type { FlowNodeType } from "@/types";

export interface FlowNodeMeta {
  type: FlowNodeType;
  label: string;
  icon: LucideIcon;
  className: string;
  paletteHint: string;
}

export const flowNodeCatalog: FlowNodeMeta[] = [
  { type: "start", label: "Start", icon: PlayCircle, className: "border-brand-600 bg-brand-600 text-white", paletteHint: "Marks where the process begins" },
  { type: "form_step", label: "Form step", icon: FileText, className: "border-border-strong bg-surface", paletteHint: "Submitter fills a form" },
  { type: "branch", label: "Branch", icon: GitBranch, className: "border-warn-text/50 bg-warn-bg", paletteHint: "Splits into conditional paths" },
  { type: "review_gate", label: "Review gate", icon: CheckCircle2, className: "border-brand-500/60 bg-brand-50", paletteHint: "Reviewer approves or returns" },
  { type: "correction_loop", label: "Correction loop", icon: RotateCcw, className: "border-critical-text/50 bg-critical-bg", paletteHint: "Resubmission re-entry point" },
  { type: "automation", label: "Automation", icon: Zap, className: "border-hold-text/40 bg-hold-bg", paletteHint: "Connector-fed, runs automatically" },
  { type: "parallel_group", label: "Parallel group", icon: GitFork, className: "border-brand-500/40 bg-surface", paletteHint: "Fan out concurrent steps" },
  { type: "wait", label: "Wait", icon: Clock, className: "border-hold-text/40 bg-surface", paletteHint: "Pause until a condition or timer" },
  { type: "document", label: "Document", icon: FileSignature, className: "border-good-text/50 bg-good-bg", paletteHint: "Auto-generated document/report" },
  { type: "milestone", label: "Milestone", icon: Flag, className: "border-ink bg-ink text-white", paletteHint: "Marks the cycle closeable" },
];

export const flowNodeMetaByType: Record<FlowNodeType, FlowNodeMeta> = flowNodeCatalog.reduce(
  (acc, meta) => ({ ...acc, [meta.type]: meta }),
  {} as Record<FlowNodeType, FlowNodeMeta>
);

/** What logically tends to follow a node of this type — surfaced in the inspector as one-click "suggested next step" buttons. */
export const suggestedNextTypes: Record<FlowNodeType, FlowNodeType[]> = {
  start: ["form_step"],
  form_step: ["review_gate", "branch", "automation", "form_step"],
  branch: ["form_step", "review_gate", "automation"],
  review_gate: ["correction_loop", "document", "form_step", "milestone"],
  correction_loop: ["form_step"],
  automation: ["form_step", "document", "milestone"],
  parallel_group: ["form_step"],
  wait: ["form_step", "automation"],
  document: ["milestone", "form_step"],
  milestone: [],
};
