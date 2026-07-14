import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { getMilestoneLedger } from "@/lib/queries";

/** Same access tier as the milestone-templates list (requireOrgEditAccess, not the broader
 * requireOrgAccess) — the ledger breaks down every role's own % and running total, which is the
 * same sensitive deal-structuring data the templates themselves carry. An investor/registry party
 * or any other non-management org member never reaches this; their own share is surfaced instead
 * via PaymentLedgerSummary on the agreement detail page, scoped to just their role. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await prisma.milestoneTemplate.findUnique({ where: { id }, include: { project: true } });
  if (!template) return NextResponse.json({ error: "Milestone template not found" }, { status: 404 });

  const access = await requireOrgEditAccess(template.project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const ledger = await getMilestoneLedger(id);
  return NextResponse.json(ledger);
}
