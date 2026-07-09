import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";
import { auth } from "@/lib/auth";
import { getFormTemplate, getFormTemplateVersionFields, getSubmission } from "@/lib/queries";
import { Button } from "@/components/ui/Button";
import { ReviewStatusChip } from "@/components/ui/StatusChip";
import { formatRelativeTime } from "@/lib/utils";

export default async function CollectSubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authSession = await auth();
  const userId = authSession?.user?.id;

  const submission = await getSubmission(id);
  if (!submission || !userId || submission.submittedByUserId !== userId) notFound();

  const [form, fields] = await Promise.all([
    getFormTemplate(submission.formTemplateId),
    getFormTemplateVersionFields(submission.formTemplateId, submission.formTemplateVersionNo),
  ]);
  if (!form) notFound();

  const linkFieldCodes = new Set(
    (fields ?? [])
      .filter((f) => f.fieldType === "linked_record" || (f.fieldType === "lookup_select" && f.lookupSource?.kind === "internal_form"))
      .map((f) => f.fieldCode)
  );
  const linkedIds = submission.answers
    .filter((a) => linkFieldCodes.has(a.fieldCode) && typeof a.value === "string" && a.value)
    .map((a) => a.value as string);
  const linkedSubmissions = await Promise.all(linkedIds.map((linkedId) => getSubmission(linkedId)));
  const linkedDisplayIdById = Object.fromEntries(linkedSubmissions.filter((s) => s !== undefined).map((s) => [s!.id, s!.displayId]));

  return (
    <div className="flex flex-col gap-4">
      <Link href="/collect/submissions" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-ink">{submission.flowNodeLabel}</h1>
          <ReviewStatusChip status={submission.reviewStatus} />
        </div>
        <p className="text-[12.5px] text-ink-soft">
          {form.name} · {submission.displayId} · submitted {formatRelativeTime(submission.updatedAt)}
        </p>
      </div>

      {submission.reviewStatus === "needs_fix" && (
        <div className="rounded-lg border border-warn-text/30 bg-warn-bg p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-warn-text">
            <Wrench className="size-3.5" /> Returned for correction
          </p>
          {submission.reviewActions
            .filter((a) => a.outcome === "returned_for_correction")
            .slice(-1)
            .map((action) => (
              <div key={action.id} className="text-[12.5px] text-warn-text">
                {action.reason && <p className="font-medium">{action.reason}</p>}
                {action.guidance && <p className="mt-1">{action.guidance}</p>}
                {action.fieldFlags && action.fieldFlags.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 rounded-md bg-surface px-2.5 py-1.5">
                    {action.fieldFlags.map((flag) => (
                      <li key={flag.fieldCode}>
                        <span className="font-medium">
                          {(fields ?? []).find((f) => f.fieldCode === flag.fieldCode)?.label ?? flag.fieldCode}:
                        </span>{" "}
                        {flag.remark}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          <Link href={`/collect/forms/${form.id}?resubmit=${submission.id}`} className="mt-3 block">
            <Button variant="primary" className="w-full justify-center">
              Fix and resubmit
            </Button>
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Your answers</p>
        <dl className="flex flex-col gap-3">
          {(fields ?? []).map((field) => {
            const answer = submission.answers.find((a) => a.fieldCode === field.fieldCode)?.value;
            const isEmpty = answer === "" || answer === undefined || answer === null;
            const displayValue = !isEmpty && linkedDisplayIdById[String(answer)] ? linkedDisplayIdById[String(answer)] : String(answer);
            return (
              <div key={field.id}>
                <dt className="text-[12px] text-ink-soft">{field.label}</dt>
                <dd className={isEmpty ? "text-[13.5px] text-ink-soft/60" : "text-[13.5px] font-medium text-ink"}>
                  {isEmpty ? "—" : displayValue}
                  {field.unit && !isEmpty ? ` ${field.unit}` : ""}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {submission.reviewActions.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Review history</p>
          <div className="flex flex-col gap-3">
            {submission.reviewActions.map((action) => (
              <div key={action.id} className="text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">
                    {action.outcome === "approved" ? "Approved" : action.outcome === "escalated" ? "Escalated" : "Returned for correction"}
                  </span>
                  <span className="text-[11.5px] text-ink-soft">{formatRelativeTime(action.createdAt)}</span>
                </div>
                {action.reason && <p className="mt-0.5 text-ink-soft">{action.reason}</p>}
                {action.guidance && <p className="mt-1 rounded-md bg-sunken px-2.5 py-1.5 text-[12.5px] text-ink-soft">{action.guidance}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
