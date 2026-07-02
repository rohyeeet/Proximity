import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import { toDevice } from "@/lib/mappers";

/** Every device across every connector for this org — used by the lookup-source device/telemetry picker. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrgAccess(id);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const rows = await prisma.device.findMany({ where: { connector: { organizationId: id } } });
  return NextResponse.json(rows.map(toDevice));
}
