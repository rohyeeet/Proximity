import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toFormTemplate } from "@/lib/mappers";
import { getFormCounts } from "@/lib/queries";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.formTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireStudioEditAccess(existing.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();

  const form = await prisma.formTemplate.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.description === "string" && { description: body.description }),
      ...(typeof body.category === "string" && { category: body.category }),
    },
  });

  let version = await prisma.formTemplateVersion.findFirst({ where: { formTemplateId: id }, orderBy: { versionNo: "desc" } });
  if (!version) return NextResponse.json({ error: "Form has no version" }, { status: 500 });

  if (body.fields !== undefined) {
    version = await prisma.formTemplateVersion.update({ where: { id: version.id }, data: { fields: body.fields } });
  }

  const counts = await getFormCounts(id);
  return NextResponse.json(toFormTemplate(form, version, counts));
}
