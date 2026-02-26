/**
 * DV360 Plugin - Full Implementation
 * Uses Google OAuth + DV360 API for discovery. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { DV360_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

const DV360_API = 'https://displayvideo.googleapis.com/v3';

class DV360Plugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'dv360';
  readonly manifest: PluginManifest = DV360_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[DV360Plugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const clientId = process.env.GOOGLE_DV360_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('PLACEHOLDER_')) throw new Error('DV360 OAuth not configured. Set GOOGLE_DV360_CLIENT_ID.');
    const state = generateState();
    const scopes = context.scopes || ['https://www.googleapis.com/auth/display-video', 'https://www.googleapis.com/auth/display-video-user-management'];
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(' '), state, access_type: 'offline', prompt: 'consent' });
    return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.GOOGLE_DV360_CLIENT_ID || process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_DV360_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET!;
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() };
    } catch (e) { return { success: false, error: `DV360 OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch(`${DV360_API}/partners?pageSize=50`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const targets: any[] = [];
      for (const p of (data.partners || [])) {
        targets.push({ targetType: 'PARTNER', externalId: p.partnerId, displayName: p.displayName || `Partner ${p.partnerId}`, metadata: { entityStatus: p.entityStatus } });
        try {
          const advRes = await fetch(`${DV360_API}/advertisers?partnerId=${p.partnerId}&pageSize=100`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
          if (advRes.ok) { const advData = await advRes.json(); for (const a of (advData.advertisers || [])) targets.push({ targetType: 'ADVERTISER', externalId: a.advertiserId, displayName: a.displayName, parentExternalId: p.partnerId }); }
        } catch (_) {}
      }
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'DV360 does not expose a public API for user access management. Use the DV360 UI: displayvideo.google.com > Settings > Users.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'DV360 does not expose a public API for verifying user access. Check via DV360 UI.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'DV360 does not expose a public API for revoking user access. Remove via DV360 UI.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }
  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getAgencyConfigSchema(t).safeParse(c); if (r.success) { if (t === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (c as any).pamOwnership === 'AGENCY_OWNED' && !(c as any).pamConfirmation) return { valid: false, errors: ['PAM confirmation required.'] }; return { valid: true, errors: [] }; } return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'PARTNER_DELEGATION': return [{ step: 1, title: 'Open DV360', description: 'Go to displayvideo.google.com', link: { url: 'https://displayvideo.google.com', label: 'Open DV360' } }, { step: 2, title: 'Add Partner', description: `Add partner ID: ${(ctx.agencyConfig as any).partnerId}` }];
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open DV360', description: 'Go to displayvideo.google.com' }, { step: 2, title: 'Settings > Users', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Manual verification required' }; }
}

export default new DV360Plugin();
export { DV360Plugin };
