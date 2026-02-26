import { z } from 'zod';
export const PartnerDelegationClientSchema = z.object({ accountId: z.string().min(1).describe('Reddit Ads Account ID') });
export const NamedInviteClientSchema = z.object({ accountId: z.string().min(1).describe('Reddit Ads Account ID') });
export const SharedAccountClientSchema = z.object({ accountId: z.string().min(1), accountEmail: z.string().email().optional() });
