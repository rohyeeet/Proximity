import type { Organization, User, Role, OrgMembership } from "@/types";

export const organizations: Organization[] = [
  {
    id: "org-varaha-south",
    name: "Varaha South",
    slug: "varaha-south",
    domainPackId: "pack-biochar-isometric",
    planTier: "growth",
    status: "active",
    createdAt: "2026-02-11T00:00:00Z",
  },
  {
    id: "org-novah2",
    name: "NovaH2 Logistics",
    slug: "novah2-logistics",
    domainPackId: "pack-green-hydrogen",
    planTier: "enterprise",
    status: "active",
    createdAt: "2026-04-02T00:00:00Z",
  },
  {
    id: "org-kaveri-arr",
    name: "Kaveri ARR Collective",
    slug: "kaveri-arr",
    domainPackId: "pack-biochar-isometric",
    planTier: "starter",
    status: "trial",
    createdAt: "2026-06-18T00:00:00Z",
  },
];

export const users: User[] = [
  { id: "user-rohit", fullName: "Rohit Singh", email: "rohit142001singh@gmail.com", avatarInitials: "RS", status: "active", isPlatformAdmin: true },
  { id: "user-arun", fullName: "Arun Kumar", email: "arun.kumar@varaha.com", avatarInitials: "AK", status: "active" },
  { id: "user-kavya", fullName: "Kavya Patil", email: "kavya.patil@varaha.com", avatarInitials: "KP", status: "active" },
  { id: "user-sara", fullName: "Sara Rao", email: "sara.rao@varaha.com", avatarInitials: "SR", status: "active" },
  { id: "user-deepak", fullName: "Deepak Sharma", email: "deepak.sharma@varaha.com", avatarInitials: "DS", status: "active" },
  { id: "user-elena", fullName: "Elena Fischer", email: "elena.fischer@novah2.com", avatarInitials: "EF", status: "active" },
  { id: "user-marcus", fullName: "Marcus Boateng", email: "marcus.boateng@novah2.com", avatarInitials: "MB", status: "active" },
  { id: "user-priya", fullName: "Priya Nair", email: "priya.nair@novah2.com", avatarInitials: "PN", status: "invited" },
  // Payments demo personas — see [[project-payments-module]] memory. Cross-org/resource-scoped
  // access for these two comes from PaymentAgreementParty (src/data/payments.ts), not their org
  // tier below; the "viewer" membership just gets them logged in through the existing org-switcher.
  { id: "user-meridian", fullName: "Alex Chen (Meridian Capital)", email: "alex.chen@meridiancapital.demo", avatarInitials: "AC", status: "active" },
  { id: "user-puro", fullName: "N. Fernandes (Puro.earth)", email: "n.fernandes@puro.earth.demo", avatarInitials: "NF", status: "active" },
];

export const roles: Role[] = [
  {
    id: "role-super-admin",
    organizationId: null,
    name: "Super Admin",
    tier: "platform",
    description: "Proximity platform team — every organization.",
    canView: ["all organizations", "all data", "billing", "domain pack governance"],
    canAct: ["impersonate (audited)", "manage domain packs", "manage billing"],
    cannot: [],
  },
  {
    id: "role-org-admin-varaha",
    organizationId: "org-varaha-south",
    name: "Org Admin",
    tier: "org_admin",
    description: "Full control of the Varaha South workspace.",
    canView: ["all forms", "all flows", "all records", "billing"],
    canAct: ["manage users", "manage roles", "manage domain pack config", "delete organization"],
    cannot: [],
  },
  {
    id: "role-sub-admin-karnataka",
    organizationId: "org-varaha-south",
    name: "Regional Ops Sub-Admin — Karnataka Cluster",
    tier: "org_sub_admin",
    description: "Delegated admin for the Karnataka facility cluster only.",
    canView: ["forms/flows/records under Karnataka projects"],
    canAct: ["invite users", "edit forms & flows", "manage devices"],
    cannot: ["billing", "delete organization", "remove Org Admin"],
  },
  {
    id: "role-lab-tech",
    organizationId: "org-varaha-south",
    name: "Lab Technician",
    tier: "reviewer",
    description: "Submitter + Reviewer combined, scoped to lab forms only.",
    canView: ["Sample Intake form", "Lab COA form", "linked batch records"],
    canAct: ["submit Lab COA", "approve/return Sample Intake"],
    cannot: ["edit flow logic", "see billing", "see other projects"],
  },
  {
    id: "role-surveyor",
    organizationId: "org-varaha-south",
    name: "Field Surveyor",
    tier: "submitter",
    description: "Captures feedstock, transport, and intake records in the field.",
    canView: ["assigned forms", "own records", "fix queue"],
    canAct: ["submit forms", "work offline"],
    cannot: ["approve records", "edit forms"],
  },
  {
    id: "role-payments-viewer-varaha",
    organizationId: "org-varaha-south",
    name: "Payments Party (Viewer)",
    tier: "viewer",
    description: "External investor/registry counterparties on Payments agreements — read-only everywhere else in the workspace; their actual payment capabilities come from PaymentAgreementParty, not this role.",
    canView: ["payment agreements they're a party to"],
    canAct: [],
    cannot: ["edit forms/flows", "review records", "see billing", "manage team"],
  },
  {
    id: "role-org-admin-novah2",
    organizationId: "org-novah2",
    name: "Org Admin",
    tier: "org_admin",
    description: "Full control of the NovaH2 Logistics workspace.",
    canView: ["all forms", "all flows", "all records", "billing"],
    canAct: ["manage users", "manage roles", "manage domain pack config", "delete organization"],
    cannot: [],
  },
  {
    id: "role-plant-qa-novah2",
    organizationId: "org-novah2",
    name: "Plant QA Engineer",
    tier: "reviewer",
    description: "Reviews production and certification submissions.",
    canView: ["production forms", "carbon intensity calc", "certification queue"],
    canAct: ["approve/return production records", "escalate compliance issues"],
    cannot: ["edit flow logic", "see billing"],
  },
];

export const orgMemberships: OrgMembership[] = [
  { id: "mem-1", organizationId: "org-varaha-south", userId: "user-arun", roleId: "role-org-admin-varaha", status: "active" },
  { id: "mem-2", organizationId: "org-varaha-south", userId: "user-kavya", roleId: "role-sub-admin-karnataka", status: "active" },
  { id: "mem-3", organizationId: "org-varaha-south", userId: "user-sara", roleId: "role-lab-tech", status: "active" },
  { id: "mem-4", organizationId: "org-varaha-south", userId: "user-deepak", roleId: "role-surveyor", status: "active" },
  { id: "mem-5", organizationId: "org-novah2", userId: "user-elena", roleId: "role-org-admin-novah2", status: "active" },
  { id: "mem-6", organizationId: "org-novah2", userId: "user-marcus", roleId: "role-plant-qa-novah2", status: "active" },
  { id: "mem-7", organizationId: "org-novah2", userId: "user-priya", roleId: "role-plant-qa-novah2", status: "invited" },
  { id: "mem-8", organizationId: "org-varaha-south", userId: "user-meridian", roleId: "role-payments-viewer-varaha", status: "active" },
  { id: "mem-9", organizationId: "org-varaha-south", userId: "user-puro", roleId: "role-payments-viewer-varaha", status: "active" },
];

export function getOrganization(id: string): Organization | undefined {
  return organizations.find((org) => org.id === id);
}

export function getUser(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function getRolesByOrganization(organizationId: string): Role[] {
  return roles.filter((role) => role.organizationId === organizationId);
}

export function getMembersByOrganization(organizationId: string) {
  return orgMemberships
    .filter((membership) => membership.organizationId === organizationId)
    .map((membership) => ({
      membership,
      user: getUser(membership.userId),
      role: roles.find((role) => role.id === membership.roleId),
    }));
}
