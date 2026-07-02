import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toFlowTemplate } from "@/lib/mappers";
import { genId } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const domainPackId = typeof body.domainPackId === "string" ? body.domainPackId : undefined;
  if (!domainPackId) return NextResponse.json({ error: "domainPackId is required" }, { status: 400 });

  const access = await requireStudioEditAccess(domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const id = genId("flow-custom");
  const flow = await prisma.flowTemplate.create({
    data: {
      id,
      domainPackId,
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
