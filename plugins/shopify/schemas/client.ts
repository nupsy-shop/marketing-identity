import { z } from 'zod';

export const NamedInviteClientSchema = z.object({
  storeDomain: z.string().min(1).describe('Shopify store domain (e.g., mystore.myshopify.com)'),
});

export const ProxyTokenClientSchema = z.object({
  storeDomain: z.string().min(1).describe('Shopify store domain (e.g., mystore.myshopify.com)'),
  apiKey: z.string().optional().describe('API key or access token'),
});

export const SharedAccountClientSchema = z.object({
  storeDomain: z.string().min(1).describe('Shopify store domain'),
  accountEmail: z.string().email().optional(),
  accountPassword: z.string().min(8).optional(),
});
