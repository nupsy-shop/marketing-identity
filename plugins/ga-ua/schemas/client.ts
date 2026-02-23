import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ propertyId: z.string().min(1).describe('UA Property ID (UA-XXXXX-X)'), accountId: z.string().optional() });
export const GroupAccessClientSchema = z.object({ propertyId: z.string().min(1).describe('UA Property ID'), viewId: z.string().optional() });
export const SharedAccountClientSchema = z.object({ propertyId: z.string().min(1), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
