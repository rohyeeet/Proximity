import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toFormTemplate, toStage } from "@/lib/mappers";
import { genId } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const domainPackId = typeof body.domainPackId === "string" ? body.domainPackId : undefined;
  const stageId = typeof body.stageId === "string" ? body.stageId : undefined;
  if (!domainPackId) return NextResponse.json({ error: "domainPackId is required" }, { status: 400 });

  const access = await requireStudioEditAccess(domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  let category = "Custom";
  const stage = stageId ? await prisma.stage.findUnique({ where: { id: stageId } }) : null;
  if (stage) category = stage.name;

  const id = genId("form-custom");
  const [form, version] = await prisma.$transaction([
    prisma.formTemplate.create({
      data: { id, domainPackId, code: id.replace(/-/g, "_"), name: "Untitled form", description: "", category },
    }),
    prisma.formTemplateVersion.create({
      data: { formTemplateId: id, versionNo: 0, status: "draft", publishedAt: null, fields: [] },
    }),
  ]);

  let updatedStage;
  if (stage) {
    updatedStage = await prisma.stage.update({
      where: { id: stage.id },
      data: { formTemplateIds: [...stage.formTemplateIds, id] },
    });
  }

  return NextResponse.json({
    form: toFormTemplate(form, version, { submissionCount: 0, needsCheckCount: 0, needsFixCount: 0 }),
    stage: updatedStage ? toStage(updatedStage) : undefined,
  });
}
