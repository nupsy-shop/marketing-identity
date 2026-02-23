/**
 * Google Analytics 4 Plugin - Management API
 * Handles GA4 Admin API calls for account and property management
 */

import type { AuthResult, Account } from '../../common/types';
import { HttpClient } from '../../common/utils/httpClient';
import type { GA4Account, GA4Property, GA4DataStream, GA4AccessBinding, GA4Role } from '../types';

const GA4_ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';

/**
 * Create an authenticated HTTP client for GA4 Admin API
 */
function createClient(auth: AuthResult): HttpClient {
  return new HttpClient({
    baseUrl: GA4_ADMIN_API_BASE,
    defaultHeaders: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

// ─── Account Operations ────────────────────────────────────────────────────

/**
 * List all GA4 accounts accessible to the authenticated user
 */
export async function listAccounts(auth: AuthResult): Promise<GA4Account[]> {
  const client = createClient(auth);
  const accounts: GA4Account[] = [];
  let pageToken: string | undefined;

  do {
    const params = pageToken ? `?pageToken=${pageToken}` : '';
    const response = await client.get<{ accounts?: GA4Account[]; nextPageToken?: string }>(`/accounts${params}`);
    
    if (response.accounts) {
      accounts.push(...response.accounts);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return accounts;
}

/**
 * Get a specific GA4 account
 */
export async function getAccount(auth: AuthResult, accountId: string): Promise<GA4Account> {
  const client = createClient(auth);
  return client.get<GA4Account>(`/accounts/${accountId}`);
}

// ─── Property Operations ───────────────────────────────────────────────────

/**
 * List all GA4 properties for an account
 */
export async function listProperties(
  auth: AuthResult,
  filter?: string
): Promise<GA4Property[]> {
  const client = createClient(auth);
  const properties: GA4Property[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (pageToken) params.set('pageToken', pageToken);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await client.get<{ properties?: GA4Property[]; nextPageToken?: string }>(`/properties${queryString}`);
    
    if (response.properties) {
      properties.push(...response.properties);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return properties;
}

/**
 * Get a specific GA4 property
 */
export async function getProperty(auth: AuthResult, propertyId: string): Promise<GA4Property> {
  const client = createClient(auth);
  return client.get<GA4Property>(`/properties/${propertyId}`);
}

// ─── Data Stream Operations ────────────────────────────────────────────────

/**
 * List all data streams for a property
 */
export async function listDataStreams(
  auth: AuthResult,
  propertyId: string
): Promise<GA4DataStream[]> {
  const client = createClient(auth);
  const dataStreams: GA4DataStream[] = [];
  let pageToken: string | undefined;

  do {
    const params = pageToken ? `?pageToken=${pageToken}` : '';
    const response = await client.get<{ dataStreams?: GA4DataStream[]; nextPageToken?: string }>(
      `/properties/${propertyId}/dataStreams${params}`
    );
    
    if (response.dataStreams) {
      dataStreams.push(...response.dataStreams);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return dataStreams;
}

// ─── Access Binding Operations (User Management) ────────────────────────────

/**
 * List access bindings for a property
 */
export async function listAccessBindings(
  auth: AuthResult,
  propertyId: string
): Promise<GA4AccessBinding[]> {
  const client = createClient(auth);
  const bindings: GA4AccessBinding[] = [];
  let pageToken: string | undefined;

  do {
    const params = pageToken ? `?pageToken=${pageToken}` : '';
    const response = await client.get<{ accessBindings?: GA4AccessBinding[]; nextPageToken?: string }>(
      `/properties/${propertyId}/accessBindings${params}`
    );
    
    if (response.accessBindings) {
      bindings.push(...response.accessBindings);
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  return bindings;
}

/**
 * Create an access binding (grant user access)
 */
export async function createAccessBinding(
  auth: AuthResult,
  propertyId: string,
  userEmail: string,
  roles: GA4Role[]
): Promise<GA4AccessBinding> {
  const client = createClient(auth);
  return client.post<GA4AccessBinding>(
    `/properties/${propertyId}/accessBindings`,
    {
      user: userEmail,
      roles,
    }
  );
}

/**
 * Delete an access binding (revoke user access)
 */
export async function deleteAccessBinding(
  auth: AuthResult,
  bindingName: string
): Promise<void> {
  const client = createClient(auth);
  await client.delete<void>(`/${bindingName}`);
}

/**
 * Check if a user has access to a property
 */
export async function checkUserAccess(
  auth: AuthResult,
  propertyId: string,
  userEmail: string
): Promise<GA4AccessBinding | null> {
  const bindings = await listAccessBindings(auth, propertyId);
  return bindings.find(b => b.user?.toLowerCase() === userEmail.toLowerCase()) || null;
}

// ─── Combined Operations ───────────────────────────────────────────────────

/**
 * Get all accounts with their properties as a flat list
 */
export async function getAllAccountsAndProperties(auth: AuthResult): Promise<Account[]> {
  const accounts = await listAccounts(auth);
  const result: Account[] = [];

  for (const account of accounts) {
    const accountId = account.name.replace('accounts/', '');
    
    // Add the account
    result.push({
      id: accountId,
      name: account.displayName,
      type: 'account',
      metadata: {
        regionCode: account.regionCode,
        createTime: account.createTime,
      },
      isAccessible: true,
      status: 'active',
    });

    // Get properties for this account
    const properties = await listProperties(auth, `parent:accounts/${accountId}`);
    for (const property of properties) {
      const propertyId = property.name.replace('properties/', '');
      result.push({
        id: propertyId,
        name: property.displayName,
        type: 'property',
        parentId: accountId,
        metadata: {
          timeZone: property.timeZone,
          currencyCode: property.currencyCode,
          serviceLevel: property.serviceLevel,
          industryCategory: property.industryCategory,
        },
        isAccessible: !property.deleteTime,
        status: property.deleteTime ? 'inactive' : 'active',
      });
    }
  }

  return result;
}
