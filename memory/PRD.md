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

### P2 — Unit Tests (DONE, Feb 2026)
- 6 test suites, 315 tests, all passing
- `validateProvisioningRequest`: 12 tests (happy path, missing fields, SHARED_ACCOUNT rejection, unsupported access types)
- `buildPluginError`: 12 tests (error parsing, HTTP status detection, JSON body extraction, flag detection)
- `resolveNativeRole`: 5 tests (case insensitivity, whitespace trimming, unknown roles)
- `getEffectiveCapabilities`: 13 tests (conditional rules, config context, simple capabilities)
- Manifest validation helpers: 18 tests (ownership, identity, access type, verification mode, full config validation, role templates)
- Plugin interface compliance: 255 tests (all 15 plugins × 17 checks: manifest structure, interface methods, validation integration, response shapes)

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

### P1 — Implement Stubbed Plugin Methods
- Replace stubs in 11 non-Google plugins with actual API integrations (requires API credentials per platform)

### P2 — Housekeeping & Cleanup
- Ensure consistent file naming across all plugin folders
- Remove any dead code or legacy interfaces
- Clean up root-level test files (`/app/*.py`)

## Known Issues
- Google Ads `discoverTargets` flow requires `GOOGLE_ADS_DEVELOPER_TOKEN` (not available — deferred)
- Meta/Salesforce/GA-UA `grantAccess`/`verifyAccess` are stubs (API integration pending)
