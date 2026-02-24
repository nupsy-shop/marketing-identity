/**
 * Google Search Console Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, AccessTypeCapabilityWithRules } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to property', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access including user management' }, { key: 'full', label: 'Full User', description: 'View all data and take some actions' }, { key: 'restricted', label: 'Restricted', description: 'View most data' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'owner', label: 'Owner', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Search Console supports named-user access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: false,
  discoverTargetsSupported: true,
  targetTypes: ['SITE', 'PROPERTY']
};

// GSC API can verify site access but cannot add users programmatically
// The API only supports listing sites and checking the current user's permission level
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // Search Console API does NOT support adding users
    canVerifyAccess: true,     // Can verify if connected user has access
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const GSC_MANIFEST: PluginManifest = {
  platformKey: 'google-search-console', displayName: 'Google Search Console', pluginVersion: '2.2.0', category: 'SEO',
  description: 'Google Search Console for SEO and search performance', tier: 1, clientFacing: true,
  icon: 'fab fa-google', logoPath: '/logos/gsc.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
};
export default GSC_MANIFEST;
