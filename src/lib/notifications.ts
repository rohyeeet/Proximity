import { prisma } from "@/lib/db";
import { genId } from "@/lib/utils";

/**
 * Fans out a "this form changed" notification to everyone who's actually submitted real
 * (non-test) data against it, plus a confirmation to whoever just published it — the two
 * audiences the versioning feature is meant to keep informed (end users and the form creator).
 */
export async function notifyFormPublished(formTemplateId: string, formName: string, versionNo: number, publisherUserId: string): Promise<void> {
  const submitters = await prisma.submission.findMany({
    where: { formTemplateId, isTest: false },
    select: { submittedByUserId: true },
    distinct: ["submittedByUserId"],
  });

  const notifications: { id: string; userId: string; type: string; title: string; body: string; formTemplateId: string }[] = [];

  for (const { submittedByUserId } of submitters) {
    if (submittedByUserId === publisherUserId) continue;
    notifications.push({
      id: genId("notif"),
      userId: submittedByUserId,
      type: "form_published",
      title: `"${formName}" was updated`,
      body: `It was updated to v${versionNo}. Your existing submissions remain saved under the version you submitted them with.`,
      formTemplateId,
    });
  }

  notifications.push({
    id: genId("notif"),
    userId: publisherUserId,
    type: "form_published",
    title: `You published v${versionNo} of "${formName}"`,
    body: `Submitters with existing data on this form have been notified. Older submissions keep rendering against their original fields.`,
    formTemplateId,
  });

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }
}
