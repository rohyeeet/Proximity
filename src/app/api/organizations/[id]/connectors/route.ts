import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAccess, requireOrgEditAccess } from "@/lib/authz";
import { toConnector } from "@/lib/mappers";
import { genId } from "@/lib/utils";

const CONNECTOR_TYPES = ["internal_lookup", "external_database", "industrial_protocol"];
const PROTOCOLS = ["opc_ua", "modbus", "mqtt_sparkplug_b"];

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrgEditAccess(id);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const connectorType = typeof body.connectorType === "string" ? body.connectorType : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!CONNECTOR_TYPES.includes(connectorType)) return NextResponse.json({ error: "Invalid connector type" }, { status: 400 });

  const protocol = connectorType === "industrial_protocol" && PROTOCOLS.includes(body.protocol) ? body.protocol : null;
  const endpoint = typeof body.endpoint === "string" && body.endpoint.trim() ? body.endpoint.trim() : null;

  const connector = await prisma.connector.create({
    data: {
      id: genId("connector"),
      organizationId: id,
      name,
      connectorType,
      protocol,
      endpoint,
      status: "disconnected",
    },
  });

  return NextResponse.json(toConnector(connector));
}
