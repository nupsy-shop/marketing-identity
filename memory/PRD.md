# Access Provisioning Platform — PRD

## Problem Statement
Build a robust, scalable platform for managing client access to marketing services across ad/analytics/e-commerce platforms. Three architectural pillars:
1. **Client-Centric Governance**: Admin UI pivots from account-centric to client-centric views.
2. **Declarative, Manifest-Driven Architecture**: All plugin capabilities declared in `PluginManifest`, driving runtime validation and UI.
3. **Unified Plugin Interface**: Standardized `AccessProvisioningPlugin` interface with `grantAccess`, `verifyAccess`, `revokeAccess` across all plugins.

## What's Been Implemented

### P0 — Unified Interface for 4 Google Plugins (DONE)
- GA4, GTM, Google Ads, GSC: Full implementations with live Google APIs

### P1 — Meta Plugin (DONE)
- Full Graph API v21.0 integration: OAuth, discoverTargets, grantAccess, verifyAccess, revokeAccess

### P1 — All 14 Remaining Plugins (DONE, Feb 2026)

**Full API implementations (real grant/verify/revoke):**
| Plugin | API | Grant | Verify | Revoke |
|--------|-----|-------|--------|--------|
| HubSpot | Settings API v3 | Invite user by email + role | Find user by email | Remove user |
| Salesforce | REST API v59.0 | Find/verify user by email | Query user + permission sets | Deactivate user |
| Snowflake | SQL REST API v2 | GRANT ROLE TO USER | SHOW GRANTS TO USER | REVOKE ROLE FROM USER |
| GA-UA | Management API v3 | Add entityUserLink | Find userLink by email | Delete entityUserLink |
| Microsoft Ads | Bing SOAP API v13 | SendUserInvitation | GetUsersInfo | DeleteUser |

**OAuth + Discovery (manual access management):**
| Plugin | OAuth Provider | Discovery Endpoint |
|--------|---------------|-------------------|
| DV360 | Google OAuth | DV360 API v3 partners/advertisers |
| LinkedIn | LinkedIn OAuth | Marketing API ad accounts |
| TikTok | TikTok Business | oauth2/advertiser/get |
| Snapchat | Snapchat OAuth | /v1/organizations/{id}/adaccounts |
| Pinterest | Pinterest OAuth | /v5/ad_accounts |
| Amazon Ads | Login with Amazon | /v2/profiles |
| Reddit Ads | Reddit OAuth | /api/v3/me/accounts |

**Manual only (no public API):**
| Plugin | Status |
|--------|--------|
| Spotify Ads | No public API - full manual workflow |
| Trade Desk | API auth-only discovery - manual user mgmt |

### P1 — Google Merchant Center & Shopify Plugins (DONE, Feb 2026)
- **Google Merchant Center**: E-commerce category, tier 2, OAuth + Content API discovery, NAMED_INVITE + PARTNER_DELEGATION + SHARED_ACCOUNT
- **Shopify**: E-commerce category, tier 2, OAuth for app auth, NAMED_INVITE (staff) + PROXY_TOKEN (API) + SHARED_ACCOUNT

### P2 — Unit Tests (DONE)
- 6 test suites, 383 tests, all passing
- Covers: validation, error handling, role mapping, capabilities, manifest validators, all plugins interface compliance

### P2 — Housekeeping & Cleanup (DONE, Feb 2026)
- Removed 22 obsolete root-level test files
- Removed 10 empty `api/` placeholder directories from plugins

### P2 — Catalog Auto-Discovery (DONE, Feb 2026)
- Added `domain` field to all plugin manifests for catalog grouping
- `syncPluginsToCatalog()` in db.js: upserts all plugin manifests into `catalog_platforms` DB on startup
- Handles legacy slug mismatches (updates existing by slug OR name match)
- Catalog now shows **21 platforms** (21 plugins, all synced from manifests)

### P2 — Consolidated Platform Mappings (DONE, Feb 2026)
- Created `/app/lib/platform-mappings.js` as single source of truth for name/key/slug mappings
- Removed duplicate `getPlatformKeyFromName()` from route.js and catalog page.js
- Removed hardcoded `KEY_TO_SLUG` mapping from route.js
- All DB slugs now normalized to match plugin keys (e.g., `ga4` not `google-analytics`)

### P2 — Legacy DB Cleanup (DONE, Feb 2026)
- Removed orphaned "Looker Studio" from catalog_platforms

## Architecture
- **21 plugins** in `/app/plugins/{key}/index.ts` + manifest.ts + schemas/
- Unified types in `/app/lib/plugins/types.ts`
- Plugin loader: `/app/lib/plugins/loader.js` (registers all 21)
- Platform mappings: `/app/lib/platform-mappings.js` (single source of truth)
- API routes in `/app/app/api/[[...path]]/route.js`
- Unit tests in `/app/tests/unit/*.test.ts`

## Remaining Backlog

### P1 — Full End-to-End Testing
- Systematically test each plugin with real API credentials

## Known Issues
- Google Ads `discoverTargets` requires `GOOGLE_ADS_DEVELOPER_TOKEN` (deferred)
- New plugins need real API credentials in `.env` to be fully functional
