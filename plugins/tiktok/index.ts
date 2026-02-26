import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult } from '../../lib/plugins/types';
import { validateProvisioningRequest } from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';
import { TIKTOK_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';

class TikTokPlugin implements PlatformPlugin, AdPlatformPlugin {
  readonly name = 'tiktok';
  readonly manifest: PluginManifest = TIKTOK_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; }
  async destroy(): Promise<void> { this.context = null; }
  async authorize(params: AuthParams): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async refreshToken(currentToken: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema;
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema;
      default: return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema;
      case 'NAMED_INVITE': return NamedInviteClientSchema;
      case 'SHARED_ACCOUNT': return SharedAccountClientSchema;
      default: return z.object({});
    }
  }

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && pamConfig.pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          return { valid: false, errors: ['PAM confirmation required.'] };
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
    const { accessItemType, agencyConfig, roleTemplate } = context;
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        const bcId = (agencyConfig as any).businessCenterId || '[Business Center ID]';
        return [
          { step: 1, title: 'Open TikTok Business Center', description: 'Go to business.tiktok.com', link: { url: 'https://business.tiktok.com', label: 'Open TikTok Business' } },
          { step: 2, title: 'Go to Settings', description: 'Click Settings > Partners.' },
          { step: 3, title: 'Add Partner', description: `Enter Business Center ID: ${bcId}` },
          { step: 4, title: 'Assign Assets', description: 'Select ad accounts to share.' }
        ];
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open TikTok Ads Manager', description: 'Go to ads.tiktok.com', link: { url: 'https://ads.tiktok.com', label: 'Open TikTok Ads' } },
          { step: 2, title: 'Go to User Management', description: 'Settings > User Management.' },
          { step: 3, title: 'Invite User', description: `Enter agency email with "${roleTemplate}" role.` }
        ];
      case 'SHARED_ACCOUNT':
        return (agencyConfig as any).pamOwnership === 'CLIENT_OWNED'
          ? [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }, { step: 2, title: 'Enable 2FA', description: 'Enable two-factor authentication.' }]
          : [{ step: 1, title: 'Agency-Managed Access', description: 'Agency will create dedicated identity.' }];
      default: return [];
    }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: `TikTok does not support programmatic access granting. Use manual client instructions.`, details: { found: false } };
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: `TikTok does not support programmatic access verification. Manual verification required.`, details: { found: false } };
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: `TikTok does not support programmatic access revocation. Remove access manually via TikTok Business Center.` };
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode { return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; }
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; }
}

export default new TikTokPlugin();
export { TikTokPlugin };
