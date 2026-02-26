/**
 * LinkedIn Ads Plugin - Full Implementation (updated)
 * Uses LinkedIn Marketing API for discovery. No public user management API.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { LINKEDIN_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { authorize as linkedInAuthorize, refreshToken as linkedInRefreshToken, startLinkedInOAuth, discoverTargets as linkedInDiscoverTargets } from './auth';

class LinkedInPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'linkedin';
  readonly manifest: PluginManifest = LINKEDIN_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[LinkedInPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<{ authUrl: string; state: string }> { return startLinkedInOAuth(context.redirectUri, context.scopes); }
  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> { return linkedInAuthorize({ code: context.code, redirectUri: context.redirectUri }); }
  async authorize(params: AuthParams): Promise<AuthResult> { return linkedInAuthorize(params); }
  async refreshToken(currentToken: string, redirectUri?: string): Promise<AuthResult> { return linkedInRefreshToken(currentToken, redirectUri || ''); }
  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> { return linkedInDiscoverTargets(auth); }

  async fetchAccounts(auth: AuthResult): Promise<Account[]> {
    const result = await this.discoverTargets(auth);
    if (result.success && result.targets) return result.targets.map(t => ({ id: t.externalId, name: t.displayName, type: t.targetType.toLowerCase(), isAccessible: true, status: 'active' as const, metadata: t.metadata }));
    return [];
  }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'LinkedIn Campaign Manager does not expose a public API for user access management. Manage access via: linkedin.com/campaignmanager > Account Settings > Manage access.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'LinkedIn does not expose a public API for verifying user access to ad accounts.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'LinkedIn does not expose a public API for revoking user access.' };
  }

  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getAgencyConfigSchema(t).safeParse(c); if (r.success) { if (t === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (c as any).pamOwnership === 'AGENCY_OWNED' && !(c as any).pamConfirmation) return { valid: false, errors: ['PAM confirmation required.'] }; return { valid: true, errors: [] }; } return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'PARTNER_DELEGATION': return [{ step: 1, title: 'Open LinkedIn Campaign Manager', description: 'Go to linkedin.com/campaignmanager', link: { url: 'https://www.linkedin.com/campaignmanager', label: 'Open LinkedIn' } }, { step: 2, title: 'Account Settings > Manage access', description: `Add agency with Business Manager ID: ${(ctx.agencyConfig as any).businessManagerId}` }];
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open LinkedIn Campaign Manager', description: 'Go to linkedin.com/campaignmanager' }, { step: 2, title: 'Account Settings > Manage access', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Manual verification required' }; }
}

export default new LinkedInPlugin();
export { LinkedInPlugin };
