import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { getAllFlowTemplates, getAllFormTemplates, getAllStages, getProjectsByOrganization } from "@/lib/queries";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { user, accessibleOrgs, initialActiveOrganizationId } = await resolveSession();

  // Field submitters get a separate, simpler mobile-first experience (see /collect) instead of
  // the Studio admin platform — this is the only tier that's auto-routed away from it.
  const activeRole = accessibleOrgs.find((entry) => entry.organization.id === initialActiveOrganizationId)?.role;
  if (!user.isPlatformAdmin && activeRole?.tier === "submitter") {
    redirect("/collect");
  }

  // Scoped to the *currently managed* organization's own domain pack only — never every domain
  // pack the caller can reach (that would leak another organization's forms/flows/stages into the
  // Studio store just because a platform admin, or a user with several real memberships, happens
  // to have access to it too). Switching "Managing" orgs (OrgSwitcher.tsx) triggers a fresh server
  // render of this layout, so this always reflects whichever org is actually active.
  const activeOrg = accessibleOrgs.find((entry) => entry.organization.id === initialActiveOrganizationId)?.organization ?? accessibleOrgs[0]!.organization;
  const domainPackIds = [activeOrg.domainPackId];
  const initialProjects = await getProjectsByOrganization(activeOrg.id);
  const projectIds = initialProjects.map((p) => p.id);
  const [initialForms, initialFlows, initialStages] = await Promise.all([
    getAllFormTemplates(domainPackIds),
    getAllFlowTemplates(projectIds),
    getAllStages(domainPackIds),
  ]);

  return (
    <AppShell
      user={user}
      accessibleOrgs={accessibleOrgs}
      isPlatformAdmin={user.isPlatformAdmin ?? false}
      initialActiveOrganizationId={initialActiveOrganizationId}
      initialForms={initialForms}
      initialFlows={initialFlows}
      initialStages={initialStages}
      initialProjects={initialProjects}
    >
      {children}
    </AppShell>
  );
}
