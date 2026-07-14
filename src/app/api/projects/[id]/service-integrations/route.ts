import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAccess, requireOrgEditAccess } from "@/lib/authz";
import { toProjectServiceIntegration } from "@/lib/mappers";
import { getProjectServiceIntegrations } from "@/lib/queries";
import { genId } from "@/lib/utils";

async function resolveProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

/** Which of this project's Marketplace listings are connected — viewable by any org member (it's
 * informational, same as seeing an agreement's status), only editable by org-editor tier. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await resolveProject(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgAccess(project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const integrations = await getProjectServiceIntegrations(projectId);
  return NextResponse.json(integrations);
}

/** "Activate" a listing for this project — deliberately simulated (see README's Prototype
 * boundaries): this only records the project's own intent/config, never a real API call or charge. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await resolveProject(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgEditAccess(project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const serviceListingId: string | undefined = body.serviceListingId;
  if (typeof serviceListingId !== "string" || serviceListingId.trim() === "") {
    return NextResponse.json({ error: "serviceListingId is required" }, { status: 400 });
  }
  const listing = await prisma.serviceListing.findUnique({ where: { id: serviceListingId } });
  if (!listing) return NextResponse.json({ error: "Service listing not found" }, { status: 404 });

  const integration = await prisma.projectServiceIntegration.upsert({
    where: { projectId_serviceListingId: { projectId, serviceListingId } },
    create: {
      id: genId("integration"),
      projectId,
      serviceListingId,
      status: "active",
      requestedByUserId: access.userId,
    },
    update: { status: "active" },
  });

  return NextResponse.json(toProjectServiceIntegration(integration), { status: 201 });
}
