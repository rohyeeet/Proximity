import type {
  EscrowAccount,
  EvidenceAttachment,
  Milestone,
  MilestoneClaim,
  PaymentAgreement,
  PaymentAgreementParty,
  PayoutInstruction,
  PayoutRecipient,
  SplitRule,
  StakeholderConsent,
} from "@/types";

/**
 * Demo data for the Payments module ("Proximity Pay") — one agreement, pre-populated mid-flow so
 * every demo login (platform admin, ground partner, investor, registry) has something real to act
 * on immediately. Mirrors the design doc's own worked example #1 (biochar offtake) almost exactly:
 * Meridian Foods x Kaveri Biochar Coop, 10,000 credits @ $18.50 = $185,000, milestones 20/30/50%,
 * split platform 8% / developer 60% / farmer 27% / investor 5%.
 *
 * Deliberately NOT included here: PaymentAuditLogEntry rows. A hash-chained audit trail can't be
 * hand-authored as static literals without the hashes being trivially wrong — prisma/seed.ts
 * builds the real chain at seed time from `paymentAuditSeedEvents` below, using the same
 * computeHash() the live app uses, so the "Verify chain" button passes on seeded data too.
 */

export const AGREEMENT_ID = "agreement-kaveri-biochar";

export const paymentAgreements: PaymentAgreement[] = [
  {
    id: AGREEMENT_ID,
    organizationId: "org-varaha-south",
    projectId: "project-default-org-varaha-south",
    buyerName: "Meridian Foods",
    projectName: "Kaveri Biochar Coop",
    currency: "USD",
    totalValue: 185000,
    pricePerCredit: 18.5,
    escrowInterestAllocation: "pool",
    fxRateTimingPolicy: "apply_at_execution",
    status: "active",
    createdByUserId: "user-rohit",
    createdAt: "2026-05-20T09:00:00Z",
  },
];

export const splitRules: SplitRule[] = [
  { id: "split-kaveri-platform", paymentAgreementId: AGREEMENT_ID, participantRole: "platform", percent: 8 },
  { id: "split-kaveri-developer", paymentAgreementId: AGREEMENT_ID, participantRole: "developer", percent: 60 },
  { id: "split-kaveri-farmer", paymentAgreementId: AGREEMENT_ID, participantRole: "farmer_community", percent: 27 },
  { id: "split-kaveri-investor", paymentAgreementId: AGREEMENT_ID, participantRole: "investor", percent: 5 },
];

export const MILESTONE_1_ID = "milestone-kaveri-1";
export const MILESTONE_2_ID = "milestone-kaveri-2";
export const MILESTONE_3_ID = "milestone-kaveri-3";

export const milestones: Milestone[] = [
  {
    id: MILESTONE_1_ID,
    paymentAgreementId: AGREEMENT_ID,
    type: "setup_capex",
    label: "Plant commissioned",
    percentOfTotal: 20,
    verificationSource: "site_inspection",
    order: 1,
    status: "paid",
  },
  {
    id: MILESTONE_2_ID,
    paymentAgreementId: AGREEMENT_ID,
    type: "achievement",
    label: "First 1,000t biochar produced and field-applied",
    percentOfTotal: 30,
    verificationSource: "ops_data_review",
    order: 2,
    status: "consented",
  },
  {
    id: MILESTONE_3_ID,
    paymentAgreementId: AGREEMENT_ID,
    type: "monitoring_cycle",
    label: "Puro.earth issues credits",
    percentOfTotal: 50,
    verificationSource: "registry_portal_confirmation",
    registryRef: "puro-earth",
    order: 3,
    status: "claim_submitted",
  },
];

export const RECIPIENT_DEVELOPER_ID = "recipient-kaveri-dev";
export const RECIPIENT_FARMER_ID = "recipient-kaveri-farmer";

export const payoutRecipients: PayoutRecipient[] = [
  {
    id: RECIPIENT_DEVELOPER_ID,
    paymentAgreementId: AGREEMENT_ID,
    role: "developer",
    name: "Kaveri Biochar Coop",
    kycStatus: "approved",
    bavStatus: "approved",
    kycVerifiedAt: "2026-05-10T10:00:00Z",
    bavVerifiedAt: "2026-05-10T10:05:00Z",
  },
  {
    id: RECIPIENT_FARMER_ID,
    paymentAgreementId: AGREEMENT_ID,
    role: "farmer_community",
    name: "Kaveri Farmer Cooperative",
    // Deliberately still in review — demonstrates the partial-block wireframe (design doc §27,
    // worked example 1, milestone 2) the moment the agreement is opened, no live action needed.
    kycStatus: "approved",
    bavStatus: "in_review",
    kycVerifiedAt: "2026-05-12T09:00:00Z",
  },
];

export const CLAIM_1_ID = "claim-kaveri-1";
export const CLAIM_2_ID = "claim-kaveri-2";
export const CLAIM_3_ID = "claim-kaveri-3";

export const milestoneClaims: MilestoneClaim[] = [
  { id: CLAIM_1_ID, milestoneId: MILESTONE_1_ID, submittedByUserId: "user-deepak", submittedAt: "2026-05-25T11:00:00Z", claimedAmount: 37000, status: "paid" },
  { id: CLAIM_2_ID, milestoneId: MILESTONE_2_ID, submittedByUserId: "user-deepak", submittedAt: "2026-06-20T14:00:00Z", claimedAmount: 55500, status: "consented" },
  { id: CLAIM_3_ID, milestoneId: MILESTONE_3_ID, submittedByUserId: "user-arun", submittedAt: "2026-07-05T16:30:00Z", claimedAmount: 92500, status: "submitted" },
];

// Placeholder file references — same convention as this app's other pre-existing mock evidence
// rows (e.g. src/data/submissions.ts), not real uploaded Blob files.
export const evidenceAttachments: EvidenceAttachment[] = [
  {
    id: "evidence-kaveri-1",
    claimId: CLAIM_1_ID,
    sourceType: "site_inspection_photo",
    fileRef: "https://placehold.co/demo-evidence/kaveri-plant-commissioning.jpg",
    fileName: "plant_commissioning_site_inspection.jpg",
    hash: "8f2b6c1a9d3e5f70b41c2a8d6e9f0c3b5a7d1e4f6c8b0a2d4e6f8b0c2a4e6f8b",
    submittedAt: "2026-05-25T10:45:00Z",
  },
  {
    id: "evidence-kaveri-2",
    claimId: CLAIM_2_ID,
    sourceType: "production_log",
    fileRef: "https://placehold.co/demo-evidence/kaveri-production-log-june.pdf",
    fileName: "production_application_log_june.pdf",
    hash: "3c7a9e1f5b2d4c6e8a0f2b4d6e8c0a2f4b6d8e0c2a4f6b8d0e2c4a6f8b0d2e4c",
    submittedAt: "2026-06-20T13:50:00Z",
  },
  {
    id: "evidence-kaveri-3",
    claimId: CLAIM_3_ID,
    sourceType: "dmrv_export",
    fileRef: "https://placehold.co/demo-evidence/kaveri-dmrv-export.json",
    fileName: "proximity_dmrv_export_cycle1.json",
    hash: "1a2b3c4d5e6f7089a0b1c2d3e4f5061728394a5b6c7d8e9f001122334455667",
    submittedAt: "2026-07-05T16:15:00Z",
  },
];

export const stakeholderConsents: StakeholderConsent[] = [
  // Claim 1 — fully consented and paid
  { id: "consent-1-investor", claimId: CLAIM_1_ID, requiredRole: "investor", consentedByUserId: "user-meridian", consentedAt: "2026-05-25T15:00:00Z", status: "approved" },
  { id: "consent-1-ops", claimId: CLAIM_1_ID, requiredRole: "platform_ops", consentedByUserId: "user-rohit", consentedAt: "2026-05-25T16:00:00Z", status: "approved" },
  // Claim 2 — fully consented, payouts created (one partially blocked on BAV)
  { id: "consent-2-investor", claimId: CLAIM_2_ID, requiredRole: "investor", consentedByUserId: "user-meridian", consentedAt: "2026-06-21T09:00:00Z", status: "approved" },
  { id: "consent-2-ops", claimId: CLAIM_2_ID, requiredRole: "platform_ops", consentedByUserId: "user-rohit", consentedAt: "2026-06-21T10:00:00Z", status: "approved" },
  // Claim 3 — nothing recorded yet, the live demo hook for the registry + investor + ops logins
  { id: "consent-3-registry", claimId: CLAIM_3_ID, requiredRole: "registry", status: "pending" },
  { id: "consent-3-investor", claimId: CLAIM_3_ID, requiredRole: "investor", status: "pending" },
  { id: "consent-3-ops", claimId: CLAIM_3_ID, requiredRole: "platform_ops", status: "pending" },
];

export const paymentAgreementParties: PaymentAgreementParty[] = [
  { id: "party-kaveri-investor", paymentAgreementId: AGREEMENT_ID, userId: "user-meridian", role: "investor", investedAmount: 50000 },
  { id: "party-kaveri-registry", paymentAgreementId: AGREEMENT_ID, userId: "user-puro", role: "registry" },
];

// Milestone 1 shares (20% of $185,000 = $37,000), all settled.
// Milestone 2 shares (30% of $185,000 = $55,500) — farmer_community deliberately blocked on BAV.
export const payoutInstructions: PayoutInstruction[] = [
  { id: "payout-1-platform", milestoneId: MILESTONE_1_ID, claimId: CLAIM_1_ID, participantRole: "platform", amount: 2960, currency: "USD", status: "paid", proximityPayRef: "PXP-A1B2C3D4", paidAt: "2026-05-26T09:00:00Z" },
  { id: "payout-1-developer", milestoneId: MILESTONE_1_ID, claimId: CLAIM_1_ID, recipientId: RECIPIENT_DEVELOPER_ID, participantRole: "developer", amount: 22200, currency: "USD", status: "paid", proximityPayRef: "PXP-B2C3D4E5", paidAt: "2026-05-26T09:00:05Z" },
  { id: "payout-1-farmer", milestoneId: MILESTONE_1_ID, claimId: CLAIM_1_ID, recipientId: RECIPIENT_FARMER_ID, participantRole: "farmer_community", amount: 9990, currency: "USD", status: "paid", proximityPayRef: "PXP-C3D4E5F6", paidAt: "2026-05-26T09:00:10Z" },
  { id: "payout-1-investor", milestoneId: MILESTONE_1_ID, claimId: CLAIM_1_ID, participantRole: "investor", amount: 1850, currency: "USD", status: "paid", proximityPayRef: "PXP-D4E5F6A7", paidAt: "2026-05-26T09:00:15Z" },

  { id: "payout-2-platform", milestoneId: MILESTONE_2_ID, claimId: CLAIM_2_ID, participantRole: "platform", amount: 4440, currency: "USD", status: "ready" },
  { id: "payout-2-developer", milestoneId: MILESTONE_2_ID, claimId: CLAIM_2_ID, recipientId: RECIPIENT_DEVELOPER_ID, participantRole: "developer", amount: 33300, currency: "USD", status: "ready" },
  { id: "payout-2-farmer", milestoneId: MILESTONE_2_ID, claimId: CLAIM_2_ID, recipientId: RECIPIENT_FARMER_ID, participantRole: "farmer_community", amount: 14985, currency: "USD", status: "blocked_awaiting_bav" },
  { id: "payout-2-investor", milestoneId: MILESTONE_2_ID, claimId: CLAIM_2_ID, participantRole: "investor", amount: 2775, currency: "USD", status: "ready" },
];

// Escrow funded for the full $185,000 at agreement activation, minus milestone 1's $37,000 already
// paid out. fundedAt is set ~6 weeks before this app's narrative "today" (2026-07-09, see other
// seed data's dates) so the escrow panel's live-computed interest accrual shows a real, non-zero number.
export const escrowAccounts: EscrowAccount[] = [
  {
    id: "escrow-kaveri",
    paymentAgreementId: AGREEMENT_ID,
    heldAmount: 148000,
    currency: "USD",
    corePortionBalance: 148000,
    interestAccruedToDate: 0,
    status: "partially_released",
    fundedAt: "2026-05-25T09:00:00Z",
  },
];

/** Raw (eventType, payload, timestamp) tuples — prisma/seed.ts turns these into a real
 * hash-chained PaymentAuditLogEntry sequence using the exact same computeHash() the live app
 * uses, so "Verify chain" passes on seeded data exactly as it would on live-created entries. */
// Strict chronological order — prisma/seed.ts chains these in array order, and
// verifyAuditChain() re-sorts by timestamp before checking, so the two must agree (evidence can
// never actually predate the claim.submitted event that created it, matching the real API's
// own order of operations: /claims/[id]/evidence 404s until the claim exists).
export const paymentAuditSeedEvents: { paymentAgreementId: string; eventType: string; payload: unknown; timestamp: string }[] = [
  { paymentAgreementId: AGREEMENT_ID, eventType: "agreement.created", payload: { buyerName: "Meridian Foods", projectName: "Kaveri Biochar Coop", totalValue: 185000 }, timestamp: "2026-05-20T09:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "agreement.activated", payload: { totalValue: 185000, currency: "USD", provider: "Proximity Pay" }, timestamp: "2026-05-20T09:05:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "claim.submitted", payload: { claimId: CLAIM_1_ID, milestoneId: MILESTONE_1_ID, claimedAmount: 37000 }, timestamp: "2026-05-25T11:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "evidence.attached", payload: { claimId: CLAIM_1_ID, evidenceId: "evidence-kaveri-1", fileName: "plant_commissioning_site_inspection.jpg" }, timestamp: "2026-05-25T11:05:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "consent.recorded", payload: { claimId: CLAIM_1_ID, consentId: "consent-1-investor", requiredRole: "investor", status: "approved" }, timestamp: "2026-05-25T15:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "consent.recorded", payload: { claimId: CLAIM_1_ID, consentId: "consent-1-ops", requiredRole: "platform_ops", status: "approved" }, timestamp: "2026-05-25T16:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "claim.consented", payload: { claimId: CLAIM_1_ID, payoutInstructionsCreated: 4 }, timestamp: "2026-05-25T16:00:01Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.routed", payload: { payoutInstructionId: "payout-1-platform", provider: "Proximity Pay · Internal Ledger", reference: "PXP-A1B2C3D4" }, timestamp: "2026-05-26T09:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.settled", payload: { payoutInstructionId: "payout-1-platform", reference: "PXP-A1B2C3D4", amount: 2960 }, timestamp: "2026-05-26T09:00:01Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.routed", payload: { payoutInstructionId: "payout-1-developer", provider: "Proximity Pay · Local Bank Transfer", reference: "PXP-B2C3D4E5" }, timestamp: "2026-05-26T09:00:05Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.settled", payload: { payoutInstructionId: "payout-1-developer", reference: "PXP-B2C3D4E5", amount: 22200 }, timestamp: "2026-05-26T09:00:06Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.routed", payload: { payoutInstructionId: "payout-1-farmer", provider: "Proximity Pay · UPI", reference: "PXP-C3D4E5F6" }, timestamp: "2026-05-26T09:00:10Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.settled", payload: { payoutInstructionId: "payout-1-farmer", reference: "PXP-C3D4E5F6", amount: 9990 }, timestamp: "2026-05-26T09:00:11Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.routed", payload: { payoutInstructionId: "payout-1-investor", provider: "Proximity Pay · Internal Ledger", reference: "PXP-D4E5F6A7" }, timestamp: "2026-05-26T09:00:15Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "payout.settled", payload: { payoutInstructionId: "payout-1-investor", reference: "PXP-D4E5F6A7", amount: 1850 }, timestamp: "2026-05-26T09:00:16Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "claim.submitted", payload: { claimId: CLAIM_2_ID, milestoneId: MILESTONE_2_ID, claimedAmount: 55500 }, timestamp: "2026-06-20T14:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "evidence.attached", payload: { claimId: CLAIM_2_ID, evidenceId: "evidence-kaveri-2", fileName: "production_application_log_june.pdf" }, timestamp: "2026-06-20T14:05:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "consent.recorded", payload: { claimId: CLAIM_2_ID, consentId: "consent-2-investor", requiredRole: "investor", status: "approved" }, timestamp: "2026-06-21T09:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "consent.recorded", payload: { claimId: CLAIM_2_ID, consentId: "consent-2-ops", requiredRole: "platform_ops", status: "approved" }, timestamp: "2026-06-21T10:00:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "claim.consented", payload: { claimId: CLAIM_2_ID, payoutInstructionsCreated: 4 }, timestamp: "2026-06-21T10:00:01Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "claim.submitted", payload: { claimId: CLAIM_3_ID, milestoneId: MILESTONE_3_ID, claimedAmount: 92500 }, timestamp: "2026-07-05T16:30:00Z" },
  { paymentAgreementId: AGREEMENT_ID, eventType: "evidence.attached", payload: { claimId: CLAIM_3_ID, evidenceId: "evidence-kaveri-3", fileName: "proximity_dmrv_export_cycle1.json" }, timestamp: "2026-07-05T16:35:00Z" },
];
