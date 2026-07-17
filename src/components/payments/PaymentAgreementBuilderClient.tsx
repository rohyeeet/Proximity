"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/lib/form-fields";
import { cn } from "@/lib/utils";
import { MILESTONE_TYPE_LABELS, VERIFICATION_SOURCE_LABELS } from "@/lib/payments-labels";
import type { MilestoneTemplate, Organization, Project, VerificationStatus } from "@/types";

interface RecipientDraft {
  name: string;
  kycStatus: VerificationStatus;
  bavStatus: VerificationStatus;
}

const VERIFICATION_STATUS_OPTIONS: VerificationStatus[] = ["not_started", "in_review", "approved", "rejected"];

/** Milestones and their revenue splits are no longer hand-typed here — they're authored once, in
 * Payments' "Payment Structure" tab, per project. This builder only ever picks which of that
 * project's milestones apply to this specific agreement; the API snapshots the selected milestones'
 * percentages into real Milestone/SplitRule rows at creation time. */
export function PaymentAgreementBuilderClient({
  organizations,
  projectsByOrg,
  preselectedOrgId,
  preselectedProjectId,
}: {
  organizations: Organization[];
  projectsByOrg: Record<string, Project[]>;
  /** Set when arriving from Payments with a project already selected — skips the org/project
   * pickers entirely instead of asking a third time. */
  preselectedOrgId?: string;
  preselectedProjectId?: string;
}) {
  const router = useRouter();
  const [locked, setLocked] = useState(Boolean(preselectedOrgId && preselectedProjectId));
  const [organizationId, setOrganizationId] = useState(preselectedOrgId ?? organizations[0]?.id ?? "");
  const orgProjects = projectsByOrg[organizationId] ?? [];
  const [projectId, setProjectId] = useState(preselectedProjectId ?? orgProjects[0]?.id ?? "");
  const preselectedOrgName = preselectedOrgId ? organizations.find((o) => o.id === preselectedOrgId)?.name : undefined;
  const preselectedProjectName = preselectedProjectId ? (projectsByOrg[preselectedOrgId ?? ""] ?? []).find((p) => p.id === preselectedProjectId)?.name : undefined;

  const [templates, setTemplates] = useState<MilestoneTemplate[] | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

  const [buyerName, setBuyerName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [totalValue, setTotalValue] = useState("");
  const [pricePerCredit, setPricePerCredit] = useState("");
  const [escrowInterestAllocation, setEscrowInterestAllocation] = useState("pool");
  const [fxRateTimingPolicy, setFxRateTimingPolicy] = useState("apply_at_execution");
  const [developerRecipient, setDeveloperRecipient] = useState<RecipientDraft>({ name: "", kycStatus: "approved", bavStatus: "approved" });
  const [farmerRecipient, setFarmerRecipient] = useState<RecipientDraft>({ name: "", kycStatus: "approved", bavStatus: "approved" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Changing org resets the project pick to that org's first project. A plain change handler
  // (not an effect keyed on organizationId) so it never fires on mount and clobbers a preselected
  // project that happens to not be that org's first one.
  function changeOrganization(nextOrgId: string) {
    setOrganizationId(nextOrgId);
    setProjectId((projectsByOrg[nextOrgId] ?? [])[0]?.id ?? "");
  }

  useEffect(() => {
    if (!projectId) {
      setTemplates(null);
      return;
    }
    let cancelled = false;
    setTemplates(null);
    setSelectedTemplateIds(new Set());
    fetch(`/api/projects/${projectId}/milestone-templates`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: MilestoneTemplate[]) => {
        if (cancelled) return;
        setTemplates(data);
        setSelectedTemplateIds(new Set(data.map((t) => t.id))); // default: include every template
      })
      .catch((err) => {
        console.error("Failed to load milestone templates", err);
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTemplates = useMemo(() => (templates ?? []).filter((t) => selectedTemplateIds.has(t.id)), [templates, selectedTemplateIds]);
  const selectedPercentTotal = useMemo(() => selectedTemplates.reduce((sum, t) => sum + t.percentOfTotal, 0), [selectedTemplates]);

  const canSubmit =
    !submitting &&
    organizationId !== "" &&
    projectId !== "" &&
    buyerName.trim() !== "" &&
    Number(totalValue) > 0 &&
    selectedTemplateIds.size > 0;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = orgProjects.find((p) => p.id === projectId);
      const res = await fetch("/api/payments/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          projectId,
          buyerName,
          projectName: project?.name ?? "",
          currency,
          totalValue: Number(totalValue),
          pricePerCredit: pricePerCredit ? Number(pricePerCredit) : undefined,
          escrowInterestAllocation,
          fxRateTimingPolicy,
          milestoneTemplateIds: [...selectedTemplateIds],
          recipients: [
            ...(developerRecipient.name.trim() ? [{ role: "developer", ...developerRecipient }] : []),
            ...(farmerRecipient.name.trim() ? [{ role: "farmer_community", ...farmerRecipient }] : []),
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create agreement");
      }
      const created = await res.json();
      router.push(`/payments/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agreement");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink">Agreement</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {locked && preselectedProjectName ? (
            <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-sunken px-3 py-2.5">
              <p className="text-[13px] text-ink">
                Building for <span className="font-medium">{preselectedProjectName}</span> · {preselectedOrgName}
              </p>
              <button type="button" onClick={() => setLocked(false)} className="text-[12.5px] font-medium text-brand-600 hover:underline">
                Change
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-soft">Project organization</label>
                <select value={organizationId} onChange={(e) => changeOrganization(e.target.value)} className={fieldInputClass}>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-soft">Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={fieldInputClass} disabled={orgProjects.length === 0}>
                  {orgProjects.length === 0 ? (
                    <option value="">No projects for this organization</option>
                  ) : (
                    orgProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Buyer name</label>
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Meridian Foods" className={fieldInputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Currency</label>
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} className={fieldInputClass} />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Total value</label>
              <input type="number" min={0} value={totalValue} onChange={(e) => setTotalValue(e.target.value)} placeholder="185000" className={fieldInputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Price per credit (optional)</label>
            <input type="number" min={0} value={pricePerCredit} onChange={(e) => setPricePerCredit(e.target.value)} placeholder="18.50" className={fieldInputClass} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Escrow interest allocation</label>
            <select value={escrowInterestAllocation} onChange={(e) => setEscrowInterestAllocation(e.target.value)} className={fieldInputClass}>
              <option value="pool">Distributable pool</option>
              <option value="buyer">Credited to buyer</option>
              <option value="platform">Platform revenue</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">FX rate timing policy</label>
            <select value={fxRateTimingPolicy} onChange={(e) => setFxRateTimingPolicy(e.target.value)} className={fieldInputClass}>
              <option value="apply_at_execution">Apply at execution</option>
              <option value="lock_at_consent">Lock at consent</option>
            </select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-sm font-semibold text-ink">Milestones</h2>
            {projectId && (
              <Link href={`/payments?tab=structure&project=${projectId}`} className="text-[12px] text-brand-600 hover:underline">
                Review full definitions →
              </Link>
            )}
          </div>
          <span className={cn("text-[12px] font-medium", Math.abs(selectedPercentTotal - 100) < 0.5 ? "text-good-text" : "text-ink-soft")}>
            {selectedPercentTotal}% of 100% selected
          </span>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          {!projectId ? (
            <p className="text-[13px] text-ink-soft">Pick a project to see its milestones.</p>
          ) : templates === null ? (
            <p className="text-[13px] text-ink-soft">Loading…</p>
          ) : templates.length === 0 ? (
            <EmptyState
              title="This project has no milestones yet"
              description="Define them first in Payments → Payment Structure, then come back here to build the agreement."
            />
          ) : (
            templates.map((template) => {
              const checked = selectedTemplateIds.has(template.id);
              return (
                <label
                  key={template.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5",
                    checked ? "border-brand-500/50 bg-brand-50" : "border-border"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleTemplate(template.id)} className="size-3.5" />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-ink">{template.label}</span>
                      <span className="block text-[11.5px] text-ink-soft">
                        {MILESTONE_TYPE_LABELS[template.type]} · {VERIFICATION_SOURCE_LABELS[template.verificationSource]}
                      </span>
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-[13px] font-semibold text-ink">{template.percentOfTotal}%</span>
                </label>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink">Payout recipients</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Developer", value: developerRecipient, set: setDeveloperRecipient },
            { label: "Farmer / community", value: farmerRecipient, set: setFarmerRecipient },
          ].map(({ label, value, set }) => (
            <div key={label} className="rounded-md border border-border p-3">
              <p className="mb-2 text-[13px] font-medium text-ink">{label}</p>
              <input
                value={value.name}
                onChange={(e) => set((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Recipient name"
                className={cn(fieldInputClass, "mb-2")}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-ink-soft">KYC status</label>
                  <select value={value.kycStatus} onChange={(e) => set((prev) => ({ ...prev, kycStatus: e.target.value as VerificationStatus }))} className={fieldInputClass}>
                    {VERIFICATION_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-ink-soft">BAV status</label>
                  <select value={value.bavStatus} onChange={(e) => set((prev) => ({ ...prev, bavStatus: e.target.value as VerificationStatus }))} className={fieldInputClass}>
                    {VERIFICATION_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={!canSubmit}>
          {submitting ? "Creating…" : "Create agreement"}
        </Button>
      </div>
    </div>
  );
}
