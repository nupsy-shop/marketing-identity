import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ orgId: z.string().min(1).describe('Salesforce Org ID'), instanceUrl: z.string().url().optional() });
export const GroupAccessClientSchema = z.object({ orgId: z.string().min(1).describe('Salesforce Org ID'), connectedAppName: z.string().optional() });
export const SharedAccountClientSchema = z.object({ orgId: z.string().min(1), instanceUrl: z.string().url().optional(), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional(), securityToken: z.string().optional() });
