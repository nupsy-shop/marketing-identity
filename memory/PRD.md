# Marketing Identity Platform - PRD

## Original Problem Statement
Build a plugin-based Marketing Identity Platform that manages agency-client access provisioning across marketing platforms (Google Ads, GA4, GSC, GTM, etc.) with dynamic, metadata-driven capabilities.

## Core Architecture
- **Next.js** full-stack app with **Prisma** ORM and **PostgreSQL (Neon)**
- **Plugin system** with manifests defining platform capabilities, schemas, and OAuth
- **Capability-driven UI**: `getEffectiveCapabilities()` evaluates runtime capabilities from manifest rules
- **Conditional capabilities** based on `pamOwnership`, `identityPurpose`, `identityStrategy`

## What's Been Implemented

### Feb 25, 2026 — Session 3 (Current)
1. **GA4 Access Binding API Fix (v1alpha)**: All access binding operations now use `v1alpha` API instead of `v1beta`
2. **GA4 Role Format Fix**: Changed from `roles/editor` to `predefinedRoles/editor` (correct GA4 format)
3. **Grant/Verify Status Update**: Backend updates AccessRequestItem status to "validated" after successful grant/verify
4. **Platform Integration Card Redesign**: Replaced "Accessible Targets" with tabbed interface (Onboarded Accounts + Integration Scope)
5. **Client-Centric Governance**: Added Client column (first), Client Summary Bar (Total/Verified/Pending/Failed), client filter dropdown, search input, scrollable table for 100+ clients, client status derived from items

### Feb 25, 2026 — Session 2
1. **Environment Reset**: Cleaned all transactional tables
2. **Data Integrity**: Added `@@unique([agencyPlatformId, itemType, role, label])` constraint on AccessItem model
3. **GTM Schema Update**: Added `containerName` field
4. **API Bug Fixes**: Fixed GROUP_ACCESS type mapping, identityStrategy field resolution, added createAuditLogEntry
5. **Onboarding UI Enhancement**: Manual fields hidden when OAuth target is selected
6. **Admin Visibility**: `clientProvidedTarget` exposed in access request detail view
7. **Full E2E Verification**: All 10 CSV variations tested across 4 platforms

### Previous Sessions
- Conditional capability engine (`getEffectiveCapabilities`)
- Plugin manifests for GA4, GTM, Google Ads, GSC with conditional rules
- Backend API endpoints refactored to use dynamic capabilities
- Frontend hardcoded logic removed in favor of capability-driven rendering

## Prioritized Backlog

### P0
- ~~GA4 Access Binding v1alpha fix~~ DONE
- ~~GA4 predefinedRoles format fix~~ DONE
- ~~Status update after grant/verify~~ DONE
- ~~Platform Integration Card redesign with tabs~~ DONE

### P1
- Google Ads Developer Token needed for `discoverTargets` endpoint (BLOCKED on user input)
- Unit tests for `getEffectiveCapabilities` and plugin modules

### P2
- Enhanced error handling for OAuth failures
- Credential encryption for CLIENT_OWNED PAM flows
