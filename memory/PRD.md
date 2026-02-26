# Access Provisioning Platform — PRD

## Problem Statement
Build a robust, scalable platform for managing client access to marketing services across 15+ ad/analytics platforms. Three architectural pillars:

1. **Client-Centric Governance**: Admin UI pivots from account-centric to client-centric views.
2. **Declarative, Manifest-Driven Architecture**: All plugin capabilities declared in `PluginManifest`, driving runtime validation and UI.
3. **Unified Plugin Interface**: Standardized `AccessProvisioningPlugin` interface with `grantAccess`, `verifyAccess`, `revokeAccess` across all plugins.

## Core Requirements
- Every plugin MUST implement `grantAccess`, `verifyAccess`, `revokeAccess` with unified `PluginOperationParams` / `PluginOperationResult` signatures.
- Manifests MUST declare `canGrantAccess`, `canVerifyAccess`, `canRevokeAccess` per access type.
- Route handler MUST gate on manifest capabilities before calling plugin methods.
- `validateProvisioningRequest` MUST be used for centralized validation.
- `buildPluginError` MUST be used for standardized error handling.

## What's Been Implemented

### P0 — Unified Interface for 4 Google Plugins (DONE, TESTED)
- GA4: Full `grantAccess`, `verifyAccess`, `revokeAccess` with live Google Analytics Admin API
- GTM: Full interface with live Google Tag Manager API, including `deleteUserPermission`
- Google Ads: Full interface with live Google Ads API, including `removeUserAccess` and `updateManagerLinkStatus`
- GSC: Full `verifyAccess` via API; `grantAccess` and `revokeAccess` return "not supported" (API limitation)

### P1 — Unified Interface for 11 Remaining Plugins (DONE, TESTED)
All 11 plugins migrated to unified interface with stubs.

### P1.1 — Meta Plugin Full Implementation (DONE, Feb 2026)
- **OAuth**: Full `startOAuth` / `handleOAuthCallback` with short-to-long-lived token exchange (Graph API v21.0)
- **Target Discovery**: `discoverTargets` lists businesses and ad accounts via `/me/businesses` + `/{biz}/owned_ad_accounts`
- **grantAccess**:
  - PARTNER_DELEGATION: Invites user/partner to business via `/{biz}/access_invite`
  - NAMED_INVITE: Assigns user to ad account via `/act_{id}/assigned_users` with role-based tasks (MANAGE/ADVERTISE/ANALYZE). Resolves email→userId via business_users lookup, auto-invites if not found.
- **verifyAccess**: Checks `/act_{id}/assigned_users` for identity match and task coverage
- **revokeAccess** (NAMED_INVITE only): Removes user from ad account via `DELETE /act_{id}/assigned_users`
- **Manifest updated**: `canRevokeAccess: true` for NAMED_INVITE, version bumped to 3.0.0
- API module: `/app/plugins/meta/api/graph.ts` (typed Meta Graph API wrapper)

### P2 — Unit Tests (DONE, Feb 2026)
- 6 test suites, 315 tests, all passing
- Covers: `validateProvisioningRequest`, `buildPluginError`, `resolveNativeRole`, `getEffectiveCapabilities`, manifest validators, plugin interface compliance (all 15 plugins)

### Earlier Completed Work
- GA4 bug fixes (API versions, role formats, UI status updates)
- Client-centric Admin UI refactor (PlatformIntegrationCard with Sheet, Tabs, filters)
- Manifest-driven architecture (allowedOwnershipModels, allowedIdentityStrategies, allowedAccessTypes, verificationModes)

## Architecture
- 15 plugins in `/app/plugins/{key}/index.ts`
- Unified types in `/app/lib/plugins/types.ts`
- API routes in `/app/app/api/[[...path]]/route.js`
- Admin UI in `/app/components/admin/PlatformIntegrationCard.tsx`
- Unit tests in `/app/tests/unit/*.test.ts`
- Jest config: `/app/jest.config.js`, `/app/tsconfig.jest.json`

## Remaining Backlog

### P1 — Implement Remaining Stubbed Plugins
- 10 plugins still have stubs (DV360, Trade Desk, TikTok, Snapchat, LinkedIn, Pinterest, HubSpot, Salesforce, Snowflake, GA-UA)
- Each needs: API credentials, OAuth flow, target discovery, grant/verify/revoke implementations

### P2 — Housekeeping & Cleanup
- Remove root-level `.py` test files
- Ensure consistent file naming across plugin folders
- Remove dead code or legacy interfaces

## Known Issues
- Google Ads `discoverTargets` flow requires `GOOGLE_ADS_DEVELOPER_TOKEN` (deferred)
- 10 non-Google/Meta plugins still have stub implementations
