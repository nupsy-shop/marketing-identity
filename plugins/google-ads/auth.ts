/**
 * Google Ads Plugin - Authentication
 * OAuth logic for Google Ads API using per-platform credentials
 */

import type { AuthParams, AuthResult } from '../common/types';
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, generateState, type OAuthConfig } from '../common/utils/auth';

// ─── Google Ads OAuth Configuration ───────────────────────────────────────────

const GOOGLE_ADS_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/adwords',
  ],
};

// Environment variable names for Google Ads OAuth
const ENV_VARS = {
  clientId: 'GOOGLE_ADS_CLIENT_ID',
  clientSecret: 'GOOGLE_ADS_CLIENT_SECRET',
  developerToken: 'GOOGLE_ADS_DEVELOPER_TOKEN',
};

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith('PLACEHOLDER_') || value === '';
}

/**
 * Check if Google Ads OAuth is configured
 */
export function isGoogleAdsOAuthConfigured(): boolean {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];
  return !isPlaceholder(clientId) && !isPlaceholder(clientSecret);
}

/**
 * Check if developer token is configured (required for most API operations)
 */
export function isDeveloperTokenConfigured(): boolean {
  const token = process.env[ENV_VARS.developerToken];
  return !isPlaceholder(token);
}

/**
 * Get OAuth configuration with Google Ads-specific credentials
 * Fails fast with clear error message if not configured
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new GoogleAdsOAuthNotConfiguredError();
  }

  return {
    ...GOOGLE_ADS_OAUTH_CONFIG,
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
  };
}

/**
 * Custom error for Google Ads OAuth not configured
 */
export class GoogleAdsOAuthNotConfiguredError extends Error {
  public platformKey = 'google-ads';
  public developerPortalUrl = 'https://console.cloud.google.com/apis/credentials';
  public requiredEnvVars = [ENV_VARS.clientId, ENV_VARS.clientSecret];

  constructor() {
    super(`Google Ads OAuth is not configured. Set ${ENV_VARS.clientId} and ${ENV_VARS.clientSecret} environment variables with real credentials.`);
    this.name = 'GoogleAdsOAuthNotConfiguredError';
  }

  toJSON() {
    return {
      platformKey: this.platformKey,
      message: this.message,
      developerPortalUrl: this.developerPortalUrl,
      requiredEnvVars: this.requiredEnvVars,
    };
  }
}

/**
 * Authorize using OAuth (redirect-based)
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (!params.redirectUri) {
    return { success: false, error: 'redirectUri is required for Google Ads OAuth' };
  }

  try {
    const config = getOAuthConfig(params.redirectUri);
    const state = generateState();
    const authUrl = buildAuthorizationUrl(config, state);

    return {
      success: true,
      accessToken: authUrl,
      tokenType: 'redirect',
    };
  } catch (error) {
    if (error instanceof GoogleAdsOAuthNotConfiguredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: `Google Ads OAuth error: ${(error as Error).message}` };
  }
}

/**
 * Refresh an access token
 */
export async function refreshToken(currentToken: string, redirectUri?: string): Promise<AuthResult> {
  if (!redirectUri) {
    return { success: false, error: 'redirectUri required for token refresh' };
  }

  try {
    const config = getOAuthConfig(redirectUri);
    return refreshAccessToken(config, currentToken);
  } catch (error) {
    if (error instanceof GoogleAdsOAuthNotConfiguredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: `Token refresh error: ${(error as Error).message}` };
  }
}
