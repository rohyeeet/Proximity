"use client";

import Link from "next/link";
import { Plus, Workflow, Wallet } from "lucide-react";
import { useSession } from "@/lib/session";
import { useStudio, pickActiveFlow } from "@/lib/studio";
import { canEditStudio } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EditableText } from "@/components/ui/EditableText";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";

/** The real-world sites/deals an organization runs — each project gets its own Flow (process
 * graph) and Payments (milestone templates, agreements, escrow), drawing on the shared Forms &
 * Stages library for the domain pack it runs on. */
export default function ProjectsPage() {
  const { session } = useSession();
  const { flows, projects, createProject, updateProject } = useStudio();
  const canEdit = canEditStudio(session.role.tier);
  const orgProjects = projects.filter((p) => p.organizationId === session.organization.id);

  async function handleNewProject() {
    await createProject(session.organization.id, session.organization.domainPackId, "Untitled project");
  }

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Projects"
        description="Each real-world site or deal your organization runs — its own Flow and its own Payments, drawing on your shared form library."
        actions={
          canEdit ? (
            <Button variant="primary" onClick={handleNewProject}>
              <Plus className="size-3.5" /> New project
            </Button>
          ) : undefined
        }
      />

      {orgProjects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start building its process flow and payment terms."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orgProjects.map((project) => {
            const flow = pickActiveFlow(flows, project.id);
            return (
              <Card key={project.id}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <EditableText
                        as="span"
                        value={project.name}
                        onChange={(name) => updateProject(project.id, { name })}
                        canEdit={canEdit}
                        textClassName="text-[14px] font-semibold text-ink"
                      />
                      <StatusChip label={project.status === "active" ? "Active" : "Archived"} tone={project.status === "active" ? "good" : "hold"} />
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      {flow ? `${flow.name} · v${flow.versionNo}` : "No flow published yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {flow && (
                      <Link href={`/flows/${flow.id}`}>
                        <Button variant="secondary" size="sm">
                          <Workflow className="size-3.5" /> Flow
                        </Button>
                      </Link>
                    )}
                    <Link href={`/payments?project=${project.id}`}>
                      <Button variant="secondary" size="sm">
                        <Wallet className="size-3.5" /> Payments
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
