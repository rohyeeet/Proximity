import { prisma } from "@/lib/db";
import { genId } from "@/lib/utils";
import type { ConsentRequiredRole } from "@/types";

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

/** Fans out to whichever real people hold each required-role sign-off on a freshly-filed claim —
 * investor/registry parties via PaymentAgreementParty, platform_ops via every platform admin. */
export async function notifyConsentNeeded(
  paymentAgreementId: string,
  milestoneLabel: string,
  requiredRoles: ConsentRequiredRole[]
): Promise<void> {
  const userIds = new Set<string>();
  const partyRoles = requiredRoles.filter((role): role is "investor" | "registry" => role === "investor" || role === "registry");
  if (partyRoles.length > 0) {
    const parties = await prisma.paymentAgreementParty.findMany({
      where: { paymentAgreementId, role: { in: partyRoles } },
      select: { userId: true },
    });
    for (const party of parties) userIds.add(party.userId);
  }
  if (requiredRoles.includes("platform_ops")) {
    const admins = await prisma.user.findMany({ where: { isPlatformAdmin: true }, select: { id: true } });
    for (const admin of admins) userIds.add(admin.id);
  }
  if (userIds.size === 0) return;
  await prisma.notification.createMany({
    data: [...userIds].map((userId) => ({
      id: genId("notif"),
      userId,
      type: "claim_needs_consent",
      title: "A claim needs your consent",
      body: `"${milestoneLabel}" has a new claim awaiting your sign-off.`,
      linkUrl: `/payments/${paymentAgreementId}`,
    })),
  });
}

/** Confirms settlement back to the ground partner who filed the claim — the moment their claimed
 * amount actually clears via Proximity Pay. */
export async function notifyPayoutPaid(paymentAgreementId: string, submittedByUserId: string, milestoneLabel: string, amount: number, currency: string): Promise<void> {
  await prisma.notification.create({
    data: {
      id: genId("notif"),
      userId: submittedByUserId,
      type: "payout_paid",
      title: "Payout settled",
      body: `A ${currency} ${amount.toFixed(2)} payout for "${milestoneLabel}" was paid via Proximity Pay.`,
      linkUrl: `/payments/${paymentAgreementId}`,
    },
  });
}
