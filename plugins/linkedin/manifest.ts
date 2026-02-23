/**
 * LinkedIn Ads Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
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

export const LINKEDIN_MANIFEST: PluginManifest = {
  platformKey: 'linkedin', displayName: 'LinkedIn Ads', pluginVersion: '2.1.0', category: 'Paid Media',
  description: 'LinkedIn Campaign Manager', tier: 1, clientFacing: true,
  icon: 'fab fa-linkedin', logoPath: '/logos/linkedin.svg', brandColor: '#0A66C2',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default LINKEDIN_MANIFEST;
