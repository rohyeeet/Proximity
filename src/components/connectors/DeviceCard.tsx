import { AlertCircle } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatDate } from "@/lib/utils";
import { TelemetrySparkline } from "./TelemetrySparkline";
import type { Device, TelemetryStream } from "@/types";

export function DeviceCard({ device, streams }: { device: Device; streams: TelemetryStream[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div>
          <p className="font-medium text-ink">{device.name}</p>
          <p className="text-[12px] text-ink-soft">{device.externalRef}</p>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-ink-soft">
          <span className="tabular">Coverage {device.coveragePct}%</span>
          {device.lastGapMinutes && (
            <span className="flex items-center gap-1">
              <AlertCircle className="size-3.5 text-warn-text" /> last gap {device.lastGapMinutes}m
            </span>
          )}
          {device.calibration && (
            <span>
              Cal. {device.calibration.certNumber} · valid to {formatDate(device.calibration.validTo)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[1fr_220px]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="pb-2 font-medium">Tag</th>
              <th className="pb-2 font-medium">Parameter</th>
              <th className="pb-2 font-medium">Unit</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {device.tags.map((tag) => (
              <tr key={tag.externalRef} className="border-t border-border">
                <td className="py-2 font-mono text-[12px] text-ink-soft">{tag.externalRef}</td>
                <td className="py-2 text-ink">{tag.parameterLabel}</td>
                <td className="py-2 text-ink-soft">{tag.unit}</td>
                <td className="py-2">
                  {tag.mapped ? (
                    <StatusChip label="Mapped" tone="good" />
                  ) : (
                    <StatusChip label={tag.isNew ? "New — needs mapping" : "Unmapped"} tone="warn" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {streams.length > 0 && (
          <div className="flex flex-col gap-3">
            {streams.map((stream) => (
              <TelemetrySparkline key={stream.parameterCode} stream={stream} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
