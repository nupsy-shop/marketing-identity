/**
 * Google Analytics 4 Plugin - Client Target Schemas
 * Zod schemas for client-provided target information
 */

import { z } from 'zod';

// ─── Common Client Schema ──────────────────────────────────────────────────

export const CommonClientSchema = z.object({
  propertyId: z.string()
    .min(1, 'Property ID is required')
    .regex(/^\d+$/, 'Property ID must be numeric')
    .describe('GA4 Property ID (numeric)'),
  propertyName: z.string()
    .optional()
    .describe('Property name for reference'),
  accountId: z.string()
    .optional()
    .describe('GA4 Account ID (for context)'),
});

// ─── Named Invite Client Schema ───────────────────────────────────────────

export const NamedInviteClientSchema = CommonClientSchema;

// ─── Group/Service Account Client Schema ──────────────────────────────────

export const GroupAccessClientSchema = CommonClientSchema;

// ─── Shared Account (PAM) Client Schema ───────────────────────────────────
// For CLIENT_OWNED PAM, client provides credentials during onboarding

export const SharedAccountClientSchema = z.object({
  propertyId: z.string()
    .min(1, 'Property ID is required')
    .describe('GA4 Property ID'),
  propertyName: z.string()
    .optional()
    .describe('Property name for reference'),
  
  // CLIENT_OWNED PAM: Client provides these during onboarding
  // (Not stored in initial configuration, but validated when submitted)
  accountEmail: z.string()
    .email('Must be a valid email')
    .optional()
    .describe('Account email for shared login'),
  accountPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .optional()
    .describe('Account password (will be encrypted)'),
});

// Type exports
export type CommonClientTarget = z.infer<typeof CommonClientSchema>;
export type NamedInviteClientTarget = z.infer<typeof NamedInviteClientSchema>;
export type GroupAccessClientTarget = z.infer<typeof GroupAccessClientSchema>;
export type SharedAccountClientTarget = z.infer<typeof SharedAccountClientSchema>;
