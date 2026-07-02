/**
 * Read-side Prisma queries, deliberately named/shaped to match the static getters every page used
 * to import from "@/data" (getFormTemplate, getFlowTemplate, ...) — moving a page from mock data to
 * the database is largely just swapping the import source.
 */
import { prisma } from "@/lib/db";
import {
  toConnector,
  toDevice,
  toDomainPack,
  toFlowTemplate,
  toFormTemplate,
  toOrganization,
  toRole,
  toStage,
  toSubmission,
  toTelemetryStream,
  toUser,
  type FormCounts,
} from "@/lib/mappers";
import type { Connector, DomainPack, Device, FlowTemplate, FormTemplate, Organization, Role, Stage, Submission, TelemetryStream, User } from "@/types";

export async function getRole(id: string): Promise<Role | undefined> {
  const row = await prisma.role.findUnique({ where: { id } });
  return row ? toRole(row) : undefined;
}

export async function getUser(id: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row) : undefined;
}

export async function getDomainPack(id: string): Promise<DomainPack | undefined> {
  const row = await prisma.domainPack.findUnique({ where: { id } });
  return row ? toDomainPack(row) : undefined;
}

export async function getOrganization(id: string): Promise<Organization | undefined> {
  const row = await prisma.organization.findUnique({ where: { id } });
  return row ? toOrganization(row) : undefined;
}

export async function getStagesByDomainPack(domainPackId: string): Promise<Stage[]> {
  const rows = await prisma.stage.findMany({ where: { domainPackId }, orderBy: { sortOrder: "asc" } });
  return rows.map(toStage);
}

export async function getStage(id: string): Promise<Stage | undefined> {
  const row = await prisma.stage.findUnique({ where: { id } });
  return row ? toStage(row) : undefined;
}

/** Every stage across every domain pack — used once to hydrate the client Studio store (see (app)/layout.tsx). */
export async function getAllStages(): Promise<Stage[]> {
  const rows = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toStage);
}

export async function getFormCounts(formTemplateId: string): Promise<FormCounts> {
  const [submissionCount, needsCheckCount, needsFixCount] = await Promise.all([
    prisma.submission.count({ where: { formTemplateId } }),
    prisma.submission.count({ where: { formTemplateId, reviewStatus: "needs_check" } }),
    prisma.submission.count({ where: { formTemplateId, reviewStatus: "needs_fix" } }),
  ]);
  return { submissionCount, needsCheckCount, needsFixCount };
}

async function latestVersion(formTemplateId: string) {
  return prisma.formTemplateVersion.findFirst({ where: { formTemplateId }, orderBy: { versionNo: "desc" } });
}

export async function getFormTemplatesByDomainPack(domainPackId: string): Promise<FormTemplate[]> {
  const rows = await prisma.formTemplate.findMany({ where: { domainPackId } });
  const results: FormTemplate[] = [];
  for (const row of rows) {
    const version = await latestVersion(row.id);
    if (!version) continue;
    const counts = await getFormCounts(row.id);
    results.push(toFormTemplate(row, version, counts));
  }
  return results;
}

export async function getFormTemplate(id: string): Promise<FormTemplate | undefined> {
  const row = await prisma.formTemplate.findUnique({ where: { id } });
  if (!row) return undefined;
  const version = await latestVersion(id);
  if (!version) return undefined;
  const counts = await getFormCounts(id);
  return toFormTemplate(row, version, counts);
}

/** Every form template across every domain pack — used once to hydrate the client Studio store. */
export async function getAllFormTemplates(): Promise<FormTemplate[]> {
  const rows = await prisma.formTemplate.findMany();
  const results: FormTemplate[] = [];
  for (const row of rows) {
    const version = await latestVersion(row.id);
    if (!version) continue;
    const counts = await getFormCounts(row.id);
    results.push(toFormTemplate(row, version, counts));
  }
  return results;
}

export async function getFlowTemplatesByDomainPack(domainPackId: string): Promise<FlowTemplate[]> {
  const rows = await prisma.flowTemplate.findMany({ where: { domainPackId } });
  return rows.map(toFlowTemplate);
}

export async function getFlowTemplate(id: string): Promise<FlowTemplate | undefined> {
  const row = await prisma.flowTemplate.findUnique({ where: { id } });
  return row ? toFlowTemplate(row) : undefined;
}

/** Every flow template across every domain pack — used once to hydrate the client Studio store. */
export async function getAllFlowTemplates(): Promise<FlowTemplate[]> {
  const rows = await prisma.flowTemplate.findMany();
  return rows.map(toFlowTemplate);
}

export async function getSubmissionsByForm(formTemplateId: string): Promise<Submission[]> {
  const rows = await prisma.submission.findMany({ where: { formTemplateId }, orderBy: { updatedAt: "desc" } });
  return rows.map(toSubmission);
}

export async function getSubmission(id: string): Promise<Submission | undefined> {
  const row = await prisma.submission.findUnique({ where: { id } });
  return row ? toSubmission(row) : undefined;
}

export async function getConnectorsByOrganization(organizationId: string): Promise<Connector[]> {
  const rows = await prisma.connector.findMany({ where: { organizationId } });
  return rows.map(toConnector);
}

export async function getConnector(id: string): Promise<Connector | undefined> {
  const row = await prisma.connector.findUnique({ where: { id } });
  return row ? toConnector(row) : undefined;
}

export async function getDevicesByConnector(connectorId: string): Promise<Device[]> {
  const rows = await prisma.device.findMany({ where: { connectorId } });
  return rows.map(toDevice);
}

export async function getDevice(id: string): Promise<Device | undefined> {
  const row = await prisma.device.findUnique({ where: { id } });
  return row ? toDevice(row) : undefined;
}

export async function getTelemetryStreamsByDevice(deviceId: string): Promise<TelemetryStream[]> {
  const rows = await prisma.telemetryStream.findMany({ where: { deviceId } });
  return rows.map(toTelemetryStream);
}
