"use client";

import { useEffect, useState } from "react";
import { MultiSearchPicker } from "@/components/ui/SearchPicker";
import { cn } from "@/lib/utils";
import type { Connector } from "@/types";

const dotToneByStatus: Record<Connector["status"], string> = {
  connected: "bg-good-text",
  degraded: "bg-warn-text",
  disconnected: "bg-critical-text",
};

/** Binds SCADA/PLC/device connectors to a stage so its automation status is visible at a glance. */
export function ConnectorPicker({
  organizationId,
  values,
  onChange,
}: {
  organizationId: string;
  values: string[];
  onChange: (ids: string[]) => void;
}) {
  const [candidates, setCandidates] = useState<Connector[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organizations/${organizationId}/connectors`)
      .then((res) => res.json())
      .then((data: Connector[]) => {
        if (!cancelled) setCandidates(data);
      })
      .catch((error) => console.error("Failed to load connectors", error));
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return (
    <MultiSearchPicker<Connector>
      items={candidates}
      getId={(connector) => connector.id}
      renderRow={(connector) => (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full", dotToneByStatus[connector.status])} />
          {connector.name}
        </span>
      )}
      filter={(connector, q) => connector.name.toLowerCase().includes(q)}
      values={values}
      onChange={onChange}
      placeholder="Bind a connector or device feed…"
      emptyLabel="No connectors set up for this organization"
    />
  );
}
