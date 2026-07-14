import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProjectEditAccess } from "@/lib/authz";
import { toFlowTemplate } from "@/lib/mappers";
import { genId } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId : undefined;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const access = await requireProjectEditAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const id = genId("flow-custom");
  const flow = await prisma.flowTemplate.create({
    data: {
      id,
      projectId,
      code: id.replace(/-/g, "_"),
      name: "Untitled flow",
      status: "draft",
      versionNo: 0,
      triggerLabel: "Manually triggered",
      nodes: [],
      edges: [],
    },
  });

  return NextResponse.json(toFlowTemplate(flow));
}
