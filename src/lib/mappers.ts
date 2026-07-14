/**
 * Adapts Prisma rows to the exact TS shapes every component already expects (src/types/*.ts).
 * Centralizing this here means the app's API/response shapes never had to change when the
 * persistence layer moved from static arrays to a real database.
 */
import type {
  Organization as OrgRow,
  User as UserRow,
  Role as RoleRow,
  DomainPack as DomainPackRow,
  Stage as StageRow,
  Project as ProjectRow,
  FormTemplate as FormTemplateRow,
  FormTemplateVersion as FormTemplateVersionRow,
  FlowTemplate as FlowTemplateRow,
  Submission as SubmissionRow,
  Connector as ConnectorRow,
  Device as DeviceRow,
  TelemetryStream as TelemetryStreamRow,
  Notification as NotificationRow,
  PaymentAgreement as PaymentAgreementRow,
  SplitRule as SplitRuleRow,
  Milestone as MilestoneRow,
  MilestoneTemplate as MilestoneTemplateRow,
  MilestoneTemplateSplit as MilestoneTemplateSplitRow,
  MilestoneClaim as MilestoneClaimRow,
  EvidenceAttachment as EvidenceAttachmentRow,
  StakeholderConsent as StakeholderConsentRow,
  PaymentAgreementParty as PaymentAgreementPartyRow,
  PayoutRecipient as PayoutRecipientRow,
  PayoutInstruction as PayoutInstructionRow,
  EscrowAccount as EscrowAccountRow,
  GateOverride as GateOverrideRow,
  PaymentAuditLogEntry as PaymentAuditLogEntryRow,
  ServiceListing as ServiceListingRow,
  ProjectServiceIntegration as ProjectServiceIntegrationRow,
} from "@prisma/client";
import type {
  Organization,
  User,
  Role,
  DomainPack,
  Stage,
  Project,
  FormTemplate,
  FormFieldDefinition,
  FlowTemplate,
  FlowNodeDefinition,
  FlowEdgeDefinition,
  Submission,
  SubmissionAnswer,
  EvidenceFile,
  SubmissionVersionRecord,
  ReviewActionRecord,
  Connector,
  Device,
  TelemetryTag,
  DeviceCalibration,
  TelemetryStream,
  TelemetryPoint,
  ChainOfCustodyMode,
  Notification,
  NotificationType,
  PaymentAgreement,
  SplitRule,
  Milestone,
  MilestoneTemplate,
  MilestoneTemplateSplit,
  MilestoneClaim,
  EvidenceAttachment,
  StakeholderConsent,
  PaymentAgreementParty,
  PayoutRecipient,
  PayoutInstruction,
  EscrowAccount,
  GateOverride,
  PaymentAuditLogEntry,
  ServiceListing,
  ProjectServiceIntegration,
} from "@/types";

export function toDomainPack(row: DomainPackRow): DomainPack {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    version: row.version,
    status: row.status as DomainPack["status"],
    description: row.description,
    chainOfCustodyModes: row.chainOfCustodyModes.length > 0 ? (row.chainOfCustodyModes as ChainOfCustodyMode[]) : undefined,
    defaultChainOfCustodyMode: (row.defaultChainOfCustodyMode as ChainOfCustodyMode | null) ?? undefined,
  };
}

export function toOrganization(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domainPackId: row.domainPackId,
    planTier: row.planTier as Organization["planTier"],
    status: row.status as Organization["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    avatarInitials: row.avatarInitials,
    status: row.status as User["status"],
    isPlatformAdmin: row.isPlatformAdmin,
    mobileNumber: row.mobileNumber ?? undefined,
    country: row.country ?? undefined,
    state: row.state ?? undefined,
    district: row.district ?? undefined,
  };
}

export function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    tier: row.tier as Role["tier"],
    description: row.description,
    canView: row.canView,
    canAct: row.canAct,
    cannot: row.cannot,
  };
}

export function toStage(row: StageRow): Stage {
  return {
    id: row.id,
    domainPackId: row.domainPackId,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sortOrder,
    connectorIds: row.connectorIds,
    formTemplateIds: row.formTemplateIds,
  };
}

export function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organizationId,
    domainPackId: row.domainPackId,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status as Project["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

export interface FormCounts {
  submissionCount: number;
  needsCheckCount: number;
  needsFixCount: number;
}

export function toFormTemplate(row: FormTemplateRow, version: FormTemplateVersionRow, counts: FormCounts): FormTemplate {
  return {
    id: row.id,
    domainPackId: row.domainPackId,
    code: row.code,
    name: row.name,
    description: row.description,
    category: row.category,
    submissionCount: counts.submissionCount,
    needsCheckCount: counts.needsCheckCount,
    needsFixCount: counts.needsFixCount,
    currentVersion: {
      versionNo: version.versionNo,
      status: version.status as FormTemplate["currentVersion"]["status"],
      publishedAt: version.publishedAt ? version.publishedAt.toISOString() : null,
      fields: version.fields as unknown as FormFieldDefinition[],
    },
  };
}

export function toFlowTemplate(row: FlowTemplateRow): FlowTemplate {
  return {
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    name: row.name,
    status: row.status as FlowTemplate["status"],
    versionNo: row.versionNo,
    triggerLabel: row.triggerLabel,
    nodes: row.nodes as unknown as FlowNodeDefinition[],
    edges: row.edges as unknown as FlowEdgeDefinition[],
  };
}

export function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    displayId: row.displayId,
    formTemplateId: row.formTemplateId,
    projectId: row.projectId ?? undefined,
    formTemplateVersionNo: row.formTemplateVersionNo,
    flowNodeLabel: row.flowNodeLabel,
    reviewStatus: row.reviewStatus as Submission["reviewStatus"],
    syncStatus: row.syncStatus as Submission["syncStatus"],
    submittedByUserId: row.submittedByUserId,
    currentVersionNo: row.currentVersionNo,
    updatedAt: row.updatedAt.toISOString(),
    answers: row.answers as unknown as SubmissionAnswer[],
    evidence: row.evidence as unknown as EvidenceFile[],
    versions: row.versions as unknown as SubmissionVersionRecord[],
    reviewActions: row.reviewActions as unknown as ReviewActionRecord[],
    linkedSubmissionIds: row.linkedSubmissionIds.length > 0 ? row.linkedSubmissionIds : undefined,
    smartCheckSummary: row.smartCheckSummary,
    isTest: row.isTest,
  };
}

export function toConnector(row: ConnectorRow): Connector {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    connectorType: row.connectorType as Connector["connectorType"],
    protocol: (row.protocol as Connector["protocol"]) ?? undefined,
    status: row.status as Connector["status"],
    endpoint: row.endpoint ?? undefined,
  };
}

export function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    connectorId: row.connectorId,
    name: row.name,
    externalRef: row.externalRef,
    calibration: (row.calibration as unknown as DeviceCalibration | null) ?? undefined,
    coveragePct: row.coveragePct,
    lastGapMinutes: row.lastGapMinutes ?? undefined,
    tags: row.tags as unknown as TelemetryTag[],
  };
}

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    formTemplateId: row.formTemplateId ?? undefined,
    linkUrl: row.linkUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : undefined,
  };
}

export function toPaymentAgreement(row: PaymentAgreementRow): PaymentAgreement {
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    buyerName: row.buyerName,
    projectName: row.projectName,
    currency: row.currency,
    totalValue: row.totalValue,
    pricePerCredit: row.pricePerCredit ?? undefined,
    escrowInterestAllocation: row.escrowInterestAllocation as PaymentAgreement["escrowInterestAllocation"],
    fxRateTimingPolicy: row.fxRateTimingPolicy as PaymentAgreement["fxRateTimingPolicy"],
    status: row.status as PaymentAgreement["status"],
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSplitRule(row: SplitRuleRow): SplitRule {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    milestoneId: row.milestoneId ?? undefined,
    participantRole: row.participantRole as SplitRule["participantRole"],
    percent: row.percent,
  };
}

export function toMilestoneTemplate(row: MilestoneTemplateRow & { splitRules: MilestoneTemplateSplitRow[] }): MilestoneTemplate {
  return {
    id: row.id,
    projectId: row.projectId,
    type: row.type as MilestoneTemplate["type"],
    label: row.label,
    percentOfTotal: row.percentOfTotal,
    verificationSource: row.verificationSource as MilestoneTemplate["verificationSource"],
    order: row.order,
    splitRules: row.splitRules.map(toMilestoneTemplateSplit),
  };
}

export function toMilestoneTemplateSplit(row: MilestoneTemplateSplitRow): MilestoneTemplateSplit {
  return {
    id: row.id,
    milestoneTemplateId: row.milestoneTemplateId,
    participantRole: row.participantRole as MilestoneTemplateSplit["participantRole"],
    percent: row.percent,
  };
}

export function toMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    sourceTemplateId: row.sourceTemplateId ?? undefined,
    type: row.type as Milestone["type"],
    label: row.label,
    percentOfTotal: row.percentOfTotal,
    verificationSource: row.verificationSource as Milestone["verificationSource"],
    registryRef: row.registryRef ?? undefined,
    order: row.order,
    status: row.status as Milestone["status"],
  };
}

export function toMilestoneClaim(row: MilestoneClaimRow): MilestoneClaim {
  return {
    id: row.id,
    milestoneId: row.milestoneId,
    submittedByUserId: row.submittedByUserId,
    submittedAt: row.submittedAt.toISOString(),
    claimedAmount: row.claimedAmount,
    status: row.status as MilestoneClaim["status"],
  };
}

export function toEvidenceAttachment(row: EvidenceAttachmentRow): EvidenceAttachment {
  return {
    id: row.id,
    claimId: row.claimId,
    sourceType: row.sourceType as EvidenceAttachment["sourceType"],
    fileRef: row.fileRef,
    fileName: row.fileName,
    hash: row.hash,
    submittedAt: row.submittedAt.toISOString(),
  };
}

export function toStakeholderConsent(row: StakeholderConsentRow): StakeholderConsent {
  return {
    id: row.id,
    claimId: row.claimId,
    requiredRole: row.requiredRole as StakeholderConsent["requiredRole"],
    consentedByUserId: row.consentedByUserId ?? undefined,
    consentedAt: row.consentedAt ? row.consentedAt.toISOString() : undefined,
    status: row.status as StakeholderConsent["status"],
    rejectionReason: row.rejectionReason ?? undefined,
  };
}

export function toPaymentAgreementParty(row: PaymentAgreementPartyRow): PaymentAgreementParty {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    userId: row.userId,
    role: row.role as PaymentAgreementParty["role"],
    investedAmount: row.investedAmount ?? undefined,
  };
}

export function toPayoutRecipient(row: PayoutRecipientRow): PayoutRecipient {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    role: row.role as PayoutRecipient["role"],
    name: row.name,
    kycStatus: row.kycStatus as PayoutRecipient["kycStatus"],
    bavStatus: row.bavStatus as PayoutRecipient["bavStatus"],
    kycVerifiedAt: row.kycVerifiedAt ? row.kycVerifiedAt.toISOString() : undefined,
    bavVerifiedAt: row.bavVerifiedAt ? row.bavVerifiedAt.toISOString() : undefined,
  };
}

export function toPayoutInstruction(row: PayoutInstructionRow): PayoutInstruction {
  return {
    id: row.id,
    milestoneId: row.milestoneId,
    claimId: row.claimId,
    recipientId: row.recipientId ?? undefined,
    participantRole: row.participantRole as PayoutInstruction["participantRole"],
    amount: row.amount,
    currency: row.currency,
    status: row.status as PayoutInstruction["status"],
    proximityPayRef: row.proximityPayRef ?? undefined,
    paidAt: row.paidAt ? row.paidAt.toISOString() : undefined,
  };
}

export function toEscrowAccount(row: EscrowAccountRow): EscrowAccount {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    heldAmount: row.heldAmount,
    currency: row.currency,
    corePortionBalance: row.corePortionBalance,
    interestAccruedToDate: row.interestAccruedToDate,
    status: row.status as EscrowAccount["status"],
    fundedAt: row.fundedAt.toISOString(),
  };
}

export function toGateOverride(row: GateOverrideRow): GateOverride {
  return {
    id: row.id,
    payoutInstructionId: row.payoutInstructionId,
    overriddenGate: row.overriddenGate as GateOverride["overriddenGate"],
    partnerApprovalByUserId: row.partnerApprovalByUserId ?? undefined,
    investorApprovalByUserId: row.investorApprovalByUserId ?? undefined,
    justification: row.justification,
    status: row.status as GateOverride["status"],
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPaymentAuditLogEntry(row: PaymentAuditLogEntryRow): PaymentAuditLogEntry {
  return {
    id: row.id,
    paymentAgreementId: row.paymentAgreementId,
    eventType: row.eventType,
    payload: row.payload,
    timestamp: row.timestamp.toISOString(),
    previousHash: row.previousHash,
    hash: row.hash,
  };
}

export function toTelemetryStream(row: TelemetryStreamRow): TelemetryStream {
  return {
    deviceId: row.deviceId,
    parameterCode: row.parameterCode,
    unit: row.unit,
    latestValue: row.latestValue,
    thresholdHigh: row.thresholdHigh ?? undefined,
    points: row.points as unknown as TelemetryPoint[],
  };
}

export function toServiceListing(row: ServiceListingRow): ServiceListing {
  return {
    id: row.id,
    category: row.category as ServiceListing["category"],
    name: row.name,
    provider: row.provider,
    description: row.description,
    pricingModel: row.pricingModel as ServiceListing["pricingModel"],
    priceLabel: row.priceLabel,
    apiAvailable: row.apiAvailable,
    badges: row.badges,
    website: row.website ?? undefined,
    order: row.order,
  };
}

export function toProjectServiceIntegration(row: ProjectServiceIntegrationRow): ProjectServiceIntegration {
  return {
    id: row.id,
    projectId: row.projectId,
    serviceListingId: row.serviceListingId,
    status: row.status as ProjectServiceIntegration["status"],
    requestedByUserId: row.requestedByUserId,
    activatedAt: row.activatedAt.toISOString(),
  };
}
