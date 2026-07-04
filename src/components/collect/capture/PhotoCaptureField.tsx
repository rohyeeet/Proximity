"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { uploadEvidenceFile } from "./upload-helpers";
import type { EvidenceFile } from "@/types";

export function PhotoCaptureField({
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
      const evidence = await uploadEvidenceFile(picked, picked.name, "photo");
      setFile(evidence);
      onChange(evidence.id);
      onEvidence?.(evidence);
    } catch (err) {
      setError("Photo upload failed — check your connection and try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {file?.url ? (
        <div className="flex items-center gap-3 rounded-md border border-border-strong bg-paper p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.fileName} className="size-14 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[12.5px] font-medium text-good-text">
              <CheckCircle2 className="size-3.5 shrink-0" /> Captured
            </p>
            {file.geo && (
              <p className="flex items-center gap-1 text-[11px] text-ink-soft">
                <MapPin className="size-3 shrink-0" /> {file.geo.latitude.toFixed(5)}, {file.geo.longitude.toFixed(5)}
              </p>
            )}
          </div>
          <label className="shrink-0 cursor-pointer text-[12px] font-medium text-brand-600 hover:underline">
            Retake
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </label>
        </div>
      ) : (
        <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-strong bg-sunken text-ink-soft hover:border-brand-500 hover:text-brand-600">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          <span className="text-[12px]">{uploading ? "Uploading…" : "Tap to take a photo"}</span>
          <input type="file" accept="image/*" capture="environment" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
      )}
      {error && <p className="mt-1 text-[11.5px] text-critical-text">{error}</p>}
    </div>
  );
}
