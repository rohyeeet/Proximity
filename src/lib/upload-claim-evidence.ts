"use client";

import { upload } from "@vercel/blob/client";
import type { EvidenceSourceType } from "@/types";

export interface UploadedClaimEvidence {
  fileRef: string;
  fileName: string;
  mimeType: string;
}

/** Uploads a claim's evidence file straight from the browser to Vercel Blob, same mechanism as
 * src/components/collect/capture/upload-helpers.ts's uploadEvidenceFile — kept as a separate sibling
 * function (rather than reusing that one directly) since claim evidence isn't shaped like an
 * EvidenceFile (no kind/geo tag) and can be a PDF, not just an image. */
export async function uploadClaimEvidence(file: File): Promise<UploadedClaimEvidence> {
  const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/uploads" });
  return { fileRef: blob.url, fileName: file.name, mimeType: file.type };
}

export const EVIDENCE_SOURCE_TYPE_LABELS: Record<EvidenceSourceType, string> = {
  dmrv_export: "dMRV export",
  site_inspection_photo: "Site inspection photo",
  production_log: "Production log",
  registry_document: "Registry document",
  other: "Other",
};
