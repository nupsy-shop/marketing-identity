/**
 * Amazon Ads Plugin - Full Implementation
 * Uses Amazon Advertising API (Login with Amazon OAuth) for discovery.
 * User management is manual (no public API for user/access provisioning).
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { AMAZON_ADS_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { generateState } from '../common/utils/auth';

class AmazonAdsPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'amazon-ads';
  readonly manifest: PluginManifest = AMAZON_ADS_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[AmazonAdsPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const clientId = process.env.AMAZON_ADS_CLIENT_ID;
    if (!clientId || clientId.startsWith('PLACEHOLDER_')) throw new Error('Amazon Ads OAuth not configured. Set AMAZON_ADS_CLIENT_ID and AMAZON_ADS_CLIENT_SECRET.');
    const state = generateState();
    const scopes = context.scopes || ['advertising::campaign_management'];
    const params = new URLSearchParams({ client_id: clientId, scope: scopes.join(' '), response_type: 'code', redirect_uri: context.redirectUri, state });
    return { authUrl: `https://www.amazon.com/ap/oa?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.AMAZON_ADS_CLIENT_ID!;
      const clientSecret = process.env.AMAZON_ADS_CLIENT_SECRET!;
      const res = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() };
    } catch (e) { return { success: false, error: `Amazon OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch('https://advertising-api.amazon.com/v2/profiles', { headers: { Authorization: `Bearer ${auth.accessToken}`, 'Amazon-Advertising-API-ClientId': process.env.AMAZON_ADS_CLIENT_ID || '' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const profiles = await res.json();
      const targets = (profiles || []).map((p: any) => ({ targetType: 'PROFILE', externalId: String(p.profileId), displayName: p.accountInfo?.name || `Profile ${p.profileId}`, metadata: { countryCode: p.countryCode, currencyCode: p.currencyCode, accountType: p.accountInfo?.type } }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Amazon Advertising does not expose a public API for user access management. Manage users via: advertising.amazon.com > Account Settings > User Management.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Amazon Advertising does not expose a public API for verifying user access.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'Amazon Advertising does not expose a public API for revoking user access.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }
  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getAgencyConfigSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    return [{ step: 1, title: 'Open Amazon Advertising', description: 'Go to advertising.amazon.com', link: { url: 'https://advertising.amazon.com', label: 'Open Amazon Ads' } }, { step: 2, title: 'Account Settings > User Management', description: `Invite user with "${ctx.roleTemplate}" role.` }];
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' }; }
}

export default new AmazonAdsPlugin();
export { AmazonAdsPlugin };
