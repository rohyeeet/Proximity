import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import { toConnector } from "@/lib/mappers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrgAccess(id);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const rows = await prisma.connector.findMany({
    where: { organizationId: id },
    include: { _count: { select: { devices: true } } },
  });

  return NextResponse.json(rows.map((row) => ({ ...toConnector(row), deviceCount: row._count.devices })));
}
