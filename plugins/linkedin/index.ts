import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';
import { LINKEDIN_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { authorize as linkedInAuthorize, refreshToken as linkedInRefreshToken, startLinkedInOAuth, getAdAccounts } from './auth';

class LinkedInPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'linkedin';
  readonly manifest: PluginManifest = LINKEDIN_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; console.log(`[LinkedInPlugin] Initialized v${this.manifest.pluginVersion} with OAuth support`); }
  async destroy(): Promise<void> { this.context = null; }
  
  // OAuth Methods
  async startOAuth(context: { redirectUri: string }): Promise<{ authUrl: string; state: string }> {
    return startLinkedInOAuth(context.redirectUri);
  }
  async handleOAuthCallback(context: { code: string; state: string; redirectUri?: string }): Promise<AuthResult> {
    return linkedInAuthorize({ code: context.code, redirectUri: context.redirectUri || '' });
  }
  async authorize(params: AuthParams): Promise<AuthResult> { return linkedInAuthorize(params); }
  async refreshToken(currentToken: string): Promise<AuthResult> { return linkedInRefreshToken(currentToken, ''); }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); }
  }
  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); }
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
    const { accessItemType, agencyConfig, roleTemplate } = context;
    switch (accessItemType) {
      case 'PARTNER_DELEGATION': return [{ step: 1, title: 'Open LinkedIn Campaign Manager', description: 'Go to linkedin.com/campaignmanager', link: { url: 'https://www.linkedin.com/campaignmanager', label: 'Open LinkedIn' } }, { step: 2, title: 'Add Partner', description: `Add agency as partner with Business Manager ID: ${(agencyConfig as any).businessManagerId}` }];
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open LinkedIn Campaign Manager', description: 'Go to linkedin.com/campaignmanager' }, { step: 2, title: 'Invite User', description: `Invite agency email with "${roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return (agencyConfig as any).pamOwnership === 'CLIENT_OWNED' ? [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }] : [{ step: 1, title: 'Agency-Managed', description: 'Agency will create identity.' }];
      default: return [];
    }
  }
  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; }
}

export default new LinkedInPlugin();
export { LinkedInPlugin };
