export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "single_select"
  | "multi_select"
  | "geo_point"
  | "geo_boundary"
  | "photo"
  | "document_scan"
  | "signature"
  | "repeat_group"
  | "lookup_select"
  | "linked_record"
  | "calculated_field";

export type LookupSourceKind = "internal_form" | "external_db" | "device_telemetry";

export type ValidationOutcome = "pass" | "warning" | "hard_stop" | "send_to_review";

export interface ValidationRule {
  id: string;
  label: string;
  kind:
    | "required"
    | "range"
    | "regex"
    | "reconciliation"
    | "image_quality"
    | "ocr_confidence"
    | "duplicate_check"
    | "spatial";
  outcome: ValidationOutcome;
  detail: string;
  /** kind: "range" */
  min?: number;
  max?: number;
  /** kind: "regex" */
  pattern?: string;
  /** kind: "reconciliation" — cross-field check against another field on this form */
  referenceFieldCode?: string;
  tolerancePct?: number;
  /** kind: "duplicate_check" — fields whose combined values must be unique */
  matchFieldCodes?: string[];
}

export interface VisibilityRule {
  id: string;
  whenFieldCode: string;
  equals: string | number | boolean;
  thenShowFieldCodes: string[];
}

export type LinkFilterOperator = "equals" | "not_equals" | "contains";

/** A column-level "where" clause narrowing which rows/records a link is allowed to resolve against. */
export interface LinkFilter {
  fieldCode: string;
  operator: LinkFilterOperator;
  value: string;
}

export interface LookupSource {
  kind: LookupSourceKind;
  label: string;
  sourceFormTemplateId?: string;
  /** kind: "internal_form" — which field (column) of the source form to surface as the lookup value */
  sourceFieldCode?: string;
  /** kind: "internal_form" — narrows which of the source form's records are eligible, e.g. status = approved */
  filter?: LinkFilter;
  deviceId?: string;
  telemetryParameterCode?: string;
  refreshSeconds?: number;
  /** kind: "external_db" — since there's no live schema to browse, table/column are named directly */
  externalTable?: string;
  externalColumn?: string;
}

export interface FormFieldDefinition {
  id: string;
  fieldCode: string;
  label: string;
  helperText?: string;
  fieldType: FieldType;
  unit?: string;
  isRequired: boolean;
  sortOrder: number;
  lookupSource?: LookupSource;
  linkedFormTemplateId?: string;
  /** linked_record only — narrows which records of the linked entity are eligible, e.g. batch_status = approved */
  linkedFilter?: LinkFilter;
  validations: ValidationRule[];
  visibilityRules?: VisibilityRule[];
  visibleToRoleTiers?: string[];
}

export interface FormTemplateVersion {
  versionNo: number;
  status: "draft" | "published";
  publishedAt: string | null;
  fields: FormFieldDefinition[];
}

export interface FormTemplate {
  id: string;
  domainPackId: string;
  code: string;
  name: string;
  description: string;
  category: string;
  currentVersion: FormTemplateVersion;
  submissionCount: number;
  needsCheckCount: number;
  needsFixCount: number;
}
