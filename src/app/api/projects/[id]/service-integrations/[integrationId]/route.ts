import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { toProjectServiceIntegration } from "@/lib/mappers";

/** Toggle a project's connection to a listing on/off — same simulated, no-real-billing model as
 * activation itself. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; integrationId: string }> }) {
  const { id: projectId, integrationId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgEditAccess(project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const existing = await prisma.projectServiceIntegration.findUnique({ where: { id: integrationId } });
  if (!existing || existing.projectId !== projectId) {
    return NextResponse.json({ error: "Integration not found for this project" }, { status: 404 });
  }

  const body = await request.json();
  const status: string | undefined = body.status;
  if (status !== "active" && status !== "disconnected") {
    return NextResponse.json({ error: "status must be 'active' or 'disconnected'" }, { status: 400 });
  }

  const updated = await prisma.projectServiceIntegration.update({ where: { id: integrationId }, data: { status } });
  return NextResponse.json(toProjectServiceIntegration(updated));
}
