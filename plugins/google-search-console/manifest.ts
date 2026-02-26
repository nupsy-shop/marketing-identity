/**
 * Google Search Console Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, AccessTypeCapabilityWithRules, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to property', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access including user management' }, { key: 'full', label: 'Full User', description: 'View all data and take some actions' }, { key: 'restricted', label: 'Restricted', description: 'View most data' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Search Console supports named-user access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: false,
  discoverTargetsSupported: true,
  targetTypes: ['SITE', 'PROPERTY']
};

// GSC API can verify site access but cannot add users programmatically
// The API only supports listing sites and checking the current user's permission level
// SHARED_ACCOUNT supports conditional rules based on PAM configuration
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // Search Console API does NOT support adding users
    canVerifyAccess: true,     // Can verify if connected user has access
    canRevokeAccess: false,    // Search Console API does NOT support removing users
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
      // AGENCY_OWNED + HUMAN_INTERACTIVE: Can verify via OAuth (user connects to confirm access)
      // Note: GSC cannot grant access programmatically, but can verify
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'HUMAN_INTERACTIVE' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: false,    // GSC API doesn't support adding users
          canVerifyAccess: true,    // Can verify agency identity has access
          requiresEvidenceUpload: false
        }
      },
      // AGENCY_OWNED + INTEGRATION_NON_HUMAN: Service account verification
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'INTEGRATION_NON_HUMAN' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: false,
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

export const GSC_MANIFEST: PluginManifest = {
  platformKey: 'google-search-console', displayName: 'Google Search Console', pluginVersion: '2.3.0', category: 'SEO',
  description: 'Google Search Console for SEO and search performance', tier: 1, clientFacing: true,
  icon: 'fab fa-google', logoPath: '/logos/gsc.svg', brandColor: '#4285F4',
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
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default GSC_MANIFEST;
