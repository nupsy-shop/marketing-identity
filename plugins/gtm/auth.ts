/**
 * Google Tag Manager Plugin - Authentication
 * OAuth logic for GTM API using per-platform credentials
 */

import type { AuthParams, AuthResult } from '../common/types';
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, generateState, type OAuthConfig } from '../common/utils/auth';

// ─── GTM-Specific OAuth Configuration ─────────────────────────────────────────

const GTM_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/tagmanager.readonly',
    'https://www.googleapis.com/auth/tagmanager.manage.users',
  ],
};

// Environment variable names for GTM OAuth
const ENV_VARS = {
  clientId: 'GOOGLE_GTM_CLIENT_ID',
  clientSecret: 'GOOGLE_GTM_CLIENT_SECRET',
};

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith('PLACEHOLDER_') || value === '';
}

/**
 * Check if GTM OAuth is configured
 */
export function isGTMOAuthConfigured(): boolean {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];
  return !isPlaceholder(clientId) && !isPlaceholder(clientSecret);
}

/**
 * Get OAuth configuration with GTM-specific credentials
 * Fails fast with clear error message if not configured
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new GTMOAuthNotConfiguredError();
  }

  return {
    ...GTM_OAUTH_CONFIG,
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
  };
}

/**
 * Custom error for GTM OAuth not configured
 */
export class GTMOAuthNotConfiguredError extends Error {
  public platformKey = 'gtm';
  public developerPortalUrl = 'https://console.cloud.google.com/apis/credentials';
  public requiredEnvVars = [ENV_VARS.clientId, ENV_VARS.clientSecret];

  constructor() {
    super(`Google Tag Manager OAuth is not configured. Set ${ENV_VARS.clientId} and ${ENV_VARS.clientSecret} environment variables with real credentials.`);
    this.name = 'GTMOAuthNotConfiguredError';
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
    return { success: false, error: 'redirectUri is required for GTM OAuth' };
  }

  try {
    const config = getOAuthConfig(params.redirectUri);
    const state = generateState();
    const authUrl = buildAuthorizationUrl(config, state);

    return {
      success: true,
      accessToken: authUrl,  // URL for redirect
      tokenType: 'redirect',
    };
  } catch (error) {
    if (error instanceof GTMOAuthNotConfiguredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: `GTM OAuth error: ${(error as Error).message}` };
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
    if (error instanceof GTMOAuthNotConfiguredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: `Token refresh error: ${(error as Error).message}` };
  }
}
