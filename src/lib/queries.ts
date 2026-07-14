/**
 * Read-side Prisma queries, deliberately named/shaped to match the static getters every page used
 * to import from "@/data" (getFormTemplate, getFlowTemplate, ...) — moving a page from mock data to
 * the database is largely just swapping the import source.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import {
  toConnector,
  toDevice,
  toDomainPack,
  toEscrowAccount,
  toEvidenceAttachment,
  toFlowTemplate,
  toFormTemplate,
  toGateOverride,
  toMilestone,
  toMilestoneClaim,
  toOrganization,
  toPaymentAgreement,
  toPaymentAgreementParty,
  toPaymentAuditLogEntry,
  toPayoutInstruction,
  toPayoutRecipient,
  toProject,
  toRole,
  toSplitRule,
  toStage,
  toStakeholderConsent,
  toSubmission,
  toTelemetryStream,
  toUser,
  toMilestoneTemplate,
  type FormCounts,
} from "@/lib/mappers";
import type {
  Connector,
  DomainPack,
  Device,
  EscrowAccount,
  EvidenceAttachment,
  FlowTemplate,
  FormFieldDefinition,
  FormTemplate,
  FormTemplateVersion,
  GateOverride,
  LinkFilter,
  Milestone,
  MilestoneClaim,
  MilestoneTemplate,
  Organization,
  ParticipantRole,
  PaymentAgreement,
  PaymentAgreementParty,
  PaymentAuditLogEntry,
  PaymentPartyRole,
  PayoutInstruction,
  PayoutRecipient,
  Project,
  Role,
  RoleTier,
  SplitRule,
  Stage,
  StakeholderConsent,
  Submission,
  SubmissionAnswer,
  TelemetryStream,
  User,
} from "@/types";

/** Which of a form's fields actually reference another submission at runtime — the field types
 * `LinkedRecordPicker` resolves to a real record id, as opposed to a plain typed-in value. */
export function deriveLinkedSubmissionIds(fields: FormFieldDefinition[], answers: SubmissionAnswer[]): string[] {
  const linkFieldCodes = new Set(
    fields
      .filter((f) => f.fieldType === "linked_record" || (f.fieldType === "lookup_select" && f.lookupSource?.kind === "internal_form"))
      .map((f) => f.fieldCode)
  );
  return answers
    .filter((a) => linkFieldCodes.has(a.fieldCode) && typeof a.value === "string" && a.value.trim() !== "")
    .map((a) => a.value as string);
}

/** Same as deriveLinkedSubmissionIds, restricted to fields the Studio setup actually marked
 * exclusive (linkedExclusive / lookupSource.excludeAlreadyLinked) — these are the ones that need a
 * real-time re-check at write time, not just at picker-list time, so two submitters can't both
 * claim the same upstream record. */
export function deriveExclusiveLinkedSubmissionIds(fields: FormFieldDefinition[], answers: SubmissionAnswer[]): string[] {
  const exclusiveFieldCodes = new Set(
    fields
      .filter(
        (f) =>
          (f.fieldType === "linked_record" && f.linkedExclusive) ||
          (f.fieldType === "lookup_select" && f.lookupSource?.kind === "internal_form" && f.lookupSource.excludeAlreadyLinked)
      )
      .map((f) => f.fieldCode)
  );
  return answers
    .filter((a) => exclusiveFieldCodes.has(a.fieldCode) && typeof a.value === "string" && a.value.trim() !== "")
    .map((a) => a.value as string);
}

export class LinkedRecordConflictError extends Error {
  constructor(public readonly conflictingIds: string[]) {
    super("One or more linked records have already been claimed by another submission.");
    this.name = "LinkedRecordConflictError";
  }
}

/** Must run inside the same transaction as the submission write it's guarding, at Serializable
 * isolation — a plain read-then-write has a gap where two concurrent submitters can both see a
 * record as unclaimed and both link it. Serializable makes Postgres itself abort one of the two
 * competing transactions (caught by the caller as a P2034 and surfaced as a 409) instead. */
export async function assertLinksStillAvailable(
  tx: Prisma.TransactionClient,
  exclusiveIds: string[],
  excludeSubmissionId?: string
): Promise<void> {
  if (exclusiveIds.length === 0) return;
  const claimants = await tx.submission.findMany({
    where: {
      linkedSubmissionIds: { hasSome: exclusiveIds },
      isTest: false,
      ...(excludeSubmissionId ? { id: { not: excludeSubmissionId } } : {}),
    },
    select: { linkedSubmissionIds: true },
  });
  const claimed = new Set(claimants.flatMap((c) => c.linkedSubmissionIds));
  const conflicts = exclusiveIds.filter((id) => claimed.has(id));
  if (conflicts.length > 0) throw new LinkedRecordConflictError(conflicts);
}

export async function getRole(id: string): Promise<Role | undefined> {
  const row = await prisma.role.findUnique({ where: { id } });
  return row ? toRole(row) : undefined;
}

/** Every real role defined for one organization — used to show actual job titles (e.g. "Field
 * Surveyor") instead of raw tier codes wherever a tier is picked, e.g. Flow Studio's node inspector. */
export async function getRolesByOrganization(organizationId: string): Promise<Role[]> {
  const rows = await prisma.role.findMany({ where: { organizationId } });
  return rows.map(toRole);
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

export async function getOrganizationsByIds(ids: string[]): Promise<Record<string, Organization>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return {};
  const rows = await prisma.organization.findMany({ where: { id: { in: uniqueIds } } });
  return Object.fromEntries(rows.map((row) => [row.id, toOrganization(row)]));
}

export async function getStagesByDomainPack(domainPackId: string): Promise<Stage[]> {
  const rows = await prisma.stage.findMany({ where: { domainPackId }, orderBy: { sortOrder: "asc" } });
  return rows.map(toStage);
}

export async function getStage(id: string): Promise<Stage | undefined> {
  const row = await prisma.stage.findUnique({ where: { id } });
  return row ? toStage(row) : undefined;
}

/** Every stage across the caller's own accessible domain packs — see getAllFormTemplates. */
export async function getAllStages(domainPackIds: string[]): Promise<Stage[]> {
  const rows = await prisma.stage.findMany({ where: { domainPackId: { in: domainPackIds } }, orderBy: { sortOrder: "asc" } });
  return rows.map(toStage);
}

export async function getFormCounts(formTemplateId: string): Promise<FormCounts> {
  const [submissionCount, needsCheckCount, needsFixCount] = await Promise.all([
    prisma.submission.count({ where: { formTemplateId, isTest: false } }),
    prisma.submission.count({ where: { formTemplateId, reviewStatus: "needs_check", isTest: false } }),
    prisma.submission.count({ where: { formTemplateId, reviewStatus: "needs_fix", isTest: false } }),
  ]);
  return { submissionCount, needsCheckCount, needsFixCount };
}

async function latestVersion(formTemplateId: string) {
  return prisma.formTemplateVersion.findFirst({ where: { formTemplateId }, orderBy: { versionNo: "desc" } });
}

/** Version-pinned lookup — used to render a submission's answers against the exact field set it was submitted under. */
export async function getFormTemplateVersionFields(formTemplateId: string, versionNo: number) {
  const version = await prisma.formTemplateVersion.findUnique({
    where: { formTemplateId_versionNo: { formTemplateId, versionNo } },
  });
  return version ? (version.fields as unknown as FormFieldDefinition[]) : undefined;
}

/** The version submitters actually fill out — real field data is only ever collected against
 * what's been published, never an in-progress draft. */
export async function getLatestPublishedVersion(formTemplateId: string) {
  return prisma.formTemplateVersion.findFirst({ where: { formTemplateId, status: "published" }, orderBy: { versionNo: "desc" } });
}

/** Every version a form has ever had — used to build the full column set for the validation table
 * (fields removed since, fields added since) rather than just the current version's fields. */
export async function getFormTemplateVersions(formTemplateId: string): Promise<FormTemplateVersion[]> {
  const rows = await prisma.formTemplateVersion.findMany({ where: { formTemplateId }, orderBy: { versionNo: "asc" } });
  return rows.map((row) => ({
    versionNo: row.versionNo,
    status: row.status as "draft" | "published",
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    fields: row.fields as unknown as FormFieldDefinition[],
  }));
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

/** Every form template across the caller's own accessible domain packs (their orgs' domain packs,
 * or literally every domain pack for a platform admin, by construction of the caller's org list) —
 * used once to hydrate the client Studio store. Never unscoped: a domain pack can be shared by
 * several organizations, but a form/flow/stage design is still that domain pack owner's IP and
 * must not leak to an org on a different domain pack. */
export async function getAllFormTemplates(domainPackIds: string[]): Promise<FormTemplate[]> {
  const rows = await prisma.formTemplate.findMany({ where: { domainPackId: { in: domainPackIds } } });
  const results: FormTemplate[] = [];
  for (const row of rows) {
    const version = await latestVersion(row.id);
    if (!version) continue;
    const counts = await getFormCounts(row.id);
    results.push(toFormTemplate(row, version, counts));
  }
  return results;
}

export async function getFlowTemplatesByProject(projectId: string): Promise<FlowTemplate[]> {
  const rows = await prisma.flowTemplate.findMany({ where: { projectId } });
  return rows.map(toFlowTemplate);
}

export async function getFlowTemplate(id: string): Promise<FlowTemplate | undefined> {
  const row = await prisma.flowTemplate.findUnique({ where: { id } });
  return row ? toFlowTemplate(row) : undefined;
}

/** Every flow template across the caller's own accessible projects — see getAllFormTemplates. */
export async function getAllFlowTemplates(projectIds: string[]): Promise<FlowTemplate[]> {
  const rows = await prisma.flowTemplate.findMany({ where: { projectId: { in: projectIds } } });
  return rows.map(toFlowTemplate);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const row = await prisma.project.findUnique({ where: { id } });
  return row ? toProject(row) : undefined;
}

export async function getProjectsByOrganization(organizationId: string): Promise<Project[]> {
  const rows = await prisma.project.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });
  return rows.map(toProject);
}

/**
 * A domain pack (and therefore a form) can be shared by several organizations, so a form's
 * submissions must always be scoped to the caller's own organization — never returned unscoped.
 * Capped at 1000 rows; a real paginated Records view is a reasonable follow-up once any single
 * org's history grows past that.
 */
export async function getSubmissionsByForm(formTemplateId: string, organizationId: string): Promise<Submission[]> {
  const rows = await prisma.submission.findMany({
    where: { formTemplateId, isTest: false, submittedBy: { memberships: { some: { organizationId, status: "active" } } } },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  return rows.map(toSubmission);
}

export async function getTestSubmissionsByForm(formTemplateId: string, organizationId: string): Promise<Submission[]> {
  const rows = await prisma.submission.findMany({
    where: { formTemplateId, isTest: true, submittedBy: { memberships: { some: { organizationId, status: "active" } } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return rows.map(toSubmission);
}

export async function getSubmission(id: string): Promise<Submission | undefined> {
  const row = await prisma.submission.findUnique({ where: { id } });
  return row ? toSubmission(row) : undefined;
}

/** Filters a list of user ids down to the ones with active membership in organizationId — used to
 * verify a submission (identified by its submittedByUserId) actually belongs to the caller's org
 * before it's shown, since `getSubmission` itself is org-unaware (it's also used org-safely inside
 * already-scoped flows like resubmit, which separately checks ownership). */
export async function filterUserIdsByOrganization(userIds: string[], organizationId: string): Promise<Set<string>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Set();
  const memberships = await prisma.orgMembership.findMany({
    where: { userId: { in: uniqueIds }, organizationId, status: "active" },
    select: { userId: true },
  });
  return new Set(memberships.map((m) => m.userId));
}

/** A submitter's own submission history for the Collect app's "My submissions" list. */
export async function getSubmissionsByUser(userId: string): Promise<Submission[]> {
  const rows = await prisma.submission.findMany({ where: { submittedByUserId: userId, isTest: false }, orderBy: { updatedAt: "desc" } });
  return rows.map(toSubmission);
}

export interface LinkCandidate {
  id: string;
  displayId: string;
  summary: string;
}

function matchesFilter(submission: Submission, filter: LinkFilter): boolean {
  const answer = submission.answers.find((a) => a.fieldCode === filter.fieldCode);
  const value = String(answer?.value ?? "");
  switch (filter.operator) {
    case "equals":
      return value === filter.value;
    case "not_equals":
      return value !== filter.value;
    case "contains":
      return value.toLowerCase().includes(filter.value.toLowerCase());
  }
}

function summarizeAnswers(submission: Submission): string {
  const parts = submission.answers
    .filter((a) => a.value !== null && a.value !== undefined && String(a.value).trim() !== "")
    .slice(0, 2)
    .map((a) => String(a.value));
  return parts.join(" · ");
}

/**
 * Real candidates for a linked_record / internal-form lookup_select field — the runtime half of
 * the Studio-configured relationship (source form + optional value filter + optional exclusivity).
 * Scoped to the caller's own organization even though a domain pack can be shared by several orgs,
 * and (when requested) excludes anything already claimed by another submission's linkedSubmissionIds.
 */
export async function getLinkCandidates(params: {
  formTemplateId: string;
  organizationId: string;
  filter?: LinkFilter;
  excludeClaimed?: boolean;
}): Promise<LinkCandidate[]> {
  const { formTemplateId, organizationId, filter, excludeClaimed } = params;

  const rows = await prisma.submission.findMany({
    where: {
      formTemplateId,
      isTest: false,
      submittedBy: { memberships: { some: { organizationId, status: "active" } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  let candidates = rows.map(toSubmission);

  if (filter) {
    candidates = candidates.filter((s) => matchesFilter(s, filter));
  }

  if (excludeClaimed && candidates.length > 0) {
    const claimed = await prisma.submission.findMany({
      where: { linkedSubmissionIds: { hasSome: candidates.map((c) => c.id) } },
      select: { linkedSubmissionIds: true },
    });
    const claimedIds = new Set(claimed.flatMap((c) => c.linkedSubmissionIds));
    candidates = candidates.filter((s) => !claimedIds.has(s.id));
  }

  return candidates.map((s) => ({ id: s.id, displayId: s.displayId, summary: summarizeAnswers(s) }));
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

// ---------- Payments ----------

export async function getUsersByIds(ids: string[]): Promise<Record<string, { fullName: string; avatarInitials: string }>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return {};
  const rows = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, fullName: true, avatarInitials: true } });
  return Object.fromEntries(rows.map((r) => [r.id, { fullName: r.fullName, avatarInitials: r.avatarInitials }]));
}

/** Every agreement a user can see: all of them for a platform admin, otherwise the union of "my
 * org owns it" (ground-partner staff) and "I'm a party to it" (investor/registry) — never one
 * combined query, since those are two genuinely different access paths (see requirePaymentOrgAccess
 * vs requirePaymentPartyAccess in authz.ts). */
export async function getPaymentAgreementsForUser(userId: string, isPlatformAdmin: boolean): Promise<PaymentAgreement[]> {
  if (isPlatformAdmin) {
    const rows = await prisma.paymentAgreement.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toPaymentAgreement);
  }
  const [memberships, parties] = await Promise.all([
    prisma.orgMembership.findMany({ where: { userId, status: "active" }, select: { organizationId: true } }),
    prisma.paymentAgreementParty.findMany({ where: { userId }, select: { paymentAgreementId: true } }),
  ]);
  const orgIds = memberships.map((m) => m.organizationId);
  const partyAgreementIds = parties.map((p) => p.paymentAgreementId);
  if (orgIds.length === 0 && partyAgreementIds.length === 0) return [];
  const rows = await prisma.paymentAgreement.findMany({
    where: { OR: [{ organizationId: { in: orgIds } }, { id: { in: partyAgreementIds } }] },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPaymentAgreement);
}

export async function getPaymentAgreement(id: string): Promise<PaymentAgreement | undefined> {
  const row = await prisma.paymentAgreement.findUnique({ where: { id } });
  return row ? toPaymentAgreement(row) : undefined;
}

/** A project's own milestone templates — the one place a project developer defines what %
 * of the total a milestone releases and how it splits across roles, authored once and then
 * referenced (never re-typed) by a flow's payment_step node and by every real agreement created
 * for this project. */
export async function getMilestoneTemplatesByProject(projectId: string): Promise<MilestoneTemplate[]> {
  const rows = await prisma.milestoneTemplate.findMany({
    where: { projectId },
    include: { splitRules: true },
    orderBy: { order: "asc" },
  });
  return rows.map(toMilestoneTemplate);
}

export async function getMilestoneTemplate(id: string): Promise<MilestoneTemplate | undefined> {
  const row = await prisma.milestoneTemplate.findUnique({ where: { id }, include: { splitRules: true } });
  return row ? toMilestoneTemplate(row) : undefined;
}

export interface MilestoneLedgerRoleShare {
  participantRole: ParticipantRole;
  percent: number;
  /** This role's share of the milestone's total deal-value allocation, across every real agreement running this template. */
  allocated: number;
  /** Actually paid out (payoutInstruction.status === "paid"). */
  disbursed: number;
  /** allocated - disbursed, floored at 0 — still notionally held in escrow for this role on this milestone. */
  pending: number;
}

export interface MilestoneLedger {
  milestoneTemplateId: string;
  label: string;
  percentOfTotal: number;
  currency: string;
  /** How many real agreements have snapshotted this template into a live Milestone. */
  agreementCount: number;
  totalAllocated: number;
  totalDisbursed: number;
  totalPending: number;
  roles: MilestoneLedgerRoleShare[];
}

/** Live rollup — asynchronously "open the milestone and check the ledger": how much of a milestone
 * template's allocation is escrowed vs. actually disbursed, per role, computed fresh from every
 * real agreement/milestone/payout-instruction that snapshotted this template. Never hand-entered. */
export async function getMilestoneLedger(milestoneTemplateId: string): Promise<MilestoneLedger | undefined> {
  const template = await prisma.milestoneTemplate.findUnique({ where: { id: milestoneTemplateId }, include: { splitRules: true } });
  if (!template) return undefined;

  const milestones = await prisma.milestone.findMany({
    where: { sourceTemplateId: milestoneTemplateId },
    include: { paymentAgreement: true, payoutInstructions: true },
  });

  const currency = milestones[0]?.paymentAgreement.currency ?? "USD";
  const roles = template.splitRules.map((rule) => {
    let allocated = 0;
    let disbursed = 0;
    for (const milestone of milestones) {
      const milestoneValue = milestone.paymentAgreement.totalValue * (milestone.percentOfTotal / 100);
      allocated += milestoneValue * (rule.percent / 100);
      for (const payout of milestone.payoutInstructions) {
        if (payout.participantRole === rule.participantRole && payout.status === "paid") disbursed += payout.amount;
      }
    }
    allocated = Math.round(allocated * 100) / 100;
    disbursed = Math.round(disbursed * 100) / 100;
    return {
      participantRole: rule.participantRole as ParticipantRole,
      percent: rule.percent,
      allocated,
      disbursed,
      pending: Math.max(0, Math.round((allocated - disbursed) * 100) / 100),
    };
  });

  return {
    milestoneTemplateId,
    label: template.label,
    percentOfTotal: template.percentOfTotal,
    currency,
    agreementCount: new Set(milestones.map((m) => m.paymentAgreementId)).size,
    totalAllocated: Math.round(roles.reduce((sum, r) => sum + r.allocated, 0) * 100) / 100,
    totalDisbursed: Math.round(roles.reduce((sum, r) => sum + r.disbursed, 0) * 100) / 100,
    totalPending: Math.round(roles.reduce((sum, r) => sum + r.pending, 0) * 100) / 100,
    roles,
  };
}

/** The current user's own party rows across every agreement — powers the "your investments" /
 * "your registry queue" summary above the agreement list. */
export async function getPaymentPartiesForUser(userId: string): Promise<PaymentAgreementParty[]> {
  const rows = await prisma.paymentAgreementParty.findMany({ where: { userId } });
  return rows.map(toPaymentAgreementParty);
}

export interface PaymentAccess {
  canView: boolean;
  isOrgMember: boolean;
  orgTier?: RoleTier;
  partyRoles: PaymentPartyRole[];
}

/** Resolves everything the agreement detail page needs to know about what one viewer can see/do:
 * platform admin (everything), org-staff membership in the agreement's own org (ground-partner
 * claim filing), and/or PaymentAgreementParty rows (investor/registry). Three genuinely different
 * access paths, deliberately not collapsed into one query (see decision #1 in the payments plan). */
export async function getPaymentAccessForUser(
  userId: string,
  isPlatformAdmin: boolean,
  organizationId: string,
  paymentAgreementId: string
): Promise<PaymentAccess> {
  if (isPlatformAdmin) return { canView: true, isOrgMember: true, orgTier: "platform", partyRoles: [] };
  const [membership, parties] = await Promise.all([
    prisma.orgMembership.findFirst({ where: { userId, organizationId, status: "active" }, include: { role: true } }),
    prisma.paymentAgreementParty.findMany({ where: { userId, paymentAgreementId } }),
  ]);
  const partyRoles = parties.map((p) => p.role as PaymentPartyRole);
  return {
    canView: !!membership || partyRoles.length > 0,
    isOrgMember: !!membership,
    orgTier: membership ? (membership.role.tier as RoleTier) : undefined,
    partyRoles,
  };
}

export interface PaymentMilestoneDetail extends Milestone {
  claims: (MilestoneClaim & { evidence: EvidenceAttachment[]; consents: StakeholderConsent[] })[];
  payoutInstructions: (PayoutInstruction & { recipient?: PayoutRecipient; overrides: GateOverride[] })[];
  splitRules: SplitRule[];
}

export interface PaymentAgreementDetail {
  agreement: PaymentAgreement;
  organizationName: string;
  splitRules: SplitRule[];
  milestones: PaymentMilestoneDetail[];
  parties: PaymentAgreementParty[];
  recipients: PayoutRecipient[];
  escrow?: EscrowAccount;
  auditEntries: PaymentAuditLogEntry[];
  usersById: Record<string, { fullName: string; avatarInitials: string }>;
}

/** The one aggregate fetch backing the agreement detail screen — a single nested query rather than
 * N+1 round trips, since every piece (milestones, claims, evidence, consents, payouts, escrow,
 * audit trail) is needed together to render the page. */
export async function getPaymentAgreementDetail(id: string): Promise<PaymentAgreementDetail | undefined> {
  const row = await prisma.paymentAgreement.findUnique({
    where: { id },
    include: {
      organization: { select: { name: true } },
      splitRules: true,
      milestones: {
        orderBy: { order: "asc" },
        include: {
          claims: { orderBy: { submittedAt: "desc" }, include: { evidence: true, consents: true } },
          payoutInstructions: { include: { recipient: true, overrides: { orderBy: { createdAt: "desc" } } } },
          splitRules: true,
        },
      },
      parties: true,
      recipients: true,
      escrow: true,
      auditEntries: { orderBy: { timestamp: "asc" } },
    },
  });
  if (!row) return undefined;

  const userIds = new Set<string>([row.createdByUserId]);
  for (const party of row.parties) userIds.add(party.userId);
  for (const milestone of row.milestones) {
    for (const claim of milestone.claims) {
      userIds.add(claim.submittedByUserId);
      for (const consent of claim.consents) if (consent.consentedByUserId) userIds.add(consent.consentedByUserId);
    }
    for (const instruction of milestone.payoutInstructions) {
      for (const override of instruction.overrides) {
        if (override.partnerApprovalByUserId) userIds.add(override.partnerApprovalByUserId);
        if (override.investorApprovalByUserId) userIds.add(override.investorApprovalByUserId);
      }
    }
  }
  const usersById = await getUsersByIds([...userIds]);

  return {
    agreement: toPaymentAgreement(row),
    organizationName: row.organization.name,
    // Agreement-wide only (milestoneId null) — how pre-template agreements were created. Each
    // milestone's own split (from a MilestoneTemplate) is on PaymentMilestoneDetail.splitRules
    // instead, since different milestones can now pay different roles different percentages.
    splitRules: row.splitRules.filter((r) => r.milestoneId === null).map(toSplitRule),
    milestones: row.milestones.map((m) => ({
      ...toMilestone(m),
      claims: m.claims.map((c) => ({
        ...toMilestoneClaim(c),
        evidence: c.evidence.map(toEvidenceAttachment),
        consents: c.consents.map(toStakeholderConsent),
      })),
      payoutInstructions: m.payoutInstructions.map((pi) => ({
        ...toPayoutInstruction(pi),
        recipient: pi.recipient ? toPayoutRecipient(pi.recipient) : undefined,
        overrides: pi.overrides.map(toGateOverride),
      })),
      splitRules: m.splitRules.map(toSplitRule),
    })),
    parties: row.parties.map(toPaymentAgreementParty),
    recipients: row.recipients.map(toPayoutRecipient),
    escrow: row.escrow ? toEscrowAccount(row.escrow) : undefined,
    auditEntries: row.auditEntries.map(toPaymentAuditLogEntry),
    usersById,
  };
}
