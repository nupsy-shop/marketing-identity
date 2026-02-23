/**
 * HubSpot OAuth Authentication
 * HubSpot uses OAuth 2.0 with Authorization Code flow
 */

import type { AuthParams, AuthResult } from '../common/types';
import { generateState } from '../common/utils/auth';

// HubSpot OAuth Configuration
const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize';
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token';

// Default scopes for marketing/CRM access
const DEFAULT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.companies.read',
  'crm.objects.deals.read',
  'content',
  'forms',
  'automation',
];

/**
 * Get OAuth configuration
 */
export function getOAuthConfig(redirectUri: string) {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('HubSpot OAuth credentials not configured. Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET.');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Build HubSpot authorization URL
 */
export function buildHubSpotAuthUrl(redirectUri: string, scopes: string[] = DEFAULT_SCOPES): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
  });

  return {
    authUrl: `${HUBSPOT_AUTH_URL}?${params.toString()}`,
    state,
  };
}

/**
 * Start HubSpot OAuth flow
 */
export function startHubSpotOAuth(redirectUri: string, scopes?: string[]): { authUrl: string; state: string } {
  return buildHubSpotAuthUrl(redirectUri, scopes);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeHubSpotCode(code: string, redirectUri: string): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);

  try {
    const response = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token exchange failed: ${error}` };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: 'Bearer',
    };
  } catch (error) {
    return { success: false, error: `Token exchange error: ${(error as Error).message}` };
  }
}

/**
 * Refresh HubSpot access token
 */
export async function refreshHubSpotToken(refreshToken: string, redirectUri: string): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);

  try {
    const response = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token refresh failed: ${error}` };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      tokenType: 'Bearer',
    };
  } catch (error) {
    return { success: false, error: `Token refresh error: ${(error as Error).message}` };
  }
}

/**
 * Handle HubSpot OAuth callback
 */
export async function handleHubSpotOAuthCallback(code: string, redirectUri: string): Promise<AuthResult> {
  return exchangeHubSpotCode(code, redirectUri);
}

/**
 * Authorize with HubSpot
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    return handleHubSpotOAuthCallback(params.code, params.redirectUri);
  }

  if (params.apiKey) {
    // HubSpot also supports private app tokens
    return {
      success: true,
      accessToken: params.apiKey,
      tokenType: 'Bearer',
    };
  }

  return {
    success: false,
    error: 'No valid authentication method provided.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(currentToken: string, redirectUri: string): Promise<AuthResult> {
  return refreshHubSpotToken(currentToken, redirectUri);
}

/**
 * Get HubSpot portal info
 */
export async function getPortalInfo(accessToken: string): Promise<{ portalId: number; name: string }> {
  const response = await fetch('https://api.hubapi.com/integrations/v1/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get HubSpot portal info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    portalId: data.portalId,
    name: data.hubDomain || `Portal ${data.portalId}`,
  };
}
