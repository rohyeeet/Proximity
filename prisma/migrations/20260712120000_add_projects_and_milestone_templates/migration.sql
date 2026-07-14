-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domainPackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "percentOfTotal" DOUBLE PRECISION NOT NULL,
    "verificationSource" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplateSplit" (
    "id" TEXT NOT NULL,
    "milestoneTemplateId" TEXT NOT NULL,
    "participantRole" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MilestoneTemplateSplit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneTemplate" ADD CONSTRAINT "MilestoneTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneTemplateSplit" ADD CONSTRAINT "MilestoneTemplateSplit_milestoneTemplateId_fkey" FOREIGN KEY ("milestoneTemplateId") REFERENCES "MilestoneTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
CREATE INDEX "Project_domainPackId_idx" ON "Project"("domainPackId");
CREATE INDEX "MilestoneTemplate_projectId_idx" ON "MilestoneTemplate"("projectId");
CREATE INDEX "MilestoneTemplateSplit_milestoneTemplateId_idx" ON "MilestoneTemplateSplit"("milestoneTemplateId");

-- Add nullable columns first (existing rows can't satisfy NOT NULL yet)
ALTER TABLE "FlowTemplate" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PaymentAgreement" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Milestone" ADD COLUMN "sourceTemplateId" TEXT;
ALTER TABLE "SplitRule" ADD COLUMN "milestoneId" TEXT;
ALTER TABLE "Submission" ADD COLUMN "projectId" TEXT;

-- Backfill: one default Project per existing Organization, inheriting its domain pack
INSERT INTO "Project" ("id", "organizationId", "domainPackId", "name", "status", "createdAt")
SELECT 'project-default-' || o.id, o.id, o."domainPackId", o.name || ' — Default Project', 'active', CURRENT_TIMESTAMP
FROM "Organization" o;

-- Backfill FlowTemplate.projectId via its domainPackId. Assumes (true for today's real data,
-- confirmed before writing this migration) that a domain pack maps to exactly one organization —
-- if a domain pack is ever genuinely shared by several orgs, this LIMIT 1 would need to become a
-- real decision about which org's project a shared legacy flow belongs to.
UPDATE "FlowTemplate" ft
SET "projectId" = (SELECT p.id FROM "Project" p WHERE p."domainPackId" = ft."domainPackId" LIMIT 1);

-- Backfill PaymentAgreement.projectId via its own organizationId (unambiguous: one default
-- project per org).
UPDATE "PaymentAgreement" pa
SET "projectId" = (SELECT p.id FROM "Project" p WHERE p."organizationId" = pa."organizationId" LIMIT 1);

-- Now that every existing row has a value, enforce NOT NULL and drop the old FlowTemplate FK.
ALTER TABLE "FlowTemplate" DROP CONSTRAINT "FlowTemplate_domainPackId_fkey";
DROP INDEX "FlowTemplate_domainPackId_code_key";
DROP INDEX "FlowTemplate_domainPackId_idx";
ALTER TABLE "FlowTemplate" DROP COLUMN "domainPackId";
ALTER TABLE "FlowTemplate" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "PaymentAgreement" ALTER COLUMN "projectId" SET NOT NULL;

-- Remaining indexes/FKs for the now-backfilled columns
CREATE INDEX "FlowTemplate_projectId_idx" ON "FlowTemplate"("projectId");
CREATE UNIQUE INDEX "FlowTemplate_projectId_code_key" ON "FlowTemplate"("projectId", "code");
CREATE INDEX "Milestone_sourceTemplateId_idx" ON "Milestone"("sourceTemplateId");
CREATE INDEX "PaymentAgreement_projectId_idx" ON "PaymentAgreement"("projectId");
CREATE INDEX "SplitRule_milestoneId_idx" ON "SplitRule"("milestoneId");
CREATE INDEX "Submission_projectId_idx" ON "Submission"("projectId");

ALTER TABLE "FlowTemplate" ADD CONSTRAINT "FlowTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAgreement" ADD CONSTRAINT "PaymentAgreement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SplitRule" ADD CONSTRAINT "SplitRule_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
