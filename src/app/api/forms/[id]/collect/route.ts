import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireFormCollectAccess } from "@/lib/authz";
import { toSubmission } from "@/lib/mappers";
import {
  assertLinksStillAvailable,
  deriveExclusiveLinkedSubmissionIds,
  deriveLinkedSubmissionIds,
  getFlowTemplatesByProject,
  getLatestPublishedVersion,
  getProjectsByOrganization,
  LinkedRecordConflictError,
} from "@/lib/queries";
import { pickActiveFlow } from "@/lib/flow-utils";
import { genId } from "@/lib/utils";
import type { FormFieldDefinition } from "@/types";

/** Resolves which project's active flow (if any) references this form, and that flow node's
 * label — Forms are shared domain-pack-level config, but Flows are project-scoped, so a form can
 * appear in more than one project's flow. Picks the submitter's own organization's project whose
 * active flow references it first; if the submitter has no org membership on this domain pack
 * (e.g. a platform admin submitting directly) or no project's flow references this form yet,
 * falls back to no project attribution rather than guessing. */
async function resolveProjectFlowNode(
  formTemplateId: string,
  domainPackId: string,
  userId: string
): Promise<{ projectId?: string; flowNodeLabel?: string }> {
  const membership = await prisma.orgMembership.findFirst({
    where: { userId, status: "active", organization: { domainPackId } },
  });
  if (!membership) return {};

  const projects = await getProjectsByOrganization(membership.organizationId);
  for (const project of projects) {
    const flows = await getFlowTemplatesByProject(project.id);
    const flow = pickActiveFlow(flows, project.id);
    const node = flow?.nodes.find((n) => n.formTemplateId === formTemplateId);
    if (node) return { projectId: project.id, flowNodeLabel: node.label };
  }
  return {};
}

/** Real field submissions — created from the Collect app, never test data. Only ever submitted
 * against the form's latest *published* version, never an in-progress Studio draft. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formTemplate.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireFormCollectAccess(form.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const version = await getLatestPublishedVersion(id);
  if (!version) return NextResponse.json({ error: "This form hasn't been published yet" }, { status: 409 });

  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const evidence = Array.isArray(body.evidence) ? body.evidence : [];
  const fields = version.fields as unknown as FormFieldDefinition[];
  const linkedSubmissionIds = deriveLinkedSubmissionIds(fields, answers);
  const exclusiveLinkedIds = deriveExclusiveLinkedSubmissionIds(fields, answers);

  // Prefer the client's own explicit project context (the Collect home page's assigned-work links
  // already know exactly which project they came from) over re-deriving it server-side — only
  // fall back to the heuristic when the client didn't send one (e.g. an older cached page).
  let projectId: string | undefined;
  let flowNodeLabel: string | undefined;
  if (typeof body.projectId === "string" && body.projectId) {
    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    if (project && project.domainPackId === form.domainPackId) {
      const flows = await getFlowTemplatesByProject(project.id);
      const flow = pickActiveFlow(flows, project.id);
      const node = flow?.nodes.find((n) => n.formTemplateId === id);
      projectId = project.id;
      flowNodeLabel = node?.label;
    }
  }
  if (!projectId) {
    const resolved = await resolveProjectFlowNode(id, form.domainPackId, access.userId);
    projectId = resolved.projectId;
    flowNodeLabel = resolved.flowNodeLabel;
  }

  const submissionId = genId("submission");
  const now = new Date();

  try {
    const submission = await prisma.$transaction(
      async (tx) => {
        await assertLinksStillAvailable(tx, exclusiveLinkedIds);
        return tx.submission.create({
          data: {
            id: submissionId,
            displayId: `${form.code.slice(0, 8).toUpperCase()}-${submissionId.slice(-6)}`,
            formTemplateId: id,
            projectId,
            formTemplateVersionNo: version.versionNo,
            flowNodeLabel: flowNodeLabel ?? form.name,
            reviewStatus: "needs_check",
            syncStatus: "synced",
            submittedByUserId: access.userId,
            currentVersionNo: 1,
            updatedAt: now,
            answers,
            evidence,
            versions: [{ versionNo: 1, answers, createdAt: now.toISOString(), createdByUserId: access.userId }],
            reviewActions: [],
            linkedSubmissionIds,
            smartCheckSummary: "Awaiting review.",
            isTest: false,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    return NextResponse.json(toSubmission(submission));
  } catch (error) {
    if (error instanceof LinkedRecordConflictError) {
      return NextResponse.json({ error: "One of the records you selected was just linked by another submission. Please pick again." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "This submission conflicted with another in-flight change. Please try again." }, { status: 409 });
    }
    throw error;
  }
}
