/**
 * Seeds the database from the same mock data every part of this app already uses
 * (src/data/*.ts) — no hand-transcription, this *is* the source of truth for demo content.
 * Safe to re-run: every insert is an upsert keyed by the entity's existing id.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  domainPacks,
  organizations,
  projects,
  users,
  roles,
  orgMemberships,
  stages,
  formTemplates,
  flowTemplates,
  submissions,
  connectors,
  devices,
  telemetryStreams,
  paymentAgreements,
  splitRules,
  milestones,
  payoutRecipients,
  milestoneClaims,
  evidenceAttachments,
  stakeholderConsents,
  paymentAgreementParties,
  payoutInstructions,
  escrowAccounts,
  paymentAuditSeedEvents,
} from "../src/data";
import { computeHash, GENESIS_HASH } from "../src/lib/payment-audit";
import { genId } from "../src/lib/utils";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

async function main() {
  console.log(`Seeding with demo password: "${DEMO_PASSWORD}" (override with SEED_DEMO_PASSWORD)`);

  for (const pack of domainPacks) {
    await prisma.domainPack.upsert({
      where: { id: pack.id },
      create: {
        id: pack.id,
        slug: pack.slug,
        name: pack.name,
        version: pack.version,
        status: pack.status,
        description: pack.description,
        chainOfCustodyModes: pack.chainOfCustodyModes ?? [],
        defaultChainOfCustodyMode: pack.defaultChainOfCustodyMode,
      },
      update: {
        name: pack.name,
        version: pack.version,
        status: pack.status,
        description: pack.description,
        chainOfCustodyModes: pack.chainOfCustodyModes ?? [],
        defaultChainOfCustodyMode: pack.defaultChainOfCustodyMode,
      },
    });
  }
  console.log(`✓ ${domainPacks.length} domain packs`);

  for (const org of organizations) {
    await prisma.organization.upsert({
      where: { id: org.id },
      create: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domainPackId: org.domainPackId,
        planTier: org.planTier,
        status: org.status,
        createdAt: new Date(org.createdAt),
      },
      update: {
        name: org.name,
        planTier: org.planTier,
        status: org.status,
      },
    });
  }
  console.log(`✓ ${organizations.length} organizations`);

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      create: {
        id: project.id,
        organizationId: project.organizationId,
        domainPackId: project.domainPackId,
        name: project.name,
        description: project.description,
        status: project.status,
        createdAt: new Date(project.createdAt),
      },
      update: {
        name: project.name,
        description: project.description,
        status: project.status,
      },
    });
  }
  console.log(`✓ ${projects.length} projects`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        passwordHash,
        avatarInitials: user.avatarInitials,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin ?? false,
      },
      update: {
        fullName: user.fullName,
        email: user.email,
        avatarInitials: user.avatarInitials,
        status: user.status,
        isPlatformAdmin: user.isPlatformAdmin ?? false,
      },
    });
  }
  console.log(`✓ ${users.length} users`);

  for (const role of roles) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        organizationId: role.organizationId,
        name: role.name,
        tier: role.tier,
        description: role.description,
        canView: role.canView,
        canAct: role.canAct,
        cannot: role.cannot,
      },
      update: {
        name: role.name,
        description: role.description,
        canView: role.canView,
        canAct: role.canAct,
        cannot: role.cannot,
      },
    });
  }
  console.log(`✓ ${roles.length} roles`);

  for (const membership of orgMemberships) {
    await prisma.orgMembership.upsert({
      where: { id: membership.id },
      create: {
        id: membership.id,
        organizationId: membership.organizationId,
        userId: membership.userId,
        roleId: membership.roleId,
        status: membership.status,
      },
      update: { roleId: membership.roleId, status: membership.status },
    });
  }
  console.log(`✓ ${orgMemberships.length} org memberships`);

  for (const stage of stages) {
    await prisma.stage.upsert({
      where: { id: stage.id },
      create: {
        id: stage.id,
        domainPackId: stage.domainPackId,
        name: stage.name,
        description: stage.description,
        sortOrder: stage.sortOrder,
        connectorIds: stage.connectorIds,
        formTemplateIds: stage.formTemplateIds,
      },
      update: {
        name: stage.name,
        description: stage.description,
        sortOrder: stage.sortOrder,
        connectorIds: stage.connectorIds,
        formTemplateIds: stage.formTemplateIds,
      },
    });
  }
  console.log(`✓ ${stages.length} stages`);

  for (const form of formTemplates) {
    await prisma.formTemplate.upsert({
      where: { id: form.id },
      create: {
        id: form.id,
        domainPackId: form.domainPackId,
        code: form.code,
        name: form.name,
        description: form.description,
        category: form.category,
      },
      update: {
        name: form.name,
        description: form.description,
        category: form.category,
      },
    });
    await prisma.formTemplateVersion.upsert({
      where: { formTemplateId_versionNo: { formTemplateId: form.id, versionNo: form.currentVersion.versionNo } },
      create: {
        formTemplateId: form.id,
        versionNo: form.currentVersion.versionNo,
        status: "published",
        publishedAt: form.currentVersion.publishedAt ? new Date(form.currentVersion.publishedAt) : new Date(),
        fields: form.currentVersion.fields as object,
      },
      update: {
        status: "published",
        publishedAt: form.currentVersion.publishedAt ? new Date(form.currentVersion.publishedAt) : new Date(),
        fields: form.currentVersion.fields as object,
      },
    });
  }
  console.log(`✓ ${formTemplates.length} form templates (+ current version each)`);

  for (const flow of flowTemplates) {
    await prisma.flowTemplate.upsert({
      where: { id: flow.id },
      create: {
        id: flow.id,
        projectId: flow.projectId,
        code: flow.code,
        name: flow.name,
        status: flow.status,
        versionNo: flow.versionNo,
        triggerLabel: flow.triggerLabel,
        nodes: flow.nodes as object,
        edges: flow.edges as object,
      },
      update: {
        name: flow.name,
        status: flow.status,
        versionNo: flow.versionNo,
        triggerLabel: flow.triggerLabel,
        nodes: flow.nodes as object,
        edges: flow.edges as object,
      },
    });
  }
  console.log(`✓ ${flowTemplates.length} flow templates`);

  for (const connector of connectors) {
    await prisma.connector.upsert({
      where: { id: connector.id },
      create: {
        id: connector.id,
        organizationId: connector.organizationId,
        name: connector.name,
        connectorType: connector.connectorType,
        protocol: connector.protocol,
        status: connector.status,
        endpoint: connector.endpoint,
      },
      update: { status: connector.status },
    });
  }
  console.log(`✓ ${connectors.length} connectors`);

  for (const device of devices) {
    await prisma.device.upsert({
      where: { id: device.id },
      create: {
        id: device.id,
        connectorId: device.connectorId,
        name: device.name,
        externalRef: device.externalRef,
        calibration: device.calibration ? (device.calibration as object) : undefined,
        coveragePct: device.coveragePct,
        lastGapMinutes: device.lastGapMinutes,
        tags: device.tags as object,
      },
      update: { coveragePct: device.coveragePct, lastGapMinutes: device.lastGapMinutes, tags: device.tags as object },
    });
  }
  console.log(`✓ ${devices.length} devices`);

  for (const stream of telemetryStreams) {
    await prisma.telemetryStream.upsert({
      where: { deviceId_parameterCode: { deviceId: stream.deviceId, parameterCode: stream.parameterCode } },
      create: {
        deviceId: stream.deviceId,
        parameterCode: stream.parameterCode,
        unit: stream.unit,
        latestValue: stream.latestValue,
        thresholdHigh: stream.thresholdHigh,
        points: stream.points as object,
      },
      update: { latestValue: stream.latestValue, points: stream.points as object },
    });
  }
  console.log(`✓ ${telemetryStreams.length} telemetry streams`);

  for (const submission of submissions) {
    await prisma.submission.upsert({
      where: { id: submission.id },
      create: {
        id: submission.id,
        displayId: submission.displayId,
        formTemplateId: submission.formTemplateId,
        formTemplateVersionNo: submission.formTemplateVersionNo,
        flowNodeLabel: submission.flowNodeLabel,
        reviewStatus: submission.reviewStatus,
        syncStatus: submission.syncStatus,
        submittedByUserId: submission.submittedByUserId,
        currentVersionNo: submission.currentVersionNo,
        updatedAt: new Date(submission.updatedAt),
        answers: submission.answers as object,
        evidence: submission.evidence as object,
        versions: submission.versions as object,
        reviewActions: submission.reviewActions as object,
        linkedSubmissionIds: submission.linkedSubmissionIds ?? [],
        smartCheckSummary: submission.smartCheckSummary,
        isTest: false,
      },
      update: {
        reviewStatus: submission.reviewStatus,
        syncStatus: submission.syncStatus,
        updatedAt: new Date(submission.updatedAt),
        answers: submission.answers as object,
        reviewActions: submission.reviewActions as object,
      },
    });
  }
  console.log(`✓ ${submissions.length} submissions`);

  for (const agreement of paymentAgreements) {
    await prisma.paymentAgreement.upsert({
      where: { id: agreement.id },
      create: {
        id: agreement.id,
        organizationId: agreement.organizationId,
        projectId: agreement.projectId,
        buyerName: agreement.buyerName,
        projectName: agreement.projectName,
        currency: agreement.currency,
        totalValue: agreement.totalValue,
        pricePerCredit: agreement.pricePerCredit,
        escrowInterestAllocation: agreement.escrowInterestAllocation,
        fxRateTimingPolicy: agreement.fxRateTimingPolicy,
        status: agreement.status,
        createdByUserId: agreement.createdByUserId,
        createdAt: new Date(agreement.createdAt),
      },
      update: { status: agreement.status },
    });
  }
  for (const rule of splitRules) {
    await prisma.splitRule.upsert({
      where: { id: rule.id },
      create: { id: rule.id, paymentAgreementId: rule.paymentAgreementId, participantRole: rule.participantRole, percent: rule.percent },
      update: { percent: rule.percent },
    });
  }
  for (const milestone of milestones) {
    await prisma.milestone.upsert({
      where: { id: milestone.id },
      create: {
        id: milestone.id,
        paymentAgreementId: milestone.paymentAgreementId,
        type: milestone.type,
        label: milestone.label,
        percentOfTotal: milestone.percentOfTotal,
        verificationSource: milestone.verificationSource,
        registryRef: milestone.registryRef,
        order: milestone.order,
        status: milestone.status,
      },
      update: { status: milestone.status },
    });
  }
  for (const recipient of payoutRecipients) {
    await prisma.payoutRecipient.upsert({
      where: { id: recipient.id },
      create: {
        id: recipient.id,
        paymentAgreementId: recipient.paymentAgreementId,
        role: recipient.role,
        name: recipient.name,
        kycStatus: recipient.kycStatus,
        bavStatus: recipient.bavStatus,
        kycVerifiedAt: recipient.kycVerifiedAt ? new Date(recipient.kycVerifiedAt) : undefined,
        bavVerifiedAt: recipient.bavVerifiedAt ? new Date(recipient.bavVerifiedAt) : undefined,
      },
      update: { kycStatus: recipient.kycStatus, bavStatus: recipient.bavStatus },
    });
  }
  for (const claim of milestoneClaims) {
    await prisma.milestoneClaim.upsert({
      where: { id: claim.id },
      create: {
        id: claim.id,
        milestoneId: claim.milestoneId,
        submittedByUserId: claim.submittedByUserId,
        submittedAt: new Date(claim.submittedAt),
        claimedAmount: claim.claimedAmount,
        status: claim.status,
      },
      update: { status: claim.status },
    });
  }
  for (const evidence of evidenceAttachments) {
    await prisma.evidenceAttachment.upsert({
      where: { id: evidence.id },
      create: {
        id: evidence.id,
        claimId: evidence.claimId,
        sourceType: evidence.sourceType,
        fileRef: evidence.fileRef,
        fileName: evidence.fileName,
        hash: evidence.hash,
        submittedAt: new Date(evidence.submittedAt),
      },
      update: {},
    });
  }
  for (const consent of stakeholderConsents) {
    await prisma.stakeholderConsent.upsert({
      where: { id: consent.id },
      create: {
        id: consent.id,
        claimId: consent.claimId,
        requiredRole: consent.requiredRole,
        consentedByUserId: consent.consentedByUserId,
        consentedAt: consent.consentedAt ? new Date(consent.consentedAt) : undefined,
        status: consent.status,
        rejectionReason: consent.rejectionReason,
      },
      // Reset every field the live consent-recording API can mutate, not just status — otherwise
      // re-running the seed after exercising the live app leaves a stale consentedByUserId/
      // consentedAt sitting next to a reset-to-pending status, which is exactly the kind of
      // inconsistent state this "safe to re-run" script should never produce.
      update: {
        status: consent.status,
        consentedByUserId: consent.consentedByUserId ?? null,
        consentedAt: consent.consentedAt ? new Date(consent.consentedAt) : null,
        rejectionReason: consent.rejectionReason ?? null,
      },
    });
  }
  for (const party of paymentAgreementParties) {
    await prisma.paymentAgreementParty.upsert({
      where: { id: party.id },
      create: { id: party.id, paymentAgreementId: party.paymentAgreementId, userId: party.userId, role: party.role, investedAmount: party.investedAmount },
      update: {},
    });
  }
  for (const instruction of payoutInstructions) {
    await prisma.payoutInstruction.upsert({
      where: { id: instruction.id },
      create: {
        id: instruction.id,
        milestoneId: instruction.milestoneId,
        claimId: instruction.claimId,
        recipientId: instruction.recipientId,
        participantRole: instruction.participantRole,
        amount: instruction.amount,
        currency: instruction.currency,
        status: instruction.status,
        proximityPayRef: instruction.proximityPayRef,
        paidAt: instruction.paidAt ? new Date(instruction.paidAt) : undefined,
      },
      // Same reasoning as the StakeholderConsent upsert above — the live release/override APIs
      // mutate proximityPayRef/paidAt too, not just status.
      update: {
        status: instruction.status,
        proximityPayRef: instruction.proximityPayRef ?? null,
        paidAt: instruction.paidAt ? new Date(instruction.paidAt) : null,
      },
    });
  }
  for (const escrow of escrowAccounts) {
    await prisma.escrowAccount.upsert({
      where: { id: escrow.id },
      create: {
        id: escrow.id,
        paymentAgreementId: escrow.paymentAgreementId,
        heldAmount: escrow.heldAmount,
        currency: escrow.currency,
        corePortionBalance: escrow.corePortionBalance,
        interestAccruedToDate: escrow.interestAccruedToDate,
        status: escrow.status,
        fundedAt: new Date(escrow.fundedAt),
      },
      update: { heldAmount: escrow.heldAmount, corePortionBalance: escrow.corePortionBalance, status: escrow.status },
    });
  }
  // Built here (not as static literals) so the hash chain is genuinely valid — the "Verify chain"
  // button should pass on seeded demo data exactly as it would on live-created entries. Chained
  // per paymentAgreementId (each agreement's chain starts from its own GENESIS_HASH, matching
  // appendAuditEntry's own per-agreement scoping) and skipped per-agreement if it already has
  // entries, so re-running the seed script never duplicates the trail.
  const eventsByAgreement = new Map<string, typeof paymentAuditSeedEvents>();
  for (const event of paymentAuditSeedEvents) {
    eventsByAgreement.set(event.paymentAgreementId, [...(eventsByAgreement.get(event.paymentAgreementId) ?? []), event]);
  }
  for (const [paymentAgreementId, events] of eventsByAgreement) {
    const existingCount = await prisma.paymentAuditLogEntry.count({ where: { paymentAgreementId } });
    if (existingCount > 0) continue;
    let previousHash = GENESIS_HASH;
    for (const event of events) {
      // Hash the normalized (millisecond-precision) timestamp, not the literal seed string — a
      // DateTime column always round-trips back through Date.toISOString() at read time (which
      // appends ".000" if the literal didn't have it), and verifyAuditChain() recomputes the hash
      // from that round-tripped value. Hashing anything else here would make "Verify chain" report
      // a false break on every seeded entry.
      const timestamp = new Date(event.timestamp);
      const normalizedTimestamp = timestamp.toISOString();
      const hash = computeHash(previousHash, event.eventType, event.payload, normalizedTimestamp);
      await prisma.paymentAuditLogEntry.create({
        data: { id: genId("audit"), paymentAgreementId, eventType: event.eventType, payload: event.payload as object, timestamp, previousHash, hash },
      });
      previousHash = hash;
    }
  }
  console.log(`✓ ${paymentAgreements.length} payment agreement(s) (+ milestones, claims, consents, payouts, escrow, audit trail)`);

  console.log("\nSeed complete. Every mock user can log in with their email + the demo password above.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
