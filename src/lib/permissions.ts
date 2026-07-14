import type { PaymentPartyRole, RoleTier } from "@/types";

/**
 * Studio (Stages/Forms/Flows) editing is a platform-, org-admin-, sub-admin-, and designer-tier
 * capability — submitters, reviewers, and viewers can open and read Studio screens but never see
 * edit affordances (matches the `canAct`/`cannot` lists already authored in src/data/identity.ts,
 * e.g. Lab Technician "cannot: edit flow logic", Field Surveyor "cannot: edit forms").
 */
export function canEditStudio(tier: RoleTier): boolean {
  return tier === "platform" || tier === "org_admin" || tier === "org_sub_admin" || tier === "designer";
}

/** Deleting a stage is irreversible — deliberately stricter than canEditStudio, admin-tier only. */
export function canDeleteStage(tier: RoleTier): boolean {
  return tier === "platform" || tier === "org_admin";
}

/** Approving/returning a submission is a reviewer-or-above capability — designers/submitters can't. */
export function canReview(tier: RoleTier): boolean {
  return tier === "platform" || tier === "org_admin" || tier === "org_sub_admin" || tier === "reviewer";
}

/** Inviting/managing team members — matches exactly who the seeded role data claims can do this
 * ("manage users" / "invite users"); designers aren't listed as able to manage people anywhere. */
export function canManageTeam(tier: RoleTier): boolean {
  return tier === "platform" || tier === "org_admin" || tier === "org_sub_admin";
}

/** Setting up a payment agreement + milestone schedule is a platform-super-admin-only capability
 * — a project's own org staff take part in it (submit claims, appear as recipients) but don't
 * author it themselves. Platform tier is a boolean flag on User, not an OrgMembership role (see
 * schema comment on User.isPlatformAdmin), so this checks the flag directly rather than a tier string. */
export function canCreatePaymentAgreement(isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin;
}

/** Filing a milestone claim is the "ground partner" action — any org staff tier that actually does
 * field/ops work, not a pure reviewer or read-only viewer. */
export function canSubmitClaim(tier: RoleTier): boolean {
  return tier === "platform" || tier === "org_admin" || tier === "org_sub_admin" || tier === "designer" || tier === "submitter";
}

/** Platform ops: records the platform_ops consent, resolves gate overrides, releases payouts.
 * Kept as its own named function (rather than an inline isPlatformAdmin check) so the capability
 * is documented in one place, same as every other permission here. */
export function canActAsOps(isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin;
}

/** Which of an agreement's right-hand panel a viewer gets: the full "Agreement terms / Revenue
 * split / Escrow" breakdown (org management only), or the role-scoped PaymentLedgerSummary — an
 * investor/registry party, a ground partner filing claims, or any other org member (reviewer,
 * designer, viewer) who takes part in the agreement but doesn't manage it. Investor/registry party
 * status takes precedence over org tier since those personas are often not org members at all. */
export function resolveLedgerViewerRole(params: {
  isPlatformAdmin: boolean;
  orgTier?: RoleTier;
  partyRoles: PaymentPartyRole[];
}): "manager" | "investor" | "registry" | "developer" | "farmer_community" {
  if (params.isPlatformAdmin || params.orgTier === "org_admin" || params.orgTier === "org_sub_admin") return "manager";
  if (params.partyRoles.includes("investor")) return "investor";
  if (params.partyRoles.includes("registry")) return "registry";
  if (params.orgTier === "submitter") return "farmer_community";
  return "developer";
}
