"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";

export default function FlowsLibraryPage() {
  const router = useRouter();
  const { session } = useSession();
  const { flows, projects, createFlow } = useStudio();
  const canEdit = canEditStudio(session.role.tier);
  const orgProjects = projects.filter((p) => p.organizationId === session.organization.id);
  const orgProjectIds = new Set(orgProjects.map((p) => p.id));
  const orgFlows = flows.filter((flow) => orgProjectIds.has(flow.projectId));
  const projectName = (projectId: string) => orgProjects.find((p) => p.id === projectId)?.name ?? "Unknown project";

  const [newFlowProjectId, setNewFlowProjectId] = useState(orgProjects[0]?.id ?? "");

  async function handleNewFlow() {
    if (!newFlowProjectId) return;
    const id = await createFlow(newFlowProjectId);
    router.push(`/flows/${id}`);
  }

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Flows"
        description="Model sequence, parallel branches, review gates, and correction loops — the same grammar for every vertical."
        actions={
          canEdit && orgProjects.length > 0 ? (
            <div className="flex items-center gap-2">
              {orgProjects.length > 1 && (
                <select
                  value={newFlowProjectId}
                  onChange={(e) => setNewFlowProjectId(e.target.value)}
                  className="rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-ink"
                >
                  {orgProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <Button variant="primary" onClick={handleNewFlow}>
                New flow
              </Button>
            </div>
          ) : undefined
        }
      />

      {orgProjects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="A flow belongs to a project — create a project first from the Projects page."
        />
      ) : (
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
                <p className="mt-1 text-[13px] text-ink-soft">
                  {projectName(flow.projectId)} · triggers on {flow.triggerLabel.toLowerCase()}
                </p>
              </div>
              <p className="text-[13px] text-ink-soft">
                {flow.nodes.length} nodes · {flow.edges.length} edges · v{flow.versionNo}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
