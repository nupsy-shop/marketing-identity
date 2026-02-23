/**
 * Meta Plugin - Client Target Schemas
 */

import { z } from 'zod';

export const PartnerDelegationClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  businessManagerId: z.string().optional().describe('Client Business Manager ID'),
});

export const NamedInviteClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  pageId: z.string().optional().describe('Facebook Page ID'),
  pixelId: z.string().optional().describe('Facebook Pixel ID'),
});

export const SharedAccountClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().min(8).optional().describe('Account password'),
});
