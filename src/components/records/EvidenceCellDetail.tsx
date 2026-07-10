"use client";

import { FileImage, ScanLine, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EvidenceFile } from "@/types";

const evidenceIcon = { photo: FileImage, document_scan: ScanLine, signature: PenTool, gps_log: FileImage };

/** A table cell for a photo/document_scan/signature answer — a chip that toggles an inline, in-place
 * expansion of the row (see RecordsGridClient's accordion panel) instead of a modal, so a reviewer
 * can see the enlarged file without losing sight of the rest of the table. */
export function EvidenceCellDetail({ file, active, onToggle }: { file: EvidenceFile; active: boolean; onToggle: () => void }) {
  const Icon = evidenceIcon[file.kind];
  return (
    <button
      onClick={onToggle}
      aria-expanded={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12.5px] transition-colors",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-sunken text-ink hover:bg-sunken/70"
      )}
    >
      <Icon className="size-3.5 text-ink-soft" />
      <span className="max-w-[110px] truncate">{file.fileName}</span>
    </button>
  );
}
