import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/authz";
import { toDomainPack, toOrganization } from "@/lib/mappers";

export async function GET() {
  const access = await requirePlatformAdmin();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const [orgRows, domainPackRows] = await Promise.all([
    prisma.organization.findMany({ include: { _count: { select: { memberships: true, connectors: true } } } }),
    prisma.domainPack.findMany(),
  ]);

  return NextResponse.json({
    organizations: orgRows.map((row) => ({ ...toOrganization(row), memberCount: row._count.memberships, connectorCount: row._count.connectors })),
    domainPacks: domainPackRows.map(toDomainPack),
  });
}
