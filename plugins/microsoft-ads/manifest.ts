/**
 * Microsoft Ads (Bing Ads) Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to Microsoft Ads account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full account + user management' }, { key: 'standard-user', label: 'Standard User', description: 'Manage campaigns' }, { key: 'advertiser-campaign-manager', label: 'Campaign Manager', description: 'Campaign management only' }, { key: 'viewer', label: 'Viewer', description: 'Read-only reporting' }] },
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Agency Link', description: 'Link client account to agency manager', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full delegated access' }, { key: 'standard-user', label: 'Standard User', description: 'Campaign management' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Microsoft Ads supports agency linking and named users. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: true, automatedProvisioningSupported: true,
  discoverTargetsSupported: true, targetTypes: ['CUSTOMER', 'AD_ACCOUNT']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: true, canVerifyAccess: true, canRevokeAccess: true, requiresEvidenceUpload: false, verificationMode: 'AUTO' as VerificationMode },
  PARTNER_DELEGATION: { clientOAuthSupported: true, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'ATTESTATION_ONLY' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const MICROSOFT_ADS_MANIFEST: PluginManifest = {
  platformKey: 'microsoft-ads', displayName: 'Microsoft Ads (Bing Ads)', pluginVersion: '1.0.0', category: 'Paid Media',
  description: 'Microsoft Advertising - Bing, MSN, Outlook, Edge', tier: 1, clientFacing: true,
  icon: 'fab fa-microsoft', logoPath: '/logos/microsoft-ads.svg', brandColor: '#00A4EF',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'PARTNER_DELEGATION' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default MICROSOFT_ADS_MANIFEST;
