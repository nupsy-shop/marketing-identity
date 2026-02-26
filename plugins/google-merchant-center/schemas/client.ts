import { z } from 'zod';

export const NamedInviteClientSchema = z.object({
  merchantId: z.string().min(1).describe('Merchant Center Account ID'),
});

export const PartnerDelegationClientSchema = z.object({
  merchantId: z.string().min(1).describe('Merchant Center Account ID'),
});

export const SharedAccountClientSchema = z.object({
  merchantId: z.string().min(1).describe('Merchant Center Account ID'),
  accountEmail: z.string().email().optional(),
  accountPassword: z.string().min(8).optional(),
});
