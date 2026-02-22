-- CreateTable
CREATE TABLE "agency_settings" (
    "id" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL DEFAULT 'Marketing Agency',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "secondaryColor" TEXT NOT NULL DEFAULT '#7c3aed',
    "subdomain" TEXT,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@agency.com',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "oktaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,
    "iconName" TEXT,
    "tier" INTEGER NOT NULL DEFAULT 2,
    "clientFacing" BOOLEAN NOT NULL DEFAULT true,
    "automationFeasibility" TEXT NOT NULL,
    "accessPatterns" JSONB NOT NULL,
    "notes" TEXT,
    "oauthSupported" BOOLEAN NOT NULL DEFAULT false,
    "oauthConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configured_apps" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configured_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_request_items" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "accessPattern" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assetType" TEXT,
    "assetId" TEXT,
    "assetName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accounts" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "accountIdentifier" TEXT NOT NULL,
    "accountName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_history" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "clientId" TEXT,
    "encryptedValue" TEXT NOT NULL,
    "metadata" JSONB,
    "rotationPolicy" JSONB,
    "lastRotated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agency_settings_subdomain_key" ON "agency_settings"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_oktaId_key" ON "users"("oktaId");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_key" ON "platforms"("slug");

-- CreateIndex
CREATE INDEX "platforms_domain_idx" ON "platforms"("domain");

-- CreateIndex
CREATE INDEX "platforms_tier_idx" ON "platforms"("tier");

-- CreateIndex
CREATE INDEX "platforms_clientFacing_idx" ON "platforms"("clientFacing");

-- CreateIndex
CREATE INDEX "configured_apps_clientId_idx" ON "configured_apps"("clientId");

-- CreateIndex
CREATE INDEX "configured_apps_platformId_idx" ON "configured_apps"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "configured_apps_clientId_platformId_key" ON "configured_apps"("clientId", "platformId");

-- CreateIndex
CREATE UNIQUE INDEX "access_requests_token_key" ON "access_requests"("token");

-- CreateIndex
CREATE INDEX "access_requests_clientId_idx" ON "access_requests"("clientId");

-- CreateIndex
CREATE INDEX "access_requests_token_idx" ON "access_requests"("token");

-- CreateIndex
CREATE INDEX "access_request_items_accessRequestId_idx" ON "access_request_items"("accessRequestId");

-- CreateIndex
CREATE INDEX "access_request_items_platformId_idx" ON "access_request_items"("platformId");

-- CreateIndex
CREATE INDEX "access_request_items_status_idx" ON "access_request_items"("status");

-- CreateIndex
CREATE INDEX "platform_accounts_clientId_idx" ON "platform_accounts"("clientId");

-- CreateIndex
CREATE INDEX "grants_userId_idx" ON "grants"("userId");

-- CreateIndex
CREATE INDEX "grants_platformAccountId_idx" ON "grants"("platformAccountId");

-- CreateIndex
CREATE INDEX "validation_history_accessRequestId_idx" ON "validation_history"("accessRequestId");

-- CreateIndex
CREATE INDEX "validation_history_userId_idx" ON "validation_history"("userId");

-- CreateIndex
CREATE INDEX "validation_history_timestamp_idx" ON "validation_history"("timestamp");

-- CreateIndex
CREATE INDEX "secrets_platformId_idx" ON "secrets"("platformId");

-- CreateIndex
CREATE INDEX "secrets_clientId_idx" ON "secrets"("clientId");

-- CreateIndex
CREATE INDEX "secrets_type_idx" ON "secrets"("type");

-- AddForeignKey
ALTER TABLE "configured_apps" ADD CONSTRAINT "configured_apps_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configured_apps" ADD CONSTRAINT "configured_apps_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_items" ADD CONSTRAINT "access_request_items_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "access_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_request_items" ADD CONSTRAINT "access_request_items_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accounts" ADD CONSTRAINT "platform_accounts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_platformAccountId_fkey" FOREIGN KEY ("platformAccountId") REFERENCES "platform_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_history" ADD CONSTRAINT "validation_history_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "access_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_history" ADD CONSTRAINT "validation_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
