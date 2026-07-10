"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeoPoint } from "@/lib/form-fields";

/** A table cell for a geo_point/geo_boundary answer — a chip that toggles an inline, in-place
 * expansion of the row (see RecordsGridClient's accordion panel) instead of a modal, so a
 * reviewer can see the enlarged map without losing sight of the rest of the table. */
export function GeoCellDetail({ points, kind, active, onToggle }: { points: GeoPoint[]; kind: "geo_point" | "geo_boundary"; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12.5px] transition-colors",
        active ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border bg-sunken text-ink hover:bg-sunken/70"
      )}
    >
      <MapPin className="size-3.5 text-ink-soft" />
      {kind === "geo_point" ? "View location" : `View boundary (${points.length} pts)`}
    </button>
  );
}
