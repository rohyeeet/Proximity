import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { toProject } from "@/lib/mappers";
import { genId } from "@/lib/utils";

/** Creates a new Project under an organization — the real-world site/deal each gets its own Flow
 * and Payments setup. domainPackId is inherited from the organization at creation time (an org
 * only ever runs one domain pack today, matching Organization.domainPackId). */
export async function POST(request: Request) {
  const body = await request.json();
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : undefined;
  const domainPackId = typeof body.domainPackId === "string" ? body.domainPackId : undefined;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!organizationId || !domainPackId) return NextResponse.json({ error: "organizationId and domainPackId are required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const access = await requireOrgEditAccess(organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const project = await prisma.project.create({
    data: { id: genId("project"), organizationId, domainPackId, name, status: "active" },
  });

  return NextResponse.json(toProject(project));
}
