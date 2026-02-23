/**
 * LinkedIn OAuth Authentication
 * LinkedIn uses OAuth 2.0 with Authorization Code flow
 */

import type { AuthParams, AuthResult } from '../common/types';
import { buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, generateState, type OAuthConfig } from '../common/utils/auth';

// LinkedIn OAuth Configuration
const LINKEDIN_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  scopes: [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social',
    'r_ads',
    'r_ads_reporting',
    'rw_ads',
  ],
};

/**
 * Get OAuth configuration with environment credentials
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn OAuth credentials not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables.');
  }

  return {
    ...LINKEDIN_OAUTH_CONFIG,
    clientId,
    clientSecret,
    redirectUri,
  };
}

/**
 * Start LinkedIn OAuth flow
 */
export function startLinkedInOAuth(redirectUri: string): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri);
  const authUrl = buildAuthorizationUrl(config, state);

  return { authUrl, state };
}

/**
 * Handle LinkedIn OAuth callback
 */
export async function handleLinkedInOAuthCallback(
  code: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return exchangeCodeForTokens(config, code);
}

/**
 * Refresh LinkedIn access token
 * Note: LinkedIn refresh tokens are long-lived but do expire
 */
export async function refreshLinkedInToken(
  refreshToken: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return refreshAccessToken(config, refreshToken);
}

/**
 * Authorize with LinkedIn
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    return handleLinkedInOAuthCallback(params.code, params.redirectUri);
  }

  if (params.apiKey) {
    // API key auth not supported for LinkedIn
    return {
      success: false,
      error: 'LinkedIn requires OAuth authentication',
    };
  }

  return {
    success: false,
    error: 'No valid authentication method provided. Use OAuth flow.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(
  currentToken: string,
  redirectUri: string
): Promise<AuthResult> {
  return refreshLinkedInToken(currentToken, redirectUri);
}

/**
 * Get user profile from LinkedIn
 */
export async function getUserProfile(accessToken: string): Promise<{ id: string; name: string; email?: string }> {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get LinkedIn profile: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: `${data.localizedFirstName} ${data.localizedLastName}`,
  };
}

/**
 * Get ad accounts from LinkedIn
 */
export async function getAdAccounts(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch('https://api.linkedin.com/v2/adAccountsV2?q=search', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get LinkedIn ad accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.elements || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
  }));
}
