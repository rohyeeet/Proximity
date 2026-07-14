"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { isFieldVisible, FieldRow } from "@/lib/form-fields";
import type { EvidenceFile, FormFieldDefinition } from "@/types";

export function CollectFormClient({
  formId,
  formName,
  formDescription,
  fields,
  initialAnswers,
  initialEvidence,
  resubmitSubmissionId,
  projectId,
}: {
  formId: string;
  formName: string;
  formDescription: string;
  fields: FormFieldDefinition[];
  initialAnswers: Record<string, string>;
  initialEvidence?: EvidenceFile[];
  resubmitSubmissionId?: string;
  /** Which project's flow this form was reached from — set by the Collect home page's assigned-
   * work links, since a form can appear in more than one project's flow. */
  projectId?: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [evidence, setEvidence] = useState<EvidenceFile[]>(initialEvidence ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addEvidence(file: EvidenceFile) {
    setEvidence((prev) => [...prev.filter((e) => e.id !== file.id), file]);
  }

  const visibleFields = useMemo(
    () =>
      fields
        .filter((field) => isFieldVisible(field, fields, answers))
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fields, answers]
  );

  const missingRequired = visibleFields.filter((f) => f.isRequired && !String(answers[f.fieldCode] ?? "").trim());

  async function handleSubmit() {
    if (missingRequired.length > 0) {
      setError(`Please fill in: ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = visibleFields.map((field) => ({ fieldCode: field.fieldCode, value: answers[field.fieldCode] ?? null }));
      const usedEvidenceIds = new Set(payload.map((a) => a.value));
      const url = resubmitSubmissionId ? `/api/submissions/${resubmitSubmissionId}/resubmit` : `/api/forms/${formId}/collect`;
      const res = await fetch(url, {
        method: resubmitSubmissionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, evidence: evidence.filter((e) => usedEvidenceIds.has(e.id)), projectId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Something went wrong submitting this form. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong submitting this form. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-8 text-center">
        <CheckCircle2 className="size-10 text-good-text" />
        <p className="text-[15px] font-semibold text-ink">
          {resubmitSubmissionId ? "Resubmitted for review" : "Submitted"}
        </p>
        <p className="text-[13px] text-ink-soft">
          {resubmitSubmissionId
            ? "Your corrected answers have been sent back to the reviewer."
            : "Your response has been recorded and is awaiting review."}
        </p>
        <div className="mt-3 flex w-full flex-col gap-2">
          <Button variant="primary" onClick={() => router.push("/collect/submissions")} className="w-full justify-center">
            View my submissions
          </Button>
          <Button variant="secondary" onClick={() => router.push("/collect")} className="w-full justify-center">
            Back to forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/collect" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-ink">{formName}</h1>
        {formDescription && <p className="text-[13px] text-ink-soft">{formDescription}</p>}
        {resubmitSubmissionId && (
          <p className="mt-2 rounded-md border border-warn-text/30 bg-warn-bg px-2.5 py-1.5 text-[12.5px] text-warn-text">
            Fixing a returned submission — your previous answers are pre-filled.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
        {visibleFields.length === 0 && <p className="text-sm text-ink-soft">This form has no fields yet.</p>}
        {visibleFields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            value={answers[field.fieldCode] ?? ""}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [field.fieldCode]: v }))}
            onEvidence={addEvidence}
            existingEvidence={evidence}
          />
        ))}
      </div>

      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      {visibleFields.length > 0 && (
        <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="justify-center">
          {submitting ? "Submitting…" : resubmitSubmissionId ? "Resubmit" : "Submit"}
        </Button>
      )}
    </div>
  );
}
