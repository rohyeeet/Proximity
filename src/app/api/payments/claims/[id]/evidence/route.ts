import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { requirePaymentOrgAccess } from "@/lib/authz";
import { appendAuditEntry } from "@/lib/payment-audit";
import { genId } from "@/lib/utils";
import type { EvidenceSourceType } from "@/types";

const SOURCE_TYPES: EvidenceSourceType[] = ["dmrv_export", "site_inspection_photo", "production_log", "registry_document", "other"];

/** Attaches one piece of evidence to a claim. The hash is metadata-based (fileRef + fileName +
 * timestamp), not a content hash of the uploaded bytes — consistent with how EvidenceFile
 * elsewhere in this app never re-fetches Blob content either; it's tamper-evidence for the audit
 * trail entry, not a cryptographic guarantee about the file's contents. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: claimId } = await params;
  const body = await request.json();
  const fileRef: string | undefined = body.fileRef;
  const fileName: string | undefined = body.fileName;
  const sourceType: string | undefined = body.sourceType;
  if (typeof fileRef !== "string" || fileRef.trim() === "" || typeof fileName !== "string" || fileName.trim() === "") {
    return NextResponse.json({ error: "fileRef and fileName are required" }, { status: 400 });
  }
  if (typeof sourceType !== "string" || !SOURCE_TYPES.includes(sourceType as EvidenceSourceType)) {
    return NextResponse.json({ error: `sourceType must be one of ${SOURCE_TYPES.join(", ")}` }, { status: 400 });
  }

  const claim = await prisma.milestoneClaim.findUnique({ where: { id: claimId }, include: { milestone: true } });
  if (!claim) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  if (claim.status !== "submitted" && claim.status !== "under_review") {
    return NextResponse.json({ error: "This claim is no longer accepting new evidence" }, { status: 409 });
  }

  const agreement = await prisma.paymentAgreement.findUnique({ where: { id: claim.milestone.paymentAgreementId } });
  if (!agreement) return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
  const access = await requirePaymentOrgAccess(agreement.organizationId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const submittedAt = new Date();
  const hash = createHash("sha256").update(`${fileRef}:${fileName}:${submittedAt.toISOString()}`).digest("hex");
  const evidenceId = genId("evidence");

  await prisma.$transaction(
    async (tx) => {
      await tx.evidenceAttachment.create({
        data: { id: evidenceId, claimId, sourceType, fileRef, fileName, hash, submittedAt },
      });
      await appendAuditEntry(tx, agreement.id, "evidence.attached", { claimId, evidenceId, fileName, sourceType, hash });
    },
    { timeout: 20000 }
  );

  return NextResponse.json({ id: evidenceId, hash }, { status: 201 });
}
