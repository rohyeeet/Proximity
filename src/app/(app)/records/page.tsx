"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useStudio } from "@/lib/studio";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusChip } from "@/components/ui/StatusChip";
import type { FormTemplate } from "@/types";

export default function RecordsHubPage() {
  const router = useRouter();
  const { session } = useSession();
  const { forms } = useStudio();
  const orgForms = forms.filter((form) => form.domainPackId === session.organization.domainPackId);

  const columns: DataTableColumn<FormTemplate>[] = [
    { key: "name", header: "Form", render: (form) => <span className="font-medium text-ink">{form.name}</span> },
    { key: "category", header: "Category", render: (form) => <span className="text-ink-soft">{form.category}</span> },
    { key: "submissions", header: "Records", render: (form) => <span className="tabular">{form.submissionCount}</span> },
    {
      key: "status",
      header: "Attention",
      render: (form) => (
        <div className="flex items-center gap-2">
          {form.needsFixCount > 0 && <StatusChip label={`${form.needsFixCount} Needs Fix`} tone="critical" />}
          {form.needsCheckCount > 0 && <StatusChip label={`${form.needsCheckCount} Needs Check`} tone="accent" />}
          {form.needsFixCount === 0 && form.needsCheckCount === 0 && <StatusChip label="Clear" tone="good" />}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={session.organization.name}
        title="Records"
        description="Every form gets its own database view. Open a form to review, validate, and drill into individual submissions."
      />
      <DataTable
        columns={columns}
        rows={orgForms}
        rowKey={(form) => form.id}
        onRowClick={(form) => router.push(`/records/${form.id}`)}
      />
      <p className="mt-3 text-[12px] text-ink-soft">
        Tip: you can also jump straight in from{" "}
        <Link href="/forms" className="text-brand-500 hover:underline">
          the Forms library
        </Link>
        .
      </p>
    </div>
  );
}
