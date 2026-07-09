import { notFound } from "next/navigation";
import { filterUserIdsByOrganization, getFormTemplate, getFormTemplateVersions, getSubmission, getSubmissionsByForm } from "@/lib/queries";
import { resolveSession } from "@/lib/session-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecordsGridClient } from "@/components/records/RecordsGridClient";

export default async function RecordsGridPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const { initialActiveOrganizationId } = await resolveSession();
  const [form, versions, formSubmissions] = await Promise.all([
    getFormTemplate(formId),
    getFormTemplateVersions(formId),
    getSubmissionsByForm(formId, initialActiveOrganizationId),
  ]);
  if (!form) notFound();

  // Any field across any version that resolves to another submission's id (linked_record, or an
  // internal-form lookup) needs that record's displayId + form resolved for the table to link to
  // it — same cross-org-safe pattern as the (now retired) single-record review screen used.
  const linkFieldCodes = new Set(
    versions
      .flatMap((v) => v.fields)
      .filter((f) => f.fieldType === "linked_record" || (f.fieldType === "lookup_select" && f.lookupSource?.kind === "internal_form"))
      .map((f) => f.fieldCode)
  );
  const linkedIds = new Set<string>();
  for (const submission of formSubmissions) {
    for (const answer of submission.answers) {
      if (linkFieldCodes.has(answer.fieldCode) && typeof answer.value === "string" && answer.value) linkedIds.add(answer.value);
    }
  }
  const linkedSubmissions = (await Promise.all([...linkedIds].map((id) => getSubmission(id)))).filter((s) => s !== undefined);
  const allowedUserIds = await filterUserIdsByOrganization(linkedSubmissions.map((s) => s!.submittedByUserId), initialActiveOrganizationId);
  const linkedRecordsById = Object.fromEntries(
    linkedSubmissions
      .filter((s) => allowedUserIds.has(s!.submittedByUserId))
      .map((s) => [s!.id, { formTemplateId: s!.formTemplateId, displayId: s!.displayId }])
  );

  return (
    <div>
      <PageHeader eyebrow={form.category} title={form.name} description={form.description} />
      <RecordsGridClient key={form.id} form={form} submissions={formSubmissions} versions={versions} linkedRecordsById={linkedRecordsById} />
    </div>
  );
}
