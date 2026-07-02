"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";

export default function FlowsLibraryPage() {
  const router = useRouter();
  const { session } = useSession();
  const { flows, createFlow } = useStudio();
  const canEdit = canEditStudio(session.role.tier);
  const orgFlows = flows.filter((flow) => flow.domainPackId === session.organization.domainPackId);

  async function handleNewFlow() {
    const id = await createFlow(session.organization.domainPackId);
    router.push(`/flows/${id}`);
  }

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Flows"
        description="Model sequence, parallel branches, review gates, and correction loops — the same grammar for every vertical."
        actions={
          canEdit ? (
            <Button variant="primary" onClick={handleNewFlow}>
              New flow
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3">
        {orgFlows.map((flow) => (
          <Link
            key={flow.id}
            href={`/flows/${flow.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5 hover:border-border-strong hover:shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-ink">{flow.name}</p>
                <StatusChip label={flow.status === "published" ? "Live" : "Draft"} tone={flow.status === "published" ? "good" : "hold"} />
              </div>
              <p className="mt-1 text-[13px] text-ink-soft">Triggers on {flow.triggerLabel.toLowerCase()}</p>
            </div>
            <p className="text-[13px] text-ink-soft">
              {flow.nodes.length} nodes · {flow.edges.length} edges · v{flow.versionNo}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
