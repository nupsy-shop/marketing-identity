/**
 * Centralized OAuth Configuration Module
 * 
 * This module provides a single source of truth for OAuth provider configurations.
 * It handles:
 * - Provider configuration mapping
 * - Credential validation (fail fast on placeholder/missing values)
 * - OAuth URL generation
 * - Token exchange and refresh
 */

import type { AuthResult } from './types';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OAuthProviderConfig {
  /** Display name for error messages */
  displayName: string;
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
  /** Default scopes */
  defaultScopes: string[];
  /** Developer portal URL for getting credentials */
  developerPortalUrl: string;
  /** Whether this provider is currently enabled */
  enabled?: boolean;
}

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthStartResult {
  authUrl: string;
  state: string;
}

export interface OAuthConfigError {
  provider: string;
  message: string;
  developerPortalUrl: string;
}

// ─── Provider Configuration Map ────────────────────────────────────────────────

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  // Google (shared across GA4, Google Ads, GTM, Search Console, DV360)
  google: {
    displayName: 'Google',
    envVars: {
      clientId: 'GOOGLE_CLIENT_ID',
      clientSecret: 'GOOGLE_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
      token: 'https://oauth2.googleapis.com/token',
    },
    defaultScopes: [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics.manage.users',
    ],
    developerPortalUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  linkedin: {
    displayName: 'LinkedIn',
    envVars: {
      clientId: 'LINKEDIN_CLIENT_ID',
      clientSecret: 'LINKEDIN_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.linkedin.com/oauth/v2/authorization',
      token: 'https://www.linkedin.com/oauth/v2/accessToken',
    },
    defaultScopes: [
      'r_liteprofile',
      'r_emailaddress',
      'r_ads',
      'r_ads_reporting',
      'rw_ads',
    ],
    developerPortalUrl: 'https://www.linkedin.com/developers/',
  },

  hubspot: {
    displayName: 'HubSpot',
    envVars: {
      clientId: 'HUBSPOT_CLIENT_ID',
      clientSecret: 'HUBSPOT_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://app.hubspot.com/oauth/authorize',
      token: 'https://api.hubapi.com/oauth/v1/token',
    },
    defaultScopes: [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'content',
      'forms',
      'automation',
    ],
    developerPortalUrl: 'https://developers.hubspot.com/',
  },

  salesforce: {
    displayName: 'Salesforce',
    envVars: {
      clientId: 'SALESFORCE_CLIENT_ID',
      clientSecret: 'SALESFORCE_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://login.salesforce.com/services/oauth2/authorize',
      token: 'https://login.salesforce.com/services/oauth2/token',
    },
    defaultScopes: ['api', 'refresh_token', 'full'],
    developerPortalUrl: 'https://developer.salesforce.com/',
  },

  snowflake: {
    displayName: 'Snowflake',
    envVars: {
      clientId: 'SNOWFLAKE_CLIENT_ID',
      clientSecret: 'SNOWFLAKE_CLIENT_SECRET',
    },
    endpoints: {
      // Snowflake endpoints are account-specific
      authorization: '', // Will be constructed with account identifier
      token: '',
    },
    defaultScopes: ['session:role:PUBLIC'],
    developerPortalUrl: 'https://docs.snowflake.com/en/user-guide/oauth-intro',
  },

  meta: {
    displayName: 'Meta/Facebook',
    envVars: {
      clientId: 'META_CLIENT_ID',
      clientSecret: 'META_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.facebook.com/v18.0/dialog/oauth',
      token: 'https://graph.facebook.com/v18.0/oauth/access_token',
    },
    defaultScopes: ['ads_management', 'ads_read', 'business_management'],
    developerPortalUrl: 'https://developers.facebook.com/',
  },

  tiktok: {
    displayName: 'TikTok',
    envVars: {
      clientId: 'TIKTOK_CLIENT_ID',
      clientSecret: 'TIKTOK_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://business-api.tiktok.com/open_api/oauth/authorize/',
      token: 'https://business-api.tiktok.com/open_api/oauth/token/',
    },
    defaultScopes: ['ads.management', 'ads.read'],
    developerPortalUrl: 'https://developers.tiktok.com/',
  },

  snapchat: {
    displayName: 'Snapchat',
    envVars: {
      clientId: 'SNAPCHAT_CLIENT_ID',
      clientSecret: 'SNAPCHAT_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://accounts.snapchat.com/accounts/oauth2/auth',
      token: 'https://accounts.snapchat.com/accounts/oauth2/token',
    },
    defaultScopes: ['snapchat-marketing-api'],
    developerPortalUrl: 'https://developers.snapchat.com/',
  },

  pinterest: {
    displayName: 'Pinterest',
    envVars: {
      clientId: 'PINTEREST_CLIENT_ID',
      clientSecret: 'PINTEREST_CLIENT_SECRET',
    },
    endpoints: {
      authorization: 'https://www.pinterest.com/oauth/',
      token: 'https://api.pinterest.com/v5/oauth/token',
    },
    defaultScopes: ['ads:read', 'ads:write'],
    developerPortalUrl: 'https://developers.pinterest.com/',
  },
};

// ─── Platform to Provider Mapping ──────────────────────────────────────────────

export const PLATFORM_TO_PROVIDER: Record<string, string> = {
  // Google platforms
  'ga4': 'google',
  'ga-ua': 'google',
  'google-ads': 'google',
  'gtm': 'google',
  'google-search-console': 'google',
  'dv360': 'google',
  
  // Individual platforms
  'linkedin': 'linkedin',
  'hubspot': 'hubspot',
  'salesforce': 'salesforce',
  'snowflake': 'snowflake',
  'meta': 'meta',
  'tiktok': 'tiktok',
  'snapchat': 'snapchat',
  'pinterest': 'pinterest',
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
 * Get the OAuth provider for a platform
 */
export function getProviderForPlatform(platformKey: string): string | null {
  return PLATFORM_TO_PROVIDER[platformKey] || null;
}

/**
 * Get provider configuration
 */
export function getProviderConfig(providerKey: string): OAuthProviderConfig | null {
  return OAUTH_PROVIDERS[providerKey] || null;
}

/**
 * Check if a provider is configured (has real credentials)
 */
export function isProviderConfigured(providerKey: string): boolean {
  const config = OAUTH_PROVIDERS[providerKey];
  if (!config) return false;

  const clientId = process.env[config.envVars.clientId];
  const clientSecret = process.env[config.envVars.clientSecret];

  return !isPlaceholder(clientId) && !isPlaceholder(clientSecret);
}

/**
 * Get credentials for a provider (fail fast if not configured)
 */
export function getProviderCredentials(providerKey: string): OAuthCredentials {
  const config = OAUTH_PROVIDERS[providerKey];
  
  if (!config) {
    throw new OAuthNotConfiguredError(
      providerKey,
      `Unknown OAuth provider: ${providerKey}`,
      ''
    );
  }

  const clientId = process.env[config.envVars.clientId];
  const clientSecret = process.env[config.envVars.clientSecret];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new OAuthNotConfiguredError(
      providerKey,
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
 * Get credentials for a platform (maps to provider first)
 */
export function getCredentialsForPlatform(platformKey: string): OAuthCredentials {
  const providerKey = getProviderForPlatform(platformKey);
  
  if (!providerKey) {
    throw new OAuthNotConfiguredError(
      platformKey,
      `Platform ${platformKey} does not support OAuth`,
      ''
    );
  }

  return getProviderCredentials(providerKey);
}

/**
 * Generate a cryptographically secure state parameter
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  providerKey: string,
  redirectUri: string,
  scopes?: string[],
  extraParams?: Record<string, string>
): OAuthStartResult {
  const config = OAUTH_PROVIDERS[providerKey];
  if (!config) {
    throw new OAuthNotConfiguredError(providerKey, `Unknown provider: ${providerKey}`, '');
  }

  const credentials = getProviderCredentials(providerKey);
  const state = generateState();

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: (scopes || config.defaultScopes).join(' '),
    state,
    ...extraParams,
  });

  // Provider-specific adjustments
  if (providerKey === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return {
    authUrl: `${config.endpoints.authorization}?${params.toString()}`,
    state,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  providerKey: string,
  code: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = OAUTH_PROVIDERS[providerKey];
  if (!config) {
    return { success: false, error: `Unknown provider: ${providerKey}` };
  }

  const credentials = getProviderCredentials(providerKey);

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
        redirect_uri: redirectUri,
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
 * Refresh an access token
 */
export async function refreshAccessToken(
  providerKey: string,
  refreshToken: string
): Promise<AuthResult> {
  const config = OAUTH_PROVIDERS[providerKey];
  if (!config) {
    return { success: false, error: `Unknown provider: ${providerKey}` };
  }

  const credentials = getProviderCredentials(providerKey);

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
 * Get list of configured providers
 */
export function getConfiguredProviders(): string[] {
  return Object.keys(OAUTH_PROVIDERS).filter(isProviderConfigured);
}

/**
 * Get configuration status for all providers
 */
export function getProvidersStatus(): Record<string, { configured: boolean; displayName: string; developerPortalUrl: string }> {
  const status: Record<string, { configured: boolean; displayName: string; developerPortalUrl: string }> = {};
  
  for (const [key, config] of Object.entries(OAUTH_PROVIDERS)) {
    status[key] = {
      configured: isProviderConfigured(key),
      displayName: config.displayName,
      developerPortalUrl: config.developerPortalUrl,
    };
  }
  
  return status;
}

// ─── Custom Error Class ────────────────────────────────────────────────────────

export class OAuthNotConfiguredError extends Error {
  public provider: string;
  public developerPortalUrl: string;

  constructor(provider: string, message: string, developerPortalUrl: string) {
    super(message);
    this.name = 'OAuthNotConfiguredError';
    this.provider = provider;
    this.developerPortalUrl = developerPortalUrl;
  }

  toJSON(): OAuthConfigError {
    return {
      provider: this.provider,
      message: this.message,
      developerPortalUrl: this.developerPortalUrl,
    };
  }
}
