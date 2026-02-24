/**
 * Google Search Console Plugin - OAuth Configuration
 * 
 * Manages GSC-specific OAuth credentials and configuration.
 */

export interface GSCOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authEndpoint: string;
  tokenEndpoint: string;
}

/**
 * Check if GSC OAuth is configured
 */
export function isGSCOAuthConfigured(): boolean {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET;
  
  // Check for placeholder values
  if (!clientId || !clientSecret) return false;
  if (clientId.startsWith('PLACEHOLDER_') || clientSecret.startsWith('PLACEHOLDER_')) return false;
  
  return true;
}

/**
 * Get GSC OAuth configuration
 */
export function getOAuthConfig(redirectUri: string): GSCOAuthConfig {
  const clientId = process.env.GOOGLE_GSC_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GSC_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new GSCOAuthNotConfiguredError();
  }
  
  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',  // View Search Console data
      'https://www.googleapis.com/auth/webmasters',            // Manage Search Console data
    ],
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };
}

/**
 * Error thrown when GSC OAuth is not configured
 */
export class GSCOAuthNotConfiguredError extends Error {
  constructor() {
    super('Google Search Console OAuth is not configured. Set GOOGLE_GSC_CLIENT_ID and GOOGLE_GSC_CLIENT_SECRET environment variables.');
    this.name = 'GSCOAuthNotConfiguredError';
  }
}
