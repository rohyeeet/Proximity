import { notFound } from "next/navigation";
import { getFormTemplate, getFormTemplateVersionFields, getSubmission, getUser } from "@/lib/queries";
import { RecordDetailClient } from "@/components/records/RecordDetailClient";

export default async function RecordDetailPage({ params }: { params: Promise<{ formId: string; recordId: string }> }) {
  const { formId, recordId } = await params;
  const [form, submission] = await Promise.all([getFormTemplate(formId), getSubmission(recordId)]);
  if (!form || !submission || submission.formTemplateId !== formId) notFound();
  const [submitter, pinnedFields] = await Promise.all([
    getUser(submission.submittedByUserId),
    getFormTemplateVersionFields(formId, submission.formTemplateVersionNo),
  ]);

  return (
    <RecordDetailClient
      form={form}
      fields={pinnedFields ?? form.currentVersion.fields}
      isStaleVersion={submission.formTemplateVersionNo !== form.currentVersion.versionNo}
      submission={submission}
      submitterName={submitter?.fullName ?? "Unknown"}
    />
  );
}
