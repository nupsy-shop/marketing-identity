import { z } from 'zod';
export const NamedInviteClientSchema = z.object({ accountIdentifier: z.string().min(1).describe('Snowflake Account Identifier (org-account)'), warehouse: z.string().optional() });
export const GroupAccessClientSchema = z.object({ accountIdentifier: z.string().min(1).describe('Snowflake Account Identifier'), database: z.string().optional(), schema: z.string().optional() });
export const SharedAccountClientSchema = z.object({ accountIdentifier: z.string().min(1), accountUrl: z.string().url().optional(), username: z.string().optional(), password: z.string().min(8).optional() });
