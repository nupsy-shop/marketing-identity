import { z } from 'zod';
export const PartnerDelegationClientSchema = z.object({ profileId: z.string().min(1).describe('Amazon Ads Profile ID') });
export const NamedInviteClientSchema = z.object({ profileId: z.string().min(1).describe('Amazon Ads Profile ID') });
export const SharedAccountClientSchema = z.object({ profileId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
