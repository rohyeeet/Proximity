import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireReviewAccess } from "@/lib/authz";
import { toSubmission } from "@/lib/mappers";
import { genId } from "@/lib/utils";
import type { FieldFlag, ReviewActionRecord, ReviewOutcome } from "@/types";

const REVIEW_STATUS_BY_OUTCOME: Record<ReviewOutcome, string> = {
  approved: "approved",
  returned_for_correction: "needs_fix",
  escalated: "on_hold",
};

/** Persists a reviewer's approve/return decision, made from the row-wise validation table
 * (`RecordsGridClient`) — optionally with per-field flags/remarks when returning for correction. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.submission.findUnique({ where: { id }, include: { formTemplate: true } });
  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const access = await requireReviewAccess(existing.formTemplate.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const body = await request.json();
  const outcome: ReviewOutcome | undefined = body.outcome;
  if (!outcome || !(outcome in REVIEW_STATUS_BY_OUTCOME)) {
    return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
  }

  const fieldFlags: FieldFlag[] | undefined = Array.isArray(body.fieldFlags)
    ? body.fieldFlags.filter(
        (f: unknown): f is FieldFlag =>
          !!f &&
          typeof (f as FieldFlag).fieldCode === "string" &&
          (f as FieldFlag).fieldCode.trim() !== "" &&
          typeof (f as FieldFlag).remark === "string" &&
          (f as FieldFlag).remark.trim() !== ""
      )
    : undefined;

  const priorActions = existing.reviewActions as unknown as ReviewActionRecord[];
  const action: ReviewActionRecord = {
    id: genId("review"),
    outcome,
    reason: typeof body.reason === "string" ? body.reason : undefined,
    guidance: typeof body.guidance === "string" ? body.guidance : undefined,
    fieldFlags: fieldFlags && fieldFlags.length > 0 ? fieldFlags : undefined,
    reviewerUserId: access.userId,
    createdAt: new Date().toISOString(),
  };

  const updated = await prisma.submission.update({
    where: { id },
    data: {
      reviewStatus: REVIEW_STATUS_BY_OUTCOME[outcome],
      reviewActions: [...priorActions, action] as object,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(toSubmission(updated));
}
