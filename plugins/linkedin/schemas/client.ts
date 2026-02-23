import { z } from 'zod';
export const PartnerDelegationClientSchema = z.object({ adAccountId: z.string().min(1).describe('Client Ad Account ID') });
export const NamedInviteClientSchema = z.object({ adAccountId: z.string().min(1).describe('Client Ad Account ID') });
export const SharedAccountClientSchema = z.object({ adAccountId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
