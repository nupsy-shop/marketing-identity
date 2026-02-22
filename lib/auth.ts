// Stub authentication system
// In production, replace this with Okta OIDC integration

import { User } from '@/types';
import { getUserByEmail } from './data/stores';

/**
 * Get current user from session
 * TODO: Replace with Okta session management
 */
export async function getCurrentUser(): Promise<User | null> {
  // For now, return the default admin user
  // In production, this would:
  // 1. Check for Okta session cookie
  // 2. Validate the session with Okta
  // 3. Return user info from Okta token claims
  // 4. Map Okta groups to internal roles
  
  return getUserByEmail('admin@agency.com') || null;
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

/**
 * Stub login function
 * TODO: Replace with Okta OIDC redirect
 */
export async function login(email: string, password: string): Promise<User | null> {
  // In production, this would redirect to Okta login
  // For now, just check if user exists
  return getUserByEmail(email) || null;
}

/**
 * Stub logout function
 * TODO: Replace with Okta logout
 */
export async function logout(): Promise<void> {
  // In production, clear Okta session and redirect
  console.log('Logout called');
}

/**
 * Generate Okta OIDC login URL
 * TODO: Implement when Okta credentials are provided
 */
export function getOktaLoginUrl(redirectUri: string): string {
  // When implementing:
  // const params = new URLSearchParams({
  //   client_id: process.env.OKTA_CLIENT_ID,
  //   redirect_uri: redirectUri,
  //   response_type: 'code',
  //   scope: 'openid profile email',
  //   state: generateState()
  // });
  // return `https://${process.env.OKTA_DOMAIN}/oauth2/v1/authorize?${params}`;
  
  return '/admin'; // Stub: redirect to admin for now
}
