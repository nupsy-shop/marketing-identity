/**
 * DV360 Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
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

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { oauthSupported: false, apiVerificationSupported: true, automatedProvisioningSupported: false };

export const DV360_MANIFEST: PluginManifest = {
  platformKey: 'dv360', displayName: 'Display & Video 360', pluginVersion: '2.1.0', category: 'Paid Media',
  description: 'Google Display & Video 360 (DV360)', tier: 1, clientFacing: true,
  icon: 'fas fa-tv', logoPath: '/logos/dv360.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default DV360_MANIFEST;
