"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { ReviewStatusChip, SyncStatusChip } from "@/components/ui/StatusChip";
import { useSession } from "@/lib/session";
import { canReview } from "@/lib/permissions";
import { formatRelativeTime } from "@/lib/utils";
import type { FormTemplate, Submission } from "@/types";

const filterOptions = [
  { value: "all", label: "All" },
  { value: "needs_check", label: "Needs Check" },
  { value: "needs_fix", label: "Needs Fix" },
  { value: "approved", label: "Approved" },
];

export function RecordsGridClient({ form, submissions }: { form: FormTemplate; submissions: Submission[] }) {
  const router = useRouter();
  const { session } = useSession();
  const [filter, setFilter] = useState("all");

  const previewFields = form.currentVersion.fields.slice(0, 3);

  const counts = useMemo(
    () => ({
      all: submissions.length,
      needs_check: submissions.filter((s) => s.reviewStatus === "needs_check").length,
      needs_fix: submissions.filter((s) => s.reviewStatus === "needs_fix").length,
      approved: submissions.filter((s) => s.reviewStatus === "approved").length,
    }),
    [submissions]
  );

  const filtered = filter === "all" ? submissions : submissions.filter((s) => s.reviewStatus === filter);

  const columns: DataTableColumn<Submission>[] = [
    { key: "id", header: "ID", render: (row) => <span className="font-medium text-ink">{row.displayId}</span> },
    ...previewFields.map<DataTableColumn<Submission>>((field) => ({
      key: field.fieldCode,
      header: field.label,
      render: (row) => {
        const answer = row.answers.find((a) => a.fieldCode === field.fieldCode)?.value;
        return <span className="text-ink-soft">{answer === "" || answer === undefined || answer === null ? "—" : String(answer)}</span>;
      },
    })),
    { key: "review", header: "Review status", render: (row) => <ReviewStatusChip status={row.reviewStatus} /> },
    { key: "sync", header: "Sync status", render: (row) => <SyncStatusChip status={row.syncStatus} /> },
    { key: "updated", header: "Updated", render: (row) => <span className="tabular text-ink-soft">{formatRelativeTime(row.updatedAt)}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={filterOptions.map((option) => ({ ...option, count: counts[option.value as keyof typeof counts] }))}
        />
        {canReview(session.role.tier) && (
          <a href={`/api/forms/${form.id}/export`} download>
            <Button variant="secondary" size="sm">
              <Download className="size-3.5" /> Export to CSV
            </Button>
          </a>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/records/${form.id}/${row.id}`)}
        emptyLabel="No records match this filter."
      />
    </div>
  );
}
