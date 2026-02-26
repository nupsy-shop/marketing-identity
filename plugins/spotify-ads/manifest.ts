/**
 * Spotify Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to Spotify Ad Studio', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full ad account access' }, { key: 'editor', label: 'Editor', description: 'Create and manage campaigns' }, { key: 'viewer', label: 'Viewer', description: 'View campaigns and reports' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: false, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Spotify Ad Studio supports named-user invites. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: false, apiVerificationSupported: false, automatedProvisioningSupported: false,
  discoverTargetsSupported: false
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'ATTESTATION_ONLY' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const SPOTIFY_ADS_MANIFEST: PluginManifest = {
  platformKey: 'spotify-ads', displayName: 'Spotify Ads', pluginVersion: '1.0.0', category: 'Paid Media', domain: 'Paid Media',
  description: 'Spotify Ad Studio - Audio and video ads', tier: 3, clientFacing: true,
  icon: 'fab fa-spotify', logoPath: '/logos/spotify-ads.svg', brandColor: '#1DB954',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['ATTESTATION_ONLY' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default SPOTIFY_ADS_MANIFEST;
