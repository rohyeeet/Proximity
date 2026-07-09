"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { decodeGeoBoundary, decodeGeoPoint } from "@/lib/form-fields";
import { isAnswerEmpty } from "@/lib/validation-table";
import type { FieldFlag, FormFieldDefinition, Submission } from "@/types";

/** A short, type-aware preview of an answer for the flag list — raw evidence ids/JSON point
 * arrays aren't meaningful to a reviewer deciding what to flag. */
function previewAnswer(
  field: FormFieldDefinition,
  value: Submission["answers"][number]["value"] | undefined,
  evidenceById: Map<string, Submission["evidence"][number]>
) {
  if (isAnswerEmpty(value)) return "—";
  switch (field.fieldType) {
    case "photo":
    case "document_scan":
    case "signature":
      return evidenceById.get(String(value))?.fileName ?? "Attached file";
    case "geo_point":
      return decodeGeoPoint(String(value)) ? "Location captured" : "—";
    case "geo_boundary": {
      const points = decodeGeoBoundary(String(value));
      return points.length > 0 ? `Boundary (${points.length} points)` : "—";
    }
    default:
      return String(value);
  }
}

/** Reviewer's "mark incorrect" flow for one row: pick which specific answers are wrong and leave a
 * remark per one, instead of only a single whole-record reason. Same fixed slide-over pattern as
 * the Studio guide drawer (KnowledgeDrawer) — an inline panel, not a separate page/route. */
export function FieldFlagDrawer({
  submission,
  fields,
  onClose,
  onSubmit,
}: {
  submission: Submission;
  fields: FormFieldDefinition[];
  onClose: () => void;
  onSubmit: (payload: { reason: string; guidance?: string; fieldFlags: FieldFlag[] }) => Promise<void>;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const suggestedReason = useMemo(() => {
    const labels = fields.filter((f) => checked.has(f.fieldCode)).map((f) => f.label);
    if (labels.length === 0) return "";
    return `Incorrect: ${labels.join(", ")}`;
  }, [checked, fields]);

  const effectiveReason = reasonTouched ? reason : suggestedReason;
  const fieldFlags: FieldFlag[] = fields
    .filter((f) => checked.has(f.fieldCode) && remarks[f.fieldCode]?.trim())
    .map((f) => ({ fieldCode: f.fieldCode, remark: remarks[f.fieldCode]!.trim() }));
  const canSubmit = fieldFlags.length > 0 && effectiveReason.trim() !== "" && !submitting;
  const answersByCode = useMemo(() => new Map(submission.answers.map((a) => [a.fieldCode, a.value])), [submission.answers]);
  const evidenceById = useMemo(() => new Map(submission.evidence.map((e) => [e.id, e])), [submission.evidence]);

  function toggle(fieldCode: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(fieldCode)) next.delete(fieldCode);
      else next.add(fieldCode);
      return next;
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({ reason: effectiveReason.trim(), guidance: guidance.trim() || undefined, fieldFlags });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-[440px] flex-col border-l border-border bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold text-ink">Mark incorrect</p>
            <p className="text-[12px] text-ink-soft">{submission.displayId}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sunken hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-3 text-[12px] text-ink-soft">Select every answer that&apos;s wrong and explain what needs fixing.</p>
          <div className="flex flex-col divide-y divide-border">
            {fields.map((field) => {
              const answer = answersByCode.get(field.fieldCode);
              const isChecked = checked.has(field.fieldCode);
              return (
                <div key={field.id} className="py-2.5">
                  <label className="flex items-start gap-2.5">
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(field.fieldCode)} className="mt-0.5 size-3.5" />
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-ink">{field.label}</p>
                      <p className="text-[12px] text-ink-soft">{previewAnswer(field, answer, evidenceById)}</p>
                    </div>
                  </label>
                  {isChecked && (
                    <textarea
                      value={remarks[field.fieldCode] ?? ""}
                      onChange={(e) => setRemarks((prev) => ({ ...prev, [field.fieldCode]: e.target.value }))}
                      placeholder="What's wrong with this answer?"
                      rows={2}
                      className="mt-2 w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3.5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Reason</label>
            <input
              value={effectiveReason}
              onChange={(e) => {
                setReasonTouched(true);
                setReason(e.target.value);
              }}
              placeholder="What's wrong with this record?"
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Guidance for the submitter (optional)</label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={submit} disabled={!canSubmit}>
              {submitting ? "Sending…" : "Send back"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
