/**
 * HubSpot Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to portal', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full portal access' }, { key: 'marketing', label: 'Marketing', description: 'Marketing tools access' }, { key: 'sales', label: 'Sales', description: 'Sales tools access' }, { key: 'service', label: 'Service', description: 'Service tools access' }] },
  { type: 'PARTNER_DELEGATION' as AccessItemType, label: 'Partner Delegation', description: 'Partner access via app marketplace', icon: 'fas fa-handshake',
    roleTemplates: [{ key: 'partner', label: 'Partner', description: 'Partner access' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'HubSpot supports named-user and partner access. Use PAM only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: false, 
  automatedProvisioningSupported: false,
  discoverTargetsSupported: true,
  targetTypes: ['PORTAL'],
};

// HubSpot does not have public APIs for user management
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // No public API for user provisioning
    canVerifyAccess: false,    // No API to verify user access
    requiresEvidenceUpload: true
  },
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const HUBSPOT_MANIFEST: PluginManifest = {
  platformKey: 'hubspot', displayName: 'HubSpot', pluginVersion: '2.2.0', category: 'CRM',
  description: 'HubSpot CRM, Marketing, Sales, and Service Hub', tier: 1, clientFacing: true,
  icon: 'fab fa-hubspot', logoPath: '/logos/hubspot.svg', brandColor: '#FF7A59',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
};
export default HUBSPOT_MANIFEST;
