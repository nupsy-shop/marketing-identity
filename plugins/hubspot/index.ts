import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { HUBSPOT_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, PartnerDelegationAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, PartnerDelegationClientSchema, SharedAccountClientSchema } from './schemas/client';
import { authorize as hubspotAuthorize, refreshToken as hubspotRefreshToken, startHubSpotOAuth, discoverTargets as hubspotDiscoverTargets } from './auth';

class HubSpotPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'hubspot';
  readonly manifest: PluginManifest = HUBSPOT_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; console.log(`[HubSpotPlugin] Initialized v${this.manifest.pluginVersion} with OAuth support`); }
  async destroy(): Promise<void> { this.context = null; }
  
  // OAuth Methods
  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<{ authUrl: string; state: string }> {
    return startHubSpotOAuth(context.redirectUri, context.scopes);
  }
  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> {
    return hubspotAuthorize({ code: context.code, redirectUri: context.redirectUri });
  }
  async authorize(params: AuthParams): Promise<AuthResult> { return hubspotAuthorize(params); }
  async refreshToken(currentToken: string, redirectUri?: string): Promise<AuthResult> { return hubspotRefreshToken(currentToken, redirectUri || ''); }
  
  // Target Discovery
  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    return hubspotDiscoverTargets(auth);
  }
  
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { 
    const result = await this.discoverTargets(auth);
    if (result.success && result.targets) {
      return result.targets.map(t => ({
        id: t.externalId,
        name: t.displayName,
        type: t.targetType.toLowerCase(),
        isAccessible: true,
        status: 'active' as const,
        metadata: t.metadata,
      }));
    }
    return []; 
  }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); }
  }
  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'NAMED_INVITE': return NamedInviteClientSchema; case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); }
  }
  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const result = this.getAgencyConfigSchema(accessItemType).safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (config as any).pamOwnership === 'AGENCY_OWNED' && !(config as any).pamConfirmation)
        return { valid: false, errors: ['PAM confirmation required.'] };
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const result = this.getClientTargetSchema(accessItemType).safeParse(target);
    return result.success ? { valid: true, errors: [] } : { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { roleTemplate } = context;
    return [{ step: 1, title: 'Open HubSpot', description: 'Go to app.hubspot.com', link: { url: 'https://app.hubspot.com', label: 'Open HubSpot' } }, { step: 2, title: 'Add User', description: `Add user with "${roleTemplate}" role.` }];
  }
  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; }
}

export default new HubSpotPlugin();
export { HubSpotPlugin };
