import { cn } from "@/lib/utils";

export type ChipTone = "good" | "warn" | "critical" | "hold" | "accent";

const toneClasses: Record<ChipTone, string> = {
  good: "bg-good-bg text-good-text",
  warn: "bg-warn-bg text-warn-text",
  critical: "bg-critical-bg text-critical-text",
  hold: "bg-hold-bg text-hold-text",
  accent: "bg-brand-50 text-brand-700",
};

const dotClasses: Record<ChipTone, string> = {
  good: "bg-good-text",
  warn: "bg-warn-text",
  critical: "bg-critical-text",
  hold: "bg-hold-text",
  accent: "bg-brand-500",
};

export function StatusChip({ label, tone }: { label: string; tone: ChipTone }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", toneClasses[tone])}>
      <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />
      {label}
    </span>
  );
}

const reviewStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Draft", tone: "hold" },
  needs_check: { label: "Needs Check", tone: "accent" },
  approved: { label: "Approved", tone: "good" },
  needs_fix: { label: "Needs Fix", tone: "critical" },
  on_hold: { label: "On Hold", tone: "hold" },
};

export function ReviewStatusChip({ status }: { status: string }) {
  const meta = reviewStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const syncStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  saved_offline: { label: "Saved Offline", tone: "hold" },
  ready_to_sync: { label: "Ready to Sync", tone: "warn" },
  synced: { label: "Synced", tone: "good" },
  sync_failed: { label: "Sync Failed", tone: "critical" },
};

export function SyncStatusChip({ status }: { status: string }) {
  const meta = syncStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const connectorStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  connected: { label: "Connected", tone: "good" },
  degraded: { label: "Degraded", tone: "warn" },
  disconnected: { label: "Disconnected", tone: "critical" },
};

export function ConnectorStatusChip({ status }: { status: string }) {
  const meta = connectorStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const paymentAgreementStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Draft", tone: "hold" },
  active: { label: "Active", tone: "good" },
  completed: { label: "Completed", tone: "accent" },
};

export function PaymentAgreementStatusChip({ status }: { status: string }) {
  const meta = paymentAgreementStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const milestoneStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  not_due: { label: "Not due", tone: "hold" },
  claim_submitted: { label: "Claim submitted", tone: "accent" },
  consented: { label: "Consented", tone: "accent" },
  paid: { label: "Paid", tone: "good" },
};

export function MilestoneStatusChip({ status }: { status: string }) {
  const meta = milestoneStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const payoutInstructionStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  blocked_awaiting_verification: { label: "Awaiting verification", tone: "hold" },
  blocked_awaiting_kyc: { label: "Blocked — KYC", tone: "critical" },
  blocked_awaiting_bav: { label: "Blocked — BAV", tone: "critical" },
  ready: { label: "Ready", tone: "accent" },
  routed: { label: "Processing…", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
};

export function PayoutInstructionStatusChip({ status }: { status: string }) {
  const meta = payoutInstructionStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}

const verificationStatusMeta: Record<string, { label: string; tone: ChipTone }> = {
  not_started: { label: "Not started", tone: "hold" },
  in_review: { label: "In review", tone: "warn" },
  approved: { label: "Approved", tone: "good" },
  rejected: { label: "Rejected", tone: "critical" },
  re_verification_required: { label: "Re-verification needed", tone: "critical" },
};

export function VerificationStatusChip({ status }: { status: string }) {
  const meta = verificationStatusMeta[status] ?? { label: status, tone: "hold" as ChipTone };
  return <StatusChip label={meta.label} tone={meta.tone} />;
}
