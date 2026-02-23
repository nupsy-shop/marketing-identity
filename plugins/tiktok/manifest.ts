/**
 * TikTok Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Partner Delegation', description: 'Add as Business Center partner', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'operator', label: 'Operator', description: 'Manage campaigns' }] },
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to ad account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'operator', label: 'Operator', description: 'Manage campaigns' }, { key: 'analyst', label: 'Analyst', description: 'View reports' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: false, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'TikTok supports partner delegation. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { oauthSupported: false, apiVerificationSupported: false, automatedProvisioningSupported: false };

export const TIKTOK_MANIFEST: PluginManifest = {
  platformKey: 'tiktok', displayName: 'TikTok Ads', pluginVersion: '2.1.0', category: 'Paid Media',
  description: 'TikTok Business Center and Ads Manager', tier: 1, clientFacing: true,
  icon: 'fab fa-tiktok', logoPath: '/logos/tiktok.svg', brandColor: '#000000',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default TIKTOK_MANIFEST;
