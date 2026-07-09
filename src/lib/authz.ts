import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canActAsOps, canCreatePaymentAgreement, canDeleteStage, canEditStudio, canManageTeam, canReview, canSubmitClaim } from "@/lib/permissions";
import type { PaymentPartyRole, RoleTier } from "@/types";

type AccessResult = { ok: true; userId: string } | { ok: false; status: 401 | 403; message: string };

/**
 * Server-side authorization for Studio mutations — the client hides edit affordances for
 * non-editors, but that's a UX nicety, not security. Every mutating route re-checks here,
 * since hiding a button client-side never stops a direct API request.
 */
export async function requireStudioEditAccess(domainPackId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const memberships = await prisma.orgMembership.findMany({
    where: { userId: user.id, status: "active", organization: { domainPackId } },
    include: { role: true },
  });
  const canEdit = memberships.some((membership) => canEditStudio(membership.role.tier as RoleTier));

  if (!canEdit) {
    return { ok: false, status: 403, message: "You don't have edit access for this domain pack" };
  }
  return { ok: true, userId: user.id };
}

/** View-only check: any active membership in the org (or platform admin) is enough to read its data. */
export async function requireOrgAccess(organizationId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, organizationId, status: "active" },
  });
  if (!membership) {
    return { ok: false, status: 403, message: "You don't have access to this organization" };
  }
  return { ok: true, userId: user.id };
}

/** Same shape as requireStudioEditAccess but keyed directly by organizationId (connectors aren't domain-pack scoped). */
export async function requireOrgEditAccess(organizationId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, organizationId, status: "active" },
    include: { role: true },
  });
  if (!membership || !canEditStudio(membership.role.tier as RoleTier)) {
    return { ok: false, status: 403, message: "You don't have edit access for this organization" };
  }
  return { ok: true, userId: user.id };
}

/** Stricter than requireStudioEditAccess — stage deletion is irreversible, so only admin-tier roles pass. */
export async function requireStageDeleteAccess(domainPackId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const memberships = await prisma.orgMembership.findMany({
    where: { userId: user.id, status: "active", organization: { domainPackId } },
    include: { role: true },
  });
  const canDelete = memberships.some((membership) => canDeleteStage(membership.role.tier as RoleTier));

  if (!canDelete) {
    return { ok: false, status: 403, message: "Only an admin can delete a stage" };
  }
  return { ok: true, userId: user.id };
}

/** Any active member of an org using this domain pack can submit real field data — the Collect
 * app's equivalent of requireOrgAccess, just keyed by domain pack since the caller doesn't send
 * their org id (it's resolved from their own membership, not trusted from the client). */
export async function requireFormCollectAccess(domainPackId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, status: "active", organization: { domainPackId } },
  });
  if (!membership) {
    return { ok: false, status: 403, message: "You don't have access to this domain pack" };
  }
  return { ok: true, userId: user.id };
}

/** Approve/return-for-correction is a reviewer-or-above capability. */
export async function requireReviewAccess(domainPackId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const memberships = await prisma.orgMembership.findMany({
    where: { userId: user.id, status: "active", organization: { domainPackId } },
    include: { role: true },
  });
  const canDoReview = memberships.some((membership) => canReview(membership.role.tier as RoleTier));

  if (!canDoReview) {
    return { ok: false, status: 403, message: "Only a reviewer can approve or return a submission" };
  }
  return { ok: true, userId: user.id };
}

/** Same reviewer-or-above check as requireReviewAccess, but keyed to one specific organization
 * instead of "any org on this domain pack" — for actions (like CSV export) that read/return one
 * particular org's data and must not be satisfied by reviewer status in a sibling org sharing the
 * same domain pack. */
export async function requireReviewAccessForOrganization(organizationId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, organizationId, status: "active" },
    include: { role: true },
  });
  if (!membership || !canReview(membership.role.tier as RoleTier)) {
    return { ok: false, status: 403, message: "Only a reviewer can export this organization's data" };
  }
  return { ok: true, userId: user.id };
}

/** Inviting/managing team members is org-scoped, not domain-pack-scoped — same shape as
 * requireOrgEditAccess but gated on canManageTeam instead of canEditStudio. */
export async function requireTeamManageAccess(organizationId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, organizationId, status: "active" },
    include: { role: true },
  });
  if (!membership || !canManageTeam(membership.role.tier as RoleTier)) {
    return { ok: false, status: 403, message: "Only an admin can manage team members for this organization" };
  }
  return { ok: true, userId: user.id };
}

export async function requirePlatformAdmin(): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active" || !user.isPlatformAdmin) {
    return { ok: false, status: 403, message: "Platform admin access required" };
  }
  return { ok: true, userId: user.id };
}

/** Setting up a payment agreement is platform-super-admin-only, per product decision — a project's
 * own org staff take part in the flow (claims, recipients) but don't author the milestone schedule. */
export async function requireCreatePaymentAgreementAccess(): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active" || !canCreatePaymentAgreement(user.isPlatformAdmin)) {
    return { ok: false, status: 403, message: "Only a platform admin can create a payment agreement" };
  }
  return { ok: true, userId: user.id };
}

/** Ground-partner claim-filing access — the agreement's own project org staff, not investor/registry
 * parties (see requirePaymentPartyAccess) and not platform-admin-only like requireCreatePaymentAgreementAccess.
 * Takes the already-resolved organizationId (the caller fetches the agreement and 404s on its own
 * if it doesn't exist, same convention as requireReviewAccess(domainPackId) elsewhere). */
export async function requirePaymentOrgAccess(organizationId: string): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, organizationId, status: "active" },
    include: { role: true },
  });
  if (!membership || !canSubmitClaim(membership.role.tier as RoleTier)) {
    return { ok: false, status: 403, message: "You don't have claim access on this agreement's organization" };
  }
  return { ok: true, userId: user.id };
}

/** Investor/registry access is resource-scoped via PaymentAgreementParty, deliberately independent
 * of OrgMembership — these personas need visibility into a specific agreement, not "membership" in
 * whatever org happens to own it. Pass `role` to require a specific party role (e.g. only a
 * registry party can confirm a monitoring-cycle milestone). */
export async function requirePaymentPartyAccess(paymentAgreementId: string, role?: PaymentPartyRole): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active") {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  if (user.isPlatformAdmin) {
    return { ok: true, userId: user.id };
  }
  const party = await prisma.paymentAgreementParty.findFirst({
    where: { paymentAgreementId, userId: user.id, ...(role ? { role } : {}) },
  });
  if (!party) {
    return { ok: false, status: 403, message: role ? `Only a ${role} party can do this` : "You're not a party to this agreement" };
  }
  return { ok: true, userId: user.id };
}

/** Recording the platform_ops consent, resolving gate overrides, and releasing payouts — reuses
 * canActAsOps rather than requirePlatformAdmin directly so the capability stays documented in
 * permissions.ts alongside every other named capability. */
export async function requirePaymentOpsAccess(): Promise<AccessResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status !== "active" || !canActAsOps(user.isPlatformAdmin)) {
    return { ok: false, status: 403, message: "Only platform ops can do this" };
  }
  return { ok: true, userId: user.id };
}
