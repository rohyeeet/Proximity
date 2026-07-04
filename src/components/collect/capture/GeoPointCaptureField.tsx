"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { decodeGeoPoint, encodeGeoPoint } from "@/lib/form-fields";

export function GeoPointCaptureField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const point = decodeGeoPoint(value);

  function capture() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location isn't available on this device/browser.");
      return;
    }
    setCapturing(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(encodeGeoPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }));
        setCapturing(false);
      },
      () => {
        setError("Couldn't get your location — check location permissions and try again.");
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (point) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border-strong bg-paper p-2.5">
        <MapPin className="size-4 shrink-0 text-good-text" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[12.5px] font-medium text-good-text">
            <CheckCircle2 className="size-3.5 shrink-0" /> {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </p>
          {point.accuracy && <p className="text-[11px] text-ink-soft">±{Math.round(point.accuracy)}m accuracy</p>}
        </div>
        <button onClick={capture} className="shrink-0 text-[12px] font-medium text-brand-600 hover:underline">
          Recapture
        </button>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={capture} disabled={capturing} className="w-full justify-center">
        {capturing ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
        {capturing ? "Getting location…" : "Capture current location"}
      </Button>
      {error && <p className="mt-1 text-[11.5px] text-critical-text">{error}</p>}
    </div>
  );
}
