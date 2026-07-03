"use client";

import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { FormFieldDefinition, FormTemplate, Submission } from "@/types";

function isFieldVisible(field: FormFieldDefinition, allFields: FormFieldDefinition[], answers: Record<string, string>): boolean {
  const controllingRules = allFields.flatMap((f) => (f.visibilityRules ?? []).map((rule) => ({ rule, controllerCode: f.fieldCode })));
  const applicable = controllingRules.filter((entry) => entry.rule.thenShowFieldCodes.includes(field.fieldCode));
  if (applicable.length === 0) return true;
  return applicable.some(({ rule, controllerCode }) => String(answers[controllerCode] ?? "") === String(rule.equals));
}

const inputClass = "w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink";
const disabledClass = "w-full rounded-md border border-dashed border-border-strong bg-sunken px-2.5 py-1.5 text-[13.5px] text-ink-soft";

function renderInput(field: FormFieldDefinition, value: string, onChange: (v: string) => void) {
  switch (field.fieldType) {
    case "short_text":
    case "single_select":
    case "multi_select":
      return <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "long_text":
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={inputClass} />;
    case "number":
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "date":
      return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "datetime":
      return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />;
    case "boolean":
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "lookup_select":
    case "linked_record":
      return <input disabled value={value || "(picked from connected records)"} className={disabledClass} />;
    case "calculated_field":
      return <input disabled value="(computed automatically)" className={disabledClass} />;
    default:
      return (
        <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border-strong bg-sunken text-[12px] text-ink-soft">
          {field.fieldType.replace(/_/g, " ")} capture
        </div>
      );
  }
}

export function FormPreviewPanel({ form }: { form: FormTemplate }) {
  const fields = form.currentVersion.fields;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [testSubmissions, setTestSubmissions] = useState<Submission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  function loadTestSubmissions() {
    fetch(`/api/forms/${form.id}/submissions`)
      .then((res) => res.json())
      .then((data) => setTestSubmissions(Array.isArray(data) ? data : []))
      .catch((error) => console.error("Failed to load test submissions", error));
  }

  useEffect(() => {
    loadTestSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const visibleFields = useMemo(
    () =>
      fields
        .filter((field) => isFieldVisible(field, fields, answers))
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [fields, answers]
  );

  async function submitTest() {
    setSubmitting(true);
    setJustSubmitted(false);
    try {
      const payload = visibleFields.map((field) => ({ fieldCode: field.fieldCode, value: answers[field.fieldCode] ?? null }));
      const res = await fetch(`/api/forms/${form.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      if (!res.ok) throw new Error(await res.text());
      setJustSubmitted(true);
      loadTestSubmissions();
    } catch (error) {
      console.error("Failed to submit test response", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-soft">Live preview — try changing a field with visibility rules to see dependents show/hide.</p>
        <div className="flex items-center gap-1 rounded-md border border-border-strong bg-paper p-0.5">
          <button
            onClick={() => setViewport("desktop")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium",
              viewport === "desktop" ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
            )}
          >
            <Monitor className="size-3.5" /> Desktop
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium",
              viewport === "mobile" ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
            )}
          >
            <Smartphone className="size-3.5" /> Mobile
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto flex flex-col gap-4",
          viewport === "mobile"
            ? "w-[375px] rounded-[28px] border-8 border-ink bg-paper p-4 shadow-lg"
            : "max-w-lg"
        )}
      >
        {visibleFields.length === 0 && <p className="text-sm text-ink-soft">No fields yet.</p>}
        {visibleFields.map((field) => (
          <div key={field.id}>
            <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-ink">
              {field.label}
              {field.isRequired && <span className="text-critical-text">*</span>}
              {field.unit && <span className="text-[11.5px] font-normal text-ink-soft">({field.unit})</span>}
            </label>
            {renderInput(field, answers[field.fieldCode] ?? "", (v) => setAnswers((prev) => ({ ...prev, [field.fieldCode]: v })))}
            {field.helperText && <p className="mt-1 text-[12px] text-ink-soft">{field.helperText}</p>}
          </div>
        ))}
        {visibleFields.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Button variant="primary" onClick={submitTest} disabled={submitting} className="justify-center">
              {submitting ? "Submitting…" : "Submit test response"}
            </Button>
            {justSubmitted && <p className="text-center text-[12px] text-good-text">Saved as a test submission — won&apos;t appear in Records.</p>}
          </div>
        )}
      </div>

      {testSubmissions.length > 0 && (
        <div className="mx-auto mt-6 max-w-lg border-t border-border pt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Recent test submissions ({testSubmissions.length})</p>
          <div className="flex flex-col gap-1.5">
            {testSubmissions.map((submission) => (
              <div key={submission.id} className="flex items-center justify-between rounded-md border border-border bg-paper px-3 py-2 text-[12.5px]">
                <span className="font-medium text-ink">{submission.displayId}</span>
                <span className="text-ink-soft">
                  v{submission.formTemplateVersionNo} · {formatRelativeTime(submission.updatedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
