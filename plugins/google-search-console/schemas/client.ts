import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ siteUrl: z.string().url().describe('Site URL (with protocol)') });
export const SharedAccountClientSchema = z.object({ siteUrl: z.string().url(), accountEmail: z.string().email().optional(), accountPassword: z.string().min(8).optional() });
