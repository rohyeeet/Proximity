"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Check, Download, Eye, Flag, History, X } from "lucide-react";
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
import { cn, formatBytes, formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils";
import { decodeGeoBoundary, decodeGeoPoint, type GeoPoint } from "@/lib/form-fields";
import { buildValidationColumns, isAnswerEmpty, resolveCell, type ValidationColumn } from "@/lib/validation-table";
import type { EvidenceFile, FieldFlag, FormTemplate, FormTemplateVersion, Submission } from "@/types";

const GeoMapView = dynamic(() => import("./GeoMapView").then((m) => m.GeoMapView), { ssr: false });

/** Which single cell's enlarged detail is currently expanded inline under its row — replaces the
 * old per-cell Modal popups (which greyed out and hid the rest of the table) with an accordion
 * panel that opens directly beneath the row instead, so the reviewer keeps full table context. */
type ExpandedDetail =
  | { rowId: string; fieldCode: string; label: string; kind: "geo"; points: GeoPoint[]; boundary: boolean }
  | { rowId: string; fieldCode: string; label: string; kind: "evidence"; file: EvidenceFile };

function ExpandedDetailPanel({ detail, onClose }: { detail: ExpandedDetail; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-ink">{detail.label}</p>
        <button onClick={onClose} aria-label="Collapse" className="flex size-7 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-surface">
          <X className="size-4" />
        </button>
      </div>
      {detail.kind === "geo" ? (
        <div className="max-w-3xl">
          <GeoMapView points={detail.points} closed={detail.boundary} size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {detail.file.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.file.url}
              alt={detail.file.fileName}
              className="max-h-[420px] w-full max-w-md rounded-md border border-border object-contain sm:w-auto"
            />
          ) : (
            <p className="text-[12.5px] text-ink-soft">No hosted file for this evidence entry.</p>
          )}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[13px] sm:min-w-[220px]">
            {detail.file.capturedAt && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Captured</dt>
                <dd className="text-ink">{formatDateTime(detail.file.capturedAt)}</dd>
              </div>
            )}
            {detail.file.sizeBytes !== undefined && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Size</dt>
                <dd className="text-ink">{formatBytes(detail.file.sizeBytes)}</dd>
              </div>
            )}
            {detail.file.mimeType && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Type</dt>
                <dd className="text-ink">{detail.file.mimeType}</dd>
              </div>
            )}
            {detail.file.geo && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Geotag</dt>
                <dd className="text-ink">
                  {detail.file.geo.latitude.toFixed(5)}, {detail.file.geo.longitude.toFixed(5)}
                  {detail.file.geo.accuracy !== undefined && <span className="text-ink-soft"> (±{Math.round(detail.file.geo.accuracy)}m)</span>}
                </dd>
              </div>
            )}
          </dl>
          {detail.file.smartCheckSummary && (
            <p className="rounded-md bg-surface px-2.5 py-1.5 text-[12.5px] text-ink-soft sm:max-w-xs">{detail.file.smartCheckSummary}</p>
          )}
        </div>
      )}
    </div>
  );
}

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
  linkedRecordsById: Record<string, { formTemplateId: string; displayId: string }>,
  expandedKey: { rowId: string; fieldCode: string } | null,
  onToggleExpand: (detail: ExpandedDetail) => void
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
      if (!file) return <span className="text-critical-text">Missing file</span>;
      const active = expandedKey?.rowId === row.id && expandedKey.fieldCode === field.fieldCode;
      return (
        <EvidenceCellDetail
          file={file}
          active={active}
          onToggle={() => onToggleExpand({ rowId: row.id, fieldCode: field.fieldCode, label: field.label, kind: "evidence", file })}
        />
      );
    }
    case "geo_point": {
      const point = decodeGeoPoint(String(raw));
      if (!point) return <span className="text-ink-soft">Invalid location</span>;
      const active = expandedKey?.rowId === row.id && expandedKey.fieldCode === field.fieldCode;
      return (
        <GeoCellDetail
          points={[point]}
          kind="geo_point"
          active={active}
          onToggle={() => onToggleExpand({ rowId: row.id, fieldCode: field.fieldCode, label: field.label, kind: "geo", points: [point], boundary: false })}
        />
      );
    }
    case "geo_boundary": {
      const points = decodeGeoBoundary(String(raw));
      if (points.length === 0) return <span className="text-ink-soft">Invalid boundary</span>;
      const active = expandedKey?.rowId === row.id && expandedKey.fieldCode === field.fieldCode;
      return (
        <GeoCellDetail
          points={points}
          kind="geo_boundary"
          active={active}
          onToggle={() => onToggleExpand({ rowId: row.id, fieldCode: field.fieldCode, label: field.label, kind: "geo", points, boundary: true })}
        />
      );
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
  // expandedKey drives the CSS open/close transition; panelDetail is what's actually rendered and
  // deliberately stays set through the close animation (only expandedKey clears), so the content
  // doesn't vanish mid-collapse. See toggleExpanded below for the mount-closed-then-open sequencing.
  const [expandedKey, setExpandedKey] = useState<{ rowId: string; fieldCode: string } | null>(null);
  const [panelDetail, setPanelDetail] = useState<ExpandedDetail | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  function toggleExpanded(detail: ExpandedDetail) {
    const isSame = expandedKey?.rowId === detail.rowId && expandedKey.fieldCode === detail.fieldCode;
    if (isSame) {
      setExpandedKey(null); // panelDetail stays so the panel keeps rendering while it animates closed
      return;
    }
    // Mount (or re-target) the panel closed first, then flip it open a frame later — guarantees a
    // real transition every time, including jumping straight from one row's open cell to another's.
    setExpandedKey(null);
    setPanelDetail(detail);
    // The enlarged panel spans the full row width starting from its left edge — if the table is
    // currently scrolled right (e.g. to see a column near the sticky Review column), the panel's
    // own content would open partially clipped off-screen unless the table scrolls back to 0 first.
    scrollContainerRef.current?.scrollTo({ left: 0 });
    requestAnimationFrame(() => requestAnimationFrame(() => setExpandedKey({ rowId: detail.rowId, fieldCode: detail.fieldCode })));
  }

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
        <div ref={scrollContainerRef} className="overflow-x-auto rounded-lg border border-border">
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
                const isOpen = expandedKey?.rowId === row.id;
                return (
                <Fragment key={row.id}>
                  <tr
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
                          linkedRecordsById,
                          expandedKey,
                          toggleExpanded
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
                  {panelDetail && panelDetail.rowId === row.id && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="p-0">
                        <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                          <div className="overflow-hidden bg-sunken/50">
                            <ExpandedDetailPanel detail={panelDetail} onClose={() => setExpandedKey(null)} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
