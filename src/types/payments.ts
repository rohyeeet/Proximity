// Milestone-gated offtake agreements settled through a simulated PSP ("Proximity Pay",
// src/lib/proximity-pay.ts). Mirrors prisma/schema.prisma's Payments section field-for-field.

export type MilestoneType = "setup_capex" | "achievement" | "monitoring_cycle";
export type VerificationSource = "site_inspection" | "gis_satellite" | "ops_data_review" | "registry_api" | "vvb_attestation_upload" | "registry_portal_confirmation";
export type MilestoneStatus = "not_due" | "claim_submitted" | "consented" | "paid";
export type ClaimStatus = "submitted" | "consented" | "rejected" | "paid";
export type EvidenceSourceType = "dmrv_export" | "site_inspection_photo" | "production_log" | "registry_document" | "other";
export type ConsentRequiredRole = "investor" | "platform_ops" | "registry";
export type ConsentStatus = "pending" | "approved" | "rejected";
export type PaymentPartyRole = "investor" | "registry";
export type RecipientRole = "developer" | "farmer_community";
export type VerificationStatus = "not_started" | "in_review" | "approved" | "rejected" | "re_verification_required";
export type ParticipantRole = "platform" | "developer" | "farmer_community" | "investor";
export type PayoutInstructionStatus = "blocked_awaiting_verification" | "blocked_awaiting_kyc" | "blocked_awaiting_bav" | "ready" | "routed" | "paid";
export type EscrowStatus = "holding" | "partially_released" | "fully_released";
export type OverriddenGate = "kyc" | "bav" | "both";
export type OverrideStatus = "pending" | "granted" | "denied";
export type EscrowInterestAllocation = "buyer" | "pool" | "platform";
export type FxRateTimingPolicy = "lock_at_consent" | "apply_at_execution";
export type PaymentAgreementStatus = "draft" | "active" | "completed";

export interface PaymentAgreement {
  id: string;
  organizationId: string;
  /** The real project this deal funds. */
  projectId: string;
  buyerName: string;
  /** Free-text display fallback predating projectId — never re-derived from it. */
  projectName: string;
  currency: string;
  totalValue: number;
  pricePerCredit?: number;
  escrowInterestAllocation: EscrowInterestAllocation;
  fxRateTimingPolicy: FxRateTimingPolicy;
  status: PaymentAgreementStatus;
  createdByUserId: string;
  createdAt: string;
}

export interface SplitRule {
  id: string;
  paymentAgreementId: string;
  /** Set when this split belongs to one specific milestone (snapshotted from a MilestoneTemplate's
   * splits) rather than the whole agreement — lets different milestones pay different roles
   * different percentages. Undefined = agreement-wide split (the original model). */
  milestoneId?: string;
  participantRole: ParticipantRole;
  percent: number;
}

export interface Milestone {
  id: string;
  paymentAgreementId: string;
  /** Which MilestoneTemplate this was snapshotted from, if any. */
  sourceTemplateId?: string;
  type: MilestoneType;
  label: string;
  percentOfTotal: number;
  verificationSource: VerificationSource;
  registryRef?: string;
  order: number;
  status: MilestoneStatus;
}

/** A reusable milestone definition authored once per project in the Payments section — the one
 * lever a project developer configures. A flow's payment_step node references one by id; a real
 * PaymentAgreement's Milestone/SplitRule rows are snapshotted from the selected template(s) at
 * agreement-creation time. */
export interface MilestoneTemplate {
  id: string;
  projectId: string;
  type: MilestoneType;
  label: string;
  percentOfTotal: number;
  verificationSource: VerificationSource;
  order: number;
  splitRules: MilestoneTemplateSplit[];
}

export interface MilestoneTemplateSplit {
  id: string;
  milestoneTemplateId: string;
  participantRole: ParticipantRole;
  percent: number;
}

export interface MilestoneClaim {
  id: string;
  milestoneId: string;
  submittedByUserId: string;
  submittedAt: string;
  claimedAmount: number;
  status: ClaimStatus;
}

export interface EvidenceAttachment {
  id: string;
  claimId: string;
  sourceType: EvidenceSourceType;
  fileRef: string;
  fileName: string;
  hash: string;
  submittedAt: string;
}

export interface StakeholderConsent {
  id: string;
  claimId: string;
  requiredRole: ConsentRequiredRole;
  consentedByUserId?: string;
  consentedAt?: string;
  status: ConsentStatus;
  rejectionReason?: string;
}

export interface PaymentAgreementParty {
  id: string;
  paymentAgreementId: string;
  userId: string;
  role: PaymentPartyRole;
  investedAmount?: number;
}

export interface PayoutRecipient {
  id: string;
  paymentAgreementId: string;
  role: RecipientRole;
  name: string;
  kycStatus: VerificationStatus;
  bavStatus: VerificationStatus;
  kycVerifiedAt?: string;
  bavVerifiedAt?: string;
}

export interface PayoutInstruction {
  id: string;
  milestoneId: string;
  claimId: string;
  recipientId?: string;
  participantRole: ParticipantRole;
  amount: number;
  currency: string;
  status: PayoutInstructionStatus;
  proximityPayRef?: string;
  paidAt?: string;
}

export interface EscrowAccount {
  id: string;
  paymentAgreementId: string;
  heldAmount: number;
  currency: string;
  corePortionBalance: number;
  interestAccruedToDate: number;
  status: EscrowStatus;
  fundedAt: string;
}

export interface GateOverride {
  id: string;
  payoutInstructionId: string;
  overriddenGate: OverriddenGate;
  partnerApprovalByUserId?: string;
  investorApprovalByUserId?: string;
  justification: string;
  status: OverrideStatus;
  createdAt: string;
}

export interface PaymentAuditLogEntry {
  id: string;
  paymentAgreementId: string;
  eventType: string;
  payload: unknown;
  timestamp: string;
  previousHash: string;
  hash: string;
}
