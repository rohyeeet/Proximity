import { notFound } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { getOrganizationsByIds, getPaymentAccessForUser, getPaymentAgreementDetail } from "@/lib/queries";
import { canSubmitClaim, resolveLedgerViewerRole } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentAgreementDetailClient } from "@/components/payments/PaymentAgreementDetailClient";

export default async function PaymentAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await resolveSession();
  const isPlatformAdmin = user.isPlatformAdmin ?? false;

  const detail = await getPaymentAgreementDetail(id);
  if (!detail) notFound();

  const access = await getPaymentAccessForUser(user.id, isPlatformAdmin, detail.agreement.organizationId, id);
  if (!access.canView) notFound();

  const organizationsById = await getOrganizationsByIds([detail.agreement.organizationId]);

  const capabilities = {
    canManage: isPlatformAdmin,
    canActAsOps: isPlatformAdmin,
    canActAsInvestor: isPlatformAdmin || access.partyRoles.includes("investor"),
    canActAsRegistry: isPlatformAdmin || access.partyRoles.includes("registry"),
    canFileClaim: isPlatformAdmin || (access.isOrgMember && !!access.orgTier && canSubmitClaim(access.orgTier)),
  };
  const viewerRole = resolveLedgerViewerRole({ isPlatformAdmin, orgTier: access.orgTier, partyRoles: access.partyRoles });

  return (
    <div>
      <PageHeader
        eyebrow={organizationsById[detail.agreement.organizationId]?.name ?? "Proximity Pay"}
        title={`${detail.agreement.buyerName} × ${detail.agreement.projectName}`}
        description={`${detail.organizationName} · milestone-gated offtake agreement`}
      />
      <PaymentAgreementDetailClient detail={detail} currentUserId={user.id} capabilities={capabilities} viewerRole={viewerRole} />
    </div>
  );
}
