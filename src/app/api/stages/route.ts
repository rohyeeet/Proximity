import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toStage } from "@/lib/mappers";
import { genId } from "@/lib/utils";

export async function POST(request: Request) {
  const body = await request.json();
  const domainPackId = typeof body.domainPackId === "string" ? body.domainPackId : undefined;
  if (!domainPackId) return NextResponse.json({ error: "domainPackId is required" }, { status: 400 });

  const access = await requireStudioEditAccess(domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const maxSort = await prisma.stage.aggregate({ where: { domainPackId }, _max: { sortOrder: true } });
  const stage = await prisma.stage.create({
    data: {
      id: genId("stage-custom"),
      domainPackId,
      name: "Untitled stage",
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      connectorIds: [],
      formTemplateIds: [],
    },
  });

  return NextResponse.json(toStage(stage));
}
