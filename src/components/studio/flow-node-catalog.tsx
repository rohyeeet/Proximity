import { PlayCircle, FileText, GitBranch, CheckCircle2, RotateCcw, Zap, GitFork, Clock, FileSignature, Flag, Banknote, type LucideIcon } from "lucide-react";
import type { FlowNodeType } from "@/types";

export interface FlowNodeMeta {
  type: FlowNodeType;
  label: string;
  icon: LucideIcon;
  className: string;
  /** Short — shown in the collapsed palette's tooltip. */
  paletteHint: string;
  /** Fuller, with a concrete example — shown as visible text in the expanded palette and the node inspector. */
  description: string;
}

export const flowNodeCatalog: FlowNodeMeta[] = [
  {
    type: "start",
    label: "Start",
    icon: PlayCircle,
    className: "border-brand-600 bg-brand-600 text-white",
    paletteHint: "Marks where the process begins",
    description: "The single entry point of the flow — nothing should point into it. Every flow should have exactly one.",
  },
  {
    type: "form_step",
    label: "Form step",
    icon: FileText,
    className: "border-border-strong bg-surface",
    paletteHint: "Submitter fills a form",
    description: "A person fills out a linked form. Example: \"Feedstock Source Survey\", where a field agent logs where the biomass came from.",
  },
  {
    type: "branch",
    label: "Branch",
    icon: GitBranch,
    className: "border-warn-text/50 bg-warn-bg",
    paletteHint: "Splits into conditional paths",
    description: "Splits into two or more paths based on a rule. Example: routing to \"Reprocessing\" only when a Sampling form's contamination_flag is true.",
  },
  {
    type: "review_gate",
    label: "Review gate",
    icon: CheckCircle2,
    className: "border-brand-500/60 bg-brand-50",
    paletteHint: "Reviewer approves or returns",
    description: "A reviewer approves the previous step or sends it back. Example: \"Facility Manager Check\", where a supervisor signs off on a survey.",
  },
  {
    type: "correction_loop",
    label: "Correction loop",
    icon: RotateCcw,
    className: "border-critical-text/50 bg-critical-bg",
    paletteHint: "Resubmission re-entry point",
    description: "Where a rejected submission goes to be fixed and resent. Example: \"Reopen Feedstock Source\", fed by a correction edge from a review gate.",
  },
  {
    type: "automation",
    label: "Automation",
    icon: Zap,
    className: "border-hold-text/40 bg-hold-bg",
    paletteHint: "Connector-fed, runs automatically",
    description: "Runs on its own, usually fed by a connector (a device or external system) — no person fills anything out. Example: a sensor reading refreshed automatically.",
  },
  {
    type: "parallel_group",
    label: "Parallel group",
    icon: GitFork,
    className: "border-brand-500/40 bg-surface",
    paletteHint: "Fan out concurrent steps",
    description: "Marks steps that happen at the same time, not one after another. Example: lab testing and dispatch paperwork proceeding together after a batch is produced.",
  },
  {
    type: "wait",
    label: "Wait",
    icon: Clock,
    className: "border-hold-text/40 bg-surface",
    paletteHint: "Pause until a condition or timer",
    description: "Pauses the flow until a condition or timer is met. Example: holding a batch for a 48-hour curing period before sampling can begin.",
  },
  {
    type: "document",
    label: "Document",
    icon: FileSignature,
    className: "border-good-text/50 bg-good-bg",
    paletteHint: "Auto-generated document/report",
    description: "An auto-generated report or certificate, usually right before a milestone. Example: a Certificate of Analysis generated once Lab COA is approved.",
  },
  {
    type: "payment_step",
    label: "Payment step",
    icon: Banknote,
    className: "border-good-text/50 bg-good-bg",
    paletteHint: "Releases a milestone payment",
    description: "Wires the flow to one of the project's milestone templates and its live escrow ledger. Example: \"Achievement payout\", releasing 40% of the deal once a Production Batch form is approved. The % and who-gets-paid split are set once in Payments — not here.",
  },
  {
    type: "milestone",
    label: "Milestone",
    icon: Flag,
    className: "border-ink bg-ink text-white",
    paletteHint: "Marks the cycle closeable",
    description: "Marks the point the cycle is complete. Example: \"Cycle closeable\" — the last box, with nothing coming out of it.",
  },
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
  review_gate: ["correction_loop", "document", "payment_step", "form_step", "milestone"],
  correction_loop: ["form_step"],
  automation: ["form_step", "document", "milestone"],
  parallel_group: ["form_step"],
  wait: ["form_step", "automation"],
  document: ["payment_step", "milestone", "form_step"],
  payment_step: ["milestone"],
  milestone: [],
};
