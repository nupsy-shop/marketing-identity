/**
 * Shopify Plugin
 * Supports staff invites, API tokens, and PAM. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { SHOPIFY_MANIFEST } from './manifest';
import { NamedInviteAgencySchema, ProxyTokenAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, ProxyTokenClientSchema, SharedAccountClientSchema } from './schemas/client';
import { generateState } from '../common/utils/auth';

class ShopifyPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'shopify';
  readonly manifest: PluginManifest = SHOPIFY_MANIFEST;
  private context: AppContext | null = null;

  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
    if (!apiKey || apiKey.startsWith('PLACEHOLDER_') || !shopDomain)
      throw new Error('Shopify OAuth not configured. Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_SHOP_DOMAIN.');
    const state = generateState();
    const scopes = context.scopes || ['read_products', 'read_orders', 'read_analytics'];
    const params = new URLSearchParams({
      client_id: apiKey,
      scope: scopes.join(','),
      redirect_uri: context.redirectUri,
      state,
    });
    return { authUrl: `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const apiKey = process.env.SHOPIFY_API_KEY!;
      const apiSecret = process.env.SHOPIFY_API_SECRET!;
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN!;
      const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, scopes: data.scope?.split(',') };
    } catch (e) { return { success: false, error: `Shopify OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    return { success: true, targets: [] };
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Shopify does not expose a public API for staff access management. Manage staff via: your-store.myshopify.com/admin > Settings > Users and permissions.', details: { found: false } };
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Shopify does not expose a public API for verifying staff access.', details: { found: false } };
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'Shopify does not expose a public API for revoking staff access.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }

  getAgencyConfigSchema(t: AccessItemType) {
    switch (t) {
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'PROXY_TOKEN': return ProxyTokenAgencySchema;
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema;
      default: return z.object({});
    }
  }

  getClientTargetSchema(t: AccessItemType) {
    switch (t) {
      case 'NAMED_INVITE': return NamedInviteClientSchema;
      case 'PROXY_TOKEN': return ProxyTokenClientSchema;
      case 'SHARED_ACCOUNT': return SharedAccountClientSchema;
      default: return z.object({});
    }
  }

  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult {
    const r = this.getAgencyConfigSchema(t).safeParse(c);
    return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult {
    const r = this.getClientTargetSchema(t).safeParse(c);
    return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open Shopify Admin', description: 'Go to your-store.myshopify.com/admin', link: { url: 'https://admin.shopify.com', label: 'Open Shopify Admin' } },
          { step: 2, title: 'Settings > Users and permissions', description: `Invite staff with "${ctx.roleTemplate}" permissions.` },
        ];
      case 'PROXY_TOKEN':
        return [
          { step: 1, title: 'Open Shopify Admin', description: 'Go to your store admin panel.', link: { url: 'https://admin.shopify.com', label: 'Open Shopify Admin' } },
          { step: 2, title: 'Settings > Apps and sales channels > Develop apps', description: 'Create a custom app and generate an API access token with the requested scopes.' },
        ];
      case 'SHARED_ACCOUNT':
        return [{ step: 1, title: 'Provide Credentials', description: 'Enter store owner email and password.' }];
      default:
        return [];
    }
  }

  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' };
  }
}

export default new ShopifyPlugin();
export { ShopifyPlugin };
