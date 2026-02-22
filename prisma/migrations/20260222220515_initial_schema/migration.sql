/*
  Warnings:

  - You are about to drop the column `assetId` on the `access_request_items` table. All the data in the column will be lost.
  - You are about to drop the column `assetType` on the `access_request_items` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `access_request_items` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `access_requests` table. All the data in the column will be lost.
  - You are about to drop the `agency_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `configured_apps` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `grants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platform_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `platforms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `secrets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `validation_history` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `itemType` to the `access_request_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "access_request_items" DROP CONSTRAINT "access_request_items_platformId_fkey";

-- DropForeignKey
ALTER TABLE "access_requests" DROP CONSTRAINT "access_requests_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "configured_apps" DROP CONSTRAINT "configured_apps_clientId_fkey";

-- DropForeignKey
ALTER TABLE "configured_apps" DROP CONSTRAINT "configured_apps_platformId_fkey";

-- DropForeignKey
ALTER TABLE "grants" DROP CONSTRAINT "grants_platformAccountId_fkey";

-- DropForeignKey
ALTER TABLE "platform_accounts" DROP CONSTRAINT "platform_accounts_clientId_fkey";

-- DropForeignKey
ALTER TABLE "secrets" DROP CONSTRAINT "secrets_clientId_fkey";

-- DropForeignKey
ALTER TABLE "secrets" DROP CONSTRAINT "secrets_platformId_fkey";

-- DropForeignKey
ALTER TABLE "validation_history" DROP CONSTRAINT "validation_history_accessRequestId_fkey";

-- DropForeignKey
ALTER TABLE "validation_history" DROP CONSTRAINT "validation_history_userId_fkey";

-- AlterTable
ALTER TABLE "access_request_items" DROP COLUMN "assetId",
DROP COLUMN "assetType",
DROP COLUMN "notes",
ADD COLUMN     "agencyData" JSONB,
ADD COLUMN     "agencyGroupEmail" TEXT,
ADD COLUMN     "clientInstructions" TEXT,
ADD COLUMN     "clientProvidedTarget" JSONB,
ADD COLUMN     "humanIdentityStrategy" TEXT,
ADD COLUMN     "identityPurpose" TEXT,
ADD COLUMN     "itemType" TEXT NOT NULL,
ADD COLUMN     "pamConfig" JSONB,
ADD COLUMN     "pamOwnership" TEXT,
ADD COLUMN     "pamSecretRef" TEXT,
ADD COLUMN     "pamUsername" TEXT,
ADD COLUMN     "patternLabel" TEXT,
ADD COLUMN     "resolvedIdentity" TEXT,
ADD COLUMN     "validationMode" TEXT,
ADD COLUMN     "validationResult" JSONB,
ALTER COLUMN "accessPattern" DROP NOT NULL;

-- AlterTable
ALTER TABLE "access_requests" DROP COLUMN "createdBy",
ADD COLUMN     "notes" TEXT;

-- DropTable
DROP TABLE "agency_settings";

-- DropTable
DROP TABLE "configured_apps";

-- DropTable
DROP TABLE "grants";

-- DropTable
DROP TABLE "platform_accounts";

-- DropTable
DROP TABLE "platforms";

-- DropTable
DROP TABLE "secrets";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "validation_history";

-- CreateTable
CREATE TABLE "catalog_platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "clientFacing" BOOLEAN NOT NULL DEFAULT true,
    "automationFeasibility" TEXT,
    "supportedItemTypes" TEXT[],
    "accessPatterns" JSONB,
    "notes" TEXT,
    "oauthSupported" BOOLEAN NOT NULL DEFAULT false,
    "oauthConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agency_platforms" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_items" (
    "id" TEXT NOT NULL,
    "agencyPlatformId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "accessPattern" TEXT,
    "patternLabel" TEXT,
    "label" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "notes" TEXT,
    "identityPurpose" TEXT,
    "humanIdentityStrategy" TEXT,
    "agencyGroupEmail" TEXT,
    "integrationIdentityId" TEXT,
    "agencyData" JSONB,
    "pamConfig" JSONB,
    "validationMethod" TEXT DEFAULT 'ATTESTATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_identities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pam_sessions" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkedOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "checkedInAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "credentialRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "requestId" TEXT,
    "itemId" TEXT,
    "platformId" TEXT,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_platforms_name_key" ON "catalog_platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_platforms_slug_key" ON "catalog_platforms"("slug");

-- CreateIndex
CREATE INDEX "catalog_platforms_domain_idx" ON "catalog_platforms"("domain");

-- CreateIndex
CREATE INDEX "catalog_platforms_clientFacing_idx" ON "catalog_platforms"("clientFacing");

-- CreateIndex
CREATE UNIQUE INDEX "agency_platforms_platformId_key" ON "agency_platforms"("platformId");

-- CreateIndex
CREATE INDEX "access_items_agencyPlatformId_idx" ON "access_items"("agencyPlatformId");

-- CreateIndex
CREATE INDEX "access_items_itemType_idx" ON "access_items"("itemType");

-- CreateIndex
CREATE INDEX "pam_sessions_requestId_idx" ON "pam_sessions"("requestId");

-- CreateIndex
CREATE INDEX "pam_sessions_status_idx" ON "pam_sessions"("status");

-- CreateIndex
CREATE INDEX "audit_logs_event_idx" ON "audit_logs"("event");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "agency_platforms" ADD CONSTRAINT "agency_platforms_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "catalog_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_items" ADD CONSTRAINT "access_items_agencyPlatformId_fkey" FOREIGN KEY ("agencyPlatformId") REFERENCES "agency_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_items" ADD CONSTRAINT "access_request_items_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "catalog_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
