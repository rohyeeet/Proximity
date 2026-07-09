import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreatePaymentAgreementAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { genId } from "@/lib/utils";
import type { MilestoneType, ParticipantRole, RecipientRole, VerificationSource, VerificationStatus } from "@/types";

interface CreateAgreementBody {
  organizationId: string;
  buyerName: string;
  projectName: string;
  currency: string;
  totalValue: number;
  pricePerCredit?: number;
  escrowInterestAllocation: string;
  fxRateTimingPolicy: string;
  splitRules: { participantRole: ParticipantRole; percent: number }[];
  milestones: { type: MilestoneType; label: string; percentOfTotal: number; verificationSource: VerificationSource; registryRef?: string }[];
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
  if (!isNonEmptyString(body.organizationId) || !isNonEmptyString(body.buyerName) || !isNonEmptyString(body.projectName)) {
    return NextResponse.json({ error: "organizationId, buyerName, and projectName are required" }, { status: 400 });
  }
  if (!Number.isFinite(body.totalValue) || body.totalValue <= 0) {
    return NextResponse.json({ error: "totalValue must be a positive number" }, { status: 400 });
  }
  if (!Array.isArray(body.milestones) || body.milestones.length === 0) {
    return NextResponse.json({ error: "At least one milestone is required" }, { status: 400 });
  }
  if (!Array.isArray(body.splitRules) || body.splitRules.length === 0) {
    return NextResponse.json({ error: "At least one split rule is required" }, { status: 400 });
  }
  const milestonePercentTotal = body.milestones.reduce((sum, m) => sum + m.percentOfTotal, 0);
  if (Math.abs(milestonePercentTotal - 100) > 0.5) {
    return NextResponse.json({ error: `Milestone percentages must sum to 100 (currently ${milestonePercentTotal})` }, { status: 400 });
  }
  const splitPercentTotal = body.splitRules.reduce((sum, r) => sum + r.percent, 0);
  if (Math.abs(splitPercentTotal - 100) > 0.5) {
    return NextResponse.json({ error: `Split rule percentages must sum to 100 (currently ${splitPercentTotal})` }, { status: 400 });
  }

  const organization = await prisma.organization.findUnique({ where: { id: body.organizationId } });
  if (!organization) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const agreementId = genId("agreement");
  // Explicit generous timeout — this transaction does several sequential round trips
  // (agreement + 2-3 createMany batches + an audit entry), which real network latency to a
  // remote Postgres can exceed Prisma's 5s interactive-transaction default.
  await prisma.$transaction(async (tx) => {
    await tx.paymentAgreement.create({
      data: {
        id: agreementId,
        organizationId: body.organizationId,
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
    await tx.splitRule.createMany({
      data: body.splitRules.map((rule) => ({ id: genId("split"), paymentAgreementId: agreementId, participantRole: rule.participantRole, percent: rule.percent })),
    });
    await tx.milestone.createMany({
      data: body.milestones.map((milestone, index) => ({
        id: genId("milestone"),
        paymentAgreementId: agreementId,
        type: milestone.type,
        label: milestone.label,
        percentOfTotal: milestone.percentOfTotal,
        verificationSource: milestone.verificationSource,
        registryRef: milestone.registryRef,
        order: index + 1,
        status: "not_due",
      })),
    });
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
