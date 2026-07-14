"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/lib/form-fields";
import { cn } from "@/lib/utils";
import {
  MILESTONE_TYPE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PARTICIPANT_ROLE_CHIP_CLASSES,
  VERIFICATION_SOURCE_LABELS,
  DEFAULT_SPLIT_DRAFT,
} from "@/lib/payments-labels";
import type { MilestoneTemplate, MilestoneType, ParticipantRole, VerificationSource } from "@/types";

interface Draft {
  type: MilestoneType;
  label: string;
  percentOfTotal: string;
  verificationSource: VerificationSource;
  splitRules: { participantRole: ParticipantRole; percent: string }[];
}

const EMPTY_DRAFT: Draft = {
  type: "achievement",
  label: "",
  percentOfTotal: "0",
  verificationSource: "ops_data_review",
  splitRules: DEFAULT_SPLIT_DRAFT,
};

function sumPercent(values: string[]): number {
  return values.reduce((sum, v) => sum + (Number.parseFloat(v) || 0), 0);
}

/** The single lever this session's request is about: a project developer defines every milestone
 * once here — its % of the deal's total value and exactly who gets paid what — before any real
 * buyer agreement exists. A flow's payment_step node then only ever *references* one of these by
 * id; the agreement builder snapshots them into a real Milestone/SplitRule set at signing time. */
export function MilestoneTemplatesClient({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [templates, setTemplates] = useState<MilestoneTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTemplates(null);
    fetch(`/api/projects/${projectId}/milestone-templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: MilestoneTemplate[]) => {
        if (!cancelled) setTemplates(data);
      })
      .catch((err) => {
        console.error("Failed to load milestone templates", err);
        if (!cancelled) {
          setTemplates([]);
          setError("Failed to load milestone templates");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const totalCoverage = templates?.reduce((sum, t) => sum + t.percentOfTotal, 0) ?? 0;
  const draftSplitTotal = sumPercent(draft.splitRules.map((s) => s.percent));
  const draftSplitValid = Math.abs(draftSplitTotal - 100) < 0.5;
  const canSubmitDraft = draft.label.trim() !== "" && Number(draft.percentOfTotal) > 0 && draftSplitValid && !submitting;

  function updateDraftSplit(role: ParticipantRole, percent: string) {
    setDraft((prev) => ({ ...prev, splitRules: prev.splitRules.map((s) => (s.participantRole === role ? { ...s, percent } : s)) }));
  }

  async function createTemplate() {
    if (!canSubmitDraft) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestone-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: draft.type,
          label: draft.label,
          percentOfTotal: Number(draft.percentOfTotal),
          verificationSource: draft.verificationSource,
          splitRules: draft.splitRules.map((s) => ({ participantRole: s.participantRole, percent: Number(s.percent) || 0 })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create milestone template");
      }
      const created: MilestoneTemplate = await res.json();
      setTemplates((prev) => [...(prev ?? []), created]);
      setDraft(EMPTY_DRAFT);
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create milestone template");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteTemplate(id: string) {
    try {
      const res = await fetch(`/api/milestone-templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete milestone template");
      setTemplates((prev) => (prev ?? []).filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete milestone template");
    }
  }

  if (templates === null) return <p className="text-[13px] text-ink-soft">Loading milestone templates…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-soft">
          <span className={cn("font-medium", Math.abs(totalCoverage - 100) < 0.5 ? "text-good-text" : "text-ink")}>{totalCoverage}%</span> of the deal
          value is currently covered by {templates.length} milestone{templates.length === 1 ? "" : "s"}.
        </p>
        {canEdit && !creating && (
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> New milestone template
          </Button>
        )}
      </div>

      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      {templates.length === 0 && !creating && (
        <EmptyState
          title="No milestone templates yet"
          description="Define what % of the total value each milestone releases, and who gets paid, before any real agreement is signed."
        />
      )}

      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
                {MILESTONE_TYPE_LABELS[template.type]} · {VERIFICATION_SOURCE_LABELS[template.verificationSource]}
              </p>
              <h3 className="text-[14px] font-semibold text-ink">{template.label}</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular text-[14px] font-semibold text-ink">{template.percentOfTotal}%</span>
              {canEdit && (
                <button
                  aria-label="Delete milestone template"
                  onClick={() => deleteTemplate(template.id)}
                  className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            {template.splitRules.map((rule) => (
              <span
                key={rule.id}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium", PARTICIPANT_ROLE_CHIP_CLASSES[rule.participantRole])}
              >
                {PARTICIPANT_ROLE_LABELS[rule.participantRole]}
                <span className="tabular">{rule.percent}%</span>
              </span>
            ))}
          </CardBody>
        </Card>
      ))}

      {creating && (
        <Card>
          <CardHeader>
            <h3 className="text-[14px] font-semibold text-ink">New milestone template</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_100px]">
              <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as MilestoneType }))} className={fieldInputClass}>
                {Object.entries(MILESTONE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={draft.label}
                onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                placeholder="Milestone label"
                className={fieldInputClass}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={draft.percentOfTotal}
                onChange={(e) => setDraft((p) => ({ ...p, percentOfTotal: e.target.value }))}
                className={fieldInputClass}
              />
            </div>
            <select
              value={draft.verificationSource}
              onChange={(e) => setDraft((p) => ({ ...p, verificationSource: e.target.value as VerificationSource }))}
              className={fieldInputClass}
            >
              {Object.entries(VERIFICATION_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-medium text-ink-soft">Who gets paid</label>
                <span className={cn("text-[12px] font-medium", draftSplitValid ? "text-good-text" : "text-critical-text")}>
                  {draftSplitTotal}% of 100%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {draft.splitRules.map((rule) => (
                  <div key={rule.participantRole}>
                    <label className="mb-1 block text-[11px] text-ink-soft">{PARTICIPANT_ROLE_LABELS[rule.participantRole]}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.percent}
                        onChange={(e) => updateDraftSplit(rule.participantRole, e.target.value)}
                        className={fieldInputClass}
                      />
                      <span className="text-[13px] text-ink-soft">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={createTemplate} disabled={!canSubmitDraft}>
                {submitting ? "Creating…" : "Create milestone template"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCreating(false);
                  setDraft(EMPTY_DRAFT);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
