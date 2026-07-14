import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFormTemplate, getFormTemplateVersionFields, getLatestPublishedVersion, getSubmission } from "@/lib/queries";
import { CollectFormClient } from "@/components/collect/CollectFormClient";
import type { EvidenceFile, FormFieldDefinition } from "@/types";

export default async function CollectFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ resubmit?: string; project?: string }>;
}) {
  const { formId } = await params;
  const { resubmit, project: projectId } = await searchParams;
  const authSession = await auth();
  const userId = authSession?.user?.id;

  const form = await getFormTemplate(formId);
  if (!form || !userId) notFound();

  let fields: FormFieldDefinition[] | undefined;
  let initialAnswers: Record<string, string> = {};
  let initialEvidence: EvidenceFile[] = [];
  let resubmitSubmissionId: string | undefined;

  if (resubmit) {
    const submission = await getSubmission(resubmit);
    if (submission && submission.submittedByUserId === userId && submission.formTemplateId === formId && submission.reviewStatus === "needs_fix") {
      fields = await getFormTemplateVersionFields(formId, submission.formTemplateVersionNo);
      initialAnswers = Object.fromEntries(submission.answers.map((a) => [a.fieldCode, a.value === null || a.value === undefined ? "" : String(a.value)]));
      initialEvidence = submission.evidence;
      resubmitSubmissionId = submission.id;
    }
  }

  if (!fields) {
    const version = await getLatestPublishedVersion(formId);
    if (!version) notFound();
    fields = version.fields as unknown as FormFieldDefinition[];
  }

  return (
    <CollectFormClient
      formId={form.id}
      formName={form.name}
      formDescription={form.description}
      fields={fields}
      initialAnswers={initialAnswers}
      initialEvidence={initialEvidence}
      resubmitSubmissionId={resubmitSubmissionId}
      projectId={projectId}
    />
  );
}
