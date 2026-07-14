import { notFound } from "next/navigation";
import { resolveSession } from "@/lib/session-server";
import { getPaymentAccessForUser, getPaymentAgreementDetail } from "@/lib/queries";
import { canSubmitClaim, resolveLedgerViewerRole } from "@/lib/permissions";
import { PaymentAgreementDetailClient } from "@/components/payments/PaymentAgreementDetailClient";

/** Same access/capability logic and the same detail component as (app)/payments/[id] — a
 * submitter-tier ground partner just reaches it through /collect instead, since they're
 * auto-routed away from the admin shell entirely. */
export default async function CollectPaymentAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await resolveSession();
  const isPlatformAdmin = user.isPlatformAdmin ?? false;

  const detail = await getPaymentAgreementDetail(id);
  if (!detail) notFound();

  const access = await getPaymentAccessForUser(user.id, isPlatformAdmin, detail.agreement.organizationId, id);
  if (!access.canView) notFound();

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
      <h1 className="mb-3 text-[15px] font-semibold text-ink">
        {detail.agreement.buyerName} × {detail.agreement.projectName}
      </h1>
      <PaymentAgreementDetailClient detail={detail} currentUserId={user.id} capabilities={capabilities} viewerRole={viewerRole} />
    </div>
  );
}
