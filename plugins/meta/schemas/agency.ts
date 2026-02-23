/**
 * Meta Plugin - Agency Config Schemas
 */

import { z } from 'zod';

export const PartnerDelegationAgencySchema = z.object({
  businessManagerId: z.string().min(1, 'Business Manager ID is required')
    .describe('Your Meta Business Manager ID'),
});

export const NamedInviteAgencySchema = z.object({
  identityPurpose: z.literal('HUMAN_INTERACTIVE').optional(),
  humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED']).optional()
    .describe('How agency users will access client assets'),
  agencyGroupEmail: z.string().email().optional()
    .describe('Agency group email for access'),
  namingTemplate: z.string().optional()
    .describe('Template for client-dedicated identities'),
});

export const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns and manages the shared account credentials'),
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN']).optional()
    .describe('Purpose of the shared account'),
  identityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY']).optional()
    .describe('How the human identity is determined'),
  agencyIdentityId: z.string().uuid().optional()
    .describe('Reference to agency identity'),
  dedicatedIdentityType: z.enum(['GROUP', 'MAILBOX']).optional(),
  pamNamingTemplate: z.string().optional(),
  integrationIdentityId: z.string().uuid().optional(),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().default(60),
  pamApprovalRequired: z.boolean().optional().default(false),
  pamConfirmation: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.pamOwnership === 'CLIENT_OWNED') return;
  if (data.pamOwnership === 'AGENCY_OWNED' && !data.identityPurpose) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityPurpose required for AGENCY_OWNED', path: ['identityPurpose'] });
  }
  if (data.identityPurpose === 'HUMAN_INTERACTIVE' && !data.identityStrategy) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityStrategy required for HUMAN_INTERACTIVE', path: ['identityStrategy'] });
  }
  if (data.identityStrategy === 'STATIC_AGENCY_IDENTITY' && !data.agencyIdentityId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'agencyIdentityId required', path: ['agencyIdentityId'] });
  }
  if (data.identityStrategy === 'CLIENT_DEDICATED_IDENTITY' && !data.pamNamingTemplate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pamNamingTemplate required', path: ['pamNamingTemplate'] });
  }
  if (data.identityPurpose === 'INTEGRATION_NON_HUMAN' && !data.integrationIdentityId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'integrationIdentityId required', path: ['integrationIdentityId'] });
  }
});
