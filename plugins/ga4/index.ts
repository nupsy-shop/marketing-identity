/**
 * Google Analytics 4 Platform Plugin
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
    description: 'Invite user to property',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' },
      { key: 'analyst', label: 'Analyst', description: 'Create and edit reports' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' }
    ]
  },
  {
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group Access',
    description: 'Service account access',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' },
      { key: 'analyst', label: 'Analyst', description: 'Create and edit reports' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' }
    ]
  }
];

// ─── Security Capabilities (PAM Governance) ────────────────────────────────────

const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false,
  supportsGroupAccess: true,
  supportsOAuth: false,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Analytics / GA4 supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Agency group email for access (optional)'),
});

const GroupAccessAgencySchema = z.object({
  serviceAccountEmail: z.string()
    .email('Must be a valid service account email')
    .describe('Service account email'),
});

const SharedAccountAgencySchema = z.object({
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns the shared account credentials'),
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

const CommonClientSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required').describe('GA4 Property ID'),
  propertyName: z.string().optional().describe('Property name for reference'),
});

const SharedAccountClientSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required').describe('GA4 Property ID'),
  propertyName: z.string().optional().describe('Property name for reference'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class GA4Plugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'ga4',
    displayName: 'Google Analytics / GA4',
    category: 'Analytics',
    description: 'Google Analytics 4 property access',
    icon: 'fas fa-chart-line',
    logoPath: '/logos/ga4.svg',
    brandColor: '#E37400',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: ACCESS_ITEM_TYPES,
    securityCapabilities: SECURITY_CAPABILITIES,
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: true,
      automatedProvisioningSupported: true
    },
    pluginVersion: '2.0.0'
  };

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'NAMED_INVITE':
        return NamedInviteAgencySchema;
      case 'GROUP_ACCESS':
        return GroupAccessAgencySchema;
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
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com and sign in.', link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' } },
          { step: 2, title: 'Go to Admin', description: 'Click Admin in the bottom left corner.' },
          { step: 3, title: 'Access Management', description: 'Click "Access Management" at the property level.' },
          { step: 4, title: 'Add User', description: 'Click "+" to add a user and enter the agency email.' },
          { step: 5, title: 'Set Permissions', description: `Set the role to "${roleTemplate}" and save.` }
        ];
      
      case 'GROUP_ACCESS':
        return [
          { step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com and sign in.', link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' } },
          { step: 2, title: 'Go to Admin', description: 'Click Admin in the bottom left corner.' },
          { step: 3, title: 'Access Management', description: 'Click "Access Management" at the property level.' },
          { step: 4, title: 'Add Service Account', description: 'Click "+" and add the service account email.' },
          { step: 5, title: 'Set Permissions', description: `Set the role to "${roleTemplate}" and save.` }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Account Credentials', description: 'Enter the shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Your credentials will be encrypted and stored in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'The agency will create and manage a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant access to the agency-managed identity.' }
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

export default new GA4Plugin();
