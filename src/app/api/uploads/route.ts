import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Issues short-lived, auth-gated client upload tokens for Vercel Blob — the file bytes go
 * straight from the browser to Blob storage, never through this Next.js server function, which
 * avoids serverless body-size limits entirely for photo/document/signature captures. */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Not authenticated");
        }
        return {
          // Payments claim evidence can be a PDF (dMRV export, registry document, invoice scan) in
          // addition to the image types Collect's capture fields upload — kept as one shared route
          // since the auth/token gating is identical either way.
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to persist server-side — the client already has the blob's URL/pathname and
        // attaches it to the submission's evidence array itself when the form is submitted.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 });
  }
}
