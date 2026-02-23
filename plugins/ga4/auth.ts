/**
 * Google Analytics 4 Plugin - Authentication
 * Google OAuth logic for GA4 Admin API and Data API
 */

import type { AuthParams, AuthResult } from '../common/types';
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, generateState, type OAuthConfig } from '../common/utils/auth';

// ─── Google OAuth Configuration ─────────────────────────────────────────────

const GOOGLE_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.manage.users',
  ],
};

/**
 * Get OAuth configuration with environment credentials
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
  }

  return {
    ...GOOGLE_OAUTH_CONFIG,
    clientId,
    clientSecret,
    redirectUri,
  };
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
