/**
 * Google Search Console Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to property', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access including user management' }, { key: 'full', label: 'Full User', description: 'View all data and take some actions' }, { key: 'restricted', label: 'Restricted', description: 'View most data' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: false, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Search Console supports named-user access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { oauthSupported: false, apiVerificationSupported: true, automatedProvisioningSupported: false };

export const GSC_MANIFEST: PluginManifest = {
  platformKey: 'google-search-console', displayName: 'Google Search Console', pluginVersion: '2.1.0', category: 'SEO',
  description: 'Google Search Console for SEO and search performance', tier: 1, clientFacing: true,
  icon: 'fab fa-google', logoPath: '/logos/gsc.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default GSC_MANIFEST;
