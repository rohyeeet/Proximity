"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { SearchPicker } from "@/components/ui/SearchPicker";
import { EntityPicker } from "./EntityPicker";
import { FieldPicker } from "./FieldPicker";
import { LinkFilterEditor } from "./LinkFilterEditor";
import { InfoHint } from "./knowledge/InfoHint";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import type { Device, LookupSource, LookupSourceKind, TelemetryTag } from "@/types";

const kindOptions: { value: LookupSourceKind; label: string }[] = [
  { value: "internal_form", label: "Internal form" },
  { value: "device_telemetry", label: "Device telemetry" },
  { value: "external_db", label: "External DB" },
];

export function LookupSourceEditor({
  lookupSource,
  domainPackId,
  onChange,
}: {
  lookupSource: LookupSource | undefined;
  domainPackId: string;
  onChange: (next: LookupSource | undefined) => void;
}) {
  const { session } = useSession();
  const { getForm } = useStudio();
  const kind: LookupSourceKind = lookupSource?.kind ?? "internal_form";

  const [orgDevices, setOrgDevices] = useState<Device[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/organizations/${session.organization.id}/devices`)
      .then((res) => res.json())
      .then((data: Device[]) => {
        if (!cancelled) setOrgDevices(data);
      })
      .catch((error) => console.error("Failed to load devices", error));
    return () => {
      cancelled = true;
    };
  }, [session.organization.id]);

  const selectedDevice = orgDevices.find((device) => device.id === lookupSource?.deviceId);
  const sourceForm = lookupSource?.sourceFormTemplateId ? getForm(lookupSource.sourceFormTemplateId) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Tabs options={kindOptions} value={kind} onChange={(value) => onChange({ kind: value as LookupSourceKind, label: lookupSource?.label ?? "" })} />
        <InfoHint topicId="form-lookup-select" />
      </div>

      {kind === "internal_form" && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Source entity</label>
            <EntityPicker
              value={lookupSource?.sourceFormTemplateId ?? null}
              domainPackId={domainPackId}
              onChange={(formId) => {
                const form = formId ? getForm(formId) : undefined;
                onChange({
                  kind: "internal_form",
                  sourceFormTemplateId: formId ?? undefined,
                  sourceFieldCode: undefined,
                  label: form ? `${form.name} records` : lookupSource?.label ?? "",
                });
              }}
            />
          </div>
          {sourceForm && (
            <>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-ink-soft">Display field / column (optional)</label>
                <FieldPicker
                  fields={sourceForm.currentVersion.fields}
                  value={lookupSource?.sourceFieldCode ?? null}
                  onChange={(fieldCode) => onChange({ ...lookupSource!, sourceFieldCode: fieldCode ?? undefined })}
                  placeholder="Default: whole record"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
                  Filter by column and value
                  <InfoHint topicId="form-link-filters" />
                </label>
                <LinkFilterEditor
                  filter={lookupSource?.filter}
                  fields={sourceForm.currentVersion.fields}
                  onChange={(filter) => onChange({ ...lookupSource!, filter })}
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Label shown to submitters</label>
            <input
              value={lookupSource?.label ?? ""}
              onChange={(e) => onChange({ ...(lookupSource ?? { kind: "internal_form" }), label: e.target.value })}
              className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
            />
          </div>
        </div>
      )}

      {kind === "device_telemetry" && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Device</label>
            <SearchPicker<Device>
              items={orgDevices}
              getId={(device) => device.id}
              renderRow={(device) => device.name}
              filter={(device, q) => device.name.toLowerCase().includes(q) || device.externalRef.toLowerCase().includes(q)}
              value={lookupSource?.deviceId ?? null}
              onChange={(deviceId) => {
                const device = orgDevices.find((d) => d.id === deviceId);
                onChange({
                  kind: "device_telemetry",
                  deviceId: deviceId ?? undefined,
                  telemetryParameterCode: undefined,
                  label: device ? device.name : lookupSource?.label ?? "",
                });
              }}
              placeholder="Pick a device…"
              emptyLabel="No devices connected for this organization"
            />
          </div>
          {selectedDevice && (
            <div>
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Parameter</label>
              <SearchPicker<TelemetryTag>
                items={selectedDevice.tags}
                getId={(tag) => tag.parameterCode}
                renderRow={(tag) => `${tag.parameterLabel} (${tag.unit})`}
                filter={(tag, q) => tag.parameterLabel.toLowerCase().includes(q) || tag.parameterCode.toLowerCase().includes(q)}
                value={lookupSource?.telemetryParameterCode ?? null}
                onChange={(paramCode) => {
                  const tag = selectedDevice.tags.find((t) => t.parameterCode === paramCode);
                  onChange({
                    ...(lookupSource ?? { kind: "device_telemetry" }),
                    kind: "device_telemetry",
                    telemetryParameterCode: paramCode ?? undefined,
                    label: tag ? `${selectedDevice.name} / ${tag.parameterLabel}` : lookupSource?.label ?? "",
                  });
                }}
                placeholder="Pick a parameter…"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Refresh interval (seconds)</label>
            <input
              type="number"
              value={lookupSource?.refreshSeconds ?? ""}
              onChange={(e) =>
                onChange({ ...(lookupSource ?? { kind: "device_telemetry", label: "" }), refreshSeconds: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
            />
          </div>
        </div>
      )}

      {kind === "external_db" && (
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Label</label>
            <input
              value={lookupSource?.label ?? ""}
              onChange={(e) => onChange({ ...(lookupSource ?? { kind: "external_db" }), label: e.target.value })}
              placeholder="e.g. PPA counterparty generation API"
              className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Table / collection</label>
              <input
                value={lookupSource?.externalTable ?? ""}
                onChange={(e) => onChange({ ...(lookupSource ?? { kind: "external_db", label: "" }), externalTable: e.target.value || undefined })}
                placeholder="e.g. generation_readings"
                className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-ink-soft">Column</label>
              <input
                value={lookupSource?.externalColumn ?? ""}
                onChange={(e) => onChange({ ...(lookupSource ?? { kind: "external_db", label: "" }), externalColumn: e.target.value || undefined })}
                placeholder="e.g. kwh_generated"
                className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-soft/60"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-ink-soft">Refresh interval (seconds)</label>
            <input
              type="number"
              value={lookupSource?.refreshSeconds ?? ""}
              onChange={(e) => onChange({ ...(lookupSource ?? { kind: "external_db", label: "" }), refreshSeconds: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13.5px] text-ink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
