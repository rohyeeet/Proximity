"use client";

import { useState } from "react";
import { FileImage, ScanLine, PenTool } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatBytes, formatDateTime } from "@/lib/utils";
import type { EvidenceFile } from "@/types";

const evidenceIcon = { photo: FileImage, document_scan: ScanLine, signature: PenTool, gps_log: FileImage };

/** A table cell for a photo/document_scan/signature answer — a small chip that opens the file's
 * capture metadata (timestamp, geotag, size) on click, since that detail doesn't fit in a cell. */
export function EvidenceCellDetail({ file }: { file: EvidenceFile }) {
  const [open, setOpen] = useState(false);
  const Icon = evidenceIcon[file.kind];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-sunken px-2 py-1 text-[12.5px] text-ink hover:bg-sunken/70"
      >
        <Icon className="size-3.5 text-ink-soft" />
        <span className="max-w-[110px] truncate">{file.fileName}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={file.fileName} description={file.kind.replace("_", " ")}>
        <div className="flex flex-col gap-3">
          {file.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={file.fileName} className="max-h-64 w-full rounded-md border border-border object-contain" />
          )}
          <dl className="grid grid-cols-2 gap-2.5 text-[13px]">
            {file.capturedAt && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Captured</dt>
                <dd className="text-ink">{formatDateTime(file.capturedAt)}</dd>
              </div>
            )}
            {file.sizeBytes !== undefined && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Size</dt>
                <dd className="text-ink">{formatBytes(file.sizeBytes)}</dd>
              </div>
            )}
            {file.mimeType && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Type</dt>
                <dd className="text-ink">{file.mimeType}</dd>
              </div>
            )}
            {file.geo && (
              <div>
                <dt className="text-[11.5px] text-ink-soft">Geotag</dt>
                <dd className="text-ink">
                  {file.geo.latitude.toFixed(5)}, {file.geo.longitude.toFixed(5)}
                  {file.geo.accuracy !== undefined && <span className="text-ink-soft"> (±{Math.round(file.geo.accuracy)}m)</span>}
                </dd>
              </div>
            )}
          </dl>
          {file.smartCheckSummary && <p className="rounded-md bg-sunken px-2.5 py-1.5 text-[12.5px] text-ink-soft">{file.smartCheckSummary}</p>}
          {!file.url && <p className="text-[12.5px] text-ink-soft">No hosted file for this evidence entry.</p>}
        </div>
      </Modal>
    </>
  );
}
