"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PaymentAgreementStatusChip } from "@/components/ui/StatusChip";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Organization, PaymentAgreement, PaymentAgreementParty } from "@/types";

export function PaymentsListClient({
  agreements,
  organizationsById,
  myParties,
  isPlatformAdmin,
  newAgreementProjectId,
}: {
  agreements: PaymentAgreement[];
  organizationsById: Record<string, Organization>;
  myParties: PaymentAgreementParty[];
  isPlatformAdmin: boolean;
  /** The project currently selected in the Payments module, if any — carried into the builder so
   * it never has to ask for a project a second time. */
  newAgreementProjectId?: string;
}) {
  const router = useRouter();
  const investorParties = myParties.filter((p) => p.role === "investor");
  const registryParties = myParties.filter((p) => p.role === "registry");
  const totalInvested = investorParties.reduce((sum, p) => sum + (p.investedAmount ?? 0), 0);

  const columns: DataTableColumn<PaymentAgreement>[] = [
    {
      key: "name",
      header: "Agreement",
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{row.buyerName}</p>
          <p className="text-[12px] text-ink-soft">{row.projectName}</p>
        </div>
      ),
    },
    { key: "org", header: "Project org", render: (row) => <span className="text-ink-soft">{organizationsById[row.organizationId]?.name ?? "—"}</span> },
    { key: "value", header: "Total value", render: (row) => <span className="tabular text-ink">{formatCurrency(row.totalValue, row.currency)}</span> },
    { key: "status", header: "Status", render: (row) => <PaymentAgreementStatusChip status={row.status} /> },
    { key: "created", header: "Created", render: (row) => <span className="tabular text-ink-soft">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {(investorParties.length > 0 || registryParties.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {investorParties.length > 0 && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-[12px] text-ink-soft">Your investments</p>
                  <p className="text-[15px] font-semibold text-ink">
                    {formatCurrency(totalInvested, agreements[0]?.currency ?? "USD")} across {investorParties.length} agreement
                    {investorParties.length === 1 ? "" : "s"}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
          {registryParties.length > 0 && (
            <Card>
              <CardBody className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <p className="text-[12px] text-ink-soft">Registry review queue</p>
                  <p className="text-[15px] font-semibold text-ink">
                    {registryParties.length} agreement{registryParties.length === 1 ? "" : "s"} referencing you
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        {isPlatformAdmin && (
          <Link href={newAgreementProjectId ? `/payments/new?project=${newAgreementProjectId}` : "/payments/new"}>
            <Button variant="primary" size="sm">
              <Plus className="size-3.5" /> New agreement
            </Button>
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={agreements}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/payments/${row.id}`)}
        emptyLabel="No payment agreements yet."
      />
    </div>
  );
}
