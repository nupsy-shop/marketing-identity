/**
 * Google Ads Platform Plugin
 * Reference implementation with full PAM governance from plugin metadata
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
    description: 'Link via Manager Account (MCC)',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to account',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' }
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
  pamRationale: 'Google Ads supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
};

// ─── Agency Config Schemas (NO client asset IDs) ───────────────────────────────

const PartnerDelegationAgencySchema = z.object({
  managerAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'MCC ID must be in format XXX-XXX-XXXX')
    .describe('Your Google Ads Manager Account (MCC) ID'),
});

const NamedInviteAgencySchema = z.object({
  agencyGroupEmail: z.string()
    .email('Must be a valid email address')
    .optional()
    .describe('Agency Google Group email for access (optional)'),
});

const SharedAccountAgencySchema = z.object({
  // PAM Ownership
  pamOwnership: z.enum(['AGENCY_OWNED', 'CLIENT_OWNED'])
    .describe('Who owns and controls the shared account credentials'),
  
  // Identity Purpose (for AGENCY_OWNED)
  identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN'])
    .optional()
    .describe('Purpose of the identity'),
  
  // Human Interactive fields
  pamIdentityStrategy: z.enum(['STATIC_AGENCY_IDENTITY', 'CLIENT_DEDICATED_IDENTITY'])
    .optional()
    .describe('Identity strategy for human interactive access'),
  
  pamIdentityType: z.enum(['GROUP', 'MAILBOX'])
    .optional()
    .describe('Type of dedicated identity'),
  
  pamNamingTemplate: z.string()
    .optional()
    .describe('Template for generating dedicated identity (e.g., {client}-googleads@agency.com)'),
  
  pamCheckoutDurationMinutes: z.number()
    .min(5)
    .max(480)
    .optional()
    .describe('Maximum checkout duration in minutes'),
  
  pamApprovalRequired: z.boolean()
    .optional()
    .describe('Require approval for checkout'),
  
  pamRotationPolicy: z.enum(['AFTER_EACH_CHECKOUT', 'SCHEDULED', 'MANUAL'])
    .optional()
    .describe('Password rotation policy'),
  
  // Integration Non-Human fields
  integrationIdentityId: z.string()
    .optional()
    .describe('Service account or integration identity ID'),
  
  // PAM Confirmation (required for not_recommended)
  pamConfirmation: z.boolean()
    .optional()
    .describe('Confirm understanding of PAM risks'),
});

// ─── Client Target Schemas (ONLY client asset IDs) ─────────────────────────────

const PartnerDelegationClientSchema = z.object({
  adAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Ad Account ID must be in format XXX-XXX-XXXX')
    .describe('Client Google Ads Account ID'),
  adAccountName: z.string()
    .optional()
    .describe('Account name for reference'),
});

const NamedInviteClientSchema = z.object({
  adAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Ad Account ID must be in format XXX-XXX-XXXX')
    .describe('Client Google Ads Account ID'),
  adAccountName: z.string()
    .optional()
    .describe('Account name for reference'),
});

const SharedAccountClientSchema = z.object({
  adAccountId: z.string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, 'Ad Account ID must be in format XXX-XXX-XXXX')
    .describe('Client Google Ads Account ID'),
  adAccountName: z.string()
    .optional()
    .describe('Account name for reference'),
  // Client-owned PAM fields
  accountEmail: z.string()
    .email()
    .optional()
    .describe('Account email (for CLIENT_OWNED PAM)'),
  accountPassword: z.string()
    .optional()
    .describe('Account password (for CLIENT_OWNED PAM)'),
});

// ─── Plugin Implementation ─────────────────────────────────────────────────────

class GoogleAdsPlugin implements PlatformPlugin {
  manifest: PluginManifest = {
    platformKey: 'google-ads',
    displayName: 'Google Ads',
    category: 'Paid Media',
    description: 'Google Ads Manager and MCC access',
    icon: 'fab fa-google',
    logoPath: '/logos/google-ads.svg',
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

  // Get agency config schema based on access item type
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

  // Get client target schema based on access item type
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

  // Validate agency configuration
  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    
    if (result.success) {
      // Additional PAM validation
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        
        // Require confirmation for not_recommended PAM
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && 
            pamConfig.pamOwnership === 'AGENCY_OWNED' && 
            !pamConfig.pamConfirmation) {
          return {
            valid: false,
            errors: ['PAM confirmation is required. Please acknowledge the security implications of using shared credentials.']
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

  // Validate client target
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

  // Build client instructions
  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, clientName } = context;
    
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        return [
          {
            step: 1,
            title: 'Sign in to Google Ads',
            description: 'Go to ads.google.com and sign in to your account.',
            link: { url: 'https://ads.google.com', label: 'Open Google Ads' }
          },
          {
            step: 2,
            title: 'Access Account Settings',
            description: 'Click the tools icon in the top menu, then select "Account Access" under Setup.'
          },
          {
            step: 3,
            title: 'Link Manager Account',
            description: `Click "Link to Manager Account" and enter the following MCC ID: ${(agencyConfig as { managerAccountId?: string }).managerAccountId || 'N/A'}`
          },
          {
            step: 4,
            title: 'Accept Link Request',
            description: `Set the access level to "${roleTemplate}" and confirm the link.`
          }
        ];
      
      case 'NAMED_INVITE':
        return [
          {
            step: 1,
            title: 'Sign in to Google Ads',
            description: 'Go to ads.google.com and sign in to your account.',
            link: { url: 'https://ads.google.com', label: 'Open Google Ads' }
          },
          {
            step: 2,
            title: 'Access Account Settings',
            description: 'Click the tools icon, then select "Account Access" under Setup.'
          },
          {
            step: 3,
            title: 'Invite User',
            description: `Click the + button to add a new user. Enter the agency email and select "${roleTemplate}" access level.`
          },
          {
            step: 4,
            title: 'Send Invitation',
            description: 'Click "Send invitation" to complete the process.'
          }
        ];
      
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            {
              step: 1,
              title: 'Provide Account Credentials',
              description: 'Enter the shared account email and password that will be stored in the credential vault.'
            },
            {
              step: 2,
              title: 'Enable 2FA (Recommended)',
              description: 'For security, enable two-factor authentication on the shared account.'
            },
            {
              step: 3,
              title: 'Credentials Stored Securely',
              description: 'Your credentials will be encrypted and stored in the PAM vault. Agency users will check out access as needed.'
            }
          ];
        }
        return [
          {
            step: 1,
            title: 'Agency-Managed Access',
            description: 'The agency will create and manage a dedicated identity for accessing your account.'
          },
          {
            step: 2,
            title: 'Grant Admin Access',
            description: 'You may need to grant admin access to the agency-managed identity.'
          }
        ];
      
      default:
        return [];
    }
  }

  // Get verification mode
  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        return 'ATTESTATION_ONLY';
      case 'NAMED_INVITE':
        return 'ATTESTATION_ONLY';
      case 'SHARED_ACCOUNT':
        return 'EVIDENCE_REQUIRED';
      default:
        return 'ATTESTATION_ONLY';
    }
  }

  // Verify grant (placeholder for API verification)
  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    // TODO: Implement actual API verification
    return {
      status: 'PENDING',
      mode: this.getVerificationMode(context.accessItemType),
      message: 'Manual verification required'
    };
  }
}

export default new GoogleAdsPlugin();
