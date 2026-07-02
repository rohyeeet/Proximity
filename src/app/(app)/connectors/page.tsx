"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cable } from "lucide-react";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ConnectorStatusChip } from "@/components/ui/StatusChip";
import type { Connector } from "@/types";

const protocolLabel: Record<string, string> = {
  opc_ua: "OPC-UA",
  modbus: "Modbus",
  mqtt_sparkplug_b: "MQTT / Sparkplug B",
};

const connectorTypeLabel: Record<string, string> = {
  internal_lookup: "Internal lookup",
  external_database: "External database / REST",
  industrial_protocol: "Industrial protocol",
};

export default function ConnectorsPage() {
  const { session } = useSession();
  const [orgConnectors, setOrgConnectors] = useState<(Connector & { deviceCount: number })[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organizations/${session.organization.id}/connectors`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOrgConnectors(data);
      })
      .catch((error) => console.error("Failed to load connectors", error));
    return () => {
      cancelled = true;
    };
  }, [session.organization.id]);

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Connectors"
        description="Database lookups, REST sources, and SCADA/PLC devices — the same abstraction feeds dropdowns, forms, and workflow triggers."
        actions={<Button variant="primary">Add connector</Button>}
      />

      <div className="flex flex-col gap-3">
        {orgConnectors.map((connector) => (
          <Link
            key={connector.id}
            href={`/connectors/${connector.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5 hover:border-border-strong hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-md bg-sunken">
                <Cable className="size-4 text-ink-soft" strokeWidth={2} />
              </div>
              <div>
                <p className="font-medium text-ink">{connector.name}</p>
                <p className="text-[13px] text-ink-soft">
                  {connectorTypeLabel[connector.connectorType]}
                  {connector.protocol ? ` · ${protocolLabel[connector.protocol]}` : ""}
                  {connector.endpoint ? ` · ${connector.endpoint}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {connector.deviceCount > 0 && (
                <span className="text-[13px] text-ink-soft">
                  {connector.deviceCount} device{connector.deviceCount > 1 ? "s" : ""}
                </span>
              )}
              <ConnectorStatusChip status={connector.status} />
            </div>
          </Link>
        ))}
        {orgConnectors.length === 0 && <p className="text-sm text-ink-soft">No connectors configured for this organization yet.</p>}
      </div>
    </div>
  );
}
