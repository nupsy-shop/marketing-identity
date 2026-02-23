/**
 * Snowflake OAuth Authentication
 * Snowflake supports OAuth 2.0 with external OAuth providers or Snowflake's native OAuth
 */

import type { AuthParams, AuthResult } from '../common/types';
import { generateState } from '../common/utils/auth';

// Snowflake OAuth Configuration
export interface SnowflakeOAuthConfig {
  accountIdentifier: string; // org-account format
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

/**
 * Get OAuth configuration
 */
export function getOAuthConfig(accountIdentifier: string, redirectUri: string): SnowflakeOAuthConfig {
  const clientId = process.env.SNOWFLAKE_CLIENT_ID;
  const clientSecret = process.env.SNOWFLAKE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Snowflake OAuth credentials not configured. Set SNOWFLAKE_CLIENT_ID and SNOWFLAKE_CLIENT_SECRET.');
  }

  if (!accountIdentifier) {
    throw new Error('Snowflake account identifier is required.');
  }

  return {
    accountIdentifier,
    clientId,
    clientSecret,
    redirectUri,
    scopes: ['session:role:PUBLIC'],
  };
}

/**
 * Build Snowflake account URL
 */
function getSnowflakeBaseUrl(accountIdentifier: string): string {
  // Handle different account identifier formats
  // org-account or account.region.cloud
  if (accountIdentifier.includes('.')) {
    return `https://${accountIdentifier}.snowflakecomputing.com`;
  }
  return `https://${accountIdentifier}.snowflakecomputing.com`;
}

/**
 * Build Snowflake authorization URL
 */
export function buildSnowflakeAuthUrl(
  accountIdentifier: string,
  redirectUri: string,
  scopes?: string[]
): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(accountIdentifier, redirectUri);
  const baseUrl = getSnowflakeBaseUrl(accountIdentifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: (scopes || config.scopes || []).join(' '),
    state,
  });

  return {
    authUrl: `${baseUrl}/oauth/authorize?${params.toString()}`,
    state,
  };
}

/**
 * Start Snowflake OAuth flow
 */
export function startSnowflakeOAuth(
  accountIdentifier: string,
  redirectUri: string,
  scopes?: string[]
): { authUrl: string; state: string } {
  return buildSnowflakeAuthUrl(accountIdentifier, redirectUri, scopes);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeSnowflakeCode(
  code: string,
  accountIdentifier: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(accountIdentifier, redirectUri);
  const baseUrl = getSnowflakeBaseUrl(accountIdentifier);
  const tokenUrl = `${baseUrl}/oauth/token-request`;

  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token exchange failed: ${error}` };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

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
 * Refresh Snowflake access token
 */
export async function refreshSnowflakeToken(
  refreshToken: string,
  accountIdentifier: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(accountIdentifier, redirectUri);
  const baseUrl = getSnowflakeBaseUrl(accountIdentifier);
  const tokenUrl = `${baseUrl}/oauth/token-request`;

  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Token refresh failed: ${error}` };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

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
 * Handle Snowflake OAuth callback
 */
export async function handleSnowflakeOAuthCallback(
  code: string,
  accountIdentifier: string,
  redirectUri: string
): Promise<AuthResult> {
  return exchangeSnowflakeCode(code, accountIdentifier, redirectUri);
}

/**
 * Authorize with Snowflake
 */
export async function authorize(params: AuthParams & { accountIdentifier?: string }): Promise<AuthResult> {
  if (params.code && params.redirectUri && params.accountIdentifier) {
    return handleSnowflakeOAuthCallback(params.code, params.accountIdentifier, params.redirectUri);
  }

  // Key-pair authentication for service accounts
  if (params.apiKey) {
    return {
      success: true,
      accessToken: params.apiKey,
      tokenType: 'KeyPair',
    };
  }

  return {
    success: false,
    error: 'No valid authentication method provided. Use OAuth flow or key-pair auth.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(
  currentToken: string,
  accountIdentifier: string,
  redirectUri: string
): Promise<AuthResult> {
  return refreshSnowflakeToken(currentToken, accountIdentifier, redirectUri);
}

/**
 * Execute SQL query via Snowflake REST API
 */
export async function executeQuery(
  accessToken: string,
  accountIdentifier: string,
  sql: string,
  warehouse?: string,
  database?: string,
  schema?: string
): Promise<any[]> {
  const baseUrl = getSnowflakeBaseUrl(accountIdentifier);
  const statementUrl = `${baseUrl}/api/v2/statements`;

  const body: any = {
    statement: sql,
    timeout: 60,
    resultSetMetaData: { format: 'json' },
  };

  if (warehouse) body.warehouse = warehouse;
  if (database) body.database = database;
  if (schema) body.schema = schema;

  const response = await fetch(statementUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Snowflake-Authorization-Token-Type': 'OAUTH',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Snowflake query failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}
