/**
 * Google Ads Platform Plugin
 * Modular implementation following the AdPlatformPlugin interface.
 */

import { z } from 'zod';
import type { 
  PlatformPlugin, 
  PluginManifest, 
  ValidationResult, 
  VerificationMode,
  VerificationResult,
  InstructionContext,
  InstructionStep,
  VerificationContext,
  AccessItemType
} from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';

import { GOOGLE_ADS_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';

class GoogleAdsPlugin implements PlatformPlugin, AdPlatformPlugin {
  readonly name = 'google-ads';
  readonly manifest: PluginManifest = GOOGLE_ADS_MANIFEST;
  private context: AppContext | null = null;

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    console.log(`[GoogleAdsPlugin] Initialized v${this.manifest.pluginVersion}`);
  }

  async destroy(): Promise<void> {
    this.context = null;
  }

  async authorize(params: AuthParams): Promise<AuthResult> {
    return { success: false, error: 'OAuth not implemented' };
  }

  async refreshToken(currentToken: string): Promise<AuthResult> {
    return { success: false, error: 'Token refresh not implemented' };
  }

  async fetchAccounts(auth: AuthResult): Promise<Account[]> {
    return [];
  }

  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> {
    return { headers: [], rows: [] };
  }

  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> {
    throw new Error('Google Ads does not support event uploads via this plugin');
  }

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
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && 
            pamConfig.pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          return { valid: false, errors: ['PAM confirmation is required for Google Ads.'] };
        }
      }
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    const result = schema.safeParse(target);
    if (result.success) return { valid: true, errors: [] };
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate } = context;
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        const mccId = (agencyConfig as { managerAccountId?: string }).managerAccountId || '[MCC ID]';
        return [
          { step: 1, title: 'Sign in to Google Ads', description: 'Go to ads.google.com and sign in.', link: { url: 'https://ads.google.com', label: 'Open Google Ads' } },
          { step: 2, title: 'Access Account Settings', description: 'Click the tools icon, then select "Account Access" under Setup.' },
          { step: 3, title: 'Link Manager Account', description: `Click "Link to Manager Account" and enter MCC ID: ${mccId}` },
          { step: 4, title: 'Accept Link Request', description: `Set access level to "${roleTemplate}" and confirm.` }
        ];
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Sign in to Google Ads', description: 'Go to ads.google.com and sign in.', link: { url: 'https://ads.google.com', label: 'Open Google Ads' } },
          { step: 2, title: 'Access Account Settings', description: 'Click the tools icon, then select "Account Access".' },
          { step: 3, title: 'Invite User', description: `Click + to add user. Enter the agency email and select "${roleTemplate}" access.` },
          { step: 4, title: 'Send Invitation', description: 'Click "Send invitation" to complete.' }
        ];
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter the shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'Agency will create a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant access to the agency-managed identity.' }
        ];
      default: return [];
    }
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY';
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' };
  }
}

export default new GoogleAdsPlugin();
export { GoogleAdsPlugin };
