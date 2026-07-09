import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { resolveSession } from "@/lib/session-server";
import { getOrganizationsByIds, getPaymentAgreementsForUser } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import { PaymentAgreementStatusChip } from "@/components/ui/StatusChip";

/** Submitter-tier ground partners are auto-routed to /collect instead of the full admin shell
 * (see (app)/layout.tsx) and so can never reach /payments there — this mirrors it for them,
 * same query layer, mobile-first card list instead of the admin DataTable. */
export default async function CollectPaymentsPage() {
  const { user } = await resolveSession();
  const isPlatformAdmin = user.isPlatformAdmin ?? false;

  const agreements = await getPaymentAgreementsForUser(user.id, isPlatformAdmin);
  const organizationsById = await getOrganizationsByIds(agreements.map((a) => a.organizationId));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Payments</h1>
        <p className="text-[13px] text-ink-soft">Milestone agreements you can submit claims on.</p>
      </div>

      {agreements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-sunken/40 px-4 py-10 text-center">
          <Wallet className="size-5 text-ink-soft" />
          <p className="text-[13px] text-ink-soft">No payment agreements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {agreements.map((agreement) => (
            <Link
              key={agreement.id}
              href={`/collect/payments/${agreement.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink">{agreement.buyerName}</p>
                <p className="truncate text-[12px] text-ink-soft">
                  {agreement.projectName} · {organizationsById[agreement.organizationId]?.name ?? "—"}
                </p>
                <p className="mt-1 tabular text-[12.5px] text-ink">{formatCurrency(agreement.totalValue, agreement.currency)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PaymentAgreementStatusChip status={agreement.status} />
                <ChevronRight className="size-4 text-ink-soft" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
