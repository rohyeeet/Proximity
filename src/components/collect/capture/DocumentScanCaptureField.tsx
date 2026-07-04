"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { uploadEvidenceFile } from "./upload-helpers";
import type { EvidenceFile } from "@/types";

/** Honest photo/file capture of a document — no edge-detection "scanning" algorithm, since a
 * clear photo or an uploaded scan already covers what field teams need day to day. */
export function DocumentScanCaptureField({
  onChange,
  onEvidence,
  existingFile,
}: {
  value: string;
  onChange: (v: string) => void;
  onEvidence?: (file: EvidenceFile) => void;
  existingFile?: EvidenceFile;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<EvidenceFile | undefined>(existingFile);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setUploading(true);
    setError(null);
    try {
      const evidence = await uploadEvidenceFile(picked, picked.name, "document_scan");
      setFile(evidence);
      onChange(evidence.id);
      onEvidence?.(evidence);
    } catch (err) {
      setError("Upload failed — check your connection and try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {file?.url ? (
        <div className="flex items-center gap-3 rounded-md border border-border-strong bg-paper p-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-sunken">
            <FileText className="size-4 text-ink-soft" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[12.5px] font-medium text-good-text">
              <CheckCircle2 className="size-3.5 shrink-0" /> {file.fileName}
            </p>
            <a href={file.url} target="_blank" rel="noreferrer" className="text-[11px] text-brand-600 hover:underline">
              View
            </a>
          </div>
          <label className="shrink-0 cursor-pointer text-[12px] font-medium text-brand-600 hover:underline">
            Replace
            <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
          </label>
        </div>
      ) : (
        <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong bg-sunken text-ink-soft hover:border-brand-500 hover:text-brand-600">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5" />}
          <span className="text-[12px]">{uploading ? "Uploading…" : "Tap to capture or choose a document"}</span>
          <input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="mt-1 text-[11.5px] text-critical-text">{error}</p>}
    </div>
  );
}
