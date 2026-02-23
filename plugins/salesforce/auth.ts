/**
 * Salesforce OAuth Authentication & Target Discovery
 * Salesforce uses OAuth 2.0 with Authorization Code flow
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

// Salesforce OAuth Configuration
const SALESFORCE_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
  tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
  scopes: [
    'api',
    'refresh_token',
    'full',
    'id',
    'profile',
    'email',
    'openid',
  ],
};

/**
 * Get OAuth configuration with environment credentials
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const credentials = getProviderCredentials('salesforce');
  
  return {
    ...SALESFORCE_OAUTH_CONFIG,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri,
  };
}

/**
 * Check if Salesforce OAuth is configured
 */
export function isConfigured(): boolean {
  return isProviderConfigured('salesforce');
}

/**
 * Start Salesforce OAuth flow
 */
export function startSalesforceOAuth(redirectUri: string, scopes?: string[]): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri);
  
  // Allow custom scopes
  const scopeList = scopes && scopes.length > 0 ? scopes : config.scopes;
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: scopeList.join(' '),
    state,
    prompt: 'consent',
  });
  
  const authUrl = `${config.authorizationUrl}?${params.toString()}`;
  return { authUrl, state };
}

/**
 * Handle Salesforce OAuth callback
 */
export async function handleSalesforceOAuthCallback(
  code: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Salesforce token exchange failed: ${error}`,
      };
    }

    const data = await response.json();
    
    // Salesforce returns issued_at (timestamp in ms) instead of expires_in
    // Access tokens typically expire in 2 hours
    const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();

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
      error: `Salesforce token exchange error: ${(error as Error).message}`,
    };
  }
}

/**
 * Refresh Salesforce access token
 */
export async function refreshSalesforceToken(
  refreshToken: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  
  try {
    const response = await fetch(config.tokenUrl, {
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
      return {
        success: false,
        error: `Salesforce token refresh failed: ${error}`,
      };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();

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
      error: `Salesforce token refresh error: ${(error as Error).message}`,
    };
  }
}

/**
 * Authorize with Salesforce
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    return handleSalesforceOAuthCallback(params.code, params.redirectUri);
  }

  if (params.apiKey) {
    return {
      success: false,
      error: 'Salesforce requires OAuth authentication',
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
  return refreshSalesforceToken(currentToken, redirectUri);
}

/**
 * Discover accessible targets (orgs) from Salesforce
 */
export async function discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
  if (!auth.success || !auth.accessToken) {
    return {
      success: false,
      error: 'Valid access token required for target discovery',
    };
  }

  try {
    // Get user info which contains org details
    // The instance URL is typically returned in the OAuth response but we'll use the standard endpoint
    const userInfoResponse = await fetch('https://login.salesforce.com/services/oauth2/userinfo', {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      // Try identity URL
      const identityResponse = await fetch('https://login.salesforce.com/id/', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });
      
      if (!identityResponse.ok) {
        return {
          success: false,
          error: `Failed to fetch Salesforce org info: ${userInfoResponse.status}`,
        };
      }
    }

    const userInfo = await userInfoResponse.json();
    
    // Salesforce typically connects to one org per OAuth token
    const targets: AccessibleTarget[] = [{
      targetType: 'ORG' as const,
      externalId: userInfo.organization_id || userInfo.sub?.split('/').pop() || 'unknown',
      displayName: userInfo.organization_id ? `Salesforce Org ${userInfo.organization_id}` : 'Salesforce Organization',
      metadata: {
        userId: userInfo.user_id,
        username: userInfo.preferred_username,
        email: userInfo.email,
        name: userInfo.name,
        profile: userInfo.profile,
        instanceUrl: userInfo.urls?.custom_domain || userInfo.urls?.enterprise,
        isSandbox: userInfo.urls?.custom_domain?.includes('sandbox') || false,
      },
    }];

    return {
      success: true,
      targets,
    };
  } catch (error) {
    return {
      success: false,
      error: `Salesforce target discovery failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Get org info from Salesforce
 */
export async function getOrgInfo(accessToken: string): Promise<{ orgId: string; username: string; instanceUrl: string }> {
  const response = await fetch('https://login.salesforce.com/services/oauth2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Salesforce org info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    orgId: data.organization_id,
    username: data.preferred_username,
    instanceUrl: data.urls?.custom_domain || data.urls?.enterprise || '',
  };
}
