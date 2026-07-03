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
  FormTemplate as FormTemplateRow,
  FormTemplateVersion as FormTemplateVersionRow,
  FlowTemplate as FlowTemplateRow,
  Submission as SubmissionRow,
  Connector as ConnectorRow,
  Device as DeviceRow,
  TelemetryStream as TelemetryStreamRow,
  Notification as NotificationRow,
} from "@prisma/client";
import type {
  Organization,
  User,
  Role,
  DomainPack,
  Stage,
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
    domainPackId: row.domainPackId,
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
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : undefined,
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
