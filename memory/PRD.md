# Marketing Identity Platform - PRD

## Original Problem Statement
Build a plugin-based Marketing Identity Platform that manages agency-client access provisioning across marketing platforms (Google Ads, GA4, GSC, GTM, etc.) with dynamic, metadata-driven capabilities.

## Core Architecture
- **Next.js** full-stack app with **Prisma** ORM and **PostgreSQL (Neon)**
- **Plugin system** with manifests defining platform capabilities, schemas, and OAuth
- **Capability-driven UI**: `getEffectiveCapabilities()` evaluates runtime capabilities from manifest rules
- **Conditional capabilities** based on `pamOwnership`, `identityPurpose`, `identityStrategy`

## What's Been Implemented

### Feb 25, 2026 — Current Session
1. **Environment Reset**: Cleaned all transactional tables (clients, agency_platforms, access_items, access_requests, access_request_items, oauth_tokens, accessible_targets, pam_sessions, audit_logs)
2. **Data Integrity**: Added `@@unique([agencyPlatformId, itemType, role, label])` constraint on AccessItem model
3. **GTM Schema Update**: Added `containerName` field to NamedInviteClientSchema, GroupAccessClientSchema, and SharedAccountClientSchema
4. **API Bug Fixes**:
   - Fixed GROUP_ACCESS type mapping (`GROUP_ACCESS` → `GROUP_SERVICE` was incorrect; now uses canonical type names)
   - Fixed `identityStrategy` field resolution (now accepts both `pamIdentityStrategy` and `identityStrategy`)
   - Added missing `createAuditLogEntry` function to db.js
5. **Onboarding UI Enhancement**: Manual fields hidden when OAuth target is selected; shown as fallback when OAuth is available but no target selected
6. **Admin Visibility**: `clientProvidedTarget` now exposed in access request detail view with formatted display of selected targets
7. **Full E2E Verification**: All 10 CSV variations created and tested across 4 platforms with correct effective capabilities

### Previous Sessions
- Conditional capability engine (`getEffectiveCapabilities`) in `lib/plugins/types.ts`
- Plugin manifests for GA4, GTM, Google Ads, GSC with conditional rules
- Backend API endpoints refactored to use dynamic capabilities
- Frontend hardcoded logic removed in favor of capability-driven rendering
- Empty onboarding page bug fix

## Prioritized Backlog

### P0
- Google Ads Developer Token needed for `discoverTargets` endpoint (BLOCKED on user input)

### P1
- Implement `grantAccess` for DV360 plugin
- Unit tests for `getEffectiveCapabilities` and plugin modules

### P2
- Enhanced error handling for OAuth failures
- Credential encryption for CLIENT_OWNED PAM flows
