/**
 * Google Ads Plugin - Manifest
 * Describes Google Ads platform capabilities and metadata
 */

import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Link via Manager Account (MCC)',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to account',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' }
    ]
  }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true,
  supportsGroupAccess: false,
  supportsOAuth: true,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Ads supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: true,
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'AD_ACCOUNT']
};

// Google Ads API supports linking customers to MCC and managing user invitations
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Google Ads API supports linking to MCC
    canVerifyAccess: true,     // Can check account links
    requiresEvidenceUpload: false
  },
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Can send invitations via API
    canVerifyAccess: true,     // Can check user access
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const GOOGLE_ADS_MANIFEST: PluginManifest = {
  platformKey: 'google-ads',
  displayName: 'Google Ads',
  pluginVersion: '2.2.0',
  category: 'Paid Media',
  description: 'Google Ads Manager and MCC access management',
  tier: 1,
  clientFacing: true,
  icon: 'fab fa-google',
  logoPath: '/logos/google-ads.svg',
  brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  supportsReporting: true,
  supportsEventUpload: false,
  supportsWebhooks: false,
  scopes: [
    'https://www.googleapis.com/auth/adwords'
  ],
};

export default GOOGLE_ADS_MANIFEST;
