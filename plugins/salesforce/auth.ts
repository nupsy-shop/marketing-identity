/**
 * Salesforce OAuth Authentication
 * Salesforce uses OAuth 2.0 with Web Server flow (Authorization Code)
 */

import type { AuthParams, AuthResult } from '../common/types';
import { generateState } from '../common/utils/auth';

// Salesforce OAuth endpoints (production)
const SF_AUTH_URL = 'https://login.salesforce.com/services/oauth2/authorize';
const SF_TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';

// Sandbox endpoints
const SF_SANDBOX_AUTH_URL = 'https://test.salesforce.com/services/oauth2/authorize';
const SF_SANDBOX_TOKEN_URL = 'https://test.salesforce.com/services/oauth2/token';

// Default scopes
const DEFAULT_SCOPES = [
  'api',
  'refresh_token',
  'full',
];

export interface SalesforceOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  isSandbox?: boolean;
}

/**
 * Get OAuth configuration
 */
export function getOAuthConfig(redirectUri: string, isSandbox: boolean = false): SalesforceOAuthConfig {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Salesforce OAuth credentials not configured. Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET.');
  }

  return { clientId, clientSecret, redirectUri, isSandbox };
}

/**
 * Build Salesforce authorization URL
 */
export function buildSalesforceAuthUrl(
  redirectUri: string,
  options: { isSandbox?: boolean; scopes?: string[] } = {}
): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri, options.isSandbox);
  const authBaseUrl = options.isSandbox ? SF_SANDBOX_AUTH_URL : SF_AUTH_URL;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: (options.scopes || DEFAULT_SCOPES).join(' '),
    state,
    prompt: 'consent',
  });

  return {
    authUrl: `${authBaseUrl}?${params.toString()}`,
    state,
  };
}

/**
 * Start Salesforce OAuth flow
 */
export function startSalesforceOAuth(
  redirectUri: string,
  options?: { isSandbox?: boolean; scopes?: string[] }
): { authUrl: string; state: string } {
  return buildSalesforceAuthUrl(redirectUri, options);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeSalesforceCode(
  code: string,
  redirectUri: string,
  isSandbox: boolean = false
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri, isSandbox);
  const tokenUrl = isSandbox ? SF_SANDBOX_TOKEN_URL : SF_TOKEN_URL;

  try {
    const response = await fetch(tokenUrl, {
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

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.issued_at ? new Date(parseInt(data.issued_at) + 7200000).toISOString() : undefined, // ~2 hours
      tokenType: data.token_type || 'Bearer',
      scopes: data.scope?.split(' '),
    };
  } catch (error) {
    return { success: false, error: `Token exchange error: ${(error as Error).message}` };
  }
}

/**
 * Refresh Salesforce access token
 */
export async function refreshSalesforceToken(
  refreshToken: string,
  isSandbox: boolean = false
): Promise<AuthResult> {
  const config = getOAuthConfig('', isSandbox); // redirectUri not needed for refresh
  const tokenUrl = isSandbox ? SF_SANDBOX_TOKEN_URL : SF_TOKEN_URL;

  try {
    const response = await fetch(tokenUrl, {
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

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: refreshToken, // Salesforce doesn't return new refresh token
      expiresAt: data.issued_at ? new Date(parseInt(data.issued_at) + 7200000).toISOString() : undefined,
      tokenType: data.token_type || 'Bearer',
    };
  } catch (error) {
    return { success: false, error: `Token refresh error: ${(error as Error).message}` };
  }
}

/**
 * Handle Salesforce OAuth callback
 */
export async function handleSalesforceOAuthCallback(
  code: string,
  redirectUri: string,
  isSandbox?: boolean
): Promise<AuthResult> {
  return exchangeSalesforceCode(code, redirectUri, isSandbox);
}

/**
 * Authorize with Salesforce
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    const isSandbox = params.redirectUri?.includes('sandbox') || false;
    return handleSalesforceOAuthCallback(params.code, params.redirectUri, isSandbox);
  }

  return {
    success: false,
    error: 'No valid authentication method provided. Use OAuth flow.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(currentToken: string, isSandbox?: boolean): Promise<AuthResult> {
  return refreshSalesforceToken(currentToken, isSandbox);
}

/**
 * Get Salesforce user info
 */
export async function getUserInfo(accessToken: string, instanceUrl: string): Promise<{
  id: string;
  username: string;
  email: string;
  orgId: string;
}> {
  const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Salesforce user info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    id: data.user_id,
    username: data.preferred_username,
    email: data.email,
    orgId: data.organization_id,
  };
}

/**
 * Query Salesforce using SOQL
 */
export async function query(accessToken: string, instanceUrl: string, soql: string): Promise<any[]> {
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Salesforce query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.records || [];
}
