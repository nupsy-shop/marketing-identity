/**
 * Google Search Console Plugin - Management API
 * 
 * Handles Search Console API calls for site/property management and verification.
 * 
 * Note: The Search Console API does NOT support adding users programmatically.
 * User management must be done manually via the web interface.
 * 
 * API Capabilities:
 * - List sites (properties) the authenticated user has access to
 * - Get site information
 * - Verify site ownership (via Site Verification API)
 */

import type { AuthResult } from '../../common/types';
import { HttpClient } from '../../common/utils/httpClient';
import type { GSCRole } from '../types';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';
const SITE_VERIFICATION_API = 'https://www.googleapis.com/siteVerification/v1';

/**
 * Create an authenticated HTTP client for GSC API
 */
function createClient(auth: AuthResult, baseUrl: string = GSC_API_BASE): HttpClient {
  return new HttpClient({
    baseUrl,
    defaultHeaders: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GSCSite {
  siteUrl: string;
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser' | 'siteUnverifiedUser';
}

export interface GSCSiteListResponse {
  siteEntry?: GSCSite[];
}

export interface GSCSearchAnalyticsQuery {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
}

// ─── Site Operations ───────────────────────────────────────────────────────────

/**
 * List all Search Console sites/properties the authenticated user has access to
 */
export async function listSites(auth: AuthResult): Promise<GSCSite[]> {
  const client = createClient(auth);
  const response = await client.get<GSCSiteListResponse>('/sites');
  return response.siteEntry || [];
}

/**
 * Get information about a specific site
 */
export async function getSite(auth: AuthResult, siteUrl: string): Promise<GSCSite | null> {
  const client = createClient(auth);
  const encodedUrl = encodeURIComponent(siteUrl);
  
  try {
    const site = await client.get<GSCSite>(`/sites/${encodedUrl}`);
    return site;
  } catch (error) {
    // Site not found or no access
    return null;
  }
}

/**
 * Check if the authenticated user has access to a specific site
 */
export async function checkSiteAccess(
  auth: AuthResult, 
  siteUrl: string
): Promise<{ hasAccess: boolean; permissionLevel?: string }> {
  const site = await getSite(auth, siteUrl);
  
  if (!site) {
    return { hasAccess: false };
  }
  
  return {
    hasAccess: true,
    permissionLevel: site.permissionLevel
  };
}

/**
 * Check if a user has the required permission level on a site
 * 
 * Permission hierarchy: siteOwner > siteFullUser > siteRestrictedUser > siteUnverifiedUser
 */
export function hasPermissionOrHigher(
  currentPermission: string | undefined, 
  requiredPermission: string
): boolean {
  if (!currentPermission) return false;
  
  const hierarchy = ['siteUnverifiedUser', 'siteRestrictedUser', 'siteFullUser', 'siteOwner'];
  
  const currentIndex = hierarchy.indexOf(currentPermission);
  const requiredIndex = hierarchy.indexOf(requiredPermission);
  
  // If permission not in hierarchy, check exact match
  if (currentIndex === -1 || requiredIndex === -1) {
    return currentPermission === requiredPermission;
  }
  
  return currentIndex >= requiredIndex;
}

/**
 * Map role key to GSC permission level
 */
export function mapRoleToPermission(role: string): string {
  const mapping: Record<string, string> = {
    'owner': 'siteOwner',
    'full': 'siteFullUser',
    'restricted': 'siteRestrictedUser',
    'siteowner': 'siteOwner',
    'sitefulluser': 'siteFullUser',
    'siterestricteduser': 'siteRestrictedUser',
  };
  
  return mapping[role.toLowerCase()] || role;
}

// ─── User Verification ─────────────────────────────────────────────────────────

/**
 * Verify if a specific user email has access to a site
 * 
 * NOTE: The Search Console API does not provide a way to list users of a property
 * or to check access for a specific email address directly.
 * 
 * This function works by:
 * 1. If the OAuth token belongs to the user we're checking, we can verify directly
 * 2. Otherwise, we cannot verify programmatically (API limitation)
 * 
 * For true user verification, the client must connect their own account via OAuth.
 */
export async function verifyUserAccess(
  auth: AuthResult,
  siteUrl: string,
  userEmail: string,
  requiredRole: string
): Promise<{
  verified: boolean;
  permissionLevel?: string;
  message?: string;
}> {
  // Check if the authenticated user has access to the site
  const siteAccess = await checkSiteAccess(auth, siteUrl);
  
  if (!siteAccess.hasAccess) {
    return {
      verified: false,
      message: `No access to site ${siteUrl} with the provided credentials`
    };
  }
  
  // The token owner has access - check permission level
  const requiredPermission = mapRoleToPermission(requiredRole);
  const hasRequired = hasPermissionOrHigher(siteAccess.permissionLevel, requiredPermission);
  
  return {
    verified: hasRequired,
    permissionLevel: siteAccess.permissionLevel,
    message: hasRequired 
      ? `User has ${siteAccess.permissionLevel} access (meets ${requiredRole} requirement)`
      : `User has ${siteAccess.permissionLevel} access but ${requiredRole} is required`
  };
}

// ─── Site Discovery ────────────────────────────────────────────────────────────

/**
 * Discover all sites/properties accessible to the authenticated user
 * Returns formatted targets for the plugin system
 */
export async function discoverSites(auth: AuthResult): Promise<{
  targetType: string;
  externalId: string;
  displayName: string;
  metadata: Record<string, unknown>;
}[]> {
  const sites = await listSites(auth);
  
  return sites.map(site => ({
    targetType: 'SITE',
    externalId: site.siteUrl,
    displayName: formatSiteUrl(site.siteUrl),
    metadata: {
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
      isVerified: site.permissionLevel === 'siteOwner'
    }
  }));
}

/**
 * Format site URL for display
 * Converts "sc-domain:example.com" to "example.com (Domain)" 
 * and "https://example.com/" to "example.com"
 */
function formatSiteUrl(siteUrl: string): string {
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.replace('sc-domain:', '');
    return `${domain} (Domain Property)`;
  }
  
  try {
    const url = new URL(siteUrl);
    return `${url.hostname}${url.pathname !== '/' ? url.pathname : ''} (URL Prefix)`;
  } catch {
    return siteUrl;
  }
}
