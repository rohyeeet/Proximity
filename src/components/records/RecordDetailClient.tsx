"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileImage, MapPin, ScanLine, PenTool } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { ReviewStatusChip, SyncStatusChip } from "@/components/ui/StatusChip";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { FormFieldDefinition, FormTemplate, ReviewActionRecord, Submission } from "@/types";

const evidenceIcon = { photo: FileImage, document_scan: ScanLine, gps_log: MapPin, signature: PenTool };

export function RecordDetailClient({
  form,
  fields,
  isStaleVersion,
  submission,
  submitterName,
}: {
  form: FormTemplate;
  fields: FormFieldDefinition[];
  isStaleVersion: boolean;
  submission: Submission;
  submitterName: string;
}) {
  const [reviewStatus, setReviewStatus] = useState(submission.reviewStatus);
  const [reviewActions, setReviewActions] = useState<ReviewActionRecord[]>(submission.reviewActions);
  const [isReturning, setIsReturning] = useState(false);
  const [reason, setReason] = useState("");
  const [guidance, setGuidance] = useState("");

  function approve() {
    setReviewStatus("approved");
    setReviewActions((prev) => [
      ...prev,
      { id: `local-${prev.length + 1}`, outcome: "approved", reviewerUserId: "user-rohit", createdAt: new Date().toISOString() },
    ]);
  }

  function sendBack() {
    if (!reason.trim()) return;
    setReviewStatus("needs_fix");
    setReviewActions((prev) => [
      ...prev,
      {
        id: `local-${prev.length + 1}`,
        outcome: "returned_for_correction",
        reason,
        guidance,
        reviewerUserId: "user-rohit",
        createdAt: new Date().toISOString(),
      },
    ]);
    setIsReturning(false);
    setReason("");
    setGuidance("");
  }

  return (
    <div>
      <Link href={`/records/${form.id}`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back to {form.name}
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{submission.displayId}</h1>
            <ReviewStatusChip status={reviewStatus} />
            <SyncStatusChip status={submission.syncStatus} />
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">
            {form.name} · v{submission.formTemplateVersionNo} · submitted by {submitterName}
          </p>
          {isStaleVersion && (
            <p className="mt-2 inline-flex items-center rounded-md border border-warn-text/30 bg-warn-bg px-2.5 py-1 text-[12px] text-warn-text">
              This form has changed since this record was submitted — answers below reflect the fields from v{submission.formTemplateVersionNo},
              not the current v{form.currentVersion.versionNo}.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-3">
              <h2 className="text-sm font-semibold text-ink">Answers</h2>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((field) => {
                  const answer = submission.answers.find((a) => a.fieldCode === field.fieldCode)?.value;
                  const isEmpty = answer === "" || answer === undefined || answer === null;
                  return (
                    <div key={field.id}>
                      <dt className="text-[12px] text-ink-soft">{field.label}</dt>
                      <dd className={isEmpty ? "text-[13.5px] font-medium text-critical-text" : "text-[13.5px] font-medium text-ink"}>
                        {isEmpty ? "Missing" : String(answer)}
                        {field.unit && !isEmpty ? ` ${field.unit}` : ""}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <h2 className="text-sm font-semibold text-ink">Evidence</h2>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-2">
              {submission.evidence.length === 0 && <p className="text-[13px] text-ink-soft">No evidence attached.</p>}
              {submission.evidence.map((file) => {
                const Icon = evidenceIcon[file.kind];
                return (
                  <div key={file.id} className="flex items-center gap-2 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px]">
                    <Icon className="size-3.5 text-ink-soft" />
                    <span className="text-ink">{file.fileName}</span>
                    {file.smartCheckSummary && <span className="text-ink-soft">· {file.smartCheckSummary}</span>}
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <h2 className="text-sm font-semibold text-ink">Smart check</h2>
            </CardHeader>
            <CardBody>
              <p className="text-[13.5px] text-ink-soft">{submission.smartCheckSummary}</p>
            </CardBody>
          </Card>

          {submission.versions.length > 1 && (
            <Card>
              <CardHeader className="py-3">
                <h2 className="text-sm font-semibold text-ink">Version history</h2>
              </CardHeader>
              <div className="flex flex-col divide-y divide-border">
                {submission.versions.map((version) => (
                  <div key={version.versionNo} className="px-5 py-2.5 text-[13px]">
                    <span className="font-medium text-ink">v{version.versionNo}</span>{" "}
                    <span className="text-ink-soft">
                      · {formatDate(version.createdAt)} {version.reason ? `· ${version.reason}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="py-3">
              <h2 className="text-sm font-semibold text-ink">Review</h2>
            </CardHeader>
            <CardBody>
              {reviewStatus === "approved" ? (
                <p className="text-[13px] text-good-text">Approved. This record remains visible in Past Records.</p>
              ) : isReturning ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-ink-soft">Reason</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="What's wrong with this record?"
                      className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-ink-soft">Guidance for the submitter</label>
                    <textarea
                      value={guidance}
                      onChange={(e) => setGuidance(e.target.value)}
                      placeholder="Explain how to fix it — this reopens the same form with their prior answers."
                      rows={3}
                      className="w-full rounded-md border border-border-strong bg-paper px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="danger" size="sm" onClick={sendBack} disabled={!reason.trim()}>
                      Send back
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsReturning(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="primary" size="sm" onClick={approve}>
                    Approve
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsReturning(true)}>
                    Return for correction
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <h2 className="text-sm font-semibold text-ink">Review history</h2>
            </CardHeader>
            <div className="flex flex-col divide-y divide-border">
              {reviewActions.length === 0 && <p className="px-5 py-4 text-[13px] text-ink-soft">No review actions yet.</p>}
              {reviewActions.map((action) => (
                <div key={action.id} className="px-5 py-3 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {action.outcome === "approved" ? "Approved" : action.outcome === "escalated" ? "Escalated" : "Returned for correction"}
                    </span>
                    <span className="tabular text-[11.5px] text-ink-soft">{formatRelativeTime(action.createdAt)}</span>
                  </div>
                  {action.reason && <p className="mt-0.5 text-ink-soft">{action.reason}</p>}
                  {action.guidance && <p className="mt-1 rounded-md bg-sunken px-2.5 py-1.5 text-[12.5px] text-ink-soft">{action.guidance}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
