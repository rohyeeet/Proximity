import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProjectEditAccess } from "@/lib/authz";
import { toFlowTemplate } from "@/lib/mappers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.flowTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

  const access = await requireProjectEditAccess(existing.projectId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const updated = await prisma.flowTemplate.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && { name: body.name }),
      ...(typeof body.triggerLabel === "string" && { triggerLabel: body.triggerLabel }),
      ...(body.nodes !== undefined && { nodes: body.nodes }),
      ...(body.edges !== undefined && { edges: body.edges }),
    },
  });

  return NextResponse.json(toFlowTemplate(updated));
}
