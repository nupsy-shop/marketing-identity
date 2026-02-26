/**
 * Google Tag Manager Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, AccessTypeCapabilityWithRules, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to container', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full container access' }, { key: 'publish', label: 'Publish', description: 'Create and publish versions' }, { key: 'approve', label: 'Approve', description: 'Create and approve versions' }, { key: 'edit', label: 'Edit', description: 'Create workspaces and versions' }, { key: 'read', label: 'Read', description: 'View only' }] },
  { type: 'GROUP_ACCESS' as AccessItemType, label: 'Group/Service Account', description: 'Grant access to groups', icon: 'fas fa-users',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'edit', label: 'Edit', description: 'Edit access' }, { key: 'read', label: 'Read', description: 'View only' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'GTM supports named-user and group access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'CONTAINER']
};

// GTM API supports user management - grant access via createUserPermission
// SHARED_ACCOUNT now supports conditional rules based on PAM configuration
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // GTM API can create user permissions
    canVerifyAccess: true,     // GTM API can list permissions
    canRevokeAccess: true,     // GTM API can delete user permissions
    requiresEvidenceUpload: false
  },
  GROUP_ACCESS: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // GTM API can create user permissions
    canVerifyAccess: true,     // GTM API can list permissions
    canRevokeAccess: true,     // GTM API can delete user permissions
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
          canRevokeAccess: true,
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
          canRevokeAccess: true,
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
          canRevokeAccess: false,
          requiresEvidenceUpload: true
        }
      }
    ]
  } as AccessTypeCapabilityWithRules
};

export const GTM_MANIFEST: PluginManifest = {
  platformKey: 'gtm', displayName: 'Google Tag Manager', pluginVersion: '2.3.0', category: 'Tag Management',
  description: 'Google Tag Manager container access', tier: 1, clientFacing: true,
  icon: 'fas fa-tags', logoPath: '/logos/gtm.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: [
    'AGENCY_GROUP' as HumanIdentityStrategy,
    'INDIVIDUAL_USERS' as HumanIdentityStrategy,
    'CLIENT_DEDICATED' as HumanIdentityStrategy,
    'STATIC' as PamIdentityStrategy,
    'CLIENT_DEDICATED' as PamIdentityStrategy,
  ],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'GROUP_ACCESS' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default GTM_MANIFEST;
