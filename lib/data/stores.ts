// In-memory data stores
// In production, replace these with database calls

import { Client, User } from '@/types';

// ── PAM Checkout Session ───────────────────────────────────────────────────────
export interface PamCheckoutSession {
  id: string;
  requestId: string;
  itemId: string;
  checkedOutBy: string;
  checkedOutAt: Date;
  expiresAt: Date;
  checkedInAt?: Date;
  reason?: string;
  active: boolean;
}

// ── Audit Log ──────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  event: string;
  timestamp: Date;
  actor: string;
  requestId?: string;
  itemId?: string;
  platformId?: string;
  details?: Record<string, unknown>;
}

// ── AccessRequestItem ──────────────────────────────────────────────────────────
export interface AccessRequestItem {
  id: string;
  platformId: string;
  accessPattern: string;
  role: string;
  assetType?: string;
  assetId?: string;
  assetName?: string;
  status: 'pending' | 'validated' | 'failed' | 'needs_evidence';
  validatedAt?: Date;
  validatedBy?: string;
  notes?: string;
  itemType?: string;
  pamOwnership?: 'CLIENT_OWNED' | 'AGENCY_OWNED';
  pamGrantMethod?: 'CREDENTIAL_HANDOFF' | 'INVITE_AGENCY_IDENTITY';
  pamUsername?: string;
  pamSecretRef?: string;
  pamAgencyIdentityEmail?: string;
  pamRoleTemplate?: string;
  validationMode?: 'AUTO' | 'ATTESTATION' | 'EVIDENCE';
  validationResult?: {
    timestamp: Date;
    actor: string;
    mode: string;
    details?: string;
    evidenceRef?: string;
    attestationText?: string;
  };
}

export interface EnhancedAccessRequest {
  id: string;
  clientId: string;
  token: string;
  items: AccessRequestItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ── Storage ────────────────────────────────────────────────────────────────────
export const clients: Client[] = [];
export const accessRequests: EnhancedAccessRequest[] = [];
export const auditLogs: AuditLog[] = [];
export const pamSessions: PamCheckoutSession[] = [];
export const users: User[] = [
  {
    id: 'admin-1',
    email: 'admin@agency.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date()
  }
];

// ── Client helpers ────────────────────────────────────────────────────────────
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

// ── AccessRequest helpers ──────────────────────────────────────────────────────
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

export function updateAccessRequest(
  id: string,
  updates: Partial<EnhancedAccessRequest>
): EnhancedAccessRequest | undefined {
  const request = getAccessRequestById(id);
  if (request) {
    Object.assign(request, updates, { updatedAt: new Date() });
  }
  return request;
}

// ── Audit log helpers ──────────────────────────────────────────────────────────
export function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
  const entry: AuditLog = { ...log, id: Math.random().toString(36).slice(2), timestamp: new Date() };
  auditLogs.push(entry);
  if (auditLogs.length > 1000) auditLogs.shift();
  return entry;
}

export function getAuditLogs(filter?: { requestId?: string; itemId?: string }): AuditLog[] {
  if (!filter) return [...auditLogs].reverse();
  return auditLogs
    .filter(l => {
      if (filter.requestId && l.requestId !== filter.requestId) return false;
      if (filter.itemId && l.itemId !== filter.itemId) return false;
      return true;
    })
    .reverse();
}

// ── PAM Session helpers ────────────────────────────────────────────────────────
export function addPamSession(session: PamCheckoutSession): PamCheckoutSession {
  pamSessions.push(session);
  return session;
}

export function getPamSessionById(id: string): PamCheckoutSession | undefined {
  return pamSessions.find(s => s.id === id);
}

export function getActivePamSessions(): PamCheckoutSession[] {
  return pamSessions.filter(s => s.active);
}

export function updatePamSession(
  id: string,
  updates: Partial<PamCheckoutSession>
): PamCheckoutSession | undefined {
  const session = getPamSessionById(id);
  if (session) Object.assign(session, updates);
  return session;
}

// ── User helpers ───────────────────────────────────────────────────────────────
export function getUserById(id: string): User | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return users.find(u => u.email === email);
}
