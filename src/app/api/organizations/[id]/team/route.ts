import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgAccess } from "@/lib/authz";
import { toRole, toUser } from "@/lib/mappers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOrgAccess(id);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const [memberships, roles] = await Promise.all([
    prisma.orgMembership.findMany({ where: { organizationId: id }, include: { user: true, role: true } }),
    prisma.role.findMany({ where: { organizationId: id } }),
  ]);

  return NextResponse.json({
    members: memberships.map((membership) => ({
      membership: { id: membership.id, organizationId: membership.organizationId, userId: membership.userId, roleId: membership.roleId, status: membership.status },
      user: toUser(membership.user),
      role: toRole(membership.role),
    })),
    roles: roles.map(toRole),
  });
}
