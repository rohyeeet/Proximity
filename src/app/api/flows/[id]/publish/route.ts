import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProjectEditAccess } from "@/lib/authz";
import { toFlowTemplate } from "@/lib/mappers";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flow = await prisma.flowTemplate.findUnique({ where: { id } });
  if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

  const access = await requireProjectEditAccess(flow.projectId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const published = await prisma.flowTemplate.update({
    where: { id },
    data: { versionNo: flow.versionNo + 1, status: "published" },
  });

  return NextResponse.json(toFlowTemplate(published));
}
