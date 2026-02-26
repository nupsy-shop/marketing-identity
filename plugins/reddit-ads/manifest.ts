/**
 * Reddit Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to Reddit Ads account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full account access' }, { key: 'campaign-manager', label: 'Campaign Manager', description: 'Manage campaigns' }, { key: 'analyst', label: 'Analyst', description: 'View reports' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Reddit Ads supports named-user access. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: false, automatedProvisioningSupported: false,
  discoverTargetsSupported: true, targetTypes: ['AD_ACCOUNT']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'ATTESTATION_ONLY' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const REDDIT_ADS_MANIFEST: PluginManifest = {
  platformKey: 'reddit-ads', displayName: 'Reddit Ads', pluginVersion: '1.0.0', category: 'Paid Media',
  description: 'Reddit Advertising - Promoted Posts, Display Ads', tier: 2, clientFacing: true,
  icon: 'fab fa-reddit', logoPath: '/logos/reddit-ads.svg', brandColor: '#FF4500',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['ATTESTATION_ONLY' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default REDDIT_ADS_MANIFEST;
