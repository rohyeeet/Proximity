import type { Project } from "@/types";

/** One default project per existing organization — matches the ids the
 * 20260712120000_add_projects_and_milestone_templates migration backfilled directly in Postgres,
 * so re-running the seed script upserts these same rows rather than creating duplicates. */
export const projects: Project[] = [
  {
    id: "project-default-org-varaha-south",
    organizationId: "org-varaha-south",
    domainPackId: "pack-biochar-isometric",
    name: "Varaha South — Default Project",
    status: "active",
    createdAt: "2026-07-11T20:59:45.553Z",
  },
  {
    id: "project-default-org-novah2",
    organizationId: "org-novah2",
    domainPackId: "pack-green-hydrogen",
    name: "NovaH2 Logistics — Default Project",
    status: "active",
    createdAt: "2026-07-11T20:59:45.553Z",
  },
  {
    id: "project-default-org-kaveri-arr",
    organizationId: "org-kaveri-arr",
    domainPackId: "pack-biochar-isometric",
    name: "Kaveri ARR Collective — Default Project",
    status: "active",
    createdAt: "2026-07-11T20:59:45.553Z",
  },
];

export function getProjectsByOrganization(organizationId: string): Project[] {
  return projects.filter((p) => p.organizationId === organizationId);
}
