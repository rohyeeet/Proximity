"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Download, Eye, Flag, History } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ReviewStatusChip, SyncStatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceCellDetail } from "./EvidenceCellDetail";
import { GeoCellDetail } from "./GeoCellDetail";
import { FieldFlagDrawer } from "./FieldFlagDrawer";
import { useSession } from "@/lib/session";
import { canReview } from "@/lib/permissions";
import { decodeGeoBoundary, decodeGeoPoint } from "@/lib/form-fields";
import { buildValidationColumns, isAnswerEmpty, resolveCell, type ValidationColumn } from "@/lib/validation-table";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { FieldFlag, FormTemplate, FormTemplateVersion, Submission } from "@/types";

const filterOptions = [
  { value: "all", label: "All" },
  { value: "needs_check", label: "Needs Check" },
  { value: "needs_fix", label: "Needs Fix" },
  { value: "approved", label: "Approved" },
];

async function patchReview(submissionId: string, body: Record<string, unknown>): Promise<Submission> {
  const res = await fetch(`/api/submissions/${submissionId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderCellValue(
  column: ValidationColumn,
  row: Submission,
  earliestKnownVersionNo: number,
  answersByCode: Map<string, Submission["answers"][number]["value"]>,
  evidenceById: Map<string, Submission["evidence"][number]>,
  linkedRecordsById: Record<string, { formTemplateId: string; displayId: string }>
) {
  const cell = resolveCell(column, row, earliestKnownVersionNo);
  if (cell.kind === "not_collected") {
    return (
      <span title={`Not collected before v${column.introducedAtVersionNo}`} className="text-ink-soft/50">
        — <span className="text-[10px]">(pre-v{column.introducedAtVersionNo})</span>
      </span>
    );
  }

  const field = cell.field;
  const raw = answersByCode.get(field.fieldCode);
  if (isAnswerEmpty(raw)) {
    return <span className={field.isRequired ? "text-critical-text" : "text-ink-soft/60"}>{field.isRequired ? "Missing" : "—"}</span>;
  }

  switch (field.fieldType) {
    case "photo":
    case "document_scan":
    case "signature": {
      const file = evidenceById.get(String(raw));
      return file ? <EvidenceCellDetail file={file} /> : <span className="text-critical-text">Missing file</span>;
    }
    case "geo_point": {
      const point = decodeGeoPoint(String(raw));
      return point ? <GeoCellDetail points={[point]} kind="geo_point" /> : <span className="text-ink-soft">Invalid location</span>;
    }
    case "geo_boundary": {
      const points = decodeGeoBoundary(String(raw));
      return points.length > 0 ? <GeoCellDetail points={points} kind="geo_boundary" /> : <span className="text-ink-soft">Invalid boundary</span>;
    }
    case "boolean":
      return <span className="text-ink">{raw === true || raw === "true" ? "Yes" : "No"}</span>;
    case "linked_record":
    case "lookup_select": {
      const isInternalLink = field.fieldType === "linked_record" || field.lookupSource?.kind === "internal_form";
      const linked = isInternalLink ? linkedRecordsById[String(raw)] : undefined;
      if (linked) {
        return (
          <Link href={`/records/${linked.formTemplateId}?highlight=${raw}`} className="text-brand-600 hover:underline">
            {linked.displayId}
          </Link>
        );
      }
      return <span className="text-ink">{String(raw)}</span>;
    }
    default:
      return (
        <span className="text-ink">
          {String(raw)}
          {field.unit ? ` ${field.unit}` : ""}
        </span>
      );
  }
}

export function RecordsGridClient({
  form,
  submissions,
  versions,
  linkedRecordsById,
}: {
  form: FormTemplate;
  submissions: Submission[];
  versions: FormTemplateVersion[];
  linkedRecordsById: Record<string, { formTemplateId: string; displayId: string }>;
}) {
  const { session } = useSession();
  const canAct = canReview(session.role.tier);
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState(submissions);
  const [visibleRemoved, setVisibleRemoved] = useState<Set<string>>(new Set());
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [flagRowId, setFlagRowId] = useState<string | null>(null);
  const [historyRowId, setHistoryRowId] = useState<string | null>(null);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("highlight");
    if (!id) return;
    setHighlightId(id);
    document.getElementById(`record-row-${id}`)?.scrollIntoView({ block: "center" });
  }, []);

  const fieldsByVersionNo = useMemo(() => new Map(versions.map((v) => [v.versionNo, v.fields])), [versions]);
  const latestFields = versions[versions.length - 1]?.fields ?? [];
  const { columns, earliestKnownVersionNo } = useMemo(() => buildValidationColumns(versions), [versions]);
  const removedColumns = useMemo(() => columns.filter((c) => !c.presentInLatestVersion), [columns]);
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.presentInLatestVersion || visibleRemoved.has(c.field.fieldCode)),
    [columns, visibleRemoved]
  );

  // Indexed once per row so each cell render is an O(1) lookup instead of a linear scan of
  // answers/evidence — matters once a form has many questions and many records.
  const answersByRowId = useMemo(
    () => new Map(rows.map((row) => [row.id, new Map(row.answers.map((a) => [a.fieldCode, a.value]))])),
    [rows]
  );
  const evidenceByRowId = useMemo(() => new Map(rows.map((row) => [row.id, new Map(row.evidence.map((e) => [e.id, e]))])), [rows]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      needs_check: rows.filter((s) => s.reviewStatus === "needs_check").length,
      needs_fix: rows.filter((s) => s.reviewStatus === "needs_fix").length,
      approved: rows.filter((s) => s.reviewStatus === "approved").length,
    }),
    [rows]
  );
  const filtered = filter === "all" ? rows : rows.filter((s) => s.reviewStatus === filter);
  const flagRow = flagRowId ? rows.find((r) => r.id === flagRowId) : undefined;
  const historyRow = historyRowId ? rows.find((r) => r.id === historyRowId) : undefined;

  function toggleRemovedColumn(fieldCode: string) {
    setVisibleRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(fieldCode)) next.delete(fieldCode);
      else next.add(fieldCode);
      return next;
    });
  }

  async function accept(row: Submission) {
    setPendingRowId(row.id);
    try {
      const updated = await patchReview(row.id, { outcome: "approved" });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (error) {
      console.error("Failed to approve", error);
    } finally {
      setPendingRowId(null);
    }
  }

  async function sendBack(row: Submission, payload: { reason: string; guidance?: string; fieldFlags: FieldFlag[] }) {
    try {
      const updated = await patchReview(row.id, { outcome: "returned_for_correction", ...payload });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setFlagRowId(null);
    } catch (error) {
      console.error("Failed to send back", error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={filterOptions.map((option) => ({ ...option, count: counts[option.value as keyof typeof counts] }))}
        />
        <div className="flex items-center gap-2">
          {removedColumns.length > 0 && (
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setColumnsMenuOpen((o) => !o)}>
                <Eye className="size-3.5" /> Columns
              </Button>
              {columnsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setColumnsMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-border bg-surface p-2 shadow-lg">
                    <p className="mb-1.5 px-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">
                      Removed from current version
                    </p>
                    {removedColumns.map((col) => (
                      <label key={col.field.fieldCode} className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-sunken">
                        <input
                          type="checkbox"
                          checked={visibleRemoved.has(col.field.fieldCode)}
                          onChange={() => toggleRemovedColumn(col.field.fieldCode)}
                          className="size-3.5"
                        />
                        {col.field.label}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {canAct && (
            <a href={`/api/forms/${form.id}/export?organizationId=${session.organization.id}`} download>
              <Button variant="secondary" size="sm">
                <Download className="size-3.5" /> Export to CSV
              </Button>
            </a>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No records match this filter." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="bg-sunken">
                <th className="sticky left-0 z-10 whitespace-nowrap bg-sunken px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  Record
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.field.fieldCode}
                    className="whitespace-nowrap px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft"
                  >
                    {col.field.label}
                    {!col.presentInLatestVersion && <span className="ml-1 text-ink-soft/50">(removed)</span>}
                  </th>
                ))}
                <th className="sticky right-0 z-10 whitespace-nowrap bg-sunken px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  Review
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isPending = pendingRowId === row.id;
                const isActionable = canAct && row.reviewStatus !== "approved" && row.reviewStatus !== "needs_fix";
                const hasHistory = row.reviewActions.length > 0 || row.versions.length > 1 || row.smartCheckSummary;
                return (
                  <tr
                    key={row.id}
                    id={`record-row-${row.id}`}
                    className={highlightId === row.id ? "border-t border-border bg-brand-50" : "border-t border-border bg-surface"}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 align-middle">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink">{row.displayId}</span>
                          {hasHistory && (
                            <button
                              aria-label="View history"
                              onClick={() => setHistoryRowId(row.id)}
                              className="text-ink-soft hover:text-ink"
                            >
                              <History className="size-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ReviewStatusChip status={row.reviewStatus} />
                          <SyncStatusChip status={row.syncStatus} />
                        </div>
                        <span className="tabular text-[11px] text-ink-soft">{formatRelativeTime(row.updatedAt)}</span>
                      </div>
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.field.fieldCode} className="px-4 py-2.5 align-middle">
                        {renderCellValue(
                          col,
                          row,
                          earliestKnownVersionNo,
                          answersByRowId.get(row.id)!,
                          evidenceByRowId.get(row.id)!,
                          linkedRecordsById
                        )}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 bg-inherit px-4 py-2.5 align-middle">
                      {isActionable ? (
                        <div className="flex items-center gap-1.5">
                          <Button variant="primary" size="sm" onClick={() => accept(row)} disabled={isPending}>
                            <Check className="size-3.5" /> Accept
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setFlagRowId(row.id)} disabled={isPending}>
                            <Flag className="size-3.5" /> Mark incorrect
                          </Button>
                        </div>
                      ) : row.reviewStatus === "needs_fix" ? (
                        <span className="text-[12.5px] text-warn-text">Waiting on submitter</span>
                      ) : row.reviewStatus === "approved" ? (
                        <span className="text-[12.5px] text-good-text">Approved</span>
                      ) : (
                        <span className="text-[12.5px] text-ink-soft">Awaiting review</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {flagRow && (
        <FieldFlagDrawer
          submission={flagRow}
          fields={fieldsByVersionNo.get(flagRow.formTemplateVersionNo) ?? latestFields}
          onClose={() => setFlagRowId(null)}
          onSubmit={(payload) => sendBack(flagRow, payload)}
        />
      )}

      {historyRow && (
        <Modal open onClose={() => setHistoryRowId(null)} title={`History · ${historyRow.displayId}`} className="max-w-lg">
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
            {historyRow.smartCheckSummary && (
              <div>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Smart check</p>
                <p className="text-[13px] text-ink-soft">{historyRow.smartCheckSummary}</p>
              </div>
            )}
            {historyRow.reviewActions.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Review history</p>
                <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                  {historyRow.reviewActions.map((action) => (
                    <div key={action.id} className="px-3 py-2 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">
                          {action.outcome === "approved" ? "Approved" : action.outcome === "escalated" ? "Escalated" : "Returned for correction"}
                        </span>
                        <span className="tabular text-[11.5px] text-ink-soft">{formatRelativeTime(action.createdAt)}</span>
                      </div>
                      {action.reason && <p className="mt-0.5 text-ink-soft">{action.reason}</p>}
                      {action.guidance && <p className="mt-1 rounded-md bg-sunken px-2 py-1 text-[12.5px] text-ink-soft">{action.guidance}</p>}
                      {action.fieldFlags && action.fieldFlags.length > 0 && (
                        <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px] text-ink-soft">
                          {action.fieldFlags.map((flag) => (
                            <li key={flag.fieldCode}>
                              <span className="font-medium">{flag.fieldCode}:</span> {flag.remark}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {historyRow.versions.length > 1 && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft/70">Version history</p>
                <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                  {historyRow.versions.map((version) => (
                    <div key={version.versionNo} className="px-3 py-2 text-[13px]">
                      <span className="font-medium text-ink">v{version.versionNo}</span>{" "}
                      <span className="text-ink-soft">
                        · {formatDate(version.createdAt)} {version.reason ? `· ${version.reason}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
