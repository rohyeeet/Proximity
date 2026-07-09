"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { GeoPoint } from "@/lib/form-fields";

const GeoMapView = dynamic(() => import("./GeoMapView").then((m) => m.GeoMapView), { ssr: false });

/** A table cell for a geo_point/geo_boundary answer — a chip that opens a read-only map on click,
 * since a polygon or even a single lat/lng pair isn't reviewable as raw text in a cell. */
export function GeoCellDetail({ points, kind }: { points: GeoPoint[]; kind: "geo_point" | "geo_boundary" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-sunken px-2 py-1 text-[12.5px] text-ink hover:bg-sunken/70"
      >
        <MapPin className="size-3.5 text-ink-soft" />
        {kind === "geo_point" ? "View location" : `View boundary (${points.length} pts)`}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={kind === "geo_point" ? "Captured location" : "Captured boundary"}
        className="max-w-lg"
      >
        {open && <GeoMapView points={points} closed={kind === "geo_boundary"} />}
      </Modal>
    </>
  );
}
