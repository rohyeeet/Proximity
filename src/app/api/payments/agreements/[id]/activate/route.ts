import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCreatePaymentAgreementAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { newEscrowAccount } from "@/lib/proximity-pay";

/** Activation is the moment the (fake) buyer payment lands and escrow is funded — Proximity Pay's
 * simulated collection leg. Platform-admin-only, matching who creates the agreement in the first place. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireCreatePaymentAgreementAccess();
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const agreement = await prisma.paymentAgreement.findUnique({ where: { id } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  if (agreement.status !== "draft") return NextResponse.json({ error: "Only a draft agreement can be activated" }, { status: 409 });

  await prisma.$transaction(
    async (tx) => {
      await tx.paymentAgreement.update({ where: { id }, data: { status: "active" } });
      await tx.escrowAccount.create({ data: newEscrowAccount(id, agreement.totalValue, agreement.currency) });
      await appendAuditEntry(tx, id, "agreement.activated", { totalValue: agreement.totalValue, currency: agreement.currency, provider: "Proximity Pay" });
    },
    { timeout: 20000 }
  );

  return NextResponse.json({ ok: true });
}
