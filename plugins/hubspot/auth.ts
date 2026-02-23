/**
 * HubSpot OAuth Authentication & Target Discovery
 * HubSpot uses OAuth 2.0 with Authorization Code flow
 */

import type { AuthParams, AuthResult, AccessibleTarget, DiscoverTargetsResult } from '../common/types';
import { 
  buildAuthorizationUrl, 
  exchangeCodeForTokens, 
  refreshAccessToken, 
  generateState, 
  type OAuthConfig 
} from '../common/utils/auth';
import { 
  getProviderCredentials, 
  isProviderConfigured,
  OAuthNotConfiguredError 
} from '../common/oauth-config';

// HubSpot OAuth Configuration
const HUBSPOT_OAUTH_CONFIG: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'> = {
  authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
  scopes: [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.companies.read',
    'crm.objects.deals.read',
    'content',
    'forms',
    'automation',
    'oauth',
  ],
};

/**
 * Get OAuth configuration with environment credentials
 */
export function getOAuthConfig(redirectUri: string): OAuthConfig {
  const credentials = getProviderCredentials('hubspot');
  
  return {
    ...HUBSPOT_OAUTH_CONFIG,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri,
  };
}

/**
 * Check if HubSpot OAuth is configured
 */
export function isConfigured(): boolean {
  return isProviderConfigured('hubspot');
}

/**
 * Start HubSpot OAuth flow
 */
export function startHubSpotOAuth(redirectUri: string, scopes?: string[]): { authUrl: string; state: string } {
  const state = generateState();
  const config = getOAuthConfig(redirectUri);
  
  // Allow custom scopes
  if (scopes && scopes.length > 0) {
    config.scopes = scopes;
  }
  
  const authUrl = buildAuthorizationUrl(config, state);
  return { authUrl, state };
}

/**
 * Handle HubSpot OAuth callback
 */
export async function handleHubSpotOAuthCallback(
  code: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return exchangeCodeForTokens(config, code);
}

/**
 * Refresh HubSpot access token
 */
export async function refreshHubSpotToken(
  refreshToken: string,
  redirectUri: string
): Promise<AuthResult> {
  const config = getOAuthConfig(redirectUri);
  return refreshAccessToken(config, refreshToken);
}

/**
 * Authorize with HubSpot
 */
export async function authorize(params: AuthParams): Promise<AuthResult> {
  if (params.code && params.redirectUri) {
    return handleHubSpotOAuthCallback(params.code, params.redirectUri);
  }

  if (params.apiKey) {
    // HubSpot also supports API keys for some operations
    return {
      success: true,
      accessToken: params.apiKey,
      tokenType: 'ApiKey',
    };
  }

  return {
    success: false,
    error: 'No valid authentication method provided. Use OAuth flow or API key.',
  };
}

/**
 * Refresh an expired token
 */
export async function refreshToken(
  currentToken: string,
  redirectUri: string
): Promise<AuthResult> {
  return refreshHubSpotToken(currentToken, redirectUri);
}

/**
 * Discover accessible targets (portals/hubs) from HubSpot
 */
export async function discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
  if (!auth.success || !auth.accessToken) {
    return {
      success: false,
      error: 'Valid access token required for target discovery',
    };
  }

  try {
    // Get access token info which contains hub_id
    const tokenInfoResponse = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + auth.accessToken, {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
      },
    });

    if (!tokenInfoResponse.ok) {
      // Try to get account info from a different endpoint
      const accountResponse = await fetch('https://api.hubapi.com/account-info/v3/api-usage/daily', {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });
      
      if (!accountResponse.ok) {
        return {
          success: false,
          error: `Failed to fetch HubSpot account info: ${tokenInfoResponse.status}`,
        };
      }
    }

    const tokenInfo = await tokenInfoResponse.json();
    
    // HubSpot typically has one portal per OAuth token
    const targets: AccessibleTarget[] = [{
      targetType: 'PORTAL' as const,
      externalId: String(tokenInfo.hub_id || tokenInfo.portalId),
      displayName: tokenInfo.hub_domain || tokenInfo.app_id ? `HubSpot Portal ${tokenInfo.hub_id}` : 'HubSpot Account',
      metadata: {
        hubDomain: tokenInfo.hub_domain,
        appId: tokenInfo.app_id,
        userId: tokenInfo.user_id,
        scopes: tokenInfo.scopes,
        tokenType: tokenInfo.token_type,
      },
    }];

    return {
      success: true,
      targets,
    };
  } catch (error) {
    return {
      success: false,
      error: `HubSpot target discovery failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Get portal info from HubSpot
 */
export async function getPortalInfo(accessToken: string): Promise<{ portalId: string; hubDomain: string }> {
  const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);

  if (!response.ok) {
    throw new Error(`Failed to get HubSpot portal info: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    portalId: data.hub_id,
    hubDomain: data.hub_domain,
  };
}
