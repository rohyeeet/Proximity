"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricCard } from "@/components/ui/MetricCard";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/Button";
import type { AnalyticsCard, DomainPack, Organization } from "@/types";

interface AdminOrgRow extends Organization {
  memberCount: number;
  connectorCount: number;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { setActiveOrganizationId } = useSession();
  const [organizations, setOrganizations] = useState<AdminOrgRow[]>([]);
  const [domainPacks, setDomainPacks] = useState<DomainPack[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview")
      .then((res) => {
        if (res.status === 403) {
          router.replace("/");
          return null;
        }
        return res.json();
      })
      .then((data: { organizations: AdminOrgRow[]; domainPacks: DomainPack[] } | null) => {
        if (data && !cancelled) {
          setOrganizations(data.organizations);
          setDomainPacks(data.domainPacks);
        }
      })
      .catch((error) => console.error("Failed to load admin overview", error));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const platformCards: AnalyticsCard[] = [
    { key: "orgs", label: "Organizations", value: String(organizations.length), tone: "neutral" },
    { key: "domain_packs", label: "Domain packs", value: String(domainPacks.length), tone: "neutral" },
    { key: "connected_devices", label: "Devices connected", value: "5", tone: "good" },
    { key: "trial_orgs", label: "Trial organizations", value: String(organizations.filter((o) => o.status === "trial").length), tone: "warn" },
  ];

  const columns: DataTableColumn<AdminOrgRow>[] = [
    { key: "name", header: "Organization", render: (org) => <span className="font-medium text-ink">{org.name}</span> },
    {
      key: "domain_pack",
      header: "Domain pack",
      render: (org) => <span className="text-ink-soft">{domainPacks.find((p) => p.id === org.domainPackId)?.name ?? "—"}</span>,
    },
    { key: "users", header: "Users", render: (org) => <span className="tabular">{org.memberCount}</span> },
    { key: "devices", header: "Devices/connectors", render: (org) => <span className="tabular">{org.connectorCount}</span> },
    { key: "plan", header: "Plan", render: (org) => <span className="capitalize text-ink-soft">{org.planTier}</span> },
    {
      key: "status",
      header: "Status",
      render: (org) => <StatusChip label={org.status} tone={org.status === "active" ? "good" : org.status === "trial" ? "accent" : "critical"} />,
    },
    {
      key: "action",
      header: "",
      render: (org) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            setActiveOrganizationId(org.id);
            router.push("/");
          }}
        >
          View as
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Proximity"
        title="Platform overview"
        description="Every organization, on one screen. Impersonation is scoped and audited — this is a demo of the pattern, not the audit log itself."
      />
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {platformCards.map((card) => (
          <MetricCard key={card.key} card={card} />
        ))}
      </div>
      <DataTable columns={columns} rows={organizations} rowKey={(org) => org.id} />
    </div>
  );
}
