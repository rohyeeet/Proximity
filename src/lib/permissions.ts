import type { RoleTier } from "@/types";

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
