"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { fieldInputClass } from "@/lib/form-fields";
import { cn } from "@/lib/utils";
import type { MilestoneType, Organization, ParticipantRole, VerificationSource, VerificationStatus } from "@/types";

interface MilestoneDraft {
  type: MilestoneType;
  label: string;
  percentOfTotal: string;
  verificationSource: VerificationSource;
  registryRef: string;
}

interface SplitDraft {
  participantRole: ParticipantRole;
  percent: string;
}

interface RecipientDraft {
  name: string;
  kycStatus: VerificationStatus;
  bavStatus: VerificationStatus;
}

const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  setup_capex: "Setup / CAPEX",
  achievement: "Achievement",
  monitoring_cycle: "Monitoring cycle",
};

const VERIFICATION_SOURCE_LABELS: Record<VerificationSource, string> = {
  site_inspection: "Site inspection",
  gis_satellite: "GIS / satellite",
  ops_data_review: "Ops data review",
  registry_api: "Registry API",
  vvb_attestation_upload: "VVB attestation upload",
  registry_portal_confirmation: "Registry portal confirmation",
};

const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
  platform: "Platform",
  developer: "Developer",
  farmer_community: "Farmer / community",
  investor: "Investor",
};

const VERIFICATION_STATUS_OPTIONS: VerificationStatus[] = ["not_started", "in_review", "approved", "rejected"];

const DEFAULT_MILESTONES: MilestoneDraft[] = [
  { type: "setup_capex", label: "Plant commissioned", percentOfTotal: "20", verificationSource: "site_inspection", registryRef: "" },
  { type: "achievement", label: "First 1,000t produced and applied", percentOfTotal: "30", verificationSource: "ops_data_review", registryRef: "" },
  { type: "monitoring_cycle", label: "Registry issues credits", percentOfTotal: "50", verificationSource: "registry_portal_confirmation", registryRef: "" },
];

const DEFAULT_SPLITS: SplitDraft[] = [
  { participantRole: "platform", percent: "8" },
  { participantRole: "developer", percent: "60" },
  { participantRole: "farmer_community", percent: "27" },
  { participantRole: "investor", percent: "5" },
];

function sumPercent(items: { percentOfTotal?: string; percent?: string }[]): number {
  return items.reduce((sum, item) => sum + (Number.parseFloat(item.percentOfTotal ?? item.percent ?? "") || 0), 0);
}

export function PaymentAgreementBuilderClient({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [buyerName, setBuyerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [totalValue, setTotalValue] = useState("");
  const [pricePerCredit, setPricePerCredit] = useState("");
  const [escrowInterestAllocation, setEscrowInterestAllocation] = useState("pool");
  const [fxRateTimingPolicy, setFxRateTimingPolicy] = useState("apply_at_execution");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(DEFAULT_MILESTONES);
  const [splitRules, setSplitRules] = useState<SplitDraft[]>(DEFAULT_SPLITS);
  const [developerRecipient, setDeveloperRecipient] = useState<RecipientDraft>({ name: "", kycStatus: "approved", bavStatus: "approved" });
  const [farmerRecipient, setFarmerRecipient] = useState<RecipientDraft>({ name: "", kycStatus: "approved", bavStatus: "approved" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const milestonePercentTotal = useMemo(() => sumPercent(milestones), [milestones]);
  const splitPercentTotal = useMemo(() => sumPercent(splitRules), [splitRules]);
  const milestonesValid = Math.abs(milestonePercentTotal - 100) < 0.5;
  const splitsValid = Math.abs(splitPercentTotal - 100) < 0.5;
  const canSubmit =
    !submitting &&
    organizationId !== "" &&
    buyerName.trim() !== "" &&
    projectName.trim() !== "" &&
    Number(totalValue) > 0 &&
    milestonesValid &&
    splitsValid &&
    milestones.every((m) => m.label.trim() !== "");

  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, { type: "achievement", label: "", percentOfTotal: "0", verificationSource: "ops_data_review", registryRef: "" }]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSplit(index: number, percent: string) {
    setSplitRules((prev) => prev.map((s, i) => (i === index ? { ...s, percent } : s)));
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          buyerName,
          projectName,
          currency,
          totalValue: Number(totalValue),
          pricePerCredit: pricePerCredit ? Number(pricePerCredit) : undefined,
          escrowInterestAllocation,
          fxRateTimingPolicy,
          milestones: milestones.map((m) => ({
            type: m.type,
            label: m.label,
            percentOfTotal: Number.parseFloat(m.percentOfTotal) || 0,
            verificationSource: m.verificationSource,
            registryRef: m.type === "monitoring_cycle" && m.registryRef.trim() !== "" ? m.registryRef.trim() : undefined,
          })),
          splitRules: splitRules.map((s) => ({ participantRole: s.participantRole, percent: Number.parseFloat(s.percent) || 0 })),
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
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Buyer name</label>
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Meridian Foods" className={fieldInputClass} />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Kaveri Biochar Coop" className={fieldInputClass} />
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
          <h2 className="text-sm font-semibold text-ink">Milestone schedule</h2>
          <span className={cn("text-[12px] font-medium", milestonesValid ? "text-good-text" : "text-critical-text")}>{milestonePercentTotal}% of 100%</span>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          {milestones.map((milestone, index) => (
            <div key={index} className="rounded-md border border-border p-3">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_100px_1fr_auto]">
                <select value={milestone.type} onChange={(e) => updateMilestone(index, { type: e.target.value as MilestoneType })} className={fieldInputClass}>
                  {Object.entries(MILESTONE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={milestone.label}
                  onChange={(e) => updateMilestone(index, { label: e.target.value })}
                  placeholder="Milestone label"
                  className={fieldInputClass}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={milestone.percentOfTotal}
                  onChange={(e) => updateMilestone(index, { percentOfTotal: e.target.value })}
                  className={fieldInputClass}
                />
                <select
                  value={milestone.verificationSource}
                  onChange={(e) => updateMilestone(index, { verificationSource: e.target.value as VerificationSource })}
                  className={fieldInputClass}
                >
                  {Object.entries(VERIFICATION_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button variant="ghost" size="sm" onClick={() => removeMilestone(index)} disabled={milestones.length <= 1}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              {milestone.type === "monitoring_cycle" && (
                <input
                  value={milestone.registryRef}
                  onChange={(e) => updateMilestone(index, { registryRef: e.target.value })}
                  placeholder="Registry reference (e.g. Puro.earth)"
                  className={cn(fieldInputClass, "mt-2.5")}
                />
              )}
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addMilestone} className="self-start">
            <Plus className="size-3.5" /> Add milestone
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-ink">Revenue split rule set</h2>
          <span className={cn("text-[12px] font-medium", splitsValid ? "text-good-text" : "text-critical-text")}>{splitPercentTotal}% of 100%</span>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {splitRules.map((rule, index) => (
            <div key={rule.participantRole}>
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">{PARTICIPANT_ROLE_LABELS[rule.participantRole]}</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={100} value={rule.percent} onChange={(e) => updateSplit(index, e.target.value)} className={fieldInputClass} />
                <span className="text-[13px] text-ink-soft">%</span>
              </div>
            </div>
          ))}
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
