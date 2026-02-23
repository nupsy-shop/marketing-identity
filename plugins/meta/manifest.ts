/**
 * Meta Business Manager Plugin - Manifest
 */

import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Add as Business Manager partner',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Business Manager access' },
      { key: 'analyst', label: 'Analyst', description: 'View and analyze performance' }
    ]
  },
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to assets',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full asset access' },
      { key: 'analyst', label: 'Analyst', description: 'View and analyze performance' },
      { key: 'advertiser', label: 'Advertiser', description: 'Create and manage ads' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Business Manager access' }
    ]
  }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true,
  supportsGroupAccess: false,
  supportsOAuth: false,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Meta Business Manager supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: false,
  apiVerificationSupported: false,
  automatedProvisioningSupported: false
};

export const META_MANIFEST: PluginManifest = {
  platformKey: 'meta',
  displayName: 'Meta Business Manager / Facebook Ads',
  pluginVersion: '2.1.0',
  category: 'Paid Media',
  description: 'Meta Business Manager, Facebook Ads, Instagram advertising',
  tier: 1,
  clientFacing: true,
  icon: 'fab fa-meta',
  logoPath: '/logos/meta.svg',
  brandColor: '#0668E1',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  supportsReporting: true,
  supportsEventUpload: true,
  supportsWebhooks: true,
};

export default META_MANIFEST;
