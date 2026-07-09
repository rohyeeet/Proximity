/**
 * Builds the column model for the row-wise validation table: one column per question that has
 * ever existed on any version of a form, so records submitted under an older or newer schema
 * still line up in the same table instead of needing a separate screen per version.
 */
import type { FormFieldDefinition, FormTemplateVersion, Submission } from "@/types";

export interface ValidationColumn {
  field: FormFieldDefinition;
  /** Earliest version (among the ones we actually have a snapshot for) this fieldCode appeared on. */
  introducedAtVersionNo: number;
  /** False once the field has been removed from the form's current version — hidden by default. */
  presentInLatestVersion: boolean;
}

export type CellState = { kind: "not_collected" } | { kind: "value"; field: FormFieldDefinition };

/** Shared "no real answer" check — used consistently wherever an answer value is rendered or
 * checked for presence, so the grid and the flag drawer never disagree on what counts as empty. */
export function isAnswerEmpty(value: unknown): boolean {
  return value === "" || value === undefined || value === null;
}

export interface ValidationColumnModel {
  columns: ValidationColumn[];
  /** The oldest version we actually have a field-set snapshot for. Historical `FormTemplateVersion`
   * rows are only ever created going forward from a real Studio publish — a submission pinned to a
   * version older than this predates any snapshot we can compare against, so we can't tell whether
   * a given field existed for it. Treat that case as "unknown", not as proof the field is missing. */
  earliestKnownVersionNo: number;
}

/** Union of fields across every version we have a snapshot for, ordered by the latest version's
 * field order first, then any removed fields appended in the order they were first introduced. */
export function buildValidationColumns(versions: FormTemplateVersion[]): ValidationColumnModel {
  const sorted = [...versions].sort((a, b) => a.versionNo - b.versionNo);
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];
  const latestFieldCodes = new Set((latest?.fields ?? []).map((f) => f.fieldCode));

  const introducedAt = new Map<string, number>();
  const latestDefinitionByCode = new Map<string, FormFieldDefinition>();
  for (const version of sorted) {
    for (const field of version.fields) {
      if (!introducedAt.has(field.fieldCode)) introducedAt.set(field.fieldCode, version.versionNo);
      latestDefinitionByCode.set(field.fieldCode, field);
    }
  }

  const columns: ValidationColumn[] = [...latestDefinitionByCode.entries()].map(([fieldCode, field]) => ({
    field,
    introducedAtVersionNo: introducedAt.get(fieldCode) ?? latest?.versionNo ?? 1,
    presentInLatestVersion: latestFieldCodes.has(fieldCode),
  }));

  const currentOrder = new Map((latest?.fields ?? []).map((f) => [f.fieldCode, f.sortOrder]));
  columns.sort((a, b) => {
    if (a.presentInLatestVersion !== b.presentInLatestVersion) return a.presentInLatestVersion ? -1 : 1;
    if (a.presentInLatestVersion) return (currentOrder.get(a.field.fieldCode) ?? 0) - (currentOrder.get(b.field.fieldCode) ?? 0);
    return a.introducedAtVersionNo - b.introducedAtVersionNo;
  });

  return { columns, earliestKnownVersionNo: earliest?.versionNo ?? 1 };
}

/** Whether a cell should show "not collected" (question didn't exist yet at this record's pinned
 * version) or the record's actual answer for that question. A submission pinned to a version older
 * than any snapshot we have is rendered normally instead — we have no basis to null it out. */
export function resolveCell(column: ValidationColumn, submission: Submission, earliestKnownVersionNo: number): CellState {
  if (submission.formTemplateVersionNo < earliestKnownVersionNo) return { kind: "value", field: column.field };
  if (submission.formTemplateVersionNo < column.introducedAtVersionNo) return { kind: "not_collected" };
  return { kind: "value", field: column.field };
}
