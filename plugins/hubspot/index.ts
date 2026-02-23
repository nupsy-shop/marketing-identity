/**
 * HubSpot Platform Plugin
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
    description: 'Invite user to portal',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'super_admin', label: 'Super Admin', description: 'Full portal administration' },
      { key: 'marketing', label: 'Marketing', description: 'Marketing access' },
      { key: 'sales', label: 'Sales', description: 'Sales access' },
      { key: 'service', label: 'Service', description: 'Service access' }
    ]
  },
  {
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group Access',
    description: 'SCIM group assignment',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'team_access', label: 'Team Access', description: 'Team-based access' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'super_admin', label: 'Super Admin', description: 'Full portal administration' }
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
  pamRationale: 'HubSpot supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (optional)'),
});

const GroupAccessAgencySchema = z.object({
  ssoGroupName: z.string().min(1, 'SSO Group Name is required').describe('SSO group name'),
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
  portalId: z.string().min(1, 'Portal ID is required').describe('HubSpot Portal ID'),
  portalName: z.string().optional().describe('Portal name for reference'),
});

const SharedAccountClientSchema = z.object({
  portalId: z.string().min(1, 'Portal ID is required').describe('HubSpot Portal ID'),
  accountEmail: z.string().email().optional().describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class HubSpotPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'hubspot',
    displayName: 'HubSpot',
    category: 'CRM',
    description: 'HubSpot CRM and Marketing Hub',
    icon: 'fab fa-hubspot',
    logoPath: '/logos/hubspot.svg',
    brandColor: '#FF7A59',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: ACCESS_ITEM_TYPES,
    securityCapabilities: SECURITY_CAPABILITIES,
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
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
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Sign in to HubSpot', description: 'Go to app.hubspot.com and sign in.', link: { url: 'https://app.hubspot.com', label: 'Open HubSpot' } },
          { step: 2, title: 'Go to Settings', description: 'Click the settings gear icon in the top navigation.' },
          { step: 3, title: 'Navigate to Users & Teams', description: 'In the left sidebar, click "Users & Teams".' },
          { step: 4, title: 'Create User', description: 'Click "Create user" and enter the agency email.' },
          { step: 5, title: 'Set Permissions', description: `Assign the "${roleTemplate}" permission set and save.` }
        ];
      
      case 'GROUP_ACCESS':
        return [
          { step: 1, title: 'Sign in to HubSpot', description: 'Go to app.hubspot.com and sign in.', link: { url: 'https://app.hubspot.com', label: 'Open HubSpot' } },
          { step: 2, title: 'Go to Settings', description: 'Click the settings gear icon.' },
          { step: 3, title: 'Configure SSO', description: 'Navigate to "Security" > "Single sign-on".' },
          { step: 4, title: 'Set Up SCIM', description: 'Configure SCIM for automatic user provisioning.' },
          { step: 5, title: 'Assign Team', description: `Assign the SSO group to a team with "${roleTemplate}" access.` }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter the HubSpot account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'The agency will manage a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant the required permissions to the agency identity.' }
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

export default new HubSpotPlugin();
