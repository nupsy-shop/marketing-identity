/**
 * Google Merchant Center Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to Merchant Center account',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Merchant Center access including settings and users' },
      { key: 'standard', label: 'Standard', description: 'Manage products, shipping, and taxes' },
      { key: 'performance-reporting', label: 'Performance Reporting', description: 'View performance reports and insights' },
    ]
  },
  {
    type: 'PARTNER_DELEGATION' as AccessItemType,
    label: 'Partner Delegation',
    description: 'Link via MCC or partner account',
    icon: 'fas fa-handshake',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full partner admin access' },
      { key: 'standard', label: 'Standard', description: 'Manage products and feeds' },
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full Merchant Center access' },
    ]
  }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: true,
  supportsGroupAccess: false,
  supportsOAuth: true,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Merchant Center supports named-user invites and partner delegation. Shared credentials should only be used for break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: false,
  automatedProvisioningSupported: false,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT'],
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true,
  },
  PARTNER_DELEGATION: {
    clientOAuthSupported: true,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true,
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true,
  }
};

export const GOOGLE_MERCHANT_CENTER_MANIFEST: PluginManifest = {
  platformKey: 'google-merchant-center',
  displayName: 'Google Merchant Center',
  pluginVersion: '1.0.0',
  category: 'E-commerce',
  domain: 'Ecommerce & Retail',
  description: 'Google Merchant Center product feed and Shopping ads management',
  tier: 2,
  clientFacing: true,
  icon: 'fas fa-shopping-bag',
  logoPath: '/logos/google-merchant-center.svg',
  brandColor: '#4285F4',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'PARTNER_DELEGATION' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};

export default GOOGLE_MERCHANT_CENTER_MANIFEST;
