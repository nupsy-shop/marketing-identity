/**
 * Snowflake Platform Plugin
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
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group Access',
    description: 'SSO/SCIM role assignment',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' },
      { key: 'sysadmin', label: 'SYSADMIN', description: 'System administration' },
      { key: 'custom', label: 'Custom', description: 'Custom role (specify name)' }
    ]
  },
  {
    type: 'PROXY_TOKEN' as AccessItemType,
    label: 'Proxy Token',
    description: 'Service account access',
    icon: 'fas fa-robot',
    roleTemplates: [
      { key: 'service_account', label: 'Service Account', description: 'Programmatic access' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' },
      { key: 'sysadmin', label: 'SYSADMIN', description: 'System administration' }
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
  pamRationale: 'Snowflake supports group/SSO-based access. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas ─────────────────────────────────────────────────────

const GroupAccessAgencySchema = z.object({
  ssoGroupName: z.string().min(1, 'SSO Group Name is required').describe('SSO group name for access'),
  customRoleName: z.string().optional().describe('Custom role name (if using custom role)'),
});

const ProxyTokenAgencySchema = z.object({
  serviceAccountEmail: z.string().email('Must be a valid email').describe('Service account email'),
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

const GroupAccessClientSchema = z.object({
  accountLocator: z.string().min(1, 'Account locator is required').describe('Snowflake account locator'),
  warehouseId: z.string().optional().describe('Warehouse ID'),
  databaseId: z.string().optional().describe('Database ID'),
});

const ProxyTokenClientSchema = z.object({
  accountLocator: z.string().min(1, 'Account locator is required').describe('Snowflake account locator'),
  warehouseId: z.string().optional().describe('Warehouse ID'),
});

const SharedAccountClientSchema = z.object({
  accountLocator: z.string().min(1, 'Account locator is required').describe('Snowflake account locator'),
  accountUsername: z.string().optional().describe('Account username (for CLIENT_OWNED PAM)'),
  accountPassword: z.string().optional().describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class SnowflakePlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'snowflake',
    displayName: 'Snowflake',
    category: 'Data Warehouse',
    description: 'Snowflake data warehouse',
    icon: 'fas fa-snowflake',
    logoPath: '/logos/snowflake.svg',
    brandColor: '#29B5E8',
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
      case 'GROUP_ACCESS':
        return GroupAccessAgencySchema;
      case 'PROXY_TOKEN':
        return ProxyTokenAgencySchema;
      case 'SHARED_ACCOUNT':
        return SharedAccountAgencySchema;
      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'GROUP_ACCESS':
        return GroupAccessClientSchema;
      case 'PROXY_TOKEN':
        return ProxyTokenClientSchema;
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
      case 'GROUP_ACCESS':
        return [
          { step: 1, title: 'Sign in to Snowflake', description: 'Go to your Snowflake account and sign in as an admin.', link: { url: 'https://app.snowflake.com', label: 'Open Snowflake' } },
          { step: 2, title: 'Go to Admin', description: 'Navigate to Admin > Security > Federated Authentication.' },
          { step: 3, title: 'Configure SSO', description: 'Set up SSO integration if not already done.' },
          { step: 4, title: 'Assign Role', description: `Grant the "${roleTemplate}" role to the SSO group.` }
        ];
      
      case 'PROXY_TOKEN':
        return [
          { step: 1, title: 'Sign in to Snowflake', description: 'Go to your Snowflake account and sign in as an admin.', link: { url: 'https://app.snowflake.com', label: 'Open Snowflake' } },
          { step: 2, title: 'Create Service Account', description: 'Create a user for the service account.' },
          { step: 3, title: 'Grant Role', description: 'Grant the appropriate role to the service account.' },
          { step: 4, title: 'Generate Key', description: 'Generate an RSA key pair for authentication.' }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter the Snowflake username and password.' },
            { step: 2, title: 'Enable MFA', description: 'Ensure multi-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'The agency will manage a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant the required role to the agency identity.' }
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

export default new SnowflakePlugin();
