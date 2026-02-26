/**
 * Google Analytics UA Plugin - Manifest (Legacy)
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Add user to GA UA account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'administrator', label: 'Administrator', description: 'Full access including user management' }, { key: 'editor', label: 'Editor', description: 'Edit settings and data' }, { key: 'analyst', label: 'Analyst', description: 'Create and share reports' }, { key: 'viewer', label: 'Viewer', description: 'Read-only access' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'administrator', label: 'Administrator', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'GA UA supports named-user access via Google accounts. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: true, automatedProvisioningSupported: true,
  discoverTargetsSupported: true, targetTypes: ['ACCOUNT', 'WEB_PROPERTY']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: true, canVerifyAccess: true, canRevokeAccess: true, requiresEvidenceUpload: false, verificationMode: 'AUTO' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const GA_UA_MANIFEST: PluginManifest = {
  platformKey: 'ga-ua', displayName: 'Google Analytics UA (Legacy)', pluginVersion: '3.0.0', category: 'Analytics',
  description: 'Google Analytics Universal Analytics (sunset - read-only + user management)', tier: 2, clientFacing: true,
  icon: 'fas fa-chart-line', logoPath: '/logos/ga-ua.svg', brandColor: '#E37400',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default GA_UA_MANIFEST;
