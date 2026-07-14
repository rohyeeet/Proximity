import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { toMilestoneTemplate } from "@/lib/mappers";
import { getMilestoneTemplatesByProject } from "@/lib/queries";
import { genId } from "@/lib/utils";
import type { MilestoneType, ParticipantRole, VerificationSource } from "@/types";

interface CreateBody {
  type: MilestoneType;
  label: string;
  percentOfTotal: number;
  verificationSource: VerificationSource;
  splitRules: { participantRole: ParticipantRole; percent: number }[];
}

/** A project's milestone templates — the one place a project developer defines the payment
 * structure (what % of the total, and how it splits across roles) before any real buyer deal
 * exists. Any org-editor tier can configure this (not platform-admin-only like agreement
 * creation) — this is process/deal-structuring config, the same tier that builds the Flow itself. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgEditAccess(project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const templates = await getMilestoneTemplatesByProject(projectId);
  return NextResponse.json(templates);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const access = await requireOrgEditAccess(project.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body: CreateBody = await request.json();
  if (!body.label?.trim()) return NextResponse.json({ error: "label is required" }, { status: 400 });
  if (!Number.isFinite(body.percentOfTotal) || body.percentOfTotal <= 0) {
    return NextResponse.json({ error: "percentOfTotal must be a positive number" }, { status: 400 });
  }
  if (!Array.isArray(body.splitRules) || body.splitRules.length === 0) {
    return NextResponse.json({ error: "At least one split rule is required" }, { status: 400 });
  }
  const splitTotal = body.splitRules.reduce((sum, r) => sum + r.percent, 0);
  if (Math.abs(splitTotal - 100) > 0.5) {
    return NextResponse.json({ error: `Split percentages must sum to 100 (currently ${splitTotal})` }, { status: 400 });
  }

  const existingCount = await prisma.milestoneTemplate.count({ where: { projectId } });
  const id = genId("milestone-template");
  const created = await prisma.milestoneTemplate.create({
    data: {
      id,
      projectId,
      type: body.type,
      label: body.label,
      percentOfTotal: body.percentOfTotal,
      verificationSource: body.verificationSource,
      order: existingCount + 1,
      splitRules: {
        create: body.splitRules.map((rule) => ({ id: genId("mt-split"), participantRole: rule.participantRole, percent: rule.percent })),
      },
    },
    include: { splitRules: true },
  });

  return NextResponse.json(toMilestoneTemplate(created));
}
