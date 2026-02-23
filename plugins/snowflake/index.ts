import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';
import { SNOWFLAKE_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';
import { authorize as snowflakeAuthorize, refreshToken as snowflakeRefreshToken, startSnowflakeOAuth, executeQuery } from './auth';

class SnowflakePlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'snowflake';
  readonly manifest: PluginManifest = SNOWFLAKE_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; console.log(`[SnowflakePlugin] Initialized v${this.manifest.pluginVersion} with OAuth support`); }
  async destroy(): Promise<void> { this.context = null; }
  
  // OAuth Methods
  async startOAuth(context: { redirectUri: string; accountIdentifier: string }): Promise<{ authUrl: string; state: string }> {
    return startSnowflakeOAuth(context.accountIdentifier, context.redirectUri);
  }
  async handleOAuthCallback(context: { code: string; state: string; redirectUri?: string; accountIdentifier?: string }): Promise<AuthResult> {
    return snowflakeAuthorize({ code: context.code, redirectUri: context.redirectUri || '', accountIdentifier: context.accountIdentifier });
  }
  async authorize(params: AuthParams & { accountIdentifier?: string }): Promise<AuthResult> { return snowflakeAuthorize(params); }
  async refreshToken(currentToken: string): Promise<AuthResult> { return snowflakeRefreshToken(currentToken, '', ''); }
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
          if (!pamConfig.breakGlassJustification) return { valid: false, errors: ['Break-glass justification is required for Snowflake PAM.'] };
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
    return [{ step: 1, title: 'Open Snowflake', description: 'Log into your Snowflake account', link: { url: 'https://app.snowflake.com', label: 'Open Snowflake' } }, { step: 2, title: 'Create User', description: `Create user with "${roleTemplate}" role.` }];
  }
  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return 'EVIDENCE_REQUIRED'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'EVIDENCE_REQUIRED', message: 'Manual verification required' }; }
}

export default new SnowflakePlugin();
export { SnowflakePlugin };
