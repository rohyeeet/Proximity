export type PlatformTier = "platform";
export type OrgTier = "org_admin" | "org_sub_admin";
export type ResourceTier = "designer" | "submitter" | "reviewer" | "viewer";
export type RoleTier = PlatformTier | OrgTier | ResourceTier;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domainPackId: string;
  planTier: "starter" | "growth" | "enterprise";
  status: "active" | "suspended" | "trial";
  createdAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarInitials: string;
  status: "active" | "invited" | "disabled";
  /** Platform tier is cross-org and intentionally not modeled as an OrgMembership. */
  isPlatformAdmin?: boolean;
}

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  tier: RoleTier;
  description: string;
  canView: string[];
  canAct: string[];
  cannot: string[];
}

export interface ResourceGrant {
  id: string;
  roleId: string;
  resourceType: "project" | "form_template" | "flow_template";
  resourceId: string;
}

export interface OrgMembership {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: "active" | "invited" | "removed";
}

export interface CurrentSession {
  user: User;
  organization: Organization;
  role: Role;
  isPlatformAdmin: boolean;
}
