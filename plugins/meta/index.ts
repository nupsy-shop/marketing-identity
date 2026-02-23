/**
 * Meta Business Manager Platform Plugin
 */

import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType } from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload } from '../common/types';

import { META_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';

class MetaPlugin implements PlatformPlugin, AdPlatformPlugin {
  readonly name = 'meta';
  readonly manifest: PluginManifest = META_MANIFEST;
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
          return { valid: false, errors: ['PAM confirmation required for Meta.'] };
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
        const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click gear icon, select "Business Settings".' },
          { step: 3, title: 'Navigate to Partners', description: 'Click "Partners" under "Users".' },
          { step: 4, title: 'Add Partner', description: `Click "Add" and enter Business Manager ID: ${bmId}` },
          { step: 5, title: 'Assign Assets', description: 'Select ad accounts, pages, and pixels to share.' }
        ];
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click gear icon, select "Business Settings".' },
          { step: 3, title: 'Navigate to People', description: 'Click "People" under "Users".' },
          { step: 4, title: 'Add Person', description: 'Click "Add" and enter agency email.' },
          { step: 5, title: 'Set Role', description: `Set role to "${roleTemplate}" and assign assets.` }
        ];
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Enable two-factor authentication.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials encrypted in PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'Agency will create dedicated identity.' },
          { step: 2, title: 'Grant Admin Access', description: 'Grant access to agency-managed identity.' }
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

export default new MetaPlugin();
export { MetaPlugin };
