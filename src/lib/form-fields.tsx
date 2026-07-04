"use client";

import { LinkedRecordPicker } from "@/components/collect/LinkedRecordPicker";
import { PhotoCaptureField } from "@/components/collect/capture/PhotoCaptureField";
import { DocumentScanCaptureField } from "@/components/collect/capture/DocumentScanCaptureField";
import { SignatureCaptureField } from "@/components/collect/capture/SignatureCaptureField";
import { GeoPointCaptureField } from "@/components/collect/capture/GeoPointCaptureField";
import { GeoBoundaryCaptureField } from "@/components/collect/capture/GeoBoundaryCaptureField";
import type { EvidenceFile, FormFieldDefinition } from "@/types";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function encodeGeoPoint(point: GeoPoint): string {
  return JSON.stringify(point);
}

export function decodeGeoPoint(value: string): GeoPoint | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed?.lat === "number" && typeof parsed?.lng === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function encodeGeoBoundary(points: GeoPoint[]): string {
  return JSON.stringify(points);
}

export function decodeGeoBoundary(value: string): GeoPoint[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number") : [];
  } catch {
    return [];
  }
}

/** Shared between the Form Builder's Preview panel and the field Collect app so both render
 * exactly the same field behavior (visibility rules, input types) — one engine, two surfaces. */
export function isFieldVisible(field: FormFieldDefinition, allFields: FormFieldDefinition[], answers: Record<string, string>): boolean {
  const controllingRules = allFields.flatMap((f) => (f.visibilityRules ?? []).map((rule) => ({ rule, controllerCode: f.fieldCode })));
  const applicable = controllingRules.filter((entry) => entry.rule.thenShowFieldCodes.includes(field.fieldCode));
  if (applicable.length === 0) return true;
  return applicable.some(({ rule, controllerCode }) => String(answers[controllerCode] ?? "") === String(rule.equals));
}

export const fieldInputClass = "w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink";
export const fieldDisabledClass = "w-full rounded-md border border-dashed border-border-strong bg-sunken px-2.5 py-1.5 text-[13.5px] text-ink-soft";

export function renderFieldInput(
  field: FormFieldDefinition,
  value: string,
  onChange: (v: string) => void,
  onEvidence?: (file: EvidenceFile) => void,
  existingEvidence?: EvidenceFile[]
) {
  switch (field.fieldType) {
    case "short_text":
    case "single_select":
    case "multi_select":
      return <input value={value} onChange={(e) => onChange(e.target.value)} className={fieldInputClass} />;
    case "long_text":
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={fieldInputClass} />;
    case "number":
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={fieldInputClass} />;
    case "date":
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={fieldInputClass} />;
    case "datetime":
      return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={fieldInputClass} />;
    case "boolean":
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldInputClass}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "linked_record":
      return (
        <LinkedRecordPicker
          sourceFormTemplateId={field.linkedFormTemplateId}
          filter={field.linkedFilter}
          excludeClaimed={field.linkedExclusive}
          value={value}
          onChange={onChange}
        />
      );
    case "lookup_select":
      if (field.lookupSource?.kind === "internal_form") {
        return (
          <LinkedRecordPicker
            sourceFormTemplateId={field.lookupSource.sourceFormTemplateId}
            filter={field.lookupSource.filter}
            excludeClaimed={field.lookupSource.excludeAlreadyLinked}
            value={value}
            onChange={onChange}
          />
        );
      }
      return (
        <input
          disabled
          value={
            field.lookupSource?.kind === "device_telemetry"
              ? "Live device reading — not yet connected"
              : field.lookupSource?.kind === "external_db"
                ? "External database lookup — not yet connected"
                : "Not configured yet"
          }
          className={fieldDisabledClass}
        />
      );
    case "calculated_field":
      return <input disabled value="(computed automatically)" className={fieldDisabledClass} />;
    case "photo":
      return (
        <PhotoCaptureField
          value={value}
          onChange={onChange}
          onEvidence={onEvidence}
          existingFile={existingEvidence?.find((e) => e.id === value)}
        />
      );
    case "document_scan":
      return (
        <DocumentScanCaptureField
          value={value}
          onChange={onChange}
          onEvidence={onEvidence}
          existingFile={existingEvidence?.find((e) => e.id === value)}
        />
      );
    case "signature":
      return (
        <SignatureCaptureField
          value={value}
          onChange={onChange}
          onEvidence={onEvidence}
          existingFile={existingEvidence?.find((e) => e.id === value)}
        />
      );
    case "geo_point":
      return <GeoPointCaptureField value={value} onChange={onChange} />;
    case "geo_boundary":
      return <GeoBoundaryCaptureField value={value} onChange={onChange} />;
    default:
      return (
        <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border-strong bg-sunken text-[12px] text-ink-soft">
          {field.fieldType.replace(/_/g, " ")} — not yet supported for capture
        </div>
      );
  }
}

/** Label + input + helper text, the one field row both surfaces render identically. */
export function FieldRow({
  field,
  value,
  onChange,
  onEvidence,
  existingEvidence,
}: {
  field: FormFieldDefinition;
  value: string;
  onChange: (v: string) => void;
  onEvidence?: (file: EvidenceFile) => void;
  existingEvidence?: EvidenceFile[];
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-ink">
        {field.label}
        {field.isRequired && <span className="text-critical-text">*</span>}
        {field.unit && <span className="text-[11.5px] font-normal text-ink-soft">({field.unit})</span>}
      </label>
      {renderFieldInput(field, value, onChange, onEvidence, existingEvidence)}
      {field.helperText && <p className="mt-1 text-[12px] text-ink-soft">{field.helperText}</p>}
    </div>
  );
}
