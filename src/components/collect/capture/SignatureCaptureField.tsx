"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { uploadEvidenceFile } from "./upload-helpers";
import type { EvidenceFile } from "@/types";

export function SignatureCaptureField({
  onChange,
  onEvidence,
  existingFile,
}: {
  value: string;
  onChange: (v: string) => void;
  onEvidence?: (file: EvidenceFile) => void;
  existingFile?: EvidenceFile;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  const [saved, setSaved] = useState<EvidenceFile | undefined>(existingFile);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#171a16";
    }
    return ctx;
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    hasStroke.current = true;
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStroke.current = false;
    setSaved(undefined);
    onChange("");
  }

  async function done() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke.current) {
      setError("Draw a signature first.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not save signature");
      const fileName = `signature-${Date.now()}.png`;
      const evidence = await uploadEvidenceFile(blob, fileName, "signature");
      setSaved(evidence);
      onChange(evidence.id);
      onEvidence?.(evidence);
    } catch (err) {
      setError("Signature upload failed — check your connection and try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  if (saved?.url) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border-strong bg-paper p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={saved.url} alt="Signature" className="h-14 w-24 rounded border border-border bg-white object-contain" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[12.5px] font-medium text-good-text">
            <CheckCircle2 className="size-3.5 shrink-0" /> Signed
          </p>
        </div>
        <button onClick={clear} className="shrink-0 text-[12px] font-medium text-brand-600 hover:underline">
          Redo
        </button>
      </div>
    );
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="w-full touch-none rounded-md border border-dashed border-border-strong bg-white"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={uploading}>
          Clear
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={done} disabled={uploading}>
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : "Done"}
        </Button>
      </div>
      {error && <p className="mt-1 text-[11.5px] text-critical-text">{error}</p>}
    </div>
  );
}
