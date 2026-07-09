import { redirect } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentAgreementBuilderClient } from "@/components/payments/PaymentAgreementBuilderClient";

export default async function NewPaymentAgreementPage() {
  const { user, accessibleOrgs } = await resolveSession();
  if (!user.isPlatformAdmin) redirect("/payments");

  return (
    <div>
      <PageHeader eyebrow="Proximity Pay" title="New payment agreement" description="Set the milestone schedule and revenue split — this becomes the flow every partner acts against." />
      <PaymentAgreementBuilderClient organizations={accessibleOrgs.map((entry) => entry.organization)} />
    </div>
  );
}
