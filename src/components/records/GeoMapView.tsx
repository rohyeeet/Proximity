"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/form-fields";

/** Only ever loaded client-side via next/dynamic({ ssr: false }) — Leaflet touches `window` at
 * import time, and CircleMarker (a pure vector layer) sidesteps Leaflet's default marker icon
 * assets not resolving correctly through Next.js's bundler. */
function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  useEffect(() => {
    const first = points[0];
    if (!first) return;
    if (points.length === 1) {
      map.setView([first.lat, first.lng], 16);
    } else {
      map.fitBounds(points.map((p) => [p.lat, p.lng] as [number, number]), { padding: [24, 24] });
    }
  }, [map, points]);
  return null;
}

export function GeoMapView({ points, closed }: { points: GeoPoint[]; closed: boolean }) {
  const first = points[0];
  if (!first) {
    return <div className="flex h-56 items-center justify-center text-[13px] text-ink-soft">No coordinates captured.</div>;
  }

  return (
    <MapContainer center={[first.lat, first.lng]} zoom={16} className="h-56 w-full rounded-md" scrollWheelZoom={false}>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      {closed && points.length > 2 && <Polygon positions={points.map((p) => [p.lat, p.lng])} pathOptions={{ color: "#2563eb", weight: 2 }} />}
      {points.map((point, i) => (
        <CircleMarker key={i} center={[point.lat, point.lng]} radius={6} pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.8 }}>
          <Tooltip>
            Point {i + 1}
            {point.accuracy !== undefined ? ` · ±${Math.round(point.accuracy)}m` : ""}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
