/**
 * Multi-Platform OAuth Provider Configuration
 * 
 * Implements Option B: One Google project, multiple OAuth clients
 * Each Google platform (GA4, GTM, GSC, Ads, DV360) has its own OAuth client credentials.
 */

import type { AuthResult } from '../plugins/common/types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OAuthPlatformConfig {
  /** Display name for error messages */
  displayName: string;
  /** Provider key (google, linkedin, etc) */
  provider: string;
  /** Environment variable names */
  envVars: {
    clientId: string;
    clientSecret: string;
  };
  /** OAuth endpoints */
  endpoints: {
    authorization: string;
    token: string;
  };
  /** Default scopes for this platform */
  scopes: string[];
  /** Callback path segment */
  callbackPath: string;
  /** Developer portal URL for getting credentials */
  developerPortalUrl: string;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthStartParams {
  platformKey: string;
  redirectUri?: string;
  scope?: 'AGENCY' | 'CLIENT';
  tenantId?: string;
  tenantType?: string;
  state?: Record<string, string>;
}

export interface OAuthStartResult {
  authUrl: string;
  state: string;
  platformKey: string;
}

// ─── Per-Platform Configuration ────────────────────────────────────────────────

export const PLATFORM_OAUTH_CONFIG: Record<string, OAuthPlatformConfig> = {
  // ─── Google Platforms (each with own OAuth client) ─────────────────────────
  'ga4': {
    displayName: 'Google Analytics 4',
    provider: 'google',
    envVars: {
      clientId: 'GOOGLE_GA4_CLIENT_ID',
      clientSecret: 'GOOGLE_GA4_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    scopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users',
    ],
    callbackPath: '/api/oauth/google/callback/ga4',
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  'gtm': {
    displayName: 'Google Tag Manager',
    provider: 'google',
    envVars: {
      clientId: 'GOOGLE_GTM_CLIENT_ID',
      clientSecret: 'GOOGLE_GTM_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    scopes: [
      'https://www.googleapis.com/auth/tagmanager.readonly',
      'https://www.googleapis.com/auth/tagmanager.manage.users',
    ],
    callbackPath: '/api/oauth/google/callback/gtm',
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  'google-search-console': {
    displayName: 'Google Search Console',
    provider: 'google',
    envVars: {
      clientId: 'GOOGLE_GSC_CLIENT_ID',
      clientSecret: 'GOOGLE_GSC_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
    callbackPath: '/api/oauth/google/callback/google-search-console',
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  'google-ads': {
    displayName: 'Google Ads',
    provider: 'google',
    envVars: {
      clientId: 'GOOGLE_ADS_CLIENT_ID',
      clientSecret: 'GOOGLE_ADS_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    scopes: [
      'https://www.googleapis.com/auth/adwords',
    ],
    callbackPath: '/api/oauth/google/callback/google-ads',
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  'dv360': {
    displayName: 'Display & Video 360',
    provider: 'google',
    envVars: {
      clientId: 'GOOGLE_DV360_CLIENT_ID',
      clientSecret: 'GOOGLE_DV360_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    scopes: [
      'https://www.googleapis.com/auth/display-video',
    ],
    callbackPath: '/api/oauth/google/callback/dv360',
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  // ─── Non-Google Platforms ──────────────────────────────────────────────────
  'linkedin': {
    displayName: 'LinkedIn',
    provider: 'linkedin',
    envVars: {
      clientId: 'LINKEDIN_CLIENT_ID',
      clientSecret: 'LINKEDIN_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.linkedin.com/oauth/v2/authorization',
      token: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    scopes: ['r_liteprofile', 'r_emailaddress', 'r_ads', 'r_ads_reporting'],
    callbackPath: '/api/oauth/linkedin/callback',
    developerPortalUrl: 'https://www.linkedin.com/developers/',
  },

  'meta': {
    displayName: 'Meta/Facebook',
    provider: 'meta',
    envVars: {
      clientId: 'META_CLIENT_ID',
      clientSecret: 'META_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.facebook.com/v18.0/dialog/oauth',
      token: 'https://graph.facebook.com/v18.0/oauth/access_token',
    },
    scopes: ['ads_management', 'ads_read', 'business_management'],
    callbackPath: '/api/oauth/meta/callback',
    developerPortalUrl: 'https://developers.facebook.com/',
  },

  'hubspot': {
    displayName: 'HubSpot',
    provider: 'hubspot',
    envVars: {
      clientId: 'HUBSPOT_CLIENT_ID',
      clientSecret: 'HUBSPOT_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://app.hubspot.com/oauth/authorize',
      token: 'https://api.hubapi.com/oauth/v1/token',
    },
    scopes: ['crm.objects.contacts.read', 'content'],
    callbackPath: '/api/oauth/hubspot/callback',
    developerPortalUrl: 'https://developers.hubspot.com/',
  },

  'salesforce': {
    displayName: 'Salesforce',
    provider: 'salesforce',
    envVars: {
      clientId: 'SALESFORCE_CLIENT_ID',
      clientSecret: 'SALESFORCE_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://login.salesforce.com/services/oauth2/authorize',
      token: 'https://login.salesforce.com/services/oauth2/token',
    },
    scopes: ['api', 'refresh_token'],
    callbackPath: '/api/oauth/salesforce/callback',
    developerPortalUrl: 'https://developer.salesforce.com/',
  },

  'tiktok': {
    displayName: 'TikTok',
    provider: 'tiktok',
    envVars: {
      clientId: 'TIKTOK_CLIENT_ID',
      clientSecret: 'TIKTOK_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://business-api.tiktok.com/open_api/oauth/authorize/',
      token: 'https://business-api.tiktok.com/open_api/oauth/token/',
    },
    scopes: ['ads.management', 'ads.read'],
    callbackPath: '/api/oauth/tiktok/callback',
    developerPortalUrl: 'https://developers.tiktok.com/',
  },

  'snapchat': {
    displayName: 'Snapchat',
    provider: 'snapchat',
    envVars: {
      clientId: 'SNAPCHAT_CLIENT_ID',
      clientSecret: 'SNAPCHAT_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.snapchat.com/accounts/oauth2/auth',
      token: 'https://accounts.snapchat.com/accounts/oauth2/token',
    },
    scopes: ['snapchat-marketing-api'],
    callbackPath: '/api/oauth/snapchat/callback',
    developerPortalUrl: 'https://developers.snapchat.com/',
  },

  'pinterest': {
    displayName: 'Pinterest',
    provider: 'pinterest',
    envVars: {
      clientId: 'PINTEREST_CLIENT_ID',
      clientSecret: 'PINTEREST_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.pinterest.com/oauth/',
      token: 'https://api.pinterest.com/v5/oauth/token',
    },
    scopes: ['ads:read', 'ads:write'],
    callbackPath: '/api/oauth/pinterest/callback',
    developerPortalUrl: 'https://developers.pinterest.com/',
  },
};

// ─── Core Functions ────────────────────────────────────────────────────────────

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith('PLACEHOLDER_') || value === '';
}

/**
 * Get platform configuration
 */
export function getPlatformConfig(platformKey: string): OAuthPlatformConfig | null {
  return PLATFORM_OAUTH_CONFIG[platformKey] || null;
}

/**
 * Check if a platform's OAuth is configured
 */
export function isPlatformOAuthConfigured(platformKey: string): boolean {
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  if (!config) return false;

  const clientId = process.env[config.envVars.clientId];
  const clientSecret = process.env[config.envVars.clientSecret];

  return !isPlaceholder(clientId) && !isPlaceholder(clientSecret);
}

/**
 * Get credentials for a platform (fail fast if not configured)
 */
export function getPlatformCredentials(platformKey: string): OAuthCredentials {
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  
  if (!config) {
    throw new PlatformOAuthError(
      platformKey,
      `Unknown OAuth platform: ${platformKey}`,
      ''
    );
  }

  const clientId = process.env[config.envVars.clientId];
  const clientSecret = process.env[config.envVars.clientSecret];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new PlatformOAuthError(
      platformKey,
      `${config.displayName} OAuth is not configured. Set ${config.envVars.clientId} and ${config.envVars.clientSecret} environment variables with real credentials.`,
      config.developerPortalUrl
    );
  }

  return {
    clientId: clientId!,
    clientSecret: clientSecret!,
  };
}

/**
 * Generate a cryptographically secure state parameter with embedded metadata
 */
export function generateOAuthState(metadata?: Record<string, string>): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  const randomPart = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  if (metadata) {
    // Encode metadata into state (base64url encoded JSON)
    const metadataStr = JSON.stringify(metadata);
    const encoded = Buffer.from(metadataStr).toString('base64url');
    return `${randomPart}.${encoded}`;
  }
  
  return randomPart;
}

/**
 * Parse state parameter to extract metadata
 */
export function parseOAuthState(state: string): { random: string; metadata?: Record<string, string> } {
  const parts = state.split('.');
  if (parts.length === 1) {
    return { random: parts[0] };
  }
  
  try {
    const metadataStr = Buffer.from(parts[1], 'base64url').toString();
    const metadata = JSON.parse(metadataStr);
    return { random: parts[0], metadata };
  } catch {
    return { random: parts[0] };
  }
}

/**
 * Get the redirect base URL (from env or construct from request)
 */
export function getOAuthRedirectBase(): string {
  return process.env.OAUTH_REDIRECT_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
}

/**
 * Build the full callback URL for a platform
 */
export function buildCallbackUrl(platformKey: string): string {
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  if (!config) {
    throw new Error(`Unknown platform: ${platformKey}`);
  }
  
  const base = getOAuthRedirectBase();
  return `${base}${config.callbackPath}`;
}

/**
 * Start OAuth flow - returns authorization URL
 */
export function startPlatformOAuth(params: OAuthStartParams): OAuthStartResult {
  const { platformKey, scope = 'AGENCY', tenantId, tenantType, state: extraState } = params;
  
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  if (!config) {
    throw new PlatformOAuthError(platformKey, `Unknown platform: ${platformKey}`, '');
  }

  const credentials = getPlatformCredentials(platformKey);
  const redirectUri = params.redirectUri || buildCallbackUrl(platformKey);

  // Build state with metadata
  const stateMetadata: Record<string, string> = {
    platformKey,
    scope,
    ...(tenantId && { tenantId }),
    ...(tenantType && { tenantType }),
    ...extraState,
  };
  const state = generateOAuthState(stateMetadata);

  const urlParams = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  // Provider-specific adjustments
  if (config.provider === 'google') {
    urlParams.set('access_type', 'offline');
    urlParams.set('prompt', 'consent');
  }

  return {
    authUrl: `${config.endpoints.authorization}?${urlParams.toString()}`,
    state,
    platformKey,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangePlatformCodeForTokens(
  platformKey: string,
  code: string,
  redirectUri?: string
): Promise<AuthResult> {
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  if (!config) {
    return { success: false, error: `Unknown platform: ${platformKey}` };
  }

  const credentials = getPlatformCredentials(platformKey);
  const callbackUri = redirectUri || buildCallbackUrl(platformKey);

  try {
    const response = await fetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: callbackUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Token exchange failed: ${errorText}` };
    }

    const data = await response.json();
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
      scopes: data.scope?.split(' '),
    };
  } catch (error) {
    return { success: false, error: `Token exchange error: ${(error as Error).message}` };
  }
}

/**
 * Refresh access token
 */
export async function refreshPlatformToken(
  platformKey: string,
  refreshToken: string
): Promise<AuthResult> {
  const config = PLATFORM_OAUTH_CONFIG[platformKey];
  if (!config) {
    return { success: false, error: `Unknown platform: ${platformKey}` };
  }

  const credentials = getPlatformCredentials(platformKey);

  try {
    const response = await fetch(config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Token refresh failed: ${errorText}` };
    }

    const data = await response.json();
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
    };
  } catch (error) {
    return { success: false, error: `Token refresh error: ${(error as Error).message}` };
  }
}

/**
 * Get configuration status for all platforms
 */
export function getPlatformsOAuthStatus(): Record<string, { configured: boolean; displayName: string; developerPortalUrl: string }> {
  const status: Record<string, { configured: boolean; displayName: string; developerPortalUrl: string }> = {};
  
  for (const [key, config] of Object.entries(PLATFORM_OAUTH_CONFIG)) {
    status[key] = {
      configured: isPlatformOAuthConfigured(key),
      displayName: config.displayName,
      developerPortalUrl: config.developerPortalUrl,
    };
  }
  
  return status;
}

// ─── Custom Error Class ────────────────────────────────────────────────────────

export class PlatformOAuthError extends Error {
  public platformKey: string;
  public developerPortalUrl: string;

  constructor(platformKey: string, message: string, developerPortalUrl: string) {
    super(message);
    this.name = 'PlatformOAuthError';
    this.platformKey = platformKey;
    this.developerPortalUrl = developerPortalUrl;
  }

  toJSON() {
    return {
      platformKey: this.platformKey,
      message: this.message,
      developerPortalUrl: this.developerPortalUrl,
    };
  }
}
