import { notFound } from "next/navigation";
import { getConnector, getDevicesByConnector, getTelemetryStreamsByDevice } from "@/lib/queries";
import { ConnectorStatusChip } from "@/components/ui/StatusChip";
import { DeviceCard } from "@/components/connectors/DeviceCard";

export default async function ConnectorDetailPage({ params }: { params: Promise<{ connectorId: string }> }) {
  const { connectorId } = await params;
  const connector = await getConnector(connectorId);
  if (!connector) notFound();
  const connectorDevices = await getDevicesByConnector(connectorId);
  const streamsByDevice = await Promise.all(connectorDevices.map((device) => getTelemetryStreamsByDevice(device.id)));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{connector.name}</h1>
            <ConnectorStatusChip status={connector.status} />
          </div>
          {connector.endpoint && <p className="mt-0.5 font-mono text-[12.5px] text-ink-soft">{connector.endpoint}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {connectorDevices.map((device, index) => (
          <DeviceCard key={device.id} device={device} streams={streamsByDevice[index] ?? []} />
        ))}
        {connectorDevices.length === 0 && <p className="text-sm text-ink-soft">No devices registered on this connector yet.</p>}
      </div>
    </div>
  );
}
