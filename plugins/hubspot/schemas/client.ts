import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ portalId: z.string().min(1).describe('HubSpot Portal ID') });
export const PartnerDelegationClientSchema = z.object({ portalId: z.string().min(1).describe('HubSpot Portal ID') });
export const SharedAccountClientSchema = z.object({ portalId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
