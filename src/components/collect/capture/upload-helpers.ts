"use client";

import { upload } from "@vercel/blob/client";
import { genId } from "@/lib/utils";
import type { EvidenceFile, EvidenceGeoTag } from "@/types";

/** Never blocks a capture — resolves undefined on denial, timeout, or unsupported browsers. */
export function getBestEffortGeoTag(): Promise<EvidenceGeoTag | undefined> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(undefined), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {
        clearTimeout(timeout);
        resolve(undefined);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  });
}

/** Uploads straight from the browser to Vercel Blob (via /api/uploads for the short-lived token)
 * and tags the result with a best-effort geolocation captured at the same moment. */
export async function uploadEvidenceFile(file: File | Blob, fileName: string, kind: EvidenceFile["kind"]): Promise<EvidenceFile> {
  const geo = await getBestEffortGeoTag();
  const blob = await upload(fileName, file, { access: "public", handleUploadUrl: "/api/uploads" });
  return {
    id: genId("evidence"),
    fileName,
    kind,
    url: blob.url,
    mimeType: file instanceof File ? file.type : "image/png",
    sizeBytes: file.size,
    capturedAt: new Date().toISOString(),
    geo,
  };
}
