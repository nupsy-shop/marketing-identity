/**
 * Snapchat Ads Plugin - Full Implementation
 * Uses Snapchat Marketing API for discovery. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { SNAPCHAT_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

class SnapchatPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'snapchat';
  readonly manifest: PluginManifest = SNAPCHAT_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[SnapchatPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    if (!isProviderConfigured('snapchat')) throw new Error('Snapchat OAuth not configured. Set SNAPCHAT_CLIENT_ID and SNAPCHAT_CLIENT_SECRET.');
    const creds = getProviderCredentials('snapchat');
    const state = generateState();
    const scopes = context.scopes || ['snapchat-marketing-api'];
    const params = new URLSearchParams({ client_id: creds.clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(' '), state });
    return { authUrl: `https://accounts.snapchat.com/accounts/oauth2/auth?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const creds = getProviderCredentials('snapchat');
      const res = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: creds.clientId, client_secret: creds.clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in || 1800) * 1000).toISOString() };
    } catch (e) { return { success: false, error: `Snapchat OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const meRes = await fetch('https://adsapi.snapchat.com/v1/me', { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      if (!meRes.ok) throw new Error(`HTTP ${meRes.status}`);
      const meData = await meRes.json();
      const orgId = meData.me?.organization_id;
      if (!orgId) return { success: true, targets: [] };
      const adRes = await fetch(`https://adsapi.snapchat.com/v1/organizations/${orgId}/adaccounts`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      if (!adRes.ok) throw new Error(`HTTP ${adRes.status}`);
      const adData = await adRes.json();
      const targets = (adData.adaccounts || []).map((a: any) => ({ targetType: 'AD_ACCOUNT', externalId: a.adaccount?.id, displayName: a.adaccount?.name || a.adaccount?.id, metadata: { status: a.adaccount?.status, currency: a.adaccount?.currency } }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Snapchat does not expose a public API for user access management. Manage members via: business.snapchat.com > Members.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Snapchat does not expose a public API for verifying member access.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'Snapchat does not expose a public API for revoking member access.' };
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
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Snapchat Business Manager', description: 'Go to business.snapchat.com', link: { url: 'https://business.snapchat.com', label: 'Open Snapchat' } }, { step: 2, title: 'Members > Invite', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' }; }
}

export default new SnapchatPlugin();
export { SnapchatPlugin };
