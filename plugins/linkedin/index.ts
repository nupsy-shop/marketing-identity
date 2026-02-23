/**
 * LinkedIn Ads Platform Plugin
 * Updated with PAM governance from plugin metadata
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
  AccessItemType,
  AccessItemTypeMetadata,
  SecurityCapabilities
} from '../../lib/plugins/types';

// ─── Access Item Type Definitions ──────────────────────────────────────────────

const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to ad account',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'account_manager', label: 'Account Manager', description: 'Full ad account management' },
      { key: 'campaign_manager', label: 'Campaign Manager', description: 'Create and manage campaigns' },
      { key: 'viewer', label: 'Viewer', description: 'View-only access' }
    ]
  },
  {
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Link via Business Manager',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'account_manager', label: 'Account Manager', description: 'Full ad account management' },
      { key: 'campaign_manager', label: 'Campaign Manager', description: 'Create and manage campaigns' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'account_manager', label: 'Account Manager', description: 'Full ad account management' }
    ]
  }
];

// ─── Security Capabilities (PAM Governance) ────────────────────────────────────

const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true,
  supportsGroupAccess: false,
  supportsOAuth: false,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'LinkedIn supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (optional)'),
});

const PartnerDelegationAgencySchema = z.object({
  businessManagerId: z.string().min(1, 'Business Manager ID is required').describe('LinkedIn Business Manager ID'),
});

const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED']).describe('Who owns the credentials'),
  pamIdentityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY']).optional().describe('Identity strategy'),
  pamIdentityType: z.enum(['GROUP', 'MAILBOX']).optional().describe('Identity type'),
  pamNamingTemplate: z.string().optional().describe('Naming template'),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().describe('Checkout duration'),
  pamApprovalRequired: z.boolean().optional().describe('Approval required'),
  pamConfirmation: z.boolean().optional().describe('PAM confirmation'),
});

// ─── Client Target Schemas ─────────────────────────────────────────────────────

const CommonClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('LinkedIn Ad Account ID'),
  adAccountName: z.string().optional().describe('Account name for reference'),
});

const SharedAccountClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('LinkedIn Ad Account ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class LinkedInPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'linkedin',
    displayName: 'LinkedIn Ads',
    category: 'Social',
    description: 'LinkedIn Campaign Manager and advertising',
    icon: 'fab fa-linkedin',
    logoPath: '/logos/linkedin.svg',
    brandColor: '#0A66C2',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: ACCESS_ITEM_TYPES,
    securityCapabilities: SECURITY_CAPABILITIES,
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
      automatedProvisioningSupported: false
    },
    pluginVersion: '2.0.0'
  };

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema;
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema;
      default: return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return accessItemType === 'SHARED_ACCOUNT' ? SharedAccountClientSchema : CommonClientSchema;
  }

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && pamConfig.pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          return { valid: false, errors: ['PAM confirmation is required.'] };
        }
      }
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    const result = schema.safeParse(target);
    return result.success ? { valid: true, errors: [] } : { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, roleTemplate } = context;
    switch (accessItemType) {
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Sign in to LinkedIn', description: 'Go to linkedin.com and sign in.', link: { url: 'https://www.linkedin.com/campaignmanager/', label: 'Open Campaign Manager' } },
          { step: 2, title: 'Go to Account Settings', description: 'Navigate to your ad account settings.' },
          { step: 3, title: 'Manage Users', description: 'Click "Manage users" and add the agency email.' },
          { step: 4, title: 'Set Role', description: `Assign the "${roleTemplate}" role and send invitation.` }
        ];
      case 'PARTNER_DELEGATION':
        return [
          { step: 1, title: 'Sign in to LinkedIn', description: 'Go to linkedin.com and sign in.', link: { url: 'https://www.linkedin.com/campaignmanager/', label: 'Open Campaign Manager' } },
          { step: 2, title: 'Open Business Manager', description: 'Navigate to Business Manager settings.' },
          { step: 3, title: 'Add Partner', description: 'Add the agency as a partner business.' },
          { step: 4, title: 'Grant Access', description: `Grant "${roleTemplate}" access to the ad account.` }
        ];
      case 'SHARED_ACCOUNT':
        return [
          { step: 1, title: 'Provide Credentials', description: 'Enter the LinkedIn account email and password.' },
          { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
          { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
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

export default new LinkedInPlugin();
