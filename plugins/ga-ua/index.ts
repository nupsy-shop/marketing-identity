import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';
import { GA_UA_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';

class GAUAPlugin implements PlatformPlugin, AdPlatformPlugin {
  readonly name = 'ga-ua';
  readonly manifest: PluginManifest = GA_UA_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; }
  async destroy(): Promise<void> { this.context = null; }
  async authorize(params: AuthParams): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async refreshToken(currentToken: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
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
    const { accessItemType, roleTemplate } = context;
    return [{ step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com', link: { url: 'https://analytics.google.com', label: 'Open GA' } }, { step: 2, title: 'Grant Access', description: `Add user with "${roleTemplate}" role.` }];
  }
  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; }
}

export default new GAUAPlugin();
export { GAUAPlugin };
