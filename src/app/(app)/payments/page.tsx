import { resolveSession } from "@/lib/session-server";
import { getOrganizationsByIds, getPaymentAgreementsForUser, getPaymentPartiesForUser } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentsListClient } from "@/components/payments/PaymentsListClient";

export default async function PaymentsPage() {
  const { user } = await resolveSession();
  const isPlatformAdmin = user.isPlatformAdmin ?? false;
  const [agreements, myParties] = await Promise.all([
    getPaymentAgreementsForUser(user.id, isPlatformAdmin),
    getPaymentPartiesForUser(user.id),
  ]);
  const organizationsById = await getOrganizationsByIds(agreements.map((a) => a.organizationId));

  return (
    <div>
      <PageHeader
        eyebrow="Proximity Pay"
        title="Payments"
        description="Milestone-gated offtake agreements — claims, consent, and settlement, end to end."
      />
      <PaymentsListClient agreements={agreements} organizationsById={organizationsById} myParties={myParties} isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}
