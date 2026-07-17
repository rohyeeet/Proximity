import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { getProjectsByOrganization } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentAgreementBuilderClient } from "@/components/payments/PaymentAgreementBuilderClient";
import type { Project } from "@/types";

export default async function NewPaymentAgreementPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { user, accessibleOrgs } = await resolveSession();
  if (!user.isPlatformAdmin) redirect("/payments");

  const { project: preselectedProjectId } = await searchParams;
  const organizations = accessibleOrgs.map((entry) => entry.organization);
  const projectLists = await Promise.all(organizations.map((org) => getProjectsByOrganization(org.id)));
  const projectsByOrg: Record<string, Project[]> = Object.fromEntries(organizations.map((org, i) => [org.id, projectLists[i]!]));

  // Arriving from Payments' Payment Structure/Agreements tabs already carries a project — resolve
  // its org here so the builder can skip asking for both a second time.
  const preselectedOrgId = preselectedProjectId
    ? organizations.find((org) => projectsByOrg[org.id]?.some((p) => p.id === preselectedProjectId))?.id
    : undefined;

  return (
    <div>
      <PageHeader
        eyebrow="Proximity Pay"
        title="New payment agreement"
        description="Pick the milestones you've already defined for this project — this becomes the schedule every partner acts against."
      />
      <PaymentAgreementBuilderClient
        organizations={organizations}
        projectsByOrg={projectsByOrg}
        preselectedOrgId={preselectedOrgId}
        preselectedProjectId={preselectedOrgId ? preselectedProjectId : undefined}
      />
    </div>
  );
}
