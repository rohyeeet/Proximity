import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toStage } from "@/lib/mappers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const direction = body.direction === 1 ? 1 : body.direction === -1 ? -1 : undefined;
  if (direction === undefined) return NextResponse.json({ error: "direction must be -1 or 1" }, { status: 400 });

  const target = await prisma.stage.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const access = await requireStudioEditAccess(target.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const siblings = await prisma.stage.findMany({ where: { domainPackId: target.domainPackId }, orderBy: { sortOrder: "asc" } });
  const index = siblings.findIndex((s) => s.id === id);
  const targetIndex = index + direction;

  if (index !== -1 && targetIndex >= 0 && targetIndex < siblings.length) {
    const a = siblings[index]!;
    const b = siblings[targetIndex]!;
    await prisma.$transaction([
      prisma.stage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
      prisma.stage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
    ]);
  }

  const refreshed = await prisma.stage.findMany({ where: { domainPackId: target.domainPackId }, orderBy: { sortOrder: "asc" } });
  return NextResponse.json(refreshed.map(toStage));
}
