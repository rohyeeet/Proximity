import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { toProject } from "@/lib/mappers";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgEditAccess(existing.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(typeof body.name === "string" && body.name.trim() !== "" && { name: body.name }),
      ...(typeof body.description === "string" && { description: body.description || null }),
      ...(typeof body.status === "string" && { status: body.status }),
    },
  });

  return NextResponse.json(toProject(updated));
}
