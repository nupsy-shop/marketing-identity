/**
 * Google Tag Manager Plugin - Management API
 * Handles GTM API calls for account, container, and user management
 */

import type { AuthResult } from '../../common/types';
import { HttpClient } from '../../common/utils/httpClient';

const GTM_API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2';

/**
 * Create an authenticated HTTP client for GTM API
 */
function createClient(auth: AuthResult): HttpClient {
  return new HttpClient({
    baseUrl: GTM_API_BASE,
    defaultHeaders: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GTMAccount {
  path: string;           // Format: accounts/{account_id}
  accountId: string;
  name: string;
  fingerprint?: string;
}

export interface GTMContainer {
  path: string;           // Format: accounts/{account_id}/containers/{container_id}
  accountId: string;
  containerId: string;
  name: string;
  publicId: string;       // GTM-XXXXXX
  fingerprint?: string;
}

export interface GTMUserPermission {
  path: string;           // Format: accounts/{account_id}/user_permissions/{permission_id}
  accountId: string;
  emailAddress: string;
  accountAccess?: {
    permission: GTMAccountPermission;
  };
  containerAccess?: GTMContainerAccess[];
}

export interface GTMContainerAccess {
  containerId: string;
  permission: GTMContainerPermission;
}

export type GTMAccountPermission = 'noAccess' | 'user' | 'admin';
export type GTMContainerPermission = 'noAccess' | 'read' | 'edit' | 'approve' | 'publish';

// ─── Account Operations ────────────────────────────────────────────────────────

/**
 * List all GTM accounts accessible to the authenticated user
 */
export async function listAccounts(auth: AuthResult): Promise<GTMAccount[]> {
  const client = createClient(auth);
  const response = await client.get<{ account?: GTMAccount[] }>('/accounts');
  return response.account || [];
}

/**
 * Get a specific GTM account
 */
export async function getAccount(auth: AuthResult, accountId: string): Promise<GTMAccount> {
  const client = createClient(auth);
  return client.get<GTMAccount>(`/accounts/${accountId}`);
}

// ─── Container Operations ──────────────────────────────────────────────────────

/**
 * List all containers in an account
 */
export async function listContainers(auth: AuthResult, accountId: string): Promise<GTMContainer[]> {
  const client = createClient(auth);
  const response = await client.get<{ container?: GTMContainer[] }>(`/accounts/${accountId}/containers`);
  return response.container || [];
}

/**
 * Get a specific container
 */
export async function getContainer(auth: AuthResult, accountId: string, containerId: string): Promise<GTMContainer> {
  const client = createClient(auth);
  return client.get<GTMContainer>(`/accounts/${accountId}/containers/${containerId}`);
}

// ─── User Permission Operations ────────────────────────────────────────────────

/**
 * List all user permissions for an account
 */
export async function listAccountUserPermissions(auth: AuthResult, accountId: string): Promise<GTMUserPermission[]> {
  const client = createClient(auth);
  const response = await client.get<{ userPermission?: GTMUserPermission[] }>(`/accounts/${accountId}/user_permissions`);
  return response.userPermission || [];
}

/**
 * Check if a user has permission on an account or container
 */
export async function checkUserPermission(
  auth: AuthResult,
  accountId: string,
  userEmail: string,
  containerId?: string
): Promise<GTMUserPermission | null> {
  const permissions = await listAccountUserPermissions(auth, accountId);
  const userPermission = permissions.find(p => 
    p.emailAddress?.toLowerCase() === userEmail.toLowerCase()
  );
  
  if (!userPermission) return null;
  
  // If containerId specified, check container access
  if (containerId && userPermission.containerAccess) {
    const containerAccess = userPermission.containerAccess.find(c => c.containerId === containerId);
    if (!containerAccess || containerAccess.permission === 'noAccess') {
      return null;
    }
  }
  
  return userPermission;
}

/**
 * Get permission level for a user on an account
 */
export async function getUserAccountPermission(
  auth: AuthResult,
  accountId: string,
  userEmail: string
): Promise<{ found: boolean; permission?: GTMAccountPermission; containerAccess?: GTMContainerAccess[] }> {
  const permission = await checkUserPermission(auth, accountId, userEmail);
  if (!permission) {
    return { found: false };
  }
  return {
    found: true,
    permission: permission.accountAccess?.permission,
    containerAccess: permission.containerAccess
  };
}

/**
 * Get permission level for a user on a specific container
 */
export async function getUserContainerPermission(
  auth: AuthResult,
  accountId: string,
  containerId: string,
  userEmail: string
): Promise<{ found: boolean; permission?: GTMContainerPermission }> {
  const userPermission = await checkUserPermission(auth, accountId, userEmail, containerId);
  if (!userPermission) {
    return { found: false };
  }
  
  const containerAccess = userPermission.containerAccess?.find(c => c.containerId === containerId);
  return {
    found: true,
    permission: containerAccess?.permission
  };
}

// ─── Combined Operations ───────────────────────────────────────────────────────

/**
 * List all accounts with their containers (for target discovery)
 */
export async function listAccountsWithContainers(auth: AuthResult): Promise<{ account: GTMAccount; containers: GTMContainer[] }[]> {
  const accounts = await listAccounts(auth);
  const result: { account: GTMAccount; containers: GTMContainer[] }[] = [];
  
  for (const account of accounts) {
    try {
      const containers = await listContainers(auth, account.accountId);
      result.push({ account, containers });
    } catch (error) {
      console.warn(`[GTM] Failed to list containers for account ${account.accountId}:`, error);
      result.push({ account, containers: [] });
    }
  }
  
  return result;
}

// ─── User Permission Creation ──────────────────────────────────────────────────

/**
 * Create a user permission for an account
 * This grants access to a user on a GTM account and optionally specific containers
 */
export async function createUserPermission(
  auth: AuthResult,
  accountId: string,
  userEmail: string,
  accountPermission: GTMAccountPermission,
  containerAccess?: GTMContainerAccess[]
): Promise<GTMUserPermission> {
  const client = createClient(auth);
  
  const body: {
    emailAddress: string;
    accountAccess: { permission: GTMAccountPermission };
    containerAccess?: GTMContainerAccess[];
  } = {
    emailAddress: userEmail,
    accountAccess: { permission: accountPermission },
  };
  
  if (containerAccess && containerAccess.length > 0) {
    body.containerAccess = containerAccess;
  }
  
  return client.post<GTMUserPermission>(`/accounts/${accountId}/user_permissions`, body);
}

/**
 * Update a user permission for an account
 */
export async function updateUserPermission(
  auth: AuthResult,
  permissionPath: string,
  accountPermission?: GTMAccountPermission,
  containerAccess?: GTMContainerAccess[]
): Promise<GTMUserPermission> {
  const client = createClient(auth);
  
  const body: {
    accountAccess?: { permission: GTMAccountPermission };
    containerAccess?: GTMContainerAccess[];
  } = {};
  
  if (accountPermission) {
    body.accountAccess = { permission: accountPermission };
  }
  
  if (containerAccess) {
    body.containerAccess = containerAccess;
  }
  
  // permissionPath format: accounts/{accountId}/user_permissions/{permissionId}
  return client.put<GTMUserPermission>(`/${permissionPath}`, body);
}

/**
 * Delete a user permission from an account
 */
export async function deleteUserPermission(
  auth: AuthResult,
  permissionPath: string
): Promise<void> {
  const client = createClient(auth);
  await client.delete<void>(`/${permissionPath}`);
}
