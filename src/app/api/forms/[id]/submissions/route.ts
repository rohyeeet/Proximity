import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toSubmission } from "@/lib/mappers";
import { genId } from "@/lib/utils";

/** Sample/test submissions created from the Form Builder's Preview panel — never shown in Records or counted in production totals. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formTemplate.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireStudioEditAccess(form.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const version = await prisma.formTemplateVersion.findFirst({ where: { formTemplateId: id }, orderBy: { versionNo: "desc" } });
  if (!version) return NextResponse.json({ error: "Form has no version" }, { status: 500 });

  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const evidence = Array.isArray(body.evidence) ? body.evidence : [];

  const submissionId = genId("submission-test");
  const submission = await prisma.submission.create({
    data: {
      id: submissionId,
      displayId: `TEST-${submissionId.slice(-6)}`,
      formTemplateId: id,
      formTemplateVersionNo: version.versionNo,
      flowNodeLabel: "Test submission",
      reviewStatus: "draft",
      syncStatus: "synced",
      submittedByUserId: access.userId,
      currentVersionNo: 1,
      updatedAt: new Date(),
      answers,
      evidence,
      versions: [{ versionNo: 1, answers, createdAt: new Date().toISOString(), createdByUserId: access.userId }],
      reviewActions: [],
      linkedSubmissionIds: [],
      smartCheckSummary: "Test submission — not part of production records.",
      isTest: true,
    },
  });

  return NextResponse.json(toSubmission(submission));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formTemplate.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireStudioEditAccess(form.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const rows = await prisma.submission.findMany({
    where: { formTemplateId: id, isTest: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(rows.map(toSubmission));
}
