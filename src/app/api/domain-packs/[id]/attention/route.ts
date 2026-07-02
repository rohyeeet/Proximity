import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { toSubmission } from "@/lib/mappers";

/** Submissions needing review across every form in a domain pack — feeds the dashboard's "needs your attention" panel. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const forms = await prisma.formTemplate.findMany({ where: { domainPackId: id }, select: { id: true } });
  const formIds = forms.map((form) => form.id);

  const rows = await prisma.submission.findMany({
    where: { formTemplateId: { in: formIds }, reviewStatus: { in: ["needs_fix", "needs_check"] } },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  return NextResponse.json(rows.map(toSubmission));
}
