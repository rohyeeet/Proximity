export type ReviewStatus = "draft" | "needs_check" | "approved" | "needs_fix" | "on_hold";
export type SyncStatus = "saved_offline" | "ready_to_sync" | "synced" | "sync_failed";
export type ReviewOutcome = "approved" | "returned_for_correction" | "escalated";

export interface EvidenceGeoTag {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  kind: "photo" | "document_scan" | "gps_log" | "signature";
  smartCheckSummary?: string;
  /** Real hosted location (Vercel Blob) — undefined only for pre-existing seed/mock evidence rows. */
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  capturedAt?: string;
  /** Best-effort — attached when the browser granted location permission at capture time. */
  geo?: EvidenceGeoTag;
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

/** A single flagged answer within a "returned for correction" review action — lets a reviewer
 * point at exactly which cells are wrong instead of only leaving one whole-record reason. */
export interface FieldFlag {
  fieldCode: string;
  remark: string;
}

export interface ReviewActionRecord {
  id: string;
  outcome: ReviewOutcome;
  reason?: string;
  guidance?: string;
  fieldFlags?: FieldFlag[];
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
