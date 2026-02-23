/**
 * LinkedIn OAuth Authentication & Target Discovery
 * LinkedIn uses OAuth 2.0 with Authorization Code flow
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
  const credentials = getProviderCredentials('linkedin');
  
  return {
    ...LINKEDIN_OAUTH_CONFIG,
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    redirectUri,
  };
}

/**
 * Check if LinkedIn OAuth is configured
 */
export function isConfigured(): boolean {
  return isProviderConfigured('linkedin');
}

/**
 * Start LinkedIn OAuth flow
 */
export function startLinkedInOAuth(redirectUri: string, scopes?: string[]): { authUrl: string; state: string } {
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
 * Discover accessible targets (ad accounts) from LinkedIn
 */
export async function discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
  if (!auth.success || !auth.accessToken) {
    return {
      success: false,
      error: 'Valid access token required for target discovery',
    };
  }

  try {
    // Fetch ad accounts
    const response = await fetch('https://api.linkedin.com/v2/adAccountsV2?q=search&count=100', {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202304',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to fetch LinkedIn ad accounts: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const targets: AccessibleTarget[] = (data.elements || []).map((account: any) => ({
      targetType: 'AD_ACCOUNT' as const,
      externalId: String(account.id),
      displayName: account.name || `Account ${account.id}`,
      metadata: {
        status: account.status,
        type: account.type,
        currency: account.currency,
        reference: account.reference,
        servingStatuses: account.servingStatuses,
      },
    }));

    return {
      success: true,
      targets,
    };
  } catch (error) {
    return {
      success: false,
      error: `LinkedIn target discovery failed: ${(error as Error).message}`,
    };
  }
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
