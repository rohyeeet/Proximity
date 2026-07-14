import { resolveSession } from "@/lib/session-server";
import { getOrganizationsByIds, getPaymentAgreementsForUser, getPaymentPartiesForUser } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentsPageClient } from "@/components/payments/PaymentsPageClient";

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
        description="Define milestone templates once — the one lever that decides what each milestone releases and who gets paid — then run real agreements against them."
      />
      <PaymentsPageClient agreements={agreements} organizationsById={organizationsById} myParties={myParties} isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}
