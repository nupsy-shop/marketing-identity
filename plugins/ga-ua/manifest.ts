/**
 * Google Analytics UA Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to property', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'administrator', label: 'Administrator', description: 'Full access' }, { key: 'editor', label: 'Editor', description: 'Edit access' }, { key: 'analyst', label: 'Analyst', description: 'Create reports' }, { key: 'viewer', label: 'Viewer', description: 'View only' }] },
  { type: 'GROUP_ACCESS' as AccessItemType, label: 'Group/Service Account', description: 'Grant access to groups', icon: 'fas fa-users',
    roleTemplates: [{ key: 'administrator', label: 'Administrator', description: 'Full access' }, { key: 'editor', label: 'Editor', description: 'Edit access' }, { key: 'viewer', label: 'Viewer', description: 'View only' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'administrator', label: 'Administrator', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Google Analytics UA supports group-based and named-user access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { oauthSupported: false, apiVerificationSupported: true, automatedProvisioningSupported: true };

export const GA_UA_MANIFEST: PluginManifest = {
  platformKey: 'ga-ua', displayName: 'Google Analytics (Universal)', pluginVersion: '2.1.0', category: 'Analytics',
  description: 'Google Analytics Universal Analytics (Legacy)', tier: 2, clientFacing: true,
  icon: 'fas fa-chart-line', logoPath: '/logos/ga-ua.svg', brandColor: '#E37400',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default GA_UA_MANIFEST;
