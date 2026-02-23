/**
 * Google Tag Manager Platform Plugin
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
    description: 'Invite user to container',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full container administration' },
      { key: 'publish', label: 'Publish', description: 'Edit and publish changes' },
      { key: 'approve', label: 'Approve', description: 'Edit and approve changes' },
      { key: 'edit', label: 'Edit', description: 'Edit workspace only' },
      { key: 'read', label: 'Read', description: 'View only' }
    ]
  },
  {
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group Access',
    description: 'Service account access',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full container administration' },
      { key: 'publish', label: 'Publish', description: 'Edit and publish changes' },
      { key: 'read', label: 'Read', description: 'View only' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full container administration' },
      { key: 'publish', label: 'Publish', description: 'Edit and publish changes' }
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
  pamRationale: 'Google Tag Manager supports named-user invites and service accounts. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
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
  containerId: z.string().min(1, 'Container ID is required').describe('GTM Container ID (e.g., GTM-XXXXX)'),
  containerName: z.string().optional().describe('Container name for reference'),
  workspaceId: z.string().optional().describe('Workspace ID (if applicable)'),
});

const SharedAccountClientSchema = z.object({
  containerId: z.string().min(1, 'Container ID is required').describe('GTM Container ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class GTMPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'gtm',
    displayName: 'Google Tag Manager',
    category: 'Tag Management',
    description: 'Google Tag Manager container access',
    icon: 'fas fa-tags',
    logoPath: '/logos/gtm.svg',
    brandColor: '#4285F4',
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
          { step: 1, title: 'Open Tag Manager', description: 'Go to tagmanager.google.com and sign in.', link: { url: 'https://tagmanager.google.com', label: 'Open Tag Manager' } },
          { step: 2, title: 'Select Container', description: 'Select the container you want to share access to.' },
          { step: 3, title: 'Go to User Management', description: 'Click Admin > User Management.' },
          { step: 4, title: 'Add User', description: 'Click "+" and enter the agency email address.' },
          { step: 5, title: 'Set Permissions', description: `Set the permission level to "${roleTemplate}" and save.` }
        ];
      case 'GROUP_ACCESS':
        return [
          { step: 1, title: 'Open Tag Manager', description: 'Go to tagmanager.google.com and sign in.', link: { url: 'https://tagmanager.google.com', label: 'Open Tag Manager' } },
          { step: 2, title: 'Select Container', description: 'Select the container.' },
          { step: 3, title: 'Go to User Management', description: 'Click Admin > User Management.' },
          { step: 4, title: 'Add Service Account', description: 'Add the service account email.' },
          { step: 5, title: 'Set Permissions', description: `Set the permission level to "${roleTemplate}" and save.` }
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

export default new GTMPlugin();
