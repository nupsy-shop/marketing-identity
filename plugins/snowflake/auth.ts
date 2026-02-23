/**
 * Snowflake OAuth Authentication & Target Discovery
 * Snowflake uses OAuth 2.0 with Authorization Code flow
 * Note: Snowflake OAuth endpoints are account-specific
 */

import type { AuthParams, AuthResult, AccessibleTarget, DiscoverTargetsResult } from '../common/types';
import { 
  generateState, 
  type OAuthConfig 
} from '../common/utils/auth';
import { 
  getProviderCredentials, 
  isProviderConfigured,
  OAuthNotConfiguredError 
} from '../common/oauth-config';

// Snowflake OAuth Configuration (endpoints are account-specific)
const SNOWFLAKE_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri' | 'authorizationUrl' | 'tokenUrl'> = {
  scopes: [
    'session:role:PUBLIC',
  ],
  authorizationUrl: '', // Will be constructed
  tokenUrl: '', // Will be constructed
};

/**
 * Construct Snowflake account URL
 * Format: https://<account_identifier>.snowflakecomputing.com
 */
export function getSnowflakeBaseUrl(accountIdentifier: string): string {
  // Handle different account identifier formats
  if (accountIdentifier.includes('.snowflakecomputing.com')) {
    return `https://${accountIdentifier}`;
  }
  return `https://${accountIdentifier}.snowflakecomputing.com`;
}

/**
 * Get OAuth configuration with environment credentials
 */
export function getOAuthConfig(redirectUri: string, accountIdentifier?: string): OAuthConfig {
  const credentials = getProviderCredentials('snowflake');
  
  // For Snowflake, we need the account identifier to construct URLs
  const account = accountIdentifier || process.env.SNOWFLAKE_ACCOUNT || '';
  const baseUrl = account ? getSnowflakeBaseUrl(account) : 'https://<account>.snowflakecomputing.com';
  
  return {
    ...SNOWFLAKE_OAUTH_CONFIG,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri,
    authorizationUrl: `${baseUrl}/oauth/authorize`,
    tokenUrl: `${baseUrl}/oauth/token-request`,
  };
}

/**
 * Check if Snowflake OAuth is configured
 */
export function isConfigured(): boolean {
  return isProviderConfigured('snowflake');
}

/**
 * Start Snowflake OAuth flow
 */
export function startSnowflakeOAuth(
  redirectUri: string, 
  accountIdentifier: string,
  scopes?: string[]
): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri, accountIdentifier);
  
  // Allow custom scopes
  const scopeList = scopes && scopes.length > 0 ? scopes : config.scopes;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopeList.join(' '),
    state,
  });
  
  const authUrl = `${config.authorizationUrl}?${params.toString()}`;
  return { authUrl, state };
}

/**
 * Handle Snowflake OAuth callback
 */
export async function handleSnowflakeOAuthCallback(
  code: string,
  redirectUri: string,
  accountIdentifier: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri, accountIdentifier);
  
  try {
    // Snowflake uses Basic auth for token endpoint
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Snowflake token exchange failed: ${error}`,
      };
    }

    const data = await response.json();
    
    // Snowflake access tokens typically expire in 10 minutes
    const expiresIn = data.expires_in || 600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
      scopes: data.scope?.split(' ') || config.scopes,
    };
  } catch (error) {
    return {
      success: false,
      error: `Snowflake token exchange error: ${(error as Error).message}`,
    };
  }
}

/**
 * Refresh Snowflake access token
 */
export async function refreshSnowflakeToken(
  refreshToken: string,
  redirectUri: string,
  accountIdentifier: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri, accountIdentifier);
  
  try {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Snowflake token refresh failed: ${error}`,
      };
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt,
      tokenType: data.token_type || 'Bearer',
    };
  } catch (error) {
    return {
      success: false,
      error: `Snowflake token refresh error: ${(error as Error).message}`,
    };
  }
}

/**
 * Authorize with Snowflake
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    // Need account identifier from somewhere
    const account = process.env.SNOWFLAKE_ACCOUNT || '';
    return handleSnowflakeOAuthCallback(params.code, params.redirectUri, account);
  }

  if (params.apiKey) {
    return {
      success: false,
      error: 'Snowflake requires OAuth authentication',
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
  const account = process.env.SNOWFLAKE_ACCOUNT || '';
  return refreshSnowflakeToken(currentToken, redirectUri, account);
}

/**
 * Discover accessible targets (accounts/warehouses/databases) from Snowflake
 */
export async function discoverTargets(
  auth: AuthResult,
  accountIdentifier?: string
): Promise<DiscoverTargetsResult> {
  if (!auth.success || !auth.accessToken) {
    return {
      success: false,
      error: 'Valid access token required for target discovery',
    };
  }

  const account = accountIdentifier || process.env.SNOWFLAKE_ACCOUNT || '';
  if (!account) {
    return {
      success: false,
      error: 'Snowflake account identifier is required',
    };
  }

  try {
    const baseUrl = getSnowflakeBaseUrl(account);
    const targets: AccessibleTarget[] = [];
    
    // Get current user/session info
    const sessionResponse = await fetch(`${baseUrl}/api/v2/statements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
        'X-Snowflake-Authorization-Token-Type': 'OAUTH',
      },
      body: JSON.stringify({
        statement: 'SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_ACCOUNT(), CURRENT_DATABASE(), CURRENT_WAREHOUSE()',
        timeout: 60,
        resultSetMetaData: {
          format: 'json',
        },
      }),
    });

    // Add the account as a target
    targets.push({
      targetType: 'ACCOUNT' as const,
      externalId: account,
      displayName: `Snowflake Account: ${account}`,
      metadata: {
        accountIdentifier: account,
        oauthConnected: true,
      },
    });

    // Try to get warehouses
    try {
      const warehousesResponse = await fetch(`${baseUrl}/api/v2/statements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
          'X-Snowflake-Authorization-Token-Type': 'OAUTH',
        },
        body: JSON.stringify({
          statement: 'SHOW WAREHOUSES',
          timeout: 60,
          resultSetMetaData: {
            format: 'json',
          },
        }),
      });

      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        // Parse warehouses from result
        if (warehousesData.data) {
          warehousesData.data.forEach((row: any[]) => {
            targets.push({
              targetType: 'WAREHOUSE' as const,
              externalId: row[0], // warehouse name is typically first column
              displayName: row[0],
              parentExternalId: account,
              metadata: {
                state: row[1],
                type: row[2],
                size: row[3],
              },
            });
          });
        }
      }
    } catch (e) {
      // Warehouses query failed, continue with account only
      console.warn('Could not fetch Snowflake warehouses:', e);
    }

    return {
      success: true,
      targets,
    };
  } catch (error) {
    return {
      success: false,
      error: `Snowflake target discovery failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Get account info from Snowflake
 */
export async function getAccountInfo(
  accessToken: string, 
  accountIdentifier: string
): Promise<{ accountId: string; user: string; role: string }> {
  const baseUrl = getSnowflakeBaseUrl(accountIdentifier);
  
  const response = await fetch(`${baseUrl}/api/v2/statements`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'OAUTH',
    },
    body: JSON.stringify({
      statement: 'SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_ACCOUNT()',
      timeout: 60,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Snowflake account info: ${response.statusText}`);
  }

  const data = await response.json();
  const row = data.data?.[0] || [];
  
  return {
    accountId: row[2] || accountIdentifier,
    user: row[0] || '',
    role: row[1] || '',
  };
}
