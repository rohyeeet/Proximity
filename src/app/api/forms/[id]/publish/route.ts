import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioEditAccess } from "@/lib/authz";
import { toFormTemplate } from "@/lib/mappers";
import { getFormCounts } from "@/lib/queries";
import { notifyFormPublished } from "@/lib/notifications";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formTemplate.findUnique({ where: { id } });
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const access = await requireStudioEditAccess(form.domainPackId);
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

  const version = await prisma.formTemplateVersion.findFirst({ where: { formTemplateId: id }, orderBy: { versionNo: "desc" } });
  if (!version) return NextResponse.json({ error: "Form has no version" }, { status: 500 });

  // Every published row is permanent history — this only ever flips the current draft to
  // published. If there's nothing pending (already published), it's a no-op that returns the
  // current state rather than minting a hollow new version with no actual changes.
  const published =
    version.status === "draft"
      ? await prisma.formTemplateVersion.update({ where: { id: version.id }, data: { status: "published", publishedAt: new Date() } })
      : version;

  if (version.status === "draft") {
    await notifyFormPublished(id, form.name, published.versionNo, access.userId);
  }

  const counts = await getFormCounts(id);
  return NextResponse.json(toFormTemplate(form, published, counts));
}
