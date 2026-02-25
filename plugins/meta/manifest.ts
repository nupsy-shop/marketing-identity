/**
 * Meta Business Manager Plugin - Manifest
 */

import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
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
  supportsOAuth: true,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Meta Business Manager supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: true,
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['BUSINESS', 'AD_ACCOUNT']
};

// Meta Business Manager API supports adding partners and user roles
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Business Manager API can add agency partners
    canVerifyAccess: true,     // Can list ad account partners
    requiresEvidenceUpload: false
  },
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Can add user roles to ad accounts
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

export const META_MANIFEST: PluginManifest = {
  platformKey: 'meta',
  displayName: 'Meta Business Manager / Facebook Ads',
  pluginVersion: '2.3.0',
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
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['AGENCY_GROUP' as HumanIdentityStrategy, 'INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['PARTNER_DELEGATION' as AccessItemType, 'NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
  supportsReporting: true,
  supportsEventUpload: true,
  supportsWebhooks: true,
};

export default META_MANIFEST;
