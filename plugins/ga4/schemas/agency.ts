/**
 * Google Analytics 4 Plugin - Agency Config Schemas
 * Zod schemas for agency configuration based on access item type
 * 
 * IMPORTANT: These schemas are aligned with the top-level PAM gating logic.
 * For SHARED_ACCOUNT (PAM), only relevant fields are included based on:
 * - pamOwnership (CLIENT_OWNED vs AGENCY_OWNED)
 * - identityPurpose (HUMAN_INTERACTIVE vs INTEGRATION_NON_HUMAN)
 */

import { z } from 'zod';

// ─── Named Invite Schema ────────────────────────────────────────────────────

export const NamedInviteAgencySchema = z.object({
  identityPurpose: z.literal('HUMAN_INTERACTIVE').optional(),
  humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED'])
    .optional()
    .describe('How agency users will access the client property'),
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Google Group email for agency team access'),
  namingTemplate: z.string()
    .optional()
    .describe('Template for client-dedicated identities (e.g., {clientSlug}-ga4@agency.com)'),
}).refine(
  (data) => {
    // If AGENCY_GROUP is selected, agencyGroupEmail is required
    if (data.humanIdentityStrategy === 'AGENCY_GROUP' && !data.agencyGroupEmail) {
      return false;
    }
    // If CLIENT_DEDICATED is selected, namingTemplate is required
    if (data.humanIdentityStrategy === 'CLIENT_DEDICATED' && !data.namingTemplate) {
      return false;
    }
    return true;
  },
  {
    message: 'AGENCY_GROUP requires agencyGroupEmail, CLIENT_DEDICATED requires namingTemplate'
  }
);

// ─── Group/Service Account Schema ─────────────────────────────────────────

export const GroupAccessAgencySchema = z.object({
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN'])
    .default('INTEGRATION_NON_HUMAN')
    .describe('Purpose of the service account access'),
  serviceAccountEmail: z.string()
    .email('Must be a valid service account email')
    .optional()
    .describe('Service account email for API access'),
  ssoGroupName: z.string()
    .optional()
    .describe('SSO group name for federated access'),
  integrationIdentityId: z.string()
    .uuid()
    .optional()
    .describe('Reference to a managed integration identity'),
}).refine(
  (data) => {
    // At least one of these should be provided
    return data.serviceAccountEmail || data.ssoGroupName || data.integrationIdentityId;
  },
  {
    message: 'At least one of serviceAccountEmail, ssoGroupName, or integrationIdentityId is required'
  }
);

// ─── Shared Account (PAM) Schema ──────────────────────────────────────────
// This is the CLEANED UP schema aligned with PAM gating logic.
// Key changes from legacy:
// - Removed redundant fields that duplicate top-level PAM gating
// - pamOwnership drives whether client provides credentials or agency manages identity
// - For AGENCY_OWNED: identityPurpose drives field visibility

export const SharedAccountAgencySchema = z.object({
  // ===== OWNERSHIP (Required) =====
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns and manages the shared account credentials'),
  
  // ===== AGENCY_OWNED ONLY: Identity Purpose =====
  // (CLIENT_OWNED doesn't need these - client just provides credentials)
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN'])
    .optional()
    .describe('Purpose of the shared account'),
  
  // ===== HUMAN_INTERACTIVE: Identity Strategy =====
  identityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY'])
    .optional()
    .describe('How the human identity is determined'),
  
  // For STATIC_AGENCY_IDENTITY: Use existing agency identity from integration_identities table
  agencyIdentityId: z.string()
    .uuid()
    .optional()
    .describe('Reference to agency identity from integration_identities table'),
  
  // For CLIENT_DEDICATED_IDENTITY: Generate per-client identity
  dedicatedIdentityType: z.enum(['GROUP', 'MAILBOX'])
    .optional()
    .describe('Type of client-dedicated identity'),
  pamNamingTemplate: z.string()
    .optional()
    .describe('Template for generating client-dedicated identity'),
  
  // ===== INTEGRATION_NON_HUMAN: Integration Identity =====
  integrationIdentityId: z.string()
    .uuid()
    .optional()
    .describe('Reference to integration/service account identity'),
  
  // ===== PAM Session Settings (AGENCY_OWNED only) =====
  pamCheckoutDurationMinutes: z.number()
    .min(5, 'Minimum checkout duration is 5 minutes')
    .max(480, 'Maximum checkout duration is 8 hours')
    .optional()
    .default(60)
    .describe('Maximum checkout duration in minutes'),
  pamApprovalRequired: z.boolean()
    .optional()
    .default(false)
    .describe('Require approval before checkout'),
  
  // ===== Security Confirmation (for not_recommended PAM) =====
  pamConfirmation: z.boolean()
    .optional()
    .describe('Confirm understanding of shared credential risks'),
}).superRefine((data, ctx) => {
  // Validation rules based on PAM gating logic
  
  // Rule 1: CLIENT_OWNED doesn't need identity fields
  if (data.pamOwnership === 'CLIENT_OWNED') {
    // No additional validation needed - client provides credentials during onboarding
    return;
  }
  
  // Rule 2: AGENCY_OWNED requires identityPurpose
  if (data.pamOwnership === 'AGENCY_OWNED' && !data.identityPurpose) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'identityPurpose is required for AGENCY_OWNED',
      path: ['identityPurpose'],
    });
  }
  
  // Rule 3: HUMAN_INTERACTIVE requires identityStrategy
  if (data.identityPurpose === 'HUMAN_INTERACTIVE' && !data.identityStrategy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'identityStrategy is required for HUMAN_INTERACTIVE',
      path: ['identityStrategy'],
    });
  }
  
  // Rule 4: STATIC_AGENCY_IDENTITY requires agencyIdentityId
  if (data.identityStrategy === 'STATIC_AGENCY_IDENTITY' && !data.agencyIdentityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'agencyIdentityId is required for STATIC_AGENCY_IDENTITY',
      path: ['agencyIdentityId'],
    });
  }
  
  // Rule 5: CLIENT_DEDICATED_IDENTITY requires naming template
  if (data.identityStrategy === 'CLIENT_DEDICATED_IDENTITY' && !data.pamNamingTemplate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'pamNamingTemplate is required for CLIENT_DEDICATED_IDENTITY',
      path: ['pamNamingTemplate'],
    });
  }
  
  // Rule 6: INTEGRATION_NON_HUMAN requires integrationIdentityId
  if (data.identityPurpose === 'INTEGRATION_NON_HUMAN' && !data.integrationIdentityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'integrationIdentityId is required for INTEGRATION_NON_HUMAN',
      path: ['integrationIdentityId'],
    });
  }
});

// Type exports for use in other modules
export type NamedInviteAgencyConfig = z.infer<typeof NamedInviteAgencySchema>;
export type GroupAccessAgencyConfig = z.infer<typeof GroupAccessAgencySchema>;
export type SharedAccountAgencyConfig = z.infer<typeof SharedAccountAgencySchema>;
