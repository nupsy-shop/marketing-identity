import { z } from 'zod';
export const PartnerDelegationClientSchema = z.object({ accountId: z.string().min(1).describe('Microsoft Ads Account ID'), customerId: z.string().optional() });
export const NamedInviteClientSchema = z.object({ accountId: z.string().min(1).describe('Microsoft Ads Account ID') });
export const SharedAccountClientSchema = z.object({ accountId: z.string().min(1), accountEmail: z.string().email().optional() });
