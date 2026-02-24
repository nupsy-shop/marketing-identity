/**
 * Google Tag Manager Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to container', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full container access' }, { key: 'publish', label: 'Publish', description: 'Create and publish versions' }, { key: 'approve', label: 'Approve', description: 'Create and approve versions' }, { key: 'edit', label: 'Edit', description: 'Create workspaces and versions' }, { key: 'read', label: 'Read', description: 'View only' }] },
  { type: 'GROUP_ACCESS' as AccessItemType, label: 'Group/Service Account', description: 'Grant access to groups', icon: 'fas fa-users',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }, { key: 'edit', label: 'Edit', description: 'Edit access' }, { key: 'read', label: 'Read', description: 'View only' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'admin', label: 'Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'GTM supports named-user and group access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'CONTAINER']
};

// GTM API supports user management - verify only for MVP
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // Not yet implemented - keep 501
    canVerifyAccess: true,     // GTM API can list permissions
    requiresEvidenceUpload: false
  },
  GROUP_ACCESS: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // Not yet implemented - keep 501
    canVerifyAccess: true,     // GTM API can list permissions
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const GTM_MANIFEST: PluginManifest = {
  platformKey: 'gtm', displayName: 'Google Tag Manager', pluginVersion: '2.2.0', category: 'Tag Management',
  description: 'Google Tag Manager container access', tier: 1, clientFacing: true,
  icon: 'fas fa-tags', logoPath: '/logos/gtm.svg', brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
};
export default GTM_MANIFEST;
