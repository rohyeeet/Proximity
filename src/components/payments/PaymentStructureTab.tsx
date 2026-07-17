"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentStepLedgerPanel } from "@/components/payments/PaymentStepLedgerPanel";
import { fieldInputClass } from "@/lib/form-fields";
import { cn } from "@/lib/utils";
import {
  MILESTONE_TYPE_LABELS,
  PARTICIPANT_ROLE_LABELS,
  PARTICIPANT_ROLE_CHIP_CLASSES,
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_SOURCE_HELP,
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

/**
 * "Payment Structure" — the single place a project's milestones are authored AND checked, replacing
 * what used to be two separate tabs (Milestone templates, Ledger) that both showed different halves
 * of the same data. Each card shows its own definition (what triggers it, who gets paid) and can
 * expand in place to show its live ledger — no tab-switching required to correlate the two. A flow's
 * payment_step node references one of these by id; the agreement builder snapshots selected ones
 * into a real Milestone/SplitRule set at signing time (never a live reference).
 */
export function PaymentStructureTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [templates, setTemplates] = useState<MilestoneTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      setExpandedId((prev) => (prev === id ? null : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete milestone template");
    }
  }

  if (templates === null) return <p className="text-[13px] text-ink-soft">Loading payment structure…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-soft">
          <span className={cn("font-medium", Math.abs(totalCoverage - 100) < 0.5 ? "text-good-text" : "text-ink")}>{totalCoverage}%</span> of the deal
          value is currently covered by {templates.length} milestone{templates.length === 1 ? "" : "s"}.
        </p>
        {canEdit && !creating && (
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> New milestone
          </Button>
        )}
      </div>

      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      {templates.length === 0 && !creating && (
        <EmptyState
          title="No milestones yet"
          description="Define what % of the total value each milestone releases, and who gets paid, before any real agreement is signed."
        />
      )}

      {templates.map((template) => {
        const isExpanded = expandedId === template.id;
        return (
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
                    aria-label="Delete milestone"
                    onClick={() => deleteTemplate(template.id)}
                    className="flex size-7 items-center justify-center rounded text-ink-soft hover:bg-critical-bg hover:text-critical-text"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardBody className="flex flex-wrap items-center gap-2">
              {template.splitRules.map((rule) => (
                <span
                  key={rule.id}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium", PARTICIPANT_ROLE_CHIP_CLASSES[rule.participantRole])}
                >
                  {PARTICIPANT_ROLE_LABELS[rule.participantRole]}
                  <span className="tabular">{rule.percent}%</span>
                </span>
              ))}
              <button
                onClick={() => setExpandedId(isExpanded ? null : template.id)}
                className="ml-auto flex items-center gap-1 text-[12.5px] font-medium text-brand-600 hover:underline"
              >
                {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                {isExpanded ? "Hide" : "View"} live ledger
              </button>
            </CardBody>
            {isExpanded && (
              <div className="border-t border-border bg-sunken/40 px-5 py-4">
                <PaymentStepLedgerPanel milestoneTemplateId={template.id} />
              </div>
            )}
          </Card>
        );
      })}

      {creating && (
        <Card>
          <CardHeader>
            <h3 className="text-[14px] font-semibold text-ink">New milestone</h3>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">What triggers this payment</p>
              <div className="flex flex-col gap-2.5">
                <input
                  value={draft.label}
                  onChange={(e) => setDraft((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Milestone label, e.g. “First 1,000t produced”"
                  className={fieldInputClass}
                />
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[120px_1fr]">
                  <div>
                    <label className="mb-1 block text-[11px] text-ink-soft">% of total value</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={draft.percentOfTotal}
                      onChange={(e) => setDraft((p) => ({ ...p, percentOfTotal: e.target.value }))}
                      className={fieldInputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-ink-soft">Type</label>
                    <select value={draft.type} onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as MilestoneType }))} className={fieldInputClass}>
                      {Object.entries(MILESTONE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-soft">Verification source</label>
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
                  <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">{VERIFICATION_SOURCE_HELP[draft.verificationSource]}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-3.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Who gets paid</p>
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
                {submitting ? "Creating…" : "Create milestone"}
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
