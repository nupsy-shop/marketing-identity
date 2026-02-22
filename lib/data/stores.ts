// In-memory data stores
// In production, replace these with database calls

import { Client, User } from '@/types';

// Enhanced AccessRequest structure for enterprise features
export interface AccessRequestItem {
  id: string;
  platformId: string;
  accessPattern: string; // e.g., '1 (Partner Hub)', '2 (Named Invites)'
  role: string; // e.g., 'Admin', 'Standard', 'Viewer'
  assetType?: string; // For Tier 1: 'Ad Account', 'Business Manager', 'Page', 'Pixel'
  assetId?: string; // Client-provided or auto-discovered asset ID
  assetName?: string; // Human-readable asset name
  status: string; // 'pending', 'validated', 'failed'
  validatedAt?: Date;
  validatedBy?: string;
  notes?: string;
}

export interface EnhancedAccessRequest {
  id: string;
  clientId: string;
  token: string;
  items: AccessRequestItem[]; // Changed from platformStatuses to items
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// Storage arrays
export const clients: Client[] = [];
export const accessRequests: EnhancedAccessRequest[] = [];
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
export function addAccessRequest(request: EnhancedAccessRequest): EnhancedAccessRequest {
  accessRequests.push(request);
  return request;
}

export function getAccessRequestById(id: string): EnhancedAccessRequest | undefined {
  return accessRequests.find(r => r.id === id);
}

export function getAccessRequestByToken(token: string): EnhancedAccessRequest | undefined {
  return accessRequests.find(r => r.token === token);
}

export function getAccessRequestsByClientId(clientId: string): EnhancedAccessRequest[] {
  return accessRequests.filter(r => r.clientId === clientId);
}

export function updateAccessRequest(id: string, updates: Partial<EnhancedAccessRequest>): EnhancedAccessRequest | undefined {
  const request = getAccessRequestById(id);
  if (request) {
    Object.assign(request, updates, { updatedAt: new Date() });
  }
  return request;
}

// Users
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}
