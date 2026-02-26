# Access Provisioning Platform — PRD

## Problem Statement
Build a robust, scalable platform for managing client access to marketing services across 19 ad/analytics platforms. Three architectural pillars:
1. **Client-Centric Governance**: Admin UI pivots from account-centric to client-centric views.
2. **Declarative, Manifest-Driven Architecture**: All plugin capabilities declared in `PluginManifest`, driving runtime validation and UI.
3. **Unified Plugin Interface**: Standardized `AccessProvisioningPlugin` interface with `grantAccess`, `verifyAccess`, `revokeAccess` across all plugins.

## What's Been Implemented

### P0 — Unified Interface for 4 Google Plugins (DONE)
- GA4, GTM, Google Ads, GSC: Full implementations with live Google APIs

### P1 — Meta Plugin (DONE)
- Full Graph API v21.0 integration: OAuth, discoverTargets, grantAccess (PARTNER_DELEGATION + NAMED_INVITE), verifyAccess, revokeAccess (NAMED_INVITE)

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

### P2 — Unit Tests (DONE)
- 6 test suites, 383 tests, all passing
- Covers: validation, error handling, role mapping, capabilities, manifest validators, all 19 plugins interface compliance

## Architecture
- **19 plugins** in `/app/plugins/{key}/index.ts` + manifest.ts + api/ + schemas/
- Unified types in `/app/lib/plugins/types.ts`
- Plugin loader: `/app/lib/plugins/loader.js` (registers all 19)
- API routes in `/app/app/api/[[...path]]/route.js`
- Unit tests in `/app/tests/unit/*.test.ts`

## Remaining Backlog

### P2 — Housekeeping & Cleanup
- Remove root-level `.py` test files
- Consistent file naming across plugin folders

## Known Issues
- Google Ads `discoverTargets` requires `GOOGLE_ADS_DEVELOPER_TOKEN` (deferred)
- New plugins (Amazon, Reddit, Microsoft, Spotify) need real API credentials in `.env` to be fully functional
