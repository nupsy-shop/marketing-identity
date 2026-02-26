/**
 * DV360 Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Partner Delegation', description: 'Partner access via DV360', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full partner access' }, { key: 'standard', label: 'Standard', description: 'Campaign management' }, { key: 'read-only', label: 'Read-only', description: 'View only' }] },
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to advertiser', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'standard', label: 'Standard', description: 'Campaign management' }, { key: 'read-only', label: 'Read-only', description: 'View only' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: true, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'DV360 supports partner delegation. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: false, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: false 
};

// DV360 does not have public APIs for user management
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  },
  NAMED_INVITE: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  }
};

export const DV360_MANIFEST: PluginManifest = {
  platformKey: 'dv360', displayName: 'DV360 (Display & Video 360)', pluginVersion: '2.3.0', category: 'Paid Media',
  description: 'Google Display & Video 360 (DV360)', tier: 1, clientFacing: true,
  icon: 'fas fa-tv', logoPath: '/logos/dv360.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['AGENCY_GROUP' as HumanIdentityStrategy, 'INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['PARTNER_DELEGATION' as AccessItemType, 'NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};
export default DV360_MANIFEST;
