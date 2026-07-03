"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Connector, ConnectorType, IndustrialProtocol } from "@/types";

const connectorTypeOptions: { value: ConnectorType; label: string }[] = [
  { value: "internal_lookup", label: "Internal lookup" },
  { value: "external_database", label: "External database / REST" },
  { value: "industrial_protocol", label: "Industrial protocol" },
];

const protocolOptions: { value: IndustrialProtocol; label: string }[] = [
  { value: "opc_ua", label: "OPC-UA" },
  { value: "modbus", label: "Modbus" },
  { value: "mqtt_sparkplug_b", label: "MQTT / Sparkplug B" },
];

export function CreateConnectorModal({
  open,
  onClose,
  organizationId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  onCreated: (connector: Connector & { deviceCount: number }) => void;
}) {
  const [name, setName] = useState("");
  const [connectorType, setConnectorType] = useState<ConnectorType>("internal_lookup");
  const [protocol, setProtocol] = useState<IndustrialProtocol>("opc_ua");
  const [endpoint, setEndpoint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setConnectorType("internal_lookup");
    setProtocol("opc_ua");
    setEndpoint("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          connectorType,
          protocol: connectorType === "industrial_protocol" ? protocol : undefined,
          endpoint: endpoint.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create connector");
      }
      const connector = await res.json();
      onCreated({ ...connector, deviceCount: 0 });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create connector");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add connector"
      description="Register a data source that stages and forms can bind to."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="rounded-md border border-critical-text/30 bg-critical-bg px-3 py-2 text-[13px] text-critical-text">{error}</p>}
        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weighbridge OPC-UA gateway"
            className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">Type</label>
          <select
            value={connectorType}
            onChange={(e) => setConnectorType(e.target.value as ConnectorType)}
            className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
          >
            {connectorTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {connectorType === "industrial_protocol" && (
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Protocol</label>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as IndustrialProtocol)}
              className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
            >
              {protocolOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[12px] font-medium text-ink-soft">Endpoint (optional)</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="opc.tcp://10.0.4.21:4840"
            className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create connector"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
