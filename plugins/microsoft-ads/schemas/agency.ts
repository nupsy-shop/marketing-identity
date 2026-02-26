import { z } from 'zod';
export const PartnerDelegationAgencySchema = z.object({ managerId: z.string().min(1).describe('Microsoft Ads Manager Account ID') });
export const NamedInviteAgencySchema = z.object({ humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS']).optional(), agencyGroupEmail: z.string().email().optional() });
export const SharedAccountAgencySchema = z.object({ pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED']), pamConfirmation: z.boolean().optional() });
