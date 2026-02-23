/**
 * Google Ads Plugin - Agency Config Schemas
 */

import { z } from 'zod';

export const PartnerDelegationAgencySchema = z.object({
  managerAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'MCC ID must be in format XXX-XXX-XXXX')
    .describe('Your Google Ads Manager Account (MCC) ID'),
});

export const NamedInviteAgencySchema = z.object({
  identityPurpose: z.literal('HUMAN_INTERACTIVE').optional(),
  humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED'])
    .optional()
    .describe('How agency users will access the client account'),
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Agency Google Group email for access'),
  namingTemplate: z.string()
    .optional()
    .describe('Template for client-dedicated identities'),
});

export const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns and manages the shared account credentials'),
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN'])
    .optional()
    .describe('Purpose of the shared account'),
  identityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY'])
    .optional()
    .describe('How the human identity is determined'),
  agencyIdentityId: z.string().uuid().optional()
    .describe('Reference to agency identity from integration_identities table'),
  dedicatedIdentityType: z.enum(['GROUP', 'MAILBOX']).optional()
    .describe('Type of client-dedicated identity'),
  pamNamingTemplate: z.string().optional()
    .describe('Template for generating client-dedicated identity'),
  integrationIdentityId: z.string().uuid().optional()
    .describe('Reference to integration/service account identity'),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().default(60)
    .describe('Maximum checkout duration in minutes'),
  pamApprovalRequired: z.boolean().optional().default(false)
    .describe('Require approval before checkout'),
  pamConfirmation: z.boolean().optional()
    .describe('Confirm understanding of shared credential risks'),
}).superRefine((data, ctx) => {
  if (data.pamOwnership === 'CLIENT_OWNED') return;
  if (data.pamOwnership === 'AGENCY_OWNED' && !data.identityPurpose) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityPurpose is required for AGENCY_OWNED', path: ['identityPurpose'] });
  }
  if (data.identityPurpose === 'HUMAN_INTERACTIVE' && !data.identityStrategy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityStrategy is required for HUMAN_INTERACTIVE', path: ['identityStrategy'] });
  }
  if (data.identityStrategy === 'STATIC_AGENCY_IDENTITY' && !data.agencyIdentityId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'agencyIdentityId is required for STATIC_AGENCY_IDENTITY', path: ['agencyIdentityId'] });
  }
  if (data.identityStrategy === 'CLIENT_DEDICATED_IDENTITY' && !data.pamNamingTemplate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pamNamingTemplate is required for CLIENT_DEDICATED_IDENTITY', path: ['pamNamingTemplate'] });
  }
  if (data.identityPurpose === 'INTEGRATION_NON_HUMAN' && !data.integrationIdentityId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'integrationIdentityId is required for INTEGRATION_NON_HUMAN', path: ['integrationIdentityId'] });
  }
});

export type PartnerDelegationAgencyConfig = z.infer<typeof PartnerDelegationAgencySchema>;
export type NamedInviteAgencyConfig = z.infer<typeof NamedInviteAgencySchema>;
export type SharedAccountAgencyConfig = z.infer<typeof SharedAccountAgencySchema>;
