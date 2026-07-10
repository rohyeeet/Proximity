export interface AnalyticsCard {
  key: string;
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
  tone?: "good" | "warn" | "critical" | "neutral";
}

export interface AnalyticsSeriesPoint {
  period: string;
  value: number;
}

export interface AnalyticsSeries {
  key: string;
  label: string;
  unit?: string;
  points: AnalyticsSeriesPoint[];
}

/** One form referenced by a form_step (or automation/document) node in the flow, rolled up from
 * that form's own submissions for the caller's organization. */
export interface FormFlowSummary {
  formTemplateId: string;
  formName: string;
  stageId?: string;
  stageName?: string;
  total: number;
  approved: number;
  needsFix: number;
  /** needs_check + on_hold + draft — anything still awaiting a decision. */
  pending: number;
  approvalRatePct: number | null;
  /** Avg hours from first submission to its first "approved" review action. */
  avgSlaHours: number | null;
  topRejectionReasons: { reason: string; count: number }[];
  tracker?: { label: string; value: number; unit?: string };
}

/** Roll-up of every FormFlowSummary that belongs to one Stage (via the flow node's own
 * sourceStageId, or a Stage.formTemplateIds fallback for hand-added nodes). */
export interface StageFlowSummary {
  stageId: string;
  stageName: string;
  pending: number;
  total: number;
  /** needsFix / total across the stage's forms in this flow — null when total is 0. */
  dropoffRatePct: number | null;
}

export interface FlowSummary {
  flowId: string;
  flowName: string;
  forms: FormFlowSummary[];
  stages: StageFlowSummary[];
  mostPendingStageId?: string;
  mostDropoffStageId?: string;
}
