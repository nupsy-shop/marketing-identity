import { z } from 'zod';
export const PartnerDelegationAgencySchema = z.object({ agencyId: z.string().min(1).describe('Agency entity ID') });
export const NamedInviteAgencySchema = z.object({ humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED']).optional(), agencyGroupEmail: z.string().email().optional(), namingTemplate: z.string().optional() });
export const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED']),
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN']).optional(),
  identityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY']).optional(),
  agencyIdentityId: z.string().uuid().optional(), pamNamingTemplate: z.string().optional(), integrationIdentityId: z.string().uuid().optional(),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().default(60), pamApprovalRequired: z.boolean().optional().default(false), pamConfirmation: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.pamOwnership === 'CLIENT_OWNED') return;
  if (data.pamOwnership === 'AGENCY_OWNED' && !data.identityPurpose) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityPurpose required', path: ['identityPurpose'] });
});
