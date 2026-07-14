"use client";

import { useState } from "react";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentsListClient } from "@/components/payments/PaymentsListClient";
import { MilestoneTemplatesClient } from "@/components/payments/MilestoneTemplatesClient";
import { PaymentsLedgerTab } from "@/components/payments/PaymentsLedgerTab";
import type { Organization, PaymentAgreement, PaymentAgreementParty } from "@/types";

export function PaymentsPageClient({
  agreements,
  organizationsById,
  myParties,
  isPlatformAdmin,
}: {
  agreements: PaymentAgreement[];
  organizationsById: Record<string, Organization>;
  myParties: PaymentAgreementParty[];
  isPlatformAdmin: boolean;
}) {
  const { session } = useSession();
  const { projects } = useStudio();
  // Milestone templates and the ledger surface every role's own split % across a project — that's
  // deal-structuring config for the org's own staff, not something an external investor/registry
  // party (or any other non-management org member) should see. They still reach their own
  // role-scoped ledger, just via the Agreements tab -> their specific agreement, never this view.
  const canEdit = canEditStudio(session.role.tier);
  const canManagePayments = canEdit; // canEditStudio already covers the "platform" tier
  const orgProjects = projects.filter((p) => p.organizationId === session.organization.id);

  const [tab, setTab] = useState<"templates" | "ledger" | "agreements">(canManagePayments ? "templates" : "agreements");
  const [selectedProjectId, setSelectedProjectId] = useState(orgProjects[0]?.id ?? "");

  const projectPicker = orgProjects.length > 1 && (
    <select
      value={selectedProjectId}
      onChange={(e) => setSelectedProjectId(e.target.value)}
      className="w-fit rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
    >
      {orgProjects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      {canManagePayments && (
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as "templates" | "ledger" | "agreements")}
          options={[
            { value: "templates", label: "Milestone templates" },
            { value: "ledger", label: "Ledger" },
            { value: "agreements", label: "Agreements", count: agreements.length },
          ]}
        />
      )}

      {canManagePayments && tab === "templates" &&
        (orgProjects.length === 0 ? (
          <EmptyState title="No projects yet" description="Create a project first — milestone templates belong to one." />
        ) : (
          <div className="flex flex-col gap-3">
            {projectPicker}
            {selectedProjectId && <MilestoneTemplatesClient projectId={selectedProjectId} canEdit={canEdit} />}
          </div>
        ))}

      {canManagePayments && tab === "ledger" &&
        (orgProjects.length === 0 ? (
          <EmptyState title="No projects yet" description="Create a project first — the ledger rolls up its milestone templates." />
        ) : (
          <div className="flex flex-col gap-3">
            {projectPicker}
            {selectedProjectId && <PaymentsLedgerTab projectId={selectedProjectId} />}
          </div>
        ))}

      {tab === "agreements" && (
        <PaymentsListClient agreements={agreements} organizationsById={organizationsById} myParties={myParties} isPlatformAdmin={isPlatformAdmin} />
      )}
    </div>
  );
}
