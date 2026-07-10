export type FlowNodeType =
  | "start"
  | "form_step"
  | "branch"
  | "review_gate"
  | "correction_loop"
  | "automation"
  | "parallel_group"
  | "wait"
  | "document"
  | "milestone";

export type TrackerAggregation = "sum" | "avg" | "min" | "max";

/** Defines a live operational metric to roll up for this node's linked form — e.g. total tonnage
 * processed, average facility capacity. Restricted to "number" fields (see field-type-catalog);
 * computed from that form's own submissions, not stored/cached. */
export interface FlowNodeTracker {
  fieldCode: string;
  aggregation: TrackerAggregation;
  /** Optional override — default label is "<AGG> of <field label>". */
  label?: string;
}

export interface FlowNodeDefinition {
  id: string;
  nodeType: FlowNodeType;
  label: string;
  detail?: string;
  position: { x: number; y: number };
  formTemplateId?: string;
  assignedRoleTier?: string;
  /** Set only on nodes owned by the stage-sync engine — one per (stage, form) pair. */
  sourceStageId?: string;
  tracker?: FlowNodeTracker;
}

export type FlowConditionOperator = "equals" | "not_equals" | "greater_than" | "less_than";

export interface FlowEdgeCondition {
  fieldCode: string;
  operator: FlowConditionOperator;
  value: string;
}

export interface FlowEdgeDefinition {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  conditionLabel?: string;
  kind: "sequential" | "parallel" | "conditional" | "correction";
  /** Structured rule backing a "conditional" edge — evaluated against the upstream linked form's fields. */
  condition?: FlowEdgeCondition;
  /** Set only on the plain sequential edges the stage-sync engine draws between backbone nodes. */
  auto?: boolean;
}

export type FlowRunStatus = "not_started" | "in_progress" | "blocked" | "completed";

export interface FlowTemplate {
  id: string;
  domainPackId: string;
  code: string;
  name: string;
  status: "draft" | "published";
  versionNo: number;
  triggerLabel: string;
  nodes: FlowNodeDefinition[];
  edges: FlowEdgeDefinition[];
}

export interface FlowRunSummary {
  id: string;
  flowTemplateId: string;
  projectName: string;
  status: FlowRunStatus;
  progressPct: number;
  blockedNodeLabel?: string;
}
