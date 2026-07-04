"use client";

import { useState } from "react";
import { Loader2, MapPinned, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { decodeGeoBoundary, encodeGeoBoundary } from "@/lib/form-fields";

/** Records an ordered list of GPS points as you walk a boundary — no map rendering in this pass,
 * just correct, real point-by-point data capture. */
export function GeoBoundaryCaptureField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const points = decodeGeoBoundary(value);

  function addPoint() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location isn't available on this device/browser.");
      return;
    }
    setCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(encodeGeoBoundary([...points, { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }]));
        setCapturing(false);
      },
      () => {
        setError("Couldn't get your location — check location permissions and try again.");
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function removePoint(index: number) {
    onChange(encodeGeoBoundary(points.filter((_, i) => i !== index)));
  }

  return (
    <div className="flex flex-col gap-2">
      {points.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-border-strong bg-paper p-2">
          {points.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[12px] text-ink">
              <span>
                {i + 1}. {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              </span>
              <button aria-label="Remove point" onClick={() => removePoint(i)} className="text-ink-soft hover:text-critical-text">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="secondary" onClick={addPoint} disabled={capturing} className="w-full justify-center">
        {capturing ? <Loader2 className="size-3.5 animate-spin" /> : <MapPinned className="size-3.5" />}
        {capturing ? "Getting location…" : `Add point (${points.length} so far)`}
      </Button>
      {error && <p className="text-[11.5px] text-critical-text">{error}</p>}
    </div>
  );
}
