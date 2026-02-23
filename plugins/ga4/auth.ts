/**
 * Google Analytics 4 Plugin - Authentication
 * Google OAuth logic for GA4 Admin API and Data API
 * 
 * Uses per-platform OAuth credentials (Option B: Multiple OAuth Clients)
 */

import type { AuthParams, AuthResult } from '../common/types';
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, generateState, type OAuthConfig } from '../common/utils/auth';

// ─── GA4-Specific OAuth Configuration ─────────────────────────────────────────

const GA4_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.manage.users',
  ],
};

// Environment variable names for GA4 OAuth
const ENV_VARS = {
  clientId: 'GOOGLE_GA4_CLIENT_ID',
  clientSecret: 'GOOGLE_GA4_CLIENT_SECRET',
};

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return value.startsWith('PLACEHOLDER_') || value === '';
}

/**
 * Check if GA4 OAuth is configured
 */
export function isGA4OAuthConfigured(): boolean {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];
  return !isPlaceholder(clientId) && !isPlaceholder(clientSecret);
}

/**
 * Get OAuth configuration with GA4-specific credentials
 * Fails fast with clear error message if not configured
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const clientId = process.env[ENV_VARS.clientId];
  const clientSecret = process.env[ENV_VARS.clientSecret];

  if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    throw new GA4OAuthNotConfiguredError();
  }

  return {
    ...GA4_OAUTH_CONFIG,
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
  };
}

/**
 * Custom error for GA4 OAuth not configured
 */
export class GA4OAuthNotConfiguredError extends Error {
  public platformKey = 'ga4';
  public developerPortalUrl = 'https://console.cloud.google.com/apis/credentials';
  public requiredEnvVars = [ENV_VARS.clientId, ENV_VARS.clientSecret];

  constructor() {
    super(`Google Analytics 4 OAuth is not configured. Set ${ENV_VARS.clientId} and ${ENV_VARS.clientSecret} environment variables with real credentials.`);
    this.name = 'GA4OAuthNotConfiguredError';
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
 * Start Google OAuth flow
 */
export function startGoogleOAuth(redirectUri: string): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri);
  const authUrl = buildAuthorizationUrl(config, state);

  return { authUrl, state };
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleOAuthCallback(
  code: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return exchangeCodeForTokens(config, code);
}

/**
 * Refresh Google access token
 */
export async function refreshGoogleToken(
  refreshToken: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return refreshAccessToken(config, refreshToken);
}

/**
 * Authorize with Google using various methods
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  // If we have an authorization code, exchange it for tokens
  if (params.code && params.redirectUri) {
    return handleGoogleOAuthCallback(params.code, params.redirectUri);
  }

  // If we have an API key (service account), validate it
  if (params.apiKey) {
    // TODO: Implement service account authentication
    return {
      success: true,
      accessToken: params.apiKey,
      tokenType: 'ServiceAccount',
    };
  }

  return {
    success: false,
    error: 'No valid authentication method provided. Supply OAuth code or API key.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(
  currentToken: string,
  redirectUri: string = ''
): Promise<AuthResult> {
  // For service accounts, tokens don't need refresh
  if (!redirectUri) {
    return {
      success: true,
      accessToken: currentToken,
      tokenType: 'ServiceAccount',
    };
  }

  return refreshGoogleToken(currentToken, redirectUri);
}
