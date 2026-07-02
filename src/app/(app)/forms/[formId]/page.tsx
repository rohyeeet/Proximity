import { FormBuilderClient } from "@/components/studio/FormBuilderClient";

export default async function FormBuilderPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  return <FormBuilderClient formId={formId} />;
}
