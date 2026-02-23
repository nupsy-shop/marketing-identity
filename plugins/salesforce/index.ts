import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';
import { SALESFORCE_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';
import { authorize as salesforceAuthorize, refreshToken as salesforceRefreshToken, startSalesforceOAuth, getUserInfo, query } from './auth';

class SalesforcePlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'salesforce';
  readonly manifest: PluginManifest = SALESFORCE_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; console.log(`[SalesforcePlugin] Initialized v${this.manifest.pluginVersion} with OAuth support`); }
  async destroy(): Promise<void> { this.context = null; }
  
  // OAuth Methods
  async startOAuth(context: { redirectUri: string; isSandbox?: boolean }): Promise<{ authUrl: string; state: string }> {
    return startSalesforceOAuth(context.redirectUri, { isSandbox: context.isSandbox });
  }
  async handleOAuthCallback(context: { code: string; state: string; redirectUri?: string; isSandbox?: boolean }): Promise<AuthResult> {
    return salesforceAuthorize({ code: context.code, redirectUri: context.redirectUri || '' });
  }
  async authorize(params: AuthParams): Promise<AuthResult> { return salesforceAuthorize(params); }
  async refreshToken(currentToken: string): Promise<AuthResult> { return salesforceRefreshToken(currentToken); }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'GROUP_ACCESS': return GroupAccessAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); }
  }
  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { case 'NAMED_INVITE': return NamedInviteClientSchema; case 'GROUP_ACCESS': return GroupAccessClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); }
  }
  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const result = this.getAgencyConfigSchema(accessItemType).safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as any;
        if (SECURITY_CAPABILITIES.pamRecommendation === 'break_glass_only' && pamConfig.pamOwnership === 'AGENCY_OWNED') {
          if (!pamConfig.pamConfirmation) return { valid: false, errors: ['PAM confirmation required for break-glass access.'] };
          if (!pamConfig.breakGlassJustification) return { valid: false, errors: ['Break-glass justification is required for Salesforce PAM.'] };
        }
      }
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
    return [{ step: 1, title: 'Open Salesforce Setup', description: 'Go to your Salesforce org Setup', link: { url: 'https://login.salesforce.com', label: 'Open Salesforce' } }, { step: 2, title: 'Add User', description: `Create user with "${roleTemplate}" profile.` }];
  }
  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return 'EVIDENCE_REQUIRED'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'EVIDENCE_REQUIRED', message: 'Manual verification required' }; }
}

export default new SalesforcePlugin();
export { SalesforcePlugin };
