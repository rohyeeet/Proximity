import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOrgEditAccess } from "@/lib/authz";
import { toMilestoneTemplate } from "@/lib/mappers";
import { genId } from "@/lib/utils";
import type { MilestoneType, ParticipantRole, VerificationSource } from "@/types";

interface UpdateBody {
  type?: MilestoneType;
  label?: string;
  percentOfTotal?: number;
  verificationSource?: VerificationSource;
  splitRules?: { participantRole: ParticipantRole; percent: number }[];
}

async function resolveAccess(templateId: string) {
  const existing = await prisma.milestoneTemplate.findUnique({ where: { id: templateId }, include: { project: true } });
  if (!existing) return { existing: null, access: null };
  const access = await requireOrgEditAccess(existing.project.organizationId);
  return { existing, access };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { existing, access } = await resolveAccess(id);
  if (!existing) return NextResponse.json({ error: "Milestone template not found" }, { status: 404 });
  if (!access!.ok) return NextResponse.json({ error: access!.message }, { status: access!.status });

  const body: UpdateBody = await request.json();
  if (body.splitRules) {
    const splitTotal = body.splitRules.reduce((sum, r) => sum + r.percent, 0);
    if (Math.abs(splitTotal - 100) > 0.5) {
      return NextResponse.json({ error: `Split percentages must sum to 100 (currently ${splitTotal})` }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (body.splitRules) {
      await tx.milestoneTemplateSplit.deleteMany({ where: { milestoneTemplateId: id } });
      await tx.milestoneTemplateSplit.createMany({
        data: body.splitRules.map((rule) => ({ id: genId("mt-split"), milestoneTemplateId: id, participantRole: rule.participantRole, percent: rule.percent })),
      });
    }
    return tx.milestoneTemplate.update({
      where: { id },
      data: {
        ...(body.type !== undefined && { type: body.type }),
        ...(body.label !== undefined && { label: body.label }),
        ...(body.percentOfTotal !== undefined && { percentOfTotal: body.percentOfTotal }),
        ...(body.verificationSource !== undefined && { verificationSource: body.verificationSource }),
      },
      include: { splitRules: true },
    });
  });

  return NextResponse.json(toMilestoneTemplate(updated));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { existing, access } = await resolveAccess(id);
  if (!existing) return NextResponse.json({ error: "Milestone template not found" }, { status: 404 });
  if (!access!.ok) return NextResponse.json({ error: access!.message }, { status: access!.status });

  await prisma.milestoneTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
