export type ReviewStatus = "draft" | "needs_check" | "approved" | "needs_fix" | "on_hold";
export type SyncStatus = "saved_offline" | "ready_to_sync" | "synced" | "sync_failed";
export type ReviewOutcome = "approved" | "returned_for_correction" | "escalated";

export interface EvidenceFile {
  id: string;
  fileName: string;
  kind: "photo" | "document_scan" | "gps_log" | "signature";
  smartCheckSummary?: string;
}

export interface SubmissionAnswer {
  fieldCode: string;
  value: string | number | boolean | null;
}

export interface SubmissionVersionRecord {
  versionNo: number;
  answers: SubmissionAnswer[];
  createdAt: string;
  createdByUserId: string;
  reason?: string;
}

export interface ReviewActionRecord {
  id: string;
  outcome: ReviewOutcome;
  reason?: string;
  guidance?: string;
  reviewerUserId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  displayId: string;
  formTemplateId: string;
  formTemplateVersionNo: number;
  flowNodeLabel: string;
  reviewStatus: ReviewStatus;
  syncStatus: SyncStatus;
  submittedByUserId: string;
  currentVersionNo: number;
  updatedAt: string;
  answers: SubmissionAnswer[];
  evidence: EvidenceFile[];
  versions: SubmissionVersionRecord[];
  reviewActions: ReviewActionRecord[];
  linkedSubmissionIds?: string[];
  smartCheckSummary: string;
  isTest?: boolean;
}
