"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentsListClient } from "@/components/payments/PaymentsListClient";
import { PaymentStructureTab } from "@/components/payments/PaymentStructureTab";
import type { Organization, PaymentAgreement, PaymentAgreementParty } from "@/types";

type Tab = "structure" | "agreements";

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
  const searchParams = useSearchParams();

  // Payment Structure surfaces every role's own split % across a project — that's deal-structuring
  // config for the org's own staff, not something an external investor/registry party (or any other
  // non-management org member) should see. They still reach their own role-scoped ledger, just via
  // the Agreements tab -> their specific agreement, never this view.
  const canEdit = canEditStudio(session.role.tier);
  const canManagePayments = canEdit; // canEditStudio already covers the "platform" tier
  const orgProjects = projects.filter((p) => p.organizationId === session.organization.id);

  // Both the active tab and the selected project are one shared piece of state for the whole
  // module — replacing what used to be three independent pickers (Milestone templates tab, Ledger
  // tab, and the Agreement Builder each asked separately) — seeded once from the URL (so a link
  // into a specific tab/project still works) and carried forward in plain state from there, which
  // is what lets "New agreement" hand the project straight to the builder without asking again.
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "agreements" ? "agreements" : "structure");
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("project") ?? orgProjects[0]?.id ?? "");
  const effectiveTab: Tab = canManagePayments ? tab : "agreements";

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
          value={effectiveTab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: "structure", label: "Payment Structure" },
            { value: "agreements", label: "Agreements", count: agreements.length },
          ]}
        />
      )}

      {canManagePayments && effectiveTab === "structure" &&
        (orgProjects.length === 0 ? (
          <EmptyState title="No projects yet" description="Create a project first — a payment structure belongs to one." />
        ) : (
          <div className="flex flex-col gap-3">
            {projectPicker}
            {selectedProjectId && <PaymentStructureTab projectId={selectedProjectId} canEdit={canEdit} />}
          </div>
        ))}

      {effectiveTab === "agreements" && (
        <PaymentsListClient
          agreements={agreements}
          organizationsById={organizationsById}
          myParties={myParties}
          isPlatformAdmin={isPlatformAdmin}
          newAgreementProjectId={canManagePayments ? selectedProjectId : undefined}
        />
      )}
    </div>
  );
}
