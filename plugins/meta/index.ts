/**
 * Meta Business Manager Platform Plugin
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
  SecurityCapabilities,
  RoleTemplate
} from '../../lib/plugins/types';

// ─── Access Item Type Definitions ──────────────────────────────────────────────

const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Add as Business Manager partner',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Business Manager access' },
      { key: 'analyst', label: 'Analyst', description: 'View and analyze performance' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to assets',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full asset access' },
      { key: 'analyst', label: 'Analyst', description: 'View and analyze performance' },
      { key: 'advertiser', label: 'Advertiser', description: 'Create and manage ads' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Business Manager access' }
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
  pamRationale: 'Meta Business Manager supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const PartnerDelegationAgencySchema = z.object({
  businessManagerId: z.string()
    .min(1, 'Business Manager ID is required')
    .describe('Your Meta Business Manager ID'),
});

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Agency group email for access (optional)'),
});

const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns and controls the shared account credentials'),
  pamIdentityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY'])
    .optional()
    .describe('Identity strategy for human interactive access'),
  pamIdentityType: z.enum(['GROUP', 'MAILBOX'])
    .optional()
    .describe('Type of dedicated identity'),
  pamNamingTemplate: z.string()
    .optional()
    .describe('Template for generating dedicated identity'),
  pamCheckoutDurationMinutes: z.number()
    .min(5).max(480).optional()
    .describe('Maximum checkout duration in minutes'),
  pamApprovalRequired: z.boolean()
    .optional()
    .describe('Require approval for checkout'),
  pamConfirmation: z.boolean()
    .optional()
    .describe('Confirm understanding of PAM risks'),
});

// ─── Client Target Schemas ─────────────────────────────────────────────────────

const PartnerDelegationClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  businessManagerId: z.string().optional().describe('Client Business Manager ID'),
});

const NamedInviteClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  pageId: z.string().optional().describe('Facebook Page ID'),
  pixelId: z.string().optional().describe('Facebook Pixel ID'),
});

const SharedAccountClientSchema = z.object({
  adAccountId: z.string().min(1, 'Ad Account ID is required').describe('Client Ad Account ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class MetaPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'meta',
    displayName: 'Meta Business Manager / Facebook Ads',
    category: 'Paid Media',
    description: 'Meta Business Manager, Facebook Ads, Instagram',
    icon: 'fab fa-meta',
    logoPath: '/logos/meta.svg',
    brandColor: '#0668E1',
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
      case 'PARTNER_DELEGATION':
        return PartnerDelegationAgencySchema;
      case 'NAMED_INVITE':
        return NamedInviteAgencySchema;
      case 'SHARED_ACCOUNT':
        return SharedAccountAgencySchema;
      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        return PartnerDelegationClientSchema;
      case 'NAMED_INVITE':
        return NamedInviteClientSchema;
      case 'SHARED_ACCOUNT':
        return SharedAccountClientSchema;
      default:
        return z.object({});
    }
  }

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && 
            pamConfig.pamOwnership === 'AGENCY_OWNED' && 
            !pamConfig.pamConfirmation) {
          return {
            valid: false,
            errors: ['PAM confirmation is required. Please acknowledge the security implications.']
          };
        }
      }
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    const result = schema.safeParse(target);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate } = context;
    
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com and sign in.', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click the gear icon, then select "Business Settings".' },
          { step: 3, title: 'Navigate to Partners', description: 'In the left menu, click "Partners" under "Users".' },
          { step: 4, title: 'Add Partner', description: `Click "Add" and enter the Business Manager ID: ${bmId}` },
          { step: 5, title: 'Assign Assets', description: 'Select the ad accounts, pages, and pixels you want to share, then confirm.' }
        ];
      
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com and sign in.', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click the gear icon, then select "Business Settings".' },
          { step: 3, title: 'Navigate to People', description: 'In the left menu, click "People" under "Users".' },
          { step: 4, title: 'Add Person', description: 'Click "Add" and enter the agency email address.' },
          { step: 5, title: 'Set Role and Assign Assets', description: `Set the role to "${roleTemplate}" and assign the relevant ad accounts and assets.` }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Account Credentials', description: 'Enter the shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'For security, enable two-factor authentication on the shared account.' },
            { step: 3, title: 'Credentials Stored', description: 'Your credentials will be encrypted and stored in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'The agency will create and manage a dedicated identity for your account.' },
          { step: 2, title: 'Grant Admin Access', description: 'You may need to grant admin access to the agency-managed identity.' }
        ];
      
      default:
        return [];
    }
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    switch (accessItemType) {
      case 'SHARED_ACCOUNT':
        return 'EVIDENCE_REQUIRED';
      default:
        return 'ATTESTATION_ONLY';
    }
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    return {
      status: 'PENDING',
      mode: this.getVerificationMode(context.accessItemType),
      message: 'Manual verification required'
    };
  }
}

export default new MetaPlugin();
