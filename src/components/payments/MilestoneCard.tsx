"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Plus, ShieldQuestion, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MilestoneStatusChip, PayoutInstructionStatusChip, VerificationStatusChip } from "@/components/ui/StatusChip";
import { EVIDENCE_SOURCE_TYPE_LABELS, uploadClaimEvidence } from "@/lib/upload-claim-evidence";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { MILESTONE_TYPE_LABELS, PARTICIPANT_ROLE_LABELS, PARTICIPANT_ROLE_CHIP_CLASSES } from "@/lib/payments-labels";
import type { EvidenceSourceType, PayoutInstruction, PayoutRecipient, StakeholderConsent } from "@/types";
import type { PaymentMilestoneDetail } from "@/lib/queries";

const REQUIRED_ROLE_LABELS: Record<string, string> = { investor: "Investor", platform_ops: "Platform ops", registry: "Registry" };

interface Capabilities {
  canManage: boolean;
  canActAsOps: boolean;
  canActAsInvestor: boolean;
  canActAsRegistry: boolean;
  canFileClaim: boolean;
}

function userLabel(usersById: Record<string, { fullName: string }>, userId?: string): string {
  if (!userId) return "—";
  return usersById[userId]?.fullName ?? "Unknown";
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}

function ConsentRow({
  consent,
  requiredRole,
  usersById,
  currentUserId,
  claimSubmittedByUserId,
  canAct,
}: {
  consent: StakeholderConsent;
  requiredRole: string;
  usersById: Record<string, { fullName: string }>;
  currentUserId: string;
  claimSubmittedByUserId: string;
  canAct: boolean;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegistry = requiredRole === "registry";
  const showActions = canAct && consent.status === "pending" && currentUserId !== claimSubmittedByUserId;

  async function record(status: "approved" | "rejected") {
    setSubmitting(true);
    setError(null);
    try {
      await postJson(`/api/payments/claims/${consent.claimId}/consents`, { consentId: consent.id, status, rejectionReason: status === "rejected" ? reason : undefined });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record consent");
    } finally {
      setSubmitting(false);
      setRejecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">{REQUIRED_ROLE_LABELS[requiredRole] ?? requiredRole}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            consent.status === "approved" ? "bg-good-bg text-good-text" : consent.status === "rejected" ? "bg-critical-bg text-critical-text" : "bg-hold-bg text-hold-text"
          }`}
        >
          {consent.status === "approved" ? "Approved" : consent.status === "rejected" ? "Rejected" : "Pending"}
        </span>
      </div>
      {consent.consentedByUserId && (
        <p className="text-[12px] text-ink-soft">
          {userLabel(usersById, consent.consentedByUserId)} · {consent.consentedAt ? formatRelativeTime(consent.consentedAt) : ""}
        </p>
      )}
      {consent.rejectionReason && <p className="text-[12px] text-critical-text">{consent.rejectionReason}</p>}
      {error && <p className="text-[12px] text-critical-text">{error}</p>}
      {showActions && !rejecting && (
        <div className="flex items-center gap-1.5">
          <Button variant="primary" size="sm" onClick={() => record("approved")} disabled={submitting}>
            <CheckCircle2 className="size-3.5" /> {isRegistry ? "Confirm verified" : "Approve"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setRejecting(true)} disabled={submitting}>
            <XCircle className="size-3.5" /> {isRegistry ? "Request more info" : "Reject"}
          </Button>
        </div>
      )}
      {showActions && rejecting && (
        <div className="flex flex-col gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
          />
          <div className="flex items-center gap-1.5">
            <Button variant="danger" size="sm" onClick={() => record("rejected")} disabled={submitting || reason.trim() === ""}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PayoutInstructionRow({
  instruction,
  currency,
  usersById,
  capabilities,
}: {
  instruction: PayoutInstruction & { recipient?: PayoutRecipient; overrides: import("@/types").GateOverride[] };
  currency: string;
  usersById: Record<string, { fullName: string }>;
  capabilities: Capabilities;
}) {
  const router = useRouter();
  const [releasing, setReleasing] = useState(false);
  const [requestingOverride, setRequestingOverride] = useState(false);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingOverride = instruction.overrides.find((o) => o.status === "pending");
  const isBlocked = instruction.status === "blocked_awaiting_kyc" || instruction.status === "blocked_awaiting_bav";

  async function release() {
    setReleasing(true);
    setError(null);
    try {
      await postJson(`/api/payments/payout-instructions/${instruction.id}/release`, {});
      setTimeout(() => router.refresh(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Release failed");
      setReleasing(false);
    }
  }

  async function requestOverride() {
    setSubmitting(true);
    setError(null);
    try {
      await postJson(`/api/payments/payout-instructions/${instruction.id}/override`, { action: "request", justification });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request override");
    } finally {
      setSubmitting(false);
      setRequestingOverride(false);
    }
  }

  async function approveOverride(as: "partner" | "investor") {
    if (!pendingOverride) return;
    setSubmitting(true);
    setError(null);
    try {
      await postJson(`/api/payments/payout-instructions/${instruction.id}/override`, { action: `approve_${as}`, overrideId: pendingOverride.id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to co-sign override");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium capitalize text-ink">{instruction.participantRole.replace("_", " ")}</p>
          <p className="tabular text-[13px] text-ink-soft">{formatCurrency(instruction.amount, currency)}</p>
        </div>
        <PayoutInstructionStatusChip status={instruction.status} />
      </div>

      {instruction.recipient && (
        <div className="flex flex-col gap-1 text-[12px] text-ink-soft">
          <p className="font-medium text-ink">{instruction.recipient.name}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              KYC <VerificationStatusChip status={instruction.recipient.kycStatus} />
            </span>
            <span className="inline-flex items-center gap-1">
              BAV <VerificationStatusChip status={instruction.recipient.bavStatus} />
            </span>
          </div>
        </div>
      )}

      {instruction.status === "paid" && instruction.proximityPayRef && (
        <p className="text-[12px] text-good-text">Paid via Proximity Pay · ref {instruction.proximityPayRef}</p>
      )}

      {error && <p className="text-[12px] text-critical-text">{error}</p>}

      {instruction.status === "ready" && capabilities.canActAsOps && (
        <Button variant="primary" size="sm" onClick={release} disabled={releasing} className="self-start">
          {releasing ? "Processing via Proximity Pay…" : "Release payout"}
        </Button>
      )}

      {isBlocked && !pendingOverride && !requestingOverride && (capabilities.canFileClaim || capabilities.canActAsOps) && (
        <Button variant="secondary" size="sm" onClick={() => setRequestingOverride(true)} className="self-start">
          Request override
        </Button>
      )}
      {isBlocked && requestingOverride && (
        <div className="flex flex-col gap-1.5">
          <input
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Why does this need an exception?"
            className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
          />
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" onClick={requestOverride} disabled={submitting || justification.trim() === ""}>
              Submit for dual approval
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRequestingOverride(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {pendingOverride && (
        <div className="flex flex-col gap-1.5 rounded-md bg-sunken px-2.5 py-2">
          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
            <ShieldQuestion className="size-3.5" /> Override pending dual sign-off
          </p>
          <p className="text-[12px] text-ink-soft">{pendingOverride.justification}</p>
          <p className="text-[12px] text-ink-soft">
            Partner: {pendingOverride.partnerApprovalByUserId ? userLabel(usersById, pendingOverride.partnerApprovalByUserId) : "Pending"} · Investor:{" "}
            {pendingOverride.investorApprovalByUserId ? userLabel(usersById, pendingOverride.investorApprovalByUserId) : "Pending"}
          </p>
          <div className="flex items-center gap-1.5">
            {capabilities.canFileClaim && !pendingOverride.partnerApprovalByUserId && (
              <Button variant="secondary" size="sm" onClick={() => approveOverride("partner")} disabled={submitting}>
                Sign as partner
              </Button>
            )}
            {capabilities.canActAsInvestor && !pendingOverride.investorApprovalByUserId && (
              <Button variant="secondary" size="sm" onClick={() => approveOverride("investor")} disabled={submitting}>
                Sign as investor
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MilestoneCard({
  currency,
  agreementStatus,
  milestone,
  usersById,
  currentUserId,
  capabilities,
}: {
  currency: string;
  agreementStatus: string;
  milestone: PaymentMilestoneDetail;
  usersById: Record<string, { fullName: string }>;
  currentUserId: string;
  capabilities: Capabilities;
}) {
  const router = useRouter();
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState("");
  const [stagedEvidence, setStagedEvidence] = useState<{ file: File; sourceType: EvidenceSourceType }[]>([]);
  const [pendingSourceType, setPendingSourceType] = useState<EvidenceSourceType>("other");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestClaim = milestone.claims[0];
  const hasOpenClaim = latestClaim && latestClaim.status !== "rejected";
  const canFileNewClaim = capabilities.canFileClaim && agreementStatus === "active" && !hasOpenClaim;

  function stageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStagedEvidence((prev) => [...prev, { file, sourceType: pendingSourceType }]);
    e.target.value = "";
  }

  async function submitClaim() {
    const amount = Number(claimedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid claimed amount");
      return;
    }
    setSubmittingClaim(true);
    setError(null);
    try {
      const created = await postJson("/api/payments/claims", { milestoneId: milestone.id, claimedAmount: amount });
      for (const staged of stagedEvidence) {
        const uploaded = await uploadClaimEvidence(staged.file);
        await postJson(`/api/payments/claims/${created.id}/evidence`, { ...uploaded, sourceType: staged.sourceType });
      }
      setClaimFormOpen(false);
      setClaimedAmount("");
      setStagedEvidence([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit claim");
    } finally {
      setSubmittingClaim(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
            {MILESTONE_TYPE_LABELS[milestone.type] ?? milestone.type} · {milestone.percentOfTotal}%
          </p>
          <h3 className="text-[14px] font-semibold text-ink">{milestone.label}</h3>
        </div>
        <MilestoneStatusChip status={milestone.status} />
      </CardHeader>
      {milestone.splitRules.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5">
          {milestone.splitRules.map((rule) => (
            <span
              key={rule.id}
              className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium", PARTICIPANT_ROLE_CHIP_CLASSES[rule.participantRole])}
            >
              {PARTICIPANT_ROLE_LABELS[rule.participantRole] ?? rule.participantRole} <span className="tabular">{rule.percent}%</span>
            </span>
          ))}
        </div>
      )}
      <CardBody className="flex flex-col gap-3">
        {milestone.claims.map((claim) => (
          <div key={claim.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-[13px] font-medium text-ink">{formatCurrency(claim.claimedAmount, currency)} claimed</p>
              <span className="text-[12px] text-ink-soft">
                {userLabel(usersById, claim.submittedByUserId)} · {formatRelativeTime(claim.submittedAt)}
              </span>
            </div>
            {claim.evidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {claim.evidence.map((file) => (
                  <a
                    key={file.id}
                    href={file.fileRef}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-sunken px-2 py-1 text-[12px] text-ink hover:bg-sunken/70 sm:max-w-[280px]"
                  >
                    <FileText className="size-3.5 shrink-0 text-ink-soft" />
                    <span className="min-w-0 flex-1 truncate">{file.fileName}</span>
                    <span className="shrink-0 text-ink-soft">· {EVIDENCE_SOURCE_TYPE_LABELS[file.sourceType]}</span>
                  </a>
                ))}
              </div>
            )}
            <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {claim.consents.map((consent) => (
                <ConsentRow
                  key={consent.id}
                  consent={consent}
                  requiredRole={consent.requiredRole}
                  usersById={usersById}
                  currentUserId={currentUserId}
                  claimSubmittedByUserId={claim.submittedByUserId}
                  canAct={
                    (consent.requiredRole === "investor" && capabilities.canActAsInvestor) ||
                    (consent.requiredRole === "registry" && capabilities.canActAsRegistry) ||
                    (consent.requiredRole === "platform_ops" && capabilities.canActAsOps)
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {canFileNewClaim && !claimFormOpen && (
          <Button variant="secondary" size="sm" onClick={() => setClaimFormOpen(true)} className="self-start">
            <Plus className="size-3.5" /> Submit claim
          </Button>
        )}
        {canFileNewClaim && claimFormOpen && (
          <div className="flex flex-col gap-2.5 rounded-md border border-border p-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Claimed amount ({currency})</label>
              <input
                type="number"
                min={0}
                value={claimedAmount}
                onChange={(e) => setClaimedAmount(e.target.value)}
                className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Evidence</label>
              <div className="flex items-center gap-1.5">
                <select
                  value={pendingSourceType}
                  onChange={(e) => setPendingSourceType(e.target.value as EvidenceSourceType)}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px]"
                >
                  {Object.entries(EVIDENCE_SOURCE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input type="file" onChange={stageFile} className="text-[12.5px]" />
              </div>
              {stagedEvidence.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-1 text-[12px] text-ink-soft">
                  {stagedEvidence.map((s, i) => (
                    <li key={i}>
                      {s.file.name} · {EVIDENCE_SOURCE_TYPE_LABELS[s.sourceType]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {error && <p className="text-[12px] text-critical-text">{error}</p>}
            <div className="flex items-center gap-1.5">
              <Button variant="primary" size="sm" onClick={submitClaim} disabled={submittingClaim}>
                {submittingClaim ? "Submitting…" : "Submit claim"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setClaimFormOpen(false)} disabled={submittingClaim}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {milestone.payoutInstructions.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Payouts</p>
            {milestone.payoutInstructions.map((instruction) => (
              <PayoutInstructionRow key={instruction.id} instruction={instruction} currency={currency} usersById={usersById} capabilities={capabilities} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
