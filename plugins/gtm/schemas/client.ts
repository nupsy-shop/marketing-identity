import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ containerId: z.string().min(1).describe('GTM Container ID (GTM-XXXXX)'), accountId: z.string().optional() });
export const GroupAccessClientSchema = z.object({ containerId: z.string().min(1).describe('GTM Container ID') });
export const SharedAccountClientSchema = z.object({ containerId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
