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
} from "../src/data";

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
        domainPackId: flow.domainPackId,
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
