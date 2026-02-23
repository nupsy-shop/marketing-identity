/**
 * Modular Advertising Platform Plugin System
 * Authentication Helper Functions
 */

import type { AuthParams, AuthResult } from '../types';

/**
 * OAuth 2.0 configuration
 */
export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string
): Promise<AuthResult> {
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
        error: `Token exchange failed: ${error}`,
      };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
      error: `Token exchange error: ${(error as Error).message}`,
    };
  }
}

/**
 * Refresh an expired token
 */
export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<AuthResult> {
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
        error: `Token refresh failed: ${error}`,
      };
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
      error: `Token refresh error: ${(error as Error).message}`,
    };
  }
}

/**
 * Check if a token is expired or about to expire
 */
export function isTokenExpired(expiresAt: string, bufferSeconds: number = 300): boolean {
  const expirationTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  const bufferMs = bufferSeconds * 1000;

  return currentTime >= expirationTime - bufferMs;
}

/**
 * Generate a random state parameter for OAuth
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate OAuth callback state
 */
export function validateState(received: string, expected: string): boolean {
  return received === expected;
}
