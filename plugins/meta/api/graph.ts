/**
 * Meta Graph API Helper
 *
 * Provides typed wrappers around the Meta Graph API v21.0 for:
 *   - Business discovery
 *   - Ad account listing
 *   - User access management (assign / verify / revoke)
 */

import type { AuthResult } from '../../common/types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MetaBusiness {
  id: string;
  name: string;
  created_time?: string;
}

export interface MetaAdAccount {
  id: string;            // e.g. "act_123456"
  account_id: string;    // e.g. "123456"
  name: string;
  currency?: string;
  account_status?: number;
}

export interface MetaAssignedUser {
  id: string;
  name?: string;
  email?: string;
  tasks?: string[];
}

export interface MetaBusinessUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

// ─── Low-level fetcher ──────────────────────────────────────────────────────────

async function graphGet<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set('access_token', accessToken);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function graphPost<T>(path: string, accessToken: string, data: Record<string, string>): Promise<T> {
  const url = `${GRAPH_API_BASE}${path}`;
  const body = new URLSearchParams({ access_token: accessToken, ...data });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function graphDelete(path: string, accessToken: string, params?: Record<string, string>): Promise<{ success: boolean }> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set('access_token', accessToken);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json();
}

// ─── Discovery ──────────────────────────────────────────────────────────────────

/**
 * List all businesses the authenticated user can manage.
 */
export async function listBusinesses(auth: AuthResult): Promise<MetaBusiness[]> {
  const data = await graphGet<{ data: MetaBusiness[] }>(
    '/me/businesses',
    auth.accessToken!,
    { fields: 'id,name,created_time', limit: '100' },
  );
  return data.data || [];
}

/**
 * List ad accounts owned by a business.
 */
export async function listBusinessAdAccounts(auth: AuthResult, businessId: string): Promise<MetaAdAccount[]> {
  const data = await graphGet<{ data: MetaAdAccount[] }>(
    `/${businessId}/owned_ad_accounts`,
    auth.accessToken!,
    { fields: 'id,account_id,name,currency,account_status', limit: '200' },
  );
  return data.data || [];
}

/**
 * List ad accounts the current user can manage directly (fallback when no business).
 */
export async function listUserAdAccounts(auth: AuthResult): Promise<MetaAdAccount[]> {
  const data = await graphGet<{ data: MetaAdAccount[] }>(
    '/me/adaccounts',
    auth.accessToken!,
    { fields: 'id,account_id,name,currency,account_status', limit: '200' },
  );
  return data.data || [];
}

// ─── Access Management ──────────────────────────────────────────────────────────

/** Task strings recognised by the Meta Business API */
export type MetaTask = 'MANAGE' | 'ADVERTISE' | 'ANALYZE';

const ROLE_TO_TASKS: Record<string, MetaTask[]> = {
  admin:      ['MANAGE', 'ADVERTISE', 'ANALYZE'],
  advertiser: ['ADVERTISE', 'ANALYZE'],
  analyst:    ['ANALYZE'],
};

export function roleToTasks(role: string): MetaTask[] {
  return ROLE_TO_TASKS[role.toLowerCase()] || ['ANALYZE'];
}

/**
 * Assign a business user to an ad account with specific tasks.
 * Endpoint: POST /act_{ad-account-id}/assigned_users
 */
export async function assignUserToAdAccount(
  auth: AuthResult,
  adAccountId: string,
  userId: string,
  tasks: MetaTask[],
): Promise<{ success: boolean }> {
  const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return graphPost<{ success: boolean }>(
    `/${normalizedId}/assigned_users`,
    auth.accessToken!,
    { user: userId, tasks: JSON.stringify(tasks) },
  );
}

/**
 * Get users assigned to an ad account.
 * Endpoint: GET /act_{ad-account-id}/assigned_users
 */
export async function listAssignedUsers(
  auth: AuthResult,
  adAccountId: string,
): Promise<MetaAssignedUser[]> {
  const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const data = await graphGet<{ data: MetaAssignedUser[] }>(
    `/${normalizedId}/assigned_users`,
    auth.accessToken!,
    { fields: 'id,name,email,tasks', limit: '200' },
  );
  return data.data || [];
}

/**
 * Remove a user from an ad account.
 * Endpoint: DELETE /act_{ad-account-id}/assigned_users
 */
export async function removeUserFromAdAccount(
  auth: AuthResult,
  adAccountId: string,
  userId: string,
): Promise<{ success: boolean }> {
  const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return graphDelete(`/${normalizedId}/assigned_users`, auth.accessToken!, { user: userId });
}

/**
 * List business users for a business (to find user IDs from emails).
 */
export async function listBusinessUsers(
  auth: AuthResult,
  businessId: string,
): Promise<MetaBusinessUser[]> {
  const data = await graphGet<{ data: MetaBusinessUser[] }>(
    `/${businessId}/business_users`,
    auth.accessToken!,
    { fields: 'id,name,email,role', limit: '200' },
  );
  return data.data || [];
}

/**
 * Invite a user to a business by email.
 * Endpoint: POST /{business-id}/access_invite
 */
export async function inviteUserToBusiness(
  auth: AuthResult,
  businessId: string,
  email: string,
  role: string,
): Promise<{ success: boolean; id?: string }> {
  const metaRole = role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
  return graphPost<{ success: boolean; id?: string }>(
    `/${businessId}/access_invite`,
    auth.accessToken!,
    { email, role: metaRole },
  );
}

/**
 * Look up the user-id for the current token holder.
 */
export async function getTokenUser(auth: AuthResult): Promise<{ id: string; name?: string; email?: string }> {
  return graphGet<{ id: string; name?: string; email?: string }>(
    '/me',
    auth.accessToken!,
    { fields: 'id,name,email' },
  );
}
