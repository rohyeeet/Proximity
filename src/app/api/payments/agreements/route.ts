import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreatePaymentAgreementAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { genId } from "@/lib/utils";
import type { RecipientRole, VerificationStatus } from "@/types";

interface CreateAgreementBody {
  organizationId: string;
  projectId: string;
  buyerName: string;
  projectName: string;
  currency: string;
  totalValue: number;
  pricePerCredit?: number;
  escrowInterestAllocation: string;
  fxRateTimingPolicy: string;
  // Which of the project's pre-authored MilestoneTemplates this agreement runs against — the
  // builder no longer accepts freehand milestones/splits, it snapshots these at creation time.
  milestoneTemplateIds: string[];
  recipients: { role: RecipientRole; name: string; kycStatus: VerificationStatus; bavStatus: VerificationStatus }[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/** Setting up an agreement + milestone schedule is platform-super-admin-only (see
 * src/lib/authz.ts's requireCreatePaymentAgreementAccess) — a project's own org staff and
 * investor/registry parties take part in the flow but don't author it. */
export async function POST(request: Request) {
  const access = await requireCreatePaymentAgreementAccess();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body: CreateAgreementBody = await request.json();
  if (
    !isNonEmptyString(body.organizationId) ||
    !isNonEmptyString(body.projectId) ||
    !isNonEmptyString(body.buyerName) ||
    !isNonEmptyString(body.projectName)
  ) {
    return NextResponse.json({ error: "organizationId, projectId, buyerName, and projectName are required" }, { status: 400 });
  }
  if (!Number.isFinite(body.totalValue) || body.totalValue <= 0) {
    return NextResponse.json({ error: "totalValue must be a positive number" }, { status: 400 });
  }
  if (!Array.isArray(body.milestoneTemplateIds) || body.milestoneTemplateIds.length === 0) {
    return NextResponse.json({ error: "At least one milestone template is required" }, { status: 400 });
  }

  const organization = await prisma.organization.findUnique({ where: { id: body.organizationId } });
  if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  const project = await prisma.project.findUnique({ where: { id: body.projectId } });
  if (!project || project.organizationId !== body.organizationId) {
    return NextResponse.json({ error: "Project not found for this organization" }, { status: 404 });
  }

  const templates = await prisma.milestoneTemplate.findMany({
    where: { id: { in: body.milestoneTemplateIds }, projectId: body.projectId },
    include: { splitRules: true },
    orderBy: { order: "asc" },
  });
  if (templates.length !== body.milestoneTemplateIds.length) {
    return NextResponse.json({ error: "One or more milestone templates were not found for this project" }, { status: 404 });
  }
  const milestonePercentTotal = templates.reduce((sum, t) => sum + t.percentOfTotal, 0);
  if (Math.abs(milestonePercentTotal - 100) > 0.5) {
    return NextResponse.json(
      { error: `Selected milestone templates must sum to 100% of the deal value (currently ${milestonePercentTotal})` },
      { status: 400 }
    );
  }

  const agreementId = genId("agreement");
  // Explicit generous timeout — this transaction does several sequential round trips
  // (agreement + 2-3 createMany batches + an audit entry), which real network latency to a
  // remote Postgres can exceed Prisma's 5s interactive-transaction default.
  await prisma.$transaction(async (tx) => {
    await tx.paymentAgreement.create({
      data: {
        id: agreementId,
        organizationId: body.organizationId,
        projectId: body.projectId,
        buyerName: body.buyerName,
        projectName: body.projectName,
        currency: body.currency || "USD",
        totalValue: body.totalValue,
        pricePerCredit: body.pricePerCredit,
        escrowInterestAllocation: body.escrowInterestAllocation || "pool",
        fxRateTimingPolicy: body.fxRateTimingPolicy || "apply_at_execution",
        status: "draft",
        createdByUserId: access.userId,
      },
    });
    // Snapshot each selected template into a real Milestone + its own per-milestone SplitRule set,
    // so a later edit to the template never retroactively changes this agreement's terms.
    for (const [index, template] of templates.entries()) {
      const milestoneId = genId("milestone");
      await tx.milestone.create({
        data: {
          id: milestoneId,
          paymentAgreementId: agreementId,
          sourceTemplateId: template.id,
          type: template.type,
          label: template.label,
          percentOfTotal: template.percentOfTotal,
          verificationSource: template.verificationSource,
          order: index + 1,
          status: "not_due",
        },
      });
      await tx.splitRule.createMany({
        data: template.splitRules.map((rule) => ({
          id: genId("split"),
          paymentAgreementId: agreementId,
          milestoneId,
          participantRole: rule.participantRole,
          percent: rule.percent,
        })),
      });
    }
    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      await tx.payoutRecipient.createMany({
        data: body.recipients.map((recipient) => ({
          id: genId("recipient"),
          paymentAgreementId: agreementId,
          role: recipient.role,
          name: recipient.name,
          kycStatus: recipient.kycStatus || "not_started",
          bavStatus: recipient.bavStatus || "not_started",
        })),
      });
    }
    await appendAuditEntry(tx, agreementId, "agreement.created", { buyerName: body.buyerName, projectName: body.projectName, totalValue: body.totalValue });
  }, { timeout: 20000 });

  return NextResponse.json({ id: agreementId }, { status: 201 });
}
