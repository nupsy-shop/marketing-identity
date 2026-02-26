/**
 * Google Merchant Center Plugin
 * Supports OAuth for discovery. User management is manual.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { GOOGLE_MERCHANT_CENTER_MANIFEST } from './manifest';
import { NamedInviteAgencySchema, PartnerDelegationAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, PartnerDelegationClientSchema, SharedAccountClientSchema } from './schemas/client';
import { generateState } from '../common/utils/auth';

class GoogleMerchantCenterPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'google-merchant-center';
  readonly manifest: PluginManifest = GOOGLE_MERCHANT_CENTER_MANIFEST;
  private context: AppContext | null = null;

  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.startsWith('PLACEHOLDER_'))
      throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    const state = generateState();
    const scopes = context.scopes || ['https://www.googleapis.com/auth/content'];
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: context.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code: context.code, client_id: clientId, client_secret: clientSecret, redirect_uri: context.redirectUri, grant_type: 'authorization_code' }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return {
        success: true,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
        scopes: data.scope?.split(' '),
      };
    } catch (e) { return { success: false, error: `Google OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch('https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo', {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const targets = (data.accountIdentifiers || []).map((a: any) => ({
        targetType: 'ACCOUNT',
        externalId: String(a.merchantId || a.aggregatorId),
        displayName: `Merchant ${a.merchantId || a.aggregatorId}`,
      }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Google Merchant Center does not expose a public API for user access management. Manage users via: merchants.google.com > Settings > Users.', details: { found: false } };
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'Google Merchant Center does not expose a public API for verifying user access.', details: { found: false } };
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'Google Merchant Center does not expose a public API for revoking user access.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }

  getAgencyConfigSchema(t: AccessItemType) {
    switch (t) {
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema;
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema;
      default: return z.object({});
    }
  }

  getClientTargetSchema(t: AccessItemType) {
    switch (t) {
      case 'NAMED_INVITE': return NamedInviteClientSchema;
      case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema;
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
          { step: 1, title: 'Open Merchant Center', description: 'Go to merchants.google.com', link: { url: 'https://merchants.google.com', label: 'Open Merchant Center' } },
          { step: 2, title: 'Settings > Users', description: `Invite the user with "${ctx.roleTemplate}" role.` },
        ];
      case 'PARTNER_DELEGATION':
        return [
          { step: 1, title: 'Open Merchant Center', description: 'Go to merchants.google.com', link: { url: 'https://merchants.google.com', label: 'Open Merchant Center' } },
          { step: 2, title: 'Settings > Account Linking', description: 'Link the agency Manager Account ID provided.' },
        ];
      case 'SHARED_ACCOUNT':
        return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default:
        return [];
    }
  }

  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' };
  }
}

export default new GoogleMerchantCenterPlugin();
export { GoogleMerchantCenterPlugin };
