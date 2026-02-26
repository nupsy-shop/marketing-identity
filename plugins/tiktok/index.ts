/**
 * TikTok Ads Plugin - Full Implementation
 * Uses TikTok Business API for discovery. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { TIKTOK_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { generateState } from '../common/utils/auth';

class TikTokPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'tiktok';
  readonly manifest: PluginManifest = TIKTOK_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[TikTokPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const appId = process.env.TIKTOK_CLIENT_ID;
    if (!appId || appId.startsWith('PLACEHOLDER_')) throw new Error('TikTok OAuth not configured. Set TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET.');
    const state = generateState();
    const params = new URLSearchParams({ app_id: appId, redirect_uri: context.redirectUri, state, response_type: 'code' });
    return { authUrl: `https://business-api.tiktok.com/portal/auth?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const appId = process.env.TIKTOK_CLIENT_ID!;
      const secret = process.env.TIKTOK_CLIENT_SECRET!;
      const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId, secret, auth_code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      if (data.code !== 0) return { success: false, error: `TikTok error: ${data.message}` };
      return { success: true, accessToken: data.data.access_token, scopes: data.data.scope?.split(',') };
    } catch (e) { return { success: false, error: `TikTok OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/', {
        method: 'GET', headers: { 'Access-Token': auth.accessToken! },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.code !== 0) throw new Error(data.message);
      const targets = (data.data?.list || []).map((a: any) => ({ targetType: 'AD_ACCOUNT', externalId: String(a.advertiser_id), displayName: a.advertiser_name || `Account ${a.advertiser_id}` }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'TikTok Business Center does not expose a public API for user access management. Manage access via: ads.tiktok.com > Business Center > Members.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'TikTok does not expose a public API for verifying member access. Check via TikTok Business Center.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'TikTok does not expose a public API for revoking member access. Remove via TikTok Business Center.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }
  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getAgencyConfigSchema(t).safeParse(c); if (r.success) return { valid: true, errors: [] }; return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open TikTok Ads Manager', description: 'Go to ads.tiktok.com', link: { url: 'https://ads.tiktok.com', label: 'Open TikTok Ads' } }, { step: 2, title: 'Business Center > Members', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Manual verification required' }; }
}

export default new TikTokPlugin();
export { TikTokPlugin };
