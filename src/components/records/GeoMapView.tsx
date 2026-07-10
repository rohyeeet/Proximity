"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
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

export function GeoMapView({ points, closed, size = "sm" }: { points: GeoPoint[]; closed: boolean; size?: "sm" | "lg" }) {
  const heightClassName = size === "lg" ? "h-[440px]" : "h-56";
  const first = points[0];
  if (!first) {
    return <div className={cn("flex items-center justify-center text-[13px] text-ink-soft", heightClassName)}>No coordinates captured.</div>;
  }

  return (
    <MapContainer center={[first.lat, first.lng]} zoom={16} className={cn(heightClassName, "w-full rounded-md")} scrollWheelZoom={size === "lg"}>
      {/* Satellite by default (Esri World Imagery, no API key) with a labels overlay on top so
          roads/POIs a reviewer needs to sanity-check a boundary against — e.g. a named clinic or
          road — stay visible over the imagery, not just a bare aerial photo. */}
      <TileLayer
        attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <TileLayer
        attribution="Esri Reference"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      />
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
