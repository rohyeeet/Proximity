-- CreateTable
CREATE TABLE "ServiceListing" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pricingModel" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "apiAvailable" BOOLEAN NOT NULL,
    "badges" TEXT[],
    "website" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectServiceIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "serviceListingId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectServiceIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceListing_category_idx" ON "ServiceListing"("category");

-- CreateIndex
CREATE INDEX "ProjectServiceIntegration_projectId_idx" ON "ProjectServiceIntegration"("projectId");

-- CreateIndex
CREATE INDEX "ProjectServiceIntegration_serviceListingId_idx" ON "ProjectServiceIntegration"("serviceListingId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectServiceIntegration_projectId_serviceListingId_key" ON "ProjectServiceIntegration"("projectId", "serviceListingId");

-- AddForeignKey
ALTER TABLE "ProjectServiceIntegration" ADD CONSTRAINT "ProjectServiceIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceIntegration" ADD CONSTRAINT "ProjectServiceIntegration_serviceListingId_fkey" FOREIGN KEY ("serviceListingId") REFERENCES "ServiceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceIntegration" ADD CONSTRAINT "ProjectServiceIntegration_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
