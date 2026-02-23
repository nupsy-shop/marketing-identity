/**
 * Universal Analytics (GA-UA) Platform Plugin
 * Updated with PAM governance from plugin metadata
 * Note: Universal Analytics is deprecated but still supported for legacy access
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
    description: 'Invite user to property (legacy)',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'manage_users', label: 'Manage Users', description: 'Full property and user management' },
      { key: 'edit', label: 'Edit', description: 'Edit property settings' },
      { key: 'collaborate', label: 'Collaborate', description: 'Create and share assets' },
      { key: 'read_analyze', label: 'Read & Analyze', description: 'View reports only' }
    ]
  },
  {
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group Access',
    description: 'Service account access (legacy)',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'read_analyze', label: 'Read & Analyze', description: 'View reports only' },
      { key: 'edit', label: 'Edit', description: 'Edit property settings' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'manage_users', label: 'Manage Users', description: 'Full property and user management' },
      { key: 'edit', label: 'Edit', description: 'Edit property settings' }
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
  pamRationale: 'Universal Analytics supports named-user invites and service accounts. This platform is deprecated - consider migrating to GA4. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (optional)'),
});

const GroupAccessAgencySchema = z.object({
  serviceAccountEmail: z.string().email('Must be a valid service account email').describe('Service account email'),
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
  viewId: z.string().min(1, 'View ID is required').describe('UA View ID (e.g., 12345678)'),
  propertyId: z.string().optional().describe('Property ID (e.g., UA-XXXXX-Y)'),
  accountName: z.string().optional().describe('Account name for reference'),
});

const SharedAccountClientSchema = z.object({
  viewId: z.string().min(1, 'View ID is required').describe('UA View ID'),
  propertyId: z.string().optional().describe('Property ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class GAUAPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'ga-ua',
    displayName: 'Universal Analytics (Legacy)',
    category: 'Analytics',
    description: 'Universal Analytics property access (deprecated)',
    icon: 'fas fa-chart-bar',
    logoPath: '/logos/ga-ua.svg',
    brandColor: '#F9AB00',
    tier: 2,
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
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'GROUP_ACCESS': return GroupAccessAgencySchema;
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
          { step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com and sign in.', link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' } },
          { step: 2, title: 'Go to Admin', description: 'Click Admin in the bottom left corner.' },
          { step: 3, title: 'Select Property', description: 'Select the Universal Analytics property.' },
          { step: 4, title: 'User Management', description: 'Click "User Management" at the property level.' },
          { step: 5, title: 'Add User', description: 'Click "+" and enter the agency email address.' },
          { step: 6, title: 'Set Permissions', description: `Set the permission level to "${roleTemplate}" and save.` }
        ];
      case 'GROUP_ACCESS':
        return [
          { step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com and sign in.', link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' } },
          { step: 2, title: 'Go to Admin', description: 'Click Admin in the bottom left corner.' },
          { step: 3, title: 'User Management', description: 'Click "User Management" at the property level.' },
          { step: 4, title: 'Add Service Account', description: 'Add the service account email with appropriate permissions.' }
        ];
      case 'SHARED_ACCOUNT':
        return [
          { step: 1, title: 'Provide Credentials', description: 'Enter the Google account email and password.' },
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

export default new GAUAPlugin();
