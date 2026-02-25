/**
 * LinkedIn Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Partner Delegation', description: 'Business Manager partner', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'campaign-manager', label: 'Campaign Manager', description: 'Manage campaigns' }, { key: 'viewer', label: 'Viewer', description: 'View only' }] },
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'campaign-manager', label: 'Campaign Manager', description: 'Manage campaigns' }, { key: 'viewer', label: 'Viewer', description: 'View only' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'LinkedIn supports partner delegation. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: false, 
  automatedProvisioningSupported: false,
  discoverTargetsSupported: true,
  targetTypes: ['AD_ACCOUNT'],
};

// LinkedIn does not have public APIs for user/partner management
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // No public API for partner management
    canVerifyAccess: false,    // No API to verify partner status
    requiresEvidenceUpload: true
  },
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const LINKEDIN_MANIFEST: PluginManifest = {
  platformKey: 'linkedin', displayName: 'LinkedIn Ads', pluginVersion: '2.2.0', category: 'Paid Media',
  description: 'LinkedIn Campaign Manager', tier: 1, clientFacing: true,
  icon: 'fab fa-linkedin', logoPath: '/logos/linkedin.svg', brandColor: '#0A66C2',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['PARTNER_DELEGATION' as AccessItemType, 'NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};
export default LINKEDIN_MANIFEST;
