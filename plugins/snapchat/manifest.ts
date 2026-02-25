/**
 * Snapchat Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Organization Partnership', description: 'Add as org partner', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'member', label: 'Member', description: 'Manage campaigns' }] },
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to ad account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'campaign-manager', label: 'Campaign Manager', description: 'Manage campaigns' }, { key: 'analyst', label: 'Analyst', description: 'View reports' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: false, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Snapchat supports organization partnerships. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: false, 
  apiVerificationSupported: false, 
  automatedProvisioningSupported: false 
};

// Snapchat does not have public APIs for user management
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  },
  NAMED_INVITE: {
    clientOAuthSupported: false,
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

export const SNAPCHAT_MANIFEST: PluginManifest = {
  platformKey: 'snapchat', displayName: 'Snapchat Ads', pluginVersion: '2.2.0', category: 'Paid Media',
  description: 'Snapchat Ads Manager', tier: 2, clientFacing: true,
  icon: 'fab fa-snapchat', logoPath: '/logos/snapchat.svg', brandColor: '#FFFC00',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['PARTNER_DELEGATION' as AccessItemType, 'NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};
export default SNAPCHAT_MANIFEST;
