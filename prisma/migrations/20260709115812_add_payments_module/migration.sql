-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "linkUrl" TEXT;

-- CreateTable
CREATE TABLE "PaymentAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "pricePerCredit" DOUBLE PRECISION,
    "escrowInterestAllocation" TEXT NOT NULL,
    "fxRateTimingPolicy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitRule" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "participantRole" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SplitRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "percentOfTotal" DOUBLE PRECISION NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "registryRef" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneClaim" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "MilestoneClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceAttachment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileRef" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakeholderConsent" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "consentedByUserId" TEXT,
    "consentedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rejectionReason" TEXT,

    CONSTRAINT "StakeholderConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAgreementParty" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "investedAmount" DOUBLE PRECISION,

    CONSTRAINT "PaymentAgreementParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRecipient" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kycStatus" TEXT NOT NULL,
    "bavStatus" TEXT NOT NULL,
    "kycVerifiedAt" TIMESTAMP(3),
    "bavVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "PayoutRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutInstruction" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "recipientId" TEXT,
    "participantRole" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proximityPayRef" TEXT,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PayoutInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowAccount" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "heldAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "corePortionBalance" DOUBLE PRECISION NOT NULL,
    "interestAccruedToDate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "fundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscrowAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GateOverride" (
    "id" TEXT NOT NULL,
    "payoutInstructionId" TEXT NOT NULL,
    "overriddenGate" TEXT NOT NULL,
    "partnerApprovalByUserId" TEXT,
    "investorApprovalByUserId" TEXT,
    "justification" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuditLogEntry" (
    "id" TEXT NOT NULL,
    "paymentAgreementId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "PaymentAuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentAgreement_organizationId_idx" ON "PaymentAgreement"("organizationId");

-- CreateIndex
CREATE INDEX "SplitRule_paymentAgreementId_idx" ON "SplitRule"("paymentAgreementId");

-- CreateIndex
CREATE INDEX "Milestone_paymentAgreementId_idx" ON "Milestone"("paymentAgreementId");

-- CreateIndex
CREATE INDEX "MilestoneClaim_milestoneId_idx" ON "MilestoneClaim"("milestoneId");

-- CreateIndex
CREATE INDEX "EvidenceAttachment_claimId_idx" ON "EvidenceAttachment"("claimId");

-- CreateIndex
CREATE INDEX "StakeholderConsent_claimId_idx" ON "StakeholderConsent"("claimId");

-- CreateIndex
CREATE INDEX "PaymentAgreementParty_userId_idx" ON "PaymentAgreementParty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAgreementParty_paymentAgreementId_userId_role_key" ON "PaymentAgreementParty"("paymentAgreementId", "userId", "role");

-- CreateIndex
CREATE INDEX "PayoutRecipient_paymentAgreementId_idx" ON "PayoutRecipient"("paymentAgreementId");

-- CreateIndex
CREATE INDEX "PayoutInstruction_milestoneId_idx" ON "PayoutInstruction"("milestoneId");

-- CreateIndex
CREATE INDEX "PayoutInstruction_claimId_idx" ON "PayoutInstruction"("claimId");

-- CreateIndex
CREATE INDEX "PayoutInstruction_recipientId_idx" ON "PayoutInstruction"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowAccount_paymentAgreementId_key" ON "EscrowAccount"("paymentAgreementId");

-- CreateIndex
CREATE INDEX "GateOverride_payoutInstructionId_idx" ON "GateOverride"("payoutInstructionId");

-- CreateIndex
CREATE INDEX "PaymentAuditLogEntry_paymentAgreementId_idx" ON "PaymentAuditLogEntry"("paymentAgreementId");

-- AddForeignKey
ALTER TABLE "PaymentAgreement" ADD CONSTRAINT "PaymentAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitRule" ADD CONSTRAINT "SplitRule_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneClaim" ADD CONSTRAINT "MilestoneClaim_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceAttachment" ADD CONSTRAINT "EvidenceAttachment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MilestoneClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeholderConsent" ADD CONSTRAINT "StakeholderConsent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MilestoneClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAgreementParty" ADD CONSTRAINT "PaymentAgreementParty_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAgreementParty" ADD CONSTRAINT "PaymentAgreementParty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRecipient" ADD CONSTRAINT "PayoutRecipient_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MilestoneClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "PayoutRecipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowAccount" ADD CONSTRAINT "EscrowAccount_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateOverride" ADD CONSTRAINT "GateOverride_payoutInstructionId_fkey" FOREIGN KEY ("payoutInstructionId") REFERENCES "PayoutInstruction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuditLogEntry" ADD CONSTRAINT "PaymentAuditLogEntry_paymentAgreementId_fkey" FOREIGN KEY ("paymentAgreementId") REFERENCES "PaymentAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
