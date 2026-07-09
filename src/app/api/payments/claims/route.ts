import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePaymentOrgAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { notifyConsentNeeded } from "@/lib/notifications";
import { genId } from "@/lib/utils";
import type { ConsentRequiredRole } from "@/types";

/** Ground partner files a claim + claimed amount for a milestone — the construction-loan-draw-request
 * pattern from the design doc's §8: the party doing the work reports progress and requests funds,
 * it doesn't get auto-billed on a schedule. Required consents are seeded immediately so the UI can
 * show exactly which sign-off is outstanding from the moment the claim exists. */
export async function POST(request: Request) {
  const body = await request.json();
  const milestoneId: string | undefined = body.milestoneId;
  const claimedAmount: number | undefined = body.claimedAmount;
  if (typeof milestoneId !== "string" || milestoneId.trim() === "") {
    return NextResponse.json({ error: "milestoneId is required" }, { status: 400 });
  }
  if (typeof claimedAmount !== "number" || !Number.isFinite(claimedAmount) || claimedAmount <= 0) {
    return NextResponse.json({ error: "claimedAmount must be a positive number" }, { status: 400 });
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const agreement = await prisma.paymentAgreement.findUnique({ where: { id: milestone.paymentAgreementId } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  if (agreement.status !== "active") return NextResponse.json({ error: "The agreement isn't active yet" }, { status: 409 });

  const access = await requirePaymentOrgAccess(agreement.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const openClaim = await prisma.milestoneClaim.findFirst({ where: { milestoneId, status: { in: ["submitted", "under_review", "consented"] } } });
  if (openClaim) return NextResponse.json({ error: "This milestone already has an open or paid claim" }, { status: 409 });

  const requiredRoles: ConsentRequiredRole[] = milestone.type === "monitoring_cycle" ? ["registry", "investor", "platform_ops"] : ["investor", "platform_ops"];

  const claimId = genId("claim");
  await prisma.$transaction(
    async (tx) => {
      await tx.milestoneClaim.create({
        data: { id: claimId, milestoneId, submittedByUserId: access.userId, claimedAmount, status: "submitted" },
      });
      await tx.stakeholderConsent.createMany({
        data: requiredRoles.map((role) => ({ id: genId("consent"), claimId, requiredRole: role, status: "pending" })),
      });
      await tx.milestone.update({ where: { id: milestoneId }, data: { status: "claim_submitted" } });
      await appendAuditEntry(tx, agreement.id, "claim.submitted", { claimId, milestoneId, claimedAmount, requiredRoles });
    },
    { timeout: 20000 }
  );

  await notifyConsentNeeded(agreement.id, milestone.label, requiredRoles).catch((error) => console.error("Failed to notify consenters", error));

  return NextResponse.json({ id: claimId }, { status: 201 });
}
