/**
 * HubSpot Settings API v3 - User Management
 * Docs: https://developers.hubspot.com/docs/api/settings/user-provisioning
 */

const HUBSPOT_API = 'https://api.hubapi.com';

export interface HubSpotUser {
  id: string;
  email: string;
  roleId?: string;
  primaryTeamId?: string;
  superAdmin?: boolean;
}

async function hubspotGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function hubspotPost<T>(path: string, accessToken: string, data: any): Promise<T> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function hubspotPut<T>(path: string, accessToken: string, data: any): Promise<T> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function hubspotDelete(path: string, accessToken: string): Promise<void> {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
}

/** List all users in the portal */
export async function listUsers(accessToken: string): Promise<HubSpotUser[]> {
  const data = await hubspotGet<{ results: HubSpotUser[] }>('/settings/v3/users?limit=100', accessToken);
  return data.results || [];
}

/** Get available roles */
export async function listRoles(accessToken: string): Promise<{ id: string; name: string }[]> {
  const data = await hubspotGet<{ results: { id: string; name: string }[] }>('/settings/v3/users/roles', accessToken);
  return data.results || [];
}

/** Invite a user by email */
export async function inviteUser(accessToken: string, email: string, roleId: string, sendWelcomeEmail = true): Promise<HubSpotUser> {
  return hubspotPost<HubSpotUser>('/settings/v3/users', accessToken, { email, roleId, sendWelcomeEmail });
}

/** Update user role */
export async function updateUserRole(accessToken: string, userId: string, roleId: string): Promise<HubSpotUser> {
  return hubspotPut<HubSpotUser>(`/settings/v3/users/${userId}`, accessToken, { roleId });
}

/** Remove a user */
export async function removeUser(accessToken: string, userId: string): Promise<void> {
  return hubspotDelete(`/settings/v3/users/${userId}`, accessToken);
}

/** Get portal info for discovery */
export async function getPortalInfo(accessToken: string): Promise<{ portalId: number; uiDomain: string; timeZone: string }> {
  return hubspotGet<any>('/account-info/v3/details', accessToken);
}

/** Find a user by email */
export async function findUserByEmail(accessToken: string, email: string): Promise<HubSpotUser | null> {
  const users = await listUsers(accessToken);
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}
