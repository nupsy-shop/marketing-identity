// In-memory data stores
// In production, replace these with database calls

import { Client, AccessRequest, PlatformAccount, Grant, User } from '@/types';

// Storage arrays
export const clients: Client[] = [];
export const accessRequests: AccessRequest[] = [];
export const platformAccounts: PlatformAccount[] = [];
export const grants: Grant[] = [];
export const users: User[] = [
  {
    id: 'admin-1',
    email: 'admin@agency.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date()
  }
];

// Helper functions for data access
// These provide a clean interface that can be easily replaced with database queries

// Clients
export function addClient(client: Client): Client {
  clients.push(client);
  return client;
}

export function getClientById(id: string): Client | undefined {
  return clients.find(c => c.id === id);
}

export function getAllClients(): Client[] {
  return clients;
}

export function updateClient(id: string, updates: Partial<Client>): Client | undefined {
  const client = getClientById(id);
  if (client) {
    Object.assign(client, updates, { updatedAt: new Date() });
  }
  return client;
}

// Access Requests
export function addAccessRequest(request: AccessRequest): AccessRequest {
  accessRequests.push(request);
  return request;
}

export function getAccessRequestById(id: string): AccessRequest | undefined {
  return accessRequests.find(r => r.id === id);
}

export function getAccessRequestByToken(token: string): AccessRequest | undefined {
  return accessRequests.find(r => r.token === token);
}

export function getAccessRequestsByClientId(clientId: string): AccessRequest[] {
  return accessRequests.filter(r => r.clientId === clientId);
}

export function updateAccessRequest(id: string, updates: Partial<AccessRequest>): AccessRequest | undefined {
  const request = getAccessRequestById(id);
  if (request) {
    Object.assign(request, updates, { updatedAt: new Date() });
  }
  return request;
}

// Platform Accounts
export function addPlatformAccount(account: PlatformAccount): PlatformAccount {
  platformAccounts.push(account);
  return account;
}

export function getPlatformAccountsByClientId(clientId: string): PlatformAccount[] {
  return platformAccounts.filter(a => a.clientId === clientId);
}

export function getPlatformAccountById(id: string): PlatformAccount | undefined {
  return platformAccounts.find(a => a.id === id);
}

// Grants
export function addGrant(grant: Grant): Grant {
  grants.push(grant);
  return grant;
}

export function getGrantsByUserId(userId: string): Grant[] {
  return grants.filter(g => g.userId === userId && !g.revokedAt);
}

export function revokeGrant(grantId: string): Grant | undefined {
  const grant = grants.find(g => g.id === grantId);
  if (grant) {
    grant.revokedAt = new Date();
  }
  return grant;
}

// Users
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}
