import { z } from 'zod';
export const PartnerDelegationClientSchema = z.object({ advertiserId: z.string().min(1).describe('Client Advertiser ID'), seatId: z.string().optional() });
export const NamedInviteClientSchema = z.object({ advertiserId: z.string().min(1).describe('Client Advertiser ID') });
export const SharedAccountClientSchema = z.object({ advertiserId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
