/**
 * Salesforce REST API - User & Permission Management
 * Docs: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta
 */

export interface SalesforceUser {
  Id: string;
  Username: string;
  Email: string;
  Name: string;
  IsActive: boolean;
  ProfileId?: string;
  UserRoleId?: string;
}

export interface SalesforceOrg {
  id: string;
  name: string;
  instanceUrl: string;
}

async function sfGet<T>(instanceUrl: string, path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${instanceUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<T>;
}

async function sfPost<T>(instanceUrl: string, path: string, accessToken: string, data: any): Promise<T> {
  const res = await fetch(`${instanceUrl}${path}`, {
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

async function sfPatch(instanceUrl: string, path: string, accessToken: string, data: any): Promise<void> {
  const res = await fetch(`${instanceUrl}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`HTTP ${res.status}: ${res.statusText}`), { body: text });
  }
}

/** Get org info */
export async function getOrgInfo(instanceUrl: string, accessToken: string): Promise<SalesforceOrg> {
  const data = await sfGet<any>(instanceUrl, '/services/data/v59.0/sobjects/Organization', accessToken);
  return { id: data.Id, name: data.Name, instanceUrl };
}

/** Query users by email */
export async function findUserByEmail(instanceUrl: string, accessToken: string, email: string): Promise<SalesforceUser | null> {
  const q = encodeURIComponent(`SELECT Id,Username,Email,Name,IsActive,ProfileId,UserRoleId FROM User WHERE Email='${email}' LIMIT 1`);
  const data = await sfGet<{ records: SalesforceUser[] }>(instanceUrl, `/services/data/v59.0/query?q=${q}`, accessToken);
  return data.records?.[0] || null;
}

/** List profiles (for role mapping) */
export async function listProfiles(instanceUrl: string, accessToken: string): Promise<{ Id: string; Name: string }[]> {
  const q = encodeURIComponent('SELECT Id,Name FROM Profile ORDER BY Name LIMIT 100');
  const data = await sfGet<{ records: { Id: string; Name: string }[] }>(instanceUrl, `/services/data/v59.0/query?q=${q}`, accessToken);
  return data.records || [];
}

/** List permission sets */
export async function listPermissionSets(instanceUrl: string, accessToken: string): Promise<{ Id: string; Name: string; Label: string }[]> {
  const q = encodeURIComponent('SELECT Id,Name,Label FROM PermissionSet WHERE IsCustom=true ORDER BY Label LIMIT 100');
  const data = await sfGet<{ records: any[] }>(instanceUrl, `/services/data/v59.0/query?q=${q}`, accessToken);
  return data.records || [];
}

/** Assign a permission set to a user */
export async function assignPermissionSet(instanceUrl: string, accessToken: string, userId: string, permissionSetId: string): Promise<{ id: string }> {
  return sfPost<{ id: string }>(instanceUrl, '/services/data/v59.0/sobjects/PermissionSetAssignment', accessToken, {
    AssigneeId: userId, PermissionSetId: permissionSetId,
  });
}

/** Check if user has a specific permission set */
export async function getUserPermissionSets(instanceUrl: string, accessToken: string, userId: string): Promise<{ PermissionSetId: string; PermissionSet: { Name: string; Label: string } }[]> {
  const q = encodeURIComponent(`SELECT PermissionSetId,PermissionSet.Name,PermissionSet.Label FROM PermissionSetAssignment WHERE AssigneeId='${userId}'`);
  const data = await sfGet<{ records: any[] }>(instanceUrl, `/services/data/v59.0/query?q=${q}`, accessToken);
  return data.records || [];
}

/** Deactivate a user */
export async function deactivateUser(instanceUrl: string, accessToken: string, userId: string): Promise<void> {
  return sfPatch(instanceUrl, `/services/data/v59.0/sobjects/User/${userId}`, accessToken, { IsActive: false });
}

/** Get identity info from token */
export async function getIdentity(instanceUrl: string, accessToken: string): Promise<{ user_id: string; organization_id: string; display_name: string; email: string }> {
  return sfGet<any>(instanceUrl, '/services/oauth2/userinfo', accessToken);
}
