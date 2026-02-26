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
All 11 plugins (Meta, DV360, Trade Desk, TikTok, Snapchat, LinkedIn, Pinterest, HubSpot, Salesforce, Snowflake, GA-UA) now implement:
- `grantAccess`, `verifyAccess`, `revokeAccess` with proper `PluginOperationParams`/`PluginOperationResult`
- `validateProvisioningRequest` for centralized validation
- Manifest `canRevokeAccess: false` (no live API integration yet)
- Plugins with `canGrantAccess: true` (Meta, Salesforce, GA-UA) return "API integration pending"
- Plugins with `canGrantAccess: false` get 501 at route level

### Earlier Completed Work
- GA4 bug fixes (API versions, role formats, UI status updates)
- Client-centric Admin UI refactor (PlatformIntegrationCard with Sheet, Tabs, filters)
- Manifest-driven architecture (allowedOwnershipModels, allowedIdentityStrategies, allowedAccessTypes, verificationModes)

## Architecture
- 15 plugins in `/app/plugins/{key}/index.ts`
- Unified types in `/app/lib/plugins/types.ts`
- API routes in `/app/app/api/[[...path]]/route.js`
- Admin UI in `/app/components/admin/PlatformIntegrationCard.tsx`

## Remaining Backlog

### P2 — Unit Tests
- Add unit tests for `validateProvisioningRequest`, `buildPluginError`
- Test `revokeAccess` logic per plugin
- Create `/app/backend/tests/` structure

### P3 — File Cleanup & Structural Consistency
- Ensure consistent file naming across all plugin folders
- Remove any dead code or legacy interfaces

### Known Issues
- Google Ads `discoverTargets` flow requires `GOOGLE_ADS_DEVELOPER_TOKEN` (not available)
- Meta/Salesforce/GA-UA `grantAccess`/`verifyAccess` are stubs (API integration pending)
