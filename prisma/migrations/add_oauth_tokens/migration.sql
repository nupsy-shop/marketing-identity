-- OAuth Tokens Storage
-- Stores OAuth tokens for agency connections to ad platforms

CREATE TABLE IF NOT EXISTS "oauth_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "platformKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "oauth_tokens_platformKey_idx" ON "oauth_tokens"("platformKey");
CREATE INDEX IF NOT EXISTS "oauth_tokens_provider_idx" ON "oauth_tokens"("provider");
CREATE INDEX IF NOT EXISTS "oauth_tokens_isActive_idx" ON "oauth_tokens"("isActive");

-- Accessible Targets Storage
-- Stores discovered resources/targets after OAuth connection

CREATE TABLE IF NOT EXISTS "accessible_targets" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "oauthTokenId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "parentExternalId" TEXT,
    "metadata" JSONB,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accessible_targets_oauthTokenId_fkey" FOREIGN KEY ("oauthTokenId") REFERENCES "oauth_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "accessible_targets_oauthTokenId_idx" ON "accessible_targets"("oauthTokenId");
CREATE INDEX IF NOT EXISTS "accessible_targets_targetType_idx" ON "accessible_targets"("targetType");
CREATE INDEX IF NOT EXISTS "accessible_targets_externalId_idx" ON "accessible_targets"("externalId");
