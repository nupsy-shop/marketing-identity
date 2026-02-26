import { z } from 'zod';

export const NamedInviteAgencySchema = z.object({
  humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED']).optional(),
  agencyGroupEmail: z.string().email().optional(),
  namingTemplate: z.string().optional(),
});

export const ProxyTokenAgencySchema = z.object({
  appName: z.string().min(1).describe('Name of the custom app or integration'),
  apiScopes: z.string().optional().describe('Comma-separated list of required API scopes'),
});

export const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED']),
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN']).optional(),
  identityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY']).optional(),
  agencyIdentityId: z.string().uuid().optional(),
  pamNamingTemplate: z.string().optional(),
  integrationIdentityId: z.string().uuid().optional(),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().default(60),
  pamApprovalRequired: z.boolean().optional().default(false),
  pamConfirmation: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.pamOwnership === 'CLIENT_OWNED') return;
  if (data.pamOwnership === 'AGENCY_OWNED' && !data.identityPurpose)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityPurpose required', path: ['identityPurpose'] });
  if (data.identityPurpose === 'HUMAN_INTERACTIVE' && !data.identityStrategy)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'identityStrategy required', path: ['identityStrategy'] });
  if (data.identityStrategy === 'STATIC_AGENCY_IDENTITY' && !data.agencyIdentityId)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'agencyIdentityId required', path: ['agencyIdentityId'] });
  if (data.identityStrategy === 'CLIENT_DEDICATED_IDENTITY' && !data.pamNamingTemplate)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pamNamingTemplate required', path: ['pamNamingTemplate'] });
  if (data.identityPurpose === 'INTEGRATION_NON_HUMAN' && !data.integrationIdentityId)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'integrationIdentityId required', path: ['integrationIdentityId'] });
});
