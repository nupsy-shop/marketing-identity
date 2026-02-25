import { z } from 'zod';
export const NamedInviteClientSchema = z.object({
  containerId: z.string().min(1).describe('GTM Container ID (GTM-XXXXX)'),
  containerName: z.string().optional().describe('Container name for reference'),
  accountId: z.string().optional().describe('GTM Account ID (for context)'),
});
export const GroupAccessClientSchema = z.object({
  containerId: z.string().min(1).describe('GTM Container ID'),
  containerName: z.string().optional().describe('Container name for reference'),
});
export const SharedAccountClientSchema = z.object({
  containerId: z.string().min(1).describe('GTM Container ID'),
  containerName: z.string().optional().describe('Container name for reference'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().min(8).optional().describe('Account password (will be encrypted)'),
});
