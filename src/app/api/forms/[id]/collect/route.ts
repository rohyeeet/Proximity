import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFormCollectAccess } from "@/lib/authz";
import { toSubmission } from "@/lib/mappers";
import { deriveLinkedSubmissionIds, getLatestPublishedVersion } from "@/lib/queries";
import { genId } from "@/lib/utils";
import type { FormFieldDefinition } from "@/types";

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
  const linkedSubmissionIds = deriveLinkedSubmissionIds(version.fields as unknown as FormFieldDefinition[], answers);

  const flowNode = await prisma.flowTemplate
    .findMany({ where: { domainPackId: form.domainPackId } })
    .then((flows) => flows.flatMap((f) => f.nodes as { formTemplateId?: string; label: string }[]).find((n) => n.formTemplateId === id));

  const submissionId = genId("submission");
  const now = new Date();
  const submission = await prisma.submission.create({
    data: {
      id: submissionId,
      displayId: `${form.code.slice(0, 8).toUpperCase()}-${submissionId.slice(-6)}`,
      formTemplateId: id,
      formTemplateVersionNo: version.versionNo,
      flowNodeLabel: flowNode?.label ?? form.name,
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

  return NextResponse.json(toSubmission(submission));
}
