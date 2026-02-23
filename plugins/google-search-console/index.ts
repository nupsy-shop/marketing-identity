/**
 * Google Search Console Platform Plugin
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
      { key: 'owner', label: 'Owner', description: 'Full property ownership' },
      { key: 'full', label: 'Full', description: 'Full access without ownership' },
      { key: 'restricted', label: 'Restricted', description: 'Limited access' }
    ]
  },
  {
    type: 'PROXY_TOKEN' as AccessItemType,
    label: 'API Access',
    description: 'Site verification API',
    icon: 'fas fa-robot',
    roleTemplates: [
      { key: 'api_access', label: 'API Access', description: 'Programmatic API access' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'owner', label: 'Owner', description: 'Full property ownership' },
      { key: 'full', label: 'Full', description: 'Full access without ownership' }
    ]
  }
];

// ─── Security Capabilities (PAM Governance) ────────────────────────────────────

const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false,
  supportsGroupAccess: false,
  supportsOAuth: false,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Search Console supports named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (optional)'),
});

const ProxyTokenAgencySchema = z.object({
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
  propertyUrl: z.string().url().describe('Property URL (e.g., https://example.com)'),
  propertyName: z.string().optional().describe('Property name for reference'),
});

const SharedAccountClientSchema = z.object({
  propertyUrl: z.string().url().describe('Property URL'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class GoogleSearchConsolePlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'google-search-console',
    displayName: 'Google Search Console',
    category: 'SEO',
    description: 'Google Search Console property access',
    icon: 'fas fa-search',
    logoPath: '/logos/google-search-console.svg',
    brandColor: '#458CF5',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: ACCESS_ITEM_TYPES,
    securityCapabilities: SECURITY_CAPABILITIES,
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: true,
      automatedProvisioningSupported: false
    },
    pluginVersion: '2.0.0'
  };

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'PROXY_TOKEN': return ProxyTokenAgencySchema;
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
          { step: 1, title: 'Open Search Console', description: 'Go to search.google.com/search-console and sign in.', link: { url: 'https://search.google.com/search-console', label: 'Open Search Console' } },
          { step: 2, title: 'Select Property', description: 'Select the property you want to share access to.' },
          { step: 3, title: 'Go to Settings', description: 'Click Settings in the left sidebar, then "Users and permissions".' },
          { step: 4, title: 'Add User', description: 'Click "Add user" and enter the agency email address.' },
          { step: 5, title: 'Set Permission', description: `Set the permission level to "${roleTemplate}" and save.` }
        ];
      case 'PROXY_TOKEN':
        return [
          { step: 1, title: 'Open Search Console', description: 'Go to search.google.com/search-console and sign in.', link: { url: 'https://search.google.com/search-console', label: 'Open Search Console' } },
          { step: 2, title: 'Select Property', description: 'Select the property.' },
          { step: 3, title: 'Add Service Account', description: 'Add the service account email with API access.' },
          { step: 4, title: 'Verify Access', description: 'Verify the service account has proper access.' }
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

export default new GoogleSearchConsolePlugin();
