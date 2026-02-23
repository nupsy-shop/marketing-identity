/**
 * DV360 (Display & Video 360) Platform Plugin
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
    description: 'Link via Partner/Seat ID',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full partner/advertiser management' },
      { key: 'standard', label: 'Standard User', description: 'Create and manage campaigns' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to advertiser',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full partner/advertiser management' },
      { key: 'standard', label: 'Standard User', description: 'Create and manage campaigns' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full partner/advertiser management' },
      { key: 'standard', label: 'Standard User', description: 'Create and manage campaigns' }
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
  pamRationale: 'DV360 supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const PartnerDelegationAgencySchema = z.object({
  seatId: z.string().min(1, 'Seat ID is required').describe('DV360 Seat/Partner ID'),
});

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Agency group email for access (optional)'),
});

const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns the shared account credentials'),
  pamIdentityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY'])
    .optional()
    .describe('Identity strategy'),
  pamIdentityType: z.enum(['GROUP', 'MAILBOX'])
    .optional()
    .describe('Type of dedicated identity'),
  pamNamingTemplate: z.string().optional().describe('Naming template'),
  pamCheckoutDurationMinutes: z.number().min(5).max(480).optional().describe('Checkout duration'),
  pamApprovalRequired: z.boolean().optional().describe('Approval required'),
  pamConfirmation: z.boolean().optional().describe('PAM confirmation'),
});

// ─── Client Target Schemas ─────────────────────────────────────────────────────

const CommonClientSchema = z.object({
  advertiserId: z.string().min(1, 'Advertiser ID is required').describe('DV360 Advertiser ID'),
  advertiserName: z.string().optional().describe('Advertiser name for reference'),
});

const SharedAccountClientSchema = z.object({
  advertiserId: z.string().min(1, 'Advertiser ID is required').describe('DV360 Advertiser ID'),
  advertiserName: z.string().optional().describe('Advertiser name'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class DV360Plugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'dv360',
    displayName: 'DV360 (Display & Video 360)',
    category: 'Paid Media',
    description: 'Google Display & Video 360 for programmatic advertising',
    icon: 'fas fa-tv',
    logoPath: '/logos/dv360.svg',
    brandColor: '#34A853',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: ACCESS_ITEM_TYPES,
    securityCapabilities: SECURITY_CAPABILITIES,
    automationCapabilities: {
      oauthSupported: true,
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
      case 'SHARED_ACCOUNT':
        return SharedAccountClientSchema;
      default:
        return CommonClientSchema;
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
    if (result.success) return { valid: true, errors: [] };
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate } = context;
    
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        const seatId = (agencyConfig as { seatId?: string }).seatId;
        return [
          { step: 1, title: 'Open DV360', description: 'Go to displayvideo.google.com and sign in.', link: { url: 'https://displayvideo.google.com', label: 'Open DV360' } },
          { step: 2, title: 'Access Partner Settings', description: 'Navigate to Settings > Basic Details for your advertiser.' },
          { step: 3, title: 'Link Partner', description: `Add the agency partner seat ID: ${seatId}` },
          { step: 4, title: 'Set Access Level', description: `Assign "${roleTemplate}" access level and confirm.` }
        ];
      
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open DV360', description: 'Go to displayvideo.google.com and sign in.', link: { url: 'https://displayvideo.google.com', label: 'Open DV360' } },
          { step: 2, title: 'Go to User Management', description: 'Navigate to Settings > Users.' },
          { step: 3, title: 'Add User', description: 'Click "Add User" and enter the agency email.' },
          { step: 4, title: 'Set Role', description: `Assign the "${roleTemplate}" role and save.` }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Account Credentials', description: 'Enter the shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'The agency will manage a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant access to the agency identity.' }
        ];
      
      default:
        return [];
    }
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY';
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' };
  }
}

export default new DV360Plugin();
