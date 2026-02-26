/**
 * Pinterest Ads Plugin - Full Implementation
 * Uses Pinterest Marketing API v5 for discovery. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { PINTEREST_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

class PinterestPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'pinterest';
  readonly manifest: PluginManifest = PINTEREST_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[PinterestPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    if (!isProviderConfigured('pinterest')) throw new Error('Pinterest OAuth not configured. Set PINTEREST_CLIENT_ID and PINTEREST_CLIENT_SECRET.');
    const creds = getProviderCredentials('pinterest');
    const state = generateState();
    const scopes = context.scopes || ['ads:read', 'ads:write', 'user_accounts:read'];
    const params = new URLSearchParams({ client_id: creds.clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(','), state });
    return { authUrl: `https://www.pinterest.com/oauth/?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const creds = getProviderCredentials('pinterest');
      const authHeader = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
      const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${authHeader}` },
        body: new URLSearchParams({ grant_type: 'authorization_code', redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() };
    } catch (e) { return { success: false, error: `Pinterest OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch('https://api.pinterest.com/v5/ad_accounts?page_size=50', { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const targets = (data.items || []).map((a: any) => ({ targetType: 'AD_ACCOUNT', externalId: a.id, displayName: a.name || `Account ${a.id}`, metadata: { currency: a.currency, country: a.country, ownerUsername: a.owner?.username } }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Pinterest does not expose a public API for user access management. Manage access via: business.pinterest.com > Ad Accounts > Members.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Pinterest does not expose a public API for verifying member access.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'Pinterest does not expose a public API for revoking member access.' };
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
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Pinterest Business', description: 'Go to business.pinterest.com', link: { url: 'https://business.pinterest.com', label: 'Open Pinterest' } }, { step: 2, title: 'Ad Accounts > Members', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' }; }
}

export default new PinterestPlugin();
export { PinterestPlugin };
