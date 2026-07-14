"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { fieldInputClass } from "@/lib/form-fields";
import { cn } from "@/lib/utils";
import { MILESTONE_TYPE_LABELS, PARTICIPANT_ROLE_LABELS, PARTICIPANT_ROLE_CHIP_CLASSES, VERIFICATION_SOURCE_LABELS } from "@/lib/payments-labels";
import type { MilestoneTemplate, Organization, Project, VerificationStatus } from "@/types";

interface RecipientDraft {
  name: string;
  kycStatus: VerificationStatus;
  bavStatus: VerificationStatus;
}

const VERIFICATION_STATUS_OPTIONS: VerificationStatus[] = ["not_started", "in_review", "approved", "rejected"];

/** Milestones and their revenue splits are no longer hand-typed here — they're authored once, in
 * Payments' "Milestone templates" tab, per project. This builder only ever picks which of that
 * project's templates apply to this specific agreement; the API snapshots the selected templates'
 * percentages into real Milestone/SplitRule rows at creation time. */
export function PaymentAgreementBuilderClient({
  organizations,
  projectsByOrg,
}: {
  organizations: Organization[];
  projectsByOrg: Record<string, Project[]>;
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const orgProjects = projectsByOrg[organizationId] ?? [];
  const [projectId, setProjectId] = useState(orgProjects[0]?.id ?? "");

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

  // Changing org resets the project pick to that org's first project.
  useEffect(() => {
    setProjectId((projectsByOrg[organizationId] ?? [])[0]?.id ?? "");
  }, [organizationId, projectsByOrg]);

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
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Project organization</label>
            <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className={fieldInputClass}>
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
          <h2 className="text-sm font-semibold text-ink">Milestone templates</h2>
          <span className={cn("text-[12px] font-medium", Math.abs(selectedPercentTotal - 100) < 0.5 ? "text-good-text" : "text-ink-soft")}>
            {selectedPercentTotal}% of 100% selected
          </span>
        </CardHeader>
        <CardBody className="flex flex-col gap-2.5">
          {!projectId ? (
            <p className="text-[13px] text-ink-soft">Pick a project to see its milestone templates.</p>
          ) : templates === null ? (
            <p className="text-[13px] text-ink-soft">Loading…</p>
          ) : templates.length === 0 ? (
            <EmptyState
              title="This project has no milestone templates yet"
              description="Define them first in Payments → Milestone templates, then come back here to build the agreement."
            />
          ) : (
            templates.map((template) => {
              const checked = selectedTemplateIds.has(template.id);
              return (
                <label
                  key={template.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3",
                    checked ? "border-brand-500/50 bg-brand-50" : "border-border"
                  )}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleTemplate(template.id)} className="mt-1 size-3.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-ink">{template.label}</p>
                      <span className="tabular shrink-0 text-[13px] font-semibold text-ink">{template.percentOfTotal}%</span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-soft">
                      {MILESTONE_TYPE_LABELS[template.type]} · {VERIFICATION_SOURCE_LABELS[template.verificationSource]}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {template.splitRules.map((rule) => (
                        <span
                          key={rule.id}
                          className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium", PARTICIPANT_ROLE_CHIP_CLASSES[rule.participantRole])}
                        >
                          {PARTICIPANT_ROLE_LABELS[rule.participantRole]} <span className="tabular">{rule.percent}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
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
