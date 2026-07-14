import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { getProjectsByOrganization } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentAgreementBuilderClient } from "@/components/payments/PaymentAgreementBuilderClient";
import type { Project } from "@/types";

export default async function NewPaymentAgreementPage() {
  const { user, accessibleOrgs } = await resolveSession();
  if (!user.isPlatformAdmin) redirect("/payments");

  const organizations = accessibleOrgs.map((entry) => entry.organization);
  const projectLists = await Promise.all(organizations.map((org) => getProjectsByOrganization(org.id)));
  const projectsByOrg: Record<string, Project[]> = Object.fromEntries(organizations.map((org, i) => [org.id, projectLists[i]!]));

  return (
    <div>
      <PageHeader
        eyebrow="Proximity Pay"
        title="New payment agreement"
        description="Pick the project and the milestone templates it already defines — this becomes the schedule every partner acts against."
      />
      <PaymentAgreementBuilderClient organizations={organizations} projectsByOrg={projectsByOrg} />
    </div>
  );
}
