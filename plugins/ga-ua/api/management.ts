/**
 * Google Analytics Universal Analytics (UA) - Management API v3
 * Docs: https://developers.google.com/analytics/devguides/config/mgmt/v3
 * Note: UA is sunset but many accounts still exist. Read-only + user mgmt.
 */

const GA_MGMT_API = 'https://www.googleapis.com/analytics/v3/management';

export interface UAAccount {
  id: string;
  name: string;
  created: string;
}

export interface UAWebProperty {
  id: string;           // e.g. UA-12345-1
  name: string;
  accountId: string;
  websiteUrl?: string;
}

export interface UAUserLink {
  id: string;
  kind: string;
  userRef: { email: string };
  permissions: { effective: string[]; local: string[] };
}

async function gaGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${GA_MGMT_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function gaPost<T>(path: string, accessToken: string, data: any): Promise<T> {
  const res = await fetch(`${GA_MGMT_API}${path}`, {
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

async function gaDelete(path: string, accessToken: string): Promise<void> {
  const res = await fetch(`${GA_MGMT_API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
}

/** List all accounts */
export async function listAccounts(accessToken: string): Promise<UAAccount[]> {
  const data = await gaGet<{ items: UAAccount[] }>('/accounts', accessToken);
  return data.items || [];
}

/** List web properties for an account */
export async function listWebProperties(accessToken: string, accountId: string): Promise<UAWebProperty[]> {
  const data = await gaGet<{ items: UAWebProperty[] }>(`/accounts/${accountId}/webproperties`, accessToken);
  return data.items || [];
}

/** List user links at account level */
export async function listAccountUserLinks(accessToken: string, accountId: string): Promise<UAUserLink[]> {
  const data = await gaGet<{ items: UAUserLink[] }>(`/accounts/${accountId}/entityUserLinks`, accessToken);
  return data.items || [];
}

/** Add user link at account level */
export async function addAccountUserLink(accessToken: string, accountId: string, email: string, permissions: string[]): Promise<UAUserLink> {
  return gaPost<UAUserLink>(`/accounts/${accountId}/entityUserLinks`, accessToken, {
    permissions: { local: permissions },
    userRef: { email },
  });
}

/** Delete a user link */
export async function deleteAccountUserLink(accessToken: string, accountId: string, linkId: string): Promise<void> {
  return gaDelete(`/accounts/${accountId}/entityUserLinks/${linkId}`, accessToken);
}

/** Find a user link by email */
export async function findUserLink(accessToken: string, accountId: string, email: string): Promise<UAUserLink | null> {
  const links = await listAccountUserLinks(accessToken, accountId);
  return links.find(l => l.userRef.email.toLowerCase() === email.toLowerCase()) || null;
}

const ROLE_TO_PERMISSIONS: Record<string, string[]> = {
  administrator: ['MANAGE_USERS', 'EDIT', 'COLLABORATE', 'READ_AND_ANALYZE'],
  editor:        ['EDIT', 'COLLABORATE', 'READ_AND_ANALYZE'],
  analyst:       ['COLLABORATE', 'READ_AND_ANALYZE'],
  viewer:        ['READ_AND_ANALYZE'],
};

export function roleToPermissions(role: string): string[] {
  return ROLE_TO_PERMISSIONS[role.toLowerCase()] || ['READ_AND_ANALYZE'];
}
