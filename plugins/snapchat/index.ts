/**
 * Snapchat Ads Platform Plugin
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
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Add via Organization',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full organization access' },
      { key: 'member', label: 'Member', description: 'Standard access' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to ad account',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full ad account management' },
      { key: 'general_user', label: 'General User', description: 'Create and manage ads' },
      { key: 'reports_only', label: 'Reports Only', description: 'View reports only' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full ad account management' }
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
  pamRationale: 'Snapchat supports organization-based delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const PartnerDelegationAgencySchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required').describe('Snapchat Organization ID'),
});

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (optional)'),
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
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Snapchat Ad Account ID'),
  adAccountName: z.string().optional().describe('Account name for reference'),
});

const SharedAccountClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Snapchat Ad Account ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class SnapchatPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'snapchat',
    displayName: 'Snapchat Ads',
    category: 'Social',
    description: 'Snapchat Ads Manager',
    icon: 'fab fa-snapchat',
    logoPath: '/logos/snapchat.svg',
    brandColor: '#FFFC00',
    tier: 2,
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
      case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema;
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
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
      case 'PARTNER_DELEGATION':
        return [
          { step: 1, title: 'Sign in to Snapchat', description: 'Go to ads.snapchat.com and sign in.', link: { url: 'https://ads.snapchat.com', label: 'Open Snapchat Ads' } },
          { step: 2, title: 'Go to Organization Settings', description: 'Navigate to your organization settings.' },
          { step: 3, title: 'Add Partner', description: 'Add the agency as a partner organization.' },
          { step: 4, title: 'Grant Access', description: `Grant "${roleTemplate}" access and confirm.` }
        ];
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Sign in to Snapchat', description: 'Go to ads.snapchat.com and sign in.', link: { url: 'https://ads.snapchat.com', label: 'Open Snapchat Ads' } },
          { step: 2, title: 'Go to Members', description: 'Navigate to Members in your ad account.' },
          { step: 3, title: 'Invite Member', description: 'Click "Invite Member" and enter the agency email.' },
          { step: 4, title: 'Set Role', description: `Assign the "${roleTemplate}" role and send invitation.` }
        ];
      case 'SHARED_ACCOUNT':
        return [
          { step: 1, title: 'Provide Credentials', description: 'Enter the Snapchat account email and password.' },
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

export default new SnapchatPlugin();
