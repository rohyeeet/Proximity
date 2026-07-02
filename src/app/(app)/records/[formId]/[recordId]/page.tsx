import { notFound } from "next/navigation";
import { getFormTemplate, getSubmission, getUser } from "@/lib/queries";
import { RecordDetailClient } from "@/components/records/RecordDetailClient";

export default async function RecordDetailPage({ params }: { params: Promise<{ formId: string; recordId: string }> }) {
  const { formId, recordId } = await params;
  const [form, submission] = await Promise.all([getFormTemplate(formId), getSubmission(recordId)]);
  if (!form || !submission || submission.formTemplateId !== formId) notFound();
  const submitter = await getUser(submission.submittedByUserId);

  return <RecordDetailClient form={form} submission={submission} submitterName={submitter?.fullName ?? "Unknown"} />;
}
