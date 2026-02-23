/**
 * Google Ads Plugin - Client Target Schemas
 */

import { z } from 'zod';

export const CommonClientSchema = z.object({
  adAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Ad Account ID must be in format XXX-XXX-XXXX')
    .describe('Client Google Ads Account ID'),
  adAccountName: z.string().optional()
    .describe('Account name for reference'),
});

export const PartnerDelegationClientSchema = CommonClientSchema;
export const NamedInviteClientSchema = CommonClientSchema;

export const SharedAccountClientSchema = CommonClientSchema.extend({
  accountEmail: z.string().email().optional()
    .describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().min(8).optional()
    .describe('Account password (will be encrypted)'),
});

export type CommonClientTarget = z.infer<typeof CommonClientSchema>;
export type SharedAccountClientTarget = z.infer<typeof SharedAccountClientSchema>;
