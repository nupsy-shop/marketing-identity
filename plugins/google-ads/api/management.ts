/**
 * Google Ads Plugin - Management API
 * Handles Google Ads API calls for account and access management
 */

import type { AuthResult } from '../../common/types';
import type { GoogleAdsCustomer, GoogleAdsManagerLink, GoogleAdsAccessRole } from '../types';

// Google Ads REST API v16
const GOOGLE_ADS_API_BASE = 'https://googleads.googleapis.com/v16';

/**
 * Get developer token from environment
 */
function getDeveloperToken(): string | null {
  const token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!token || token.startsWith('PLACEHOLDER_')) {
    return null;
  }
  return token;
}

/**
 * Make a request to Google Ads API
 */
async function apiRequest<T>(
  auth: AuthResult,
  method: string,
  endpoint: string,
  body?: object
): Promise<T> {
  const developerToken = getDeveloperToken();
  
  const headers: Record<string, string> = {
    'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
    'Content-Type': 'application/json',
  };

  // Developer token is optional for some operations but required for most
  if (developerToken) {
    headers['developer-token'] = developerToken;
  }

  const response = await fetch(`${GOOGLE_ADS_API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Ads API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ─── Customer/Account Operations ───────────────────────────────────────────────

/**
 * List all accessible customer accounts
 * NOTE: This endpoint requires a valid developer token
 */
export async function listAccessibleCustomers(auth: AuthResult): Promise<string[]> {
  const developerToken = getDeveloperToken();
  
  // Developer token is required for Google Ads API
  if (!developerToken) {
    throw new Error(
      'Google Ads API requires a developer token. ' +
      'Please set GOOGLE_ADS_DEVELOPER_TOKEN in environment variables. ' +
      'Get a token from: https://developers.google.com/google-ads/api/docs/get-started/dev-token'
    );
  }

  const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`, {
    method: 'GET',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': developerToken,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list accessible customers: ${errorText}`);
  }

  const data = await response.json() as { resourceNames: string[] };
  return data.resourceNames || [];
}

/**
 * Get customer details by ID
 */
export async function getCustomer(auth: AuthResult, customerId: string): Promise<GoogleAdsCustomer | null> {
  const developerToken = getDeveloperToken();
  
  const query = `
    SELECT 
      customer.id,
      customer.resource_name,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.manager,
      customer.test_account
    FROM customer
    LIMIT 1
  `;

  try {
    const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
        'Content-Type': 'application/json',
        ...(developerToken && { 'developer-token': developerToken }),
        'login-customer-id': customerId,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { results?: Array<{ customer: GoogleAdsCustomer }> };
    return data.results?.[0]?.customer || null;
  } catch (error) {
    console.error(`[GoogleAds] Failed to get customer ${customerId}:`, error);
    return null;
  }
}

// ─── Manager Link Operations ───────────────────────────────────────────────────

/**
 * List manager links for a customer account
 * Checks if an MCC (Manager Customer) has access to this account
 */
export async function listManagerLinks(auth: AuthResult, customerId: string): Promise<GoogleAdsManagerLink[]> {
  const developerToken = getDeveloperToken();
  
  const query = `
    SELECT 
      customer_manager_link.resource_name,
      customer_manager_link.manager_customer,
      customer_manager_link.status
    FROM customer_manager_link
  `;

  try {
    const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
        'Content-Type': 'application/json',
        ...(developerToken && { 'developer-token': developerToken }),
        'login-customer-id': customerId,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list manager links: ${errorText}`);
    }

    const data = await response.json() as { 
      results?: Array<{ customerManagerLink: GoogleAdsManagerLink }> 
    };
    
    return data.results?.map(r => r.customerManagerLink) || [];
  } catch (error) {
    console.error(`[GoogleAds] Failed to list manager links for ${customerId}:`, error);
    throw error;
  }
}

/**
 * Check if a specific MCC has an active link to the customer account
 */
export async function checkManagerLink(
  auth: AuthResult,
  customerId: string,
  managerCustomerId: string
): Promise<{ found: boolean; status?: string }> {
  try {
    const links = await listManagerLinks(auth, customerId);
    
    // Manager customer format is "customers/123456789"
    const managerResourceName = managerCustomerId.startsWith('customers/') 
      ? managerCustomerId 
      : `customers/${managerCustomerId}`;
    
    const link = links.find(l => 
      l.managerCustomer === managerResourceName || 
      l.managerCustomer?.includes(managerCustomerId)
    );
    
    if (!link) {
      return { found: false };
    }
    
    return { 
      found: true, 
      status: link.status 
    };
  } catch (error) {
    console.error(`[GoogleAds] checkManagerLink error:`, error);
    throw error;
  }
}

// ─── User Access Operations ────────────────────────────────────────────────────

/**
 * List customer user access links
 * Shows which users have access to the account
 */
export async function listUserAccessLinks(auth: AuthResult, customerId: string): Promise<GoogleAdsAccessRole[]> {
  const developerToken = getDeveloperToken();
  
  const query = `
    SELECT 
      customer_user_access.user_id,
      customer_user_access.email_address,
      customer_user_access.access_role,
      customer_user_access.resource_name
    FROM customer_user_access
  `;

  try {
    const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
        'Content-Type': 'application/json',
        ...(developerToken && { 'developer-token': developerToken }),
        'login-customer-id': customerId,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list user access: ${errorText}`);
    }

    const data = await response.json() as { 
      results?: Array<{ customerUserAccess: { emailAddress: string; accessRole: string } }> 
    };
    
    return data.results?.map(r => ({
      customerId,
      emailAddress: r.customerUserAccess.emailAddress,
      accessRole: r.customerUserAccess.accessRole as GoogleAdsAccessRole['accessRole'],
    })) || [];
  } catch (error) {
    console.error(`[GoogleAds] Failed to list user access for ${customerId}:`, error);
    throw error;
  }
}

/**
 * Check if a user has access to a customer account
 */
export async function checkUserAccess(
  auth: AuthResult,
  customerId: string,
  userEmail: string
): Promise<{ found: boolean; accessRole?: string }> {
  try {
    const accessLinks = await listUserAccessLinks(auth, customerId);
    
    const userAccess = accessLinks.find(a => 
      a.emailAddress?.toLowerCase() === userEmail.toLowerCase()
    );
    
    if (!userAccess) {
      return { found: false };
    }
    
    return { 
      found: true, 
      accessRole: userAccess.accessRole 
    };
  } catch (error) {
    console.error(`[GoogleAds] checkUserAccess error:`, error);
    throw error;
  }
}

// ─── Combined Operations ───────────────────────────────────────────────────────

/**
 * Get all accessible accounts with their details
 */
export async function listAllCustomers(auth: AuthResult): Promise<{ id: string; name: string; isManager: boolean }[]> {
  const resourceNames = await listAccessibleCustomers(auth);
  const customers: { id: string; name: string; isManager: boolean }[] = [];
  
  for (const resourceName of resourceNames) {
    // Extract customer ID from resource name (format: "customers/123456789")
    const customerId = resourceName.replace('customers/', '');
    
    try {
      const customer = await getCustomer(auth, customerId);
      if (customer) {
        customers.push({
          id: customer.id || customerId,
          name: customer.descriptiveName || `Account ${customerId}`,
          isManager: customer.manager || false,
        });
      } else {
        // If we can't get details, still include the account
        customers.push({
          id: customerId,
          name: `Account ${customerId}`,
          isManager: false,
        });
      }
    } catch (error) {
      // Skip accounts we can't access details for
      customers.push({
        id: customerId,
        name: `Account ${customerId}`,
        isManager: false,
      });
    }
  }
  
  return customers;
}

// ─── User Access Invitation Operations ─────────────────────────────────────────

/**
 * Create a user access invitation
 * This sends an invitation to a user to access the customer account
 */
export async function createUserAccessInvitation(
  auth: AuthResult,
  customerId: string,
  userEmail: string,
  accessRole: GoogleAdsAccessRole['accessRole']
): Promise<{ resourceName: string; emailAddress: string; accessRole: string }> {
  const developerToken = getDeveloperToken();
  
  // Google Ads API: Create customer_user_access_invitation
  const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/customerUserAccessInvitations:mutate`, {
    method: 'POST',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(developerToken && { 'developer-token': developerToken }),
      'login-customer-id': customerId,
    },
    body: JSON.stringify({
      operation: {
        create: {
          emailAddress: userEmail,
          accessRole: accessRole,
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create user access invitation: ${errorText}`);
  }

  const data = await response.json() as { 
    result: { resourceName: string; emailAddress: string; accessRole: string } 
  };
  
  return data.result;
}

// ─── User Access Removal Operations ────────────────────────────────────────────

/**
 * Remove a user's access from a customer account.
 * Uses the Google Ads API to remove customerUserAccess by resource name.
 */
export async function removeUserAccess(
  auth: AuthResult,
  customerId: string,
  userEmail: string
): Promise<{ removed: boolean; resourceName?: string }> {
  // First, find the user's access link to get the resource name
  const accessLinks = await listUserAccessLinks(auth, customerId);
  const userAccess = accessLinks.find(a =>
    a.emailAddress?.toLowerCase() === userEmail.toLowerCase()
  );

  if (!userAccess) {
    return { removed: false };
  }

  const developerToken = getDeveloperToken();

  // The resource name from the GAQL query is formatted as
  // customers/{customerId}/customerUserAccesses/{userId}
  // We need to construct it if we only have userId
  const resourceName = `customers/${customerId}/customerUserAccesses/${(userAccess as any).userId || ''}`;

  // Use the search query to get the full resource name
  const query = `
    SELECT
      customer_user_access.resource_name,
      customer_user_access.email_address,
      customer_user_access.user_id
    FROM customer_user_access
    WHERE customer_user_access.email_address = '${userEmail}'
  `;

  const searchResponse = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(developerToken && { 'developer-token': developerToken }),
      'login-customer-id': customerId,
    },
    body: JSON.stringify({ query }),
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    throw new Error(`Failed to find user access for removal: ${errorText}`);
  }

  const searchData = await searchResponse.json() as {
    results?: Array<{ customerUserAccess: { resourceName: string; emailAddress: string; userId: string } }>
  };

  const result = searchData.results?.[0];
  if (!result) {
    return { removed: false };
  }

  const fullResourceName = result.customerUserAccess.resourceName;

  // Mutate: remove the user access
  const mutateResponse = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${customerId}/customerUserAccesses:mutate`, {
    method: 'POST',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(developerToken && { 'developer-token': developerToken }),
      'login-customer-id': customerId,
    },
    body: JSON.stringify({
      operation: {
        remove: fullResourceName,
      }
    }),
  });

  if (!mutateResponse.ok) {
    const errorText = await mutateResponse.text();
    throw new Error(`Failed to remove user access: ${errorText}`);
  }

  return { removed: true, resourceName: fullResourceName };
}

// ─── Manager Link Operations (Creation) ────────────────────────────────────────

/**
 * Create a customer client link from MCC to client account
 * This must be called from the MCC (manager) account's perspective
 * Note: This creates a link request that the client account must approve
 */
export async function createManagerClientLink(
  auth: AuthResult,
  managerCustomerId: string,
  clientCustomerId: string
): Promise<{ resourceName: string; status: string }> {
  const developerToken = getDeveloperToken();
  
  // Google Ads API: Create customer_client_link from MCC side
  const response = await fetch(`${GOOGLE_ADS_API_BASE}/customers/${managerCustomerId}/customerClientLinks:mutate`, {
    method: 'POST',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(developerToken && { 'developer-token': developerToken }),
      'login-customer-id': managerCustomerId,
    },
    body: JSON.stringify({
      operation: {
        create: {
          clientCustomer: `customers/${clientCustomerId}`,
          status: 'PENDING',
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create manager client link: ${errorText}`);
  }

  const data = await response.json() as { 
    result: { resourceName: string; status: string } 
  };
  
  return data.result;
}

/**
 * Accept/update a manager link status from the client account side
 * This is used when the client approves the link request from MCC
 */
export async function updateManagerLinkStatus(
  auth: AuthResult,
  customerId: string,
  managerLinkResourceName: string,
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELED'
): Promise<{ resourceName: string; status: string }> {
  const developerToken = getDeveloperToken();
  
  const response = await fetch(`${GOOGLE_ADS_API_BASE}/${managerLinkResourceName}:mutate`, {
    method: 'POST',
    headers: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
      ...(developerToken && { 'developer-token': developerToken }),
      'login-customer-id': customerId,
    },
    body: JSON.stringify({
      operation: {
        update: {
          resourceName: managerLinkResourceName,
          status: status,
        },
        updateMask: 'status'
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update manager link: ${errorText}`);
  }

  const data = await response.json() as { 
    result: { resourceName: string; status: string } 
  };
  
  return data.result;
}
