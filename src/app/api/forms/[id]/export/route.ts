import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireReviewAccess } from "@/lib/authz";
import { getFormTemplate, getSubmissionsByForm, getUser } from "@/lib/queries";
import { decodeGeoBoundary, decodeGeoPoint } from "@/lib/form-fields";
import type { EvidenceFile, FormFieldDefinition } from "@/types";

/** RFC 4180: quote-wrap and double any internal quotes for values containing a comma, quote, or newline. */
function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatAnswerForExport(field: FormFieldDefinition, rawValue: unknown, evidenceById: Map<string, EvidenceFile>): string {
  if (rawValue === null || rawValue === undefined || rawValue === "") return "";
  switch (field.fieldType) {
    case "photo":
    case "document_scan":
    case "signature":
      return evidenceById.get(String(rawValue))?.url ?? "";
    case "geo_point": {
      const point = decodeGeoPoint(String(rawValue));
      return point ? `${point.lat}, ${point.lng}` : "";
    }
    case "geo_boundary":
      return decodeGeoBoundary(String(rawValue))
        .map((p) => `${p.lat},${p.lng}`)
        .join("; ");
    default:
      return String(rawValue);
  }
}

/** One row per submission, current form fields as the column set (by label, in sortOrder) —
 * older submissions missing a since-added field just get a blank cell. Media columns are real,
 * clickable hosted URLs; reviewer-or-above only, matching who already sees company-wide data. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formRow = await prisma.formTemplate.findUnique({ where: { id } });
  if (!formRow) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireReviewAccess(formRow.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const [form, submissions] = await Promise.all([getFormTemplate(id), getSubmissionsByForm(id)]);
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const fields = form.currentVersion.fields.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const submitterIds = [...new Set(submissions.map((s) => s.submittedByUserId))];
  const submitters = await Promise.all(submitterIds.map((userId) => getUser(userId)));
  const submitterNameById = new Map(submitters.filter((u) => u !== undefined).map((u) => [u.id, u.fullName]));

  const headers = ["Display ID", "Review Status", "Sync Status", "Submitted By", "Submitted At", "Version", ...fields.map((f) => f.label)];

  const rows = submissions.map((submission) => {
    const evidenceById = new Map(submission.evidence.map((e) => [e.id, e]));
    const answerByCode = new Map(submission.answers.map((a) => [a.fieldCode, a.value]));
    return [
      submission.displayId,
      submission.reviewStatus,
      submission.syncStatus,
      submitterNameById.get(submission.submittedByUserId) ?? submission.submittedByUserId,
      submission.updatedAt,
      String(submission.currentVersionNo),
      ...fields.map((field) => formatAnswerForExport(field, answerByCode.get(field.fieldCode), evidenceById)),
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${form.code || "form"}-submissions.csv"`,
    },
  });
}
