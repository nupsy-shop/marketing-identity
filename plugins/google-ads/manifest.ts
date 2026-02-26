/**
 * Google Ads Plugin - Manifest
 * Describes Google Ads platform capabilities and metadata
 */

import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, AccessTypeCapabilityWithRules, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
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

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true,
  supportsGroupAccess: false,
  supportsOAuth: true,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Ads supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: true,
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'AD_ACCOUNT']
};

// Google Ads API supports linking customers to MCC and managing user invitations
// Grant access implemented via user invitation and manager link creation
// SHARED_ACCOUNT now supports conditional rules based on PAM configuration
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Can create MCC manager link invitation
    canVerifyAccess: true,     // Can check MCC account links
    canRevokeAccess: true,     // Can cancel/deactivate manager link
    requiresEvidenceUpload: false
  },
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Can create user access invitation
    canVerifyAccess: true,     // Can check user access
    canRevokeAccess: true,     // Can remove user access
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    // Default: evidence/manual flow (for CLIENT_OWNED)
    default: {
      clientOAuthSupported: false,
      canGrantAccess: false,
      canVerifyAccess: false,
      requiresEvidenceUpload: true
    },
    // Conditional rules for identity-based PAM
    rules: [
      // AGENCY_OWNED + HUMAN_INTERACTIVE: Can grant and verify via API
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'HUMAN_INTERACTIVE' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: true,
          canVerifyAccess: true,
          requiresEvidenceUpload: false
        }
      },
      // AGENCY_OWNED + INTEGRATION_NON_HUMAN: Service account access
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'INTEGRATION_NON_HUMAN' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: true,
          canVerifyAccess: true,
          requiresEvidenceUpload: false
        }
      },
      // CLIENT_OWNED: Must use evidence
      {
        when: { pamOwnership: 'CLIENT_OWNED' },
        set: {
          clientOAuthSupported: false,
          canGrantAccess: false,
          canVerifyAccess: false,
          requiresEvidenceUpload: true
        }
      }
    ]
  } as AccessTypeCapabilityWithRules
};

export const GOOGLE_ADS_MANIFEST: PluginManifest = {
  platformKey: 'google-ads',
  displayName: 'Google Ads',
  pluginVersion: '2.3.0',
  category: 'Paid Media',
  description: 'Google Ads Manager and MCC access management',
  tier: 1,
  clientFacing: true,
  icon: 'fab fa-google',
  logoPath: '/logos/google-ads.svg',
  brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: [
    'AGENCY_GROUP' as HumanIdentityStrategy,
    'INDIVIDUAL_USERS' as HumanIdentityStrategy,
    'CLIENT_DEDICATED' as HumanIdentityStrategy,
    'STATIC' as PamIdentityStrategy,
    'CLIENT_DEDICATED' as PamIdentityStrategy,
  ],
  allowedAccessTypes: ['PARTNER_DELEGATION' as AccessItemType, 'NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
  supportsReporting: true,
  supportsEventUpload: false,
  supportsWebhooks: false,
  scopes: [
    'https://www.googleapis.com/auth/adwords'
  ],
};

export default GOOGLE_ADS_MANIFEST;
