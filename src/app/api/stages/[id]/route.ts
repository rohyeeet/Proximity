import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toStage } from "@/lib/mappers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.stage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const access = await requireStudioEditAccess(existing.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const updated = await prisma.stage.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && { name: body.name }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(Array.isArray(body.connectorIds) && { connectorIds: body.connectorIds }),
      ...(Array.isArray(body.formTemplateIds) && { formTemplateIds: body.formTemplateIds }),
    },
  });

  return NextResponse.json(toStage(updated));
}
