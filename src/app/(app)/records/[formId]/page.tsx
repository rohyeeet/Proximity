import { notFound } from "next/navigation";
import { getFormTemplate, getSubmissionsByForm } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { RecordsGridClient } from "@/components/records/RecordsGridClient";

export default async function RecordsGridPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const form = await getFormTemplate(formId);
  if (!form) notFound();
  const formSubmissions = await getSubmissionsByForm(formId);

  return (
    <div>
      <PageHeader eyebrow={form.category} title={form.name} description={form.description} />
      <RecordsGridClient form={form} submissions={formSubmissions} />
    </div>
  );
}
