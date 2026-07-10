import { NextResponse } from "next/server";
import { requireOrgAccess } from "@/lib/authz";
import { getFlowSummary } from "@/lib/analytics";

/** Per-form/per-stage roll-up (SLA, rejection reasons, accept/reject/pending, bottleneck and
 * drop-off stages, tracker metrics) for the Overview page — scoped to one caller-verified
 * organization, same tenant-isolation shape as src/app/api/organizations/[id]/analytics/route.ts. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: flowId } = await params;
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "organizationId is required" }, { status: 400 });

  const access = await requireOrgAccess(organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const summary = await getFlowSummary(flowId, organizationId);
  if (!summary) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

  return NextResponse.json(summary);
}
