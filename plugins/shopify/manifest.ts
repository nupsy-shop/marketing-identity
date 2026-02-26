/**
 * Shopify Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Staff Invite',
    description: 'Invite staff member to Shopify store',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'full-access', label: 'Full Access', description: 'Full store access including settings and billing' },
      { key: 'limited-staff', label: 'Limited Staff', description: 'Access to selected areas only' },
      { key: 'reports-only', label: 'Reports Only', description: 'View reports and analytics only' },
    ]
  },
  {
    type: 'PROXY_TOKEN' as AccessItemType,
    label: 'API / App Token',
    description: 'Custom app or API access token',
    icon: 'fas fa-code',
    roleTemplates: [
      { key: 'read-write', label: 'Read/Write', description: 'Full API access to store data' },
      { key: 'read-only', label: 'Read Only', description: 'Read-only API access' },
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'store-owner', label: 'Store Owner', description: 'Full store owner access' },
    ]
  }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false,
  supportsGroupAccess: false,
  supportsOAuth: true,
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Shopify supports named staff invites and API tokens. Use PAM only for store-owner-level break-glass access.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: false,
  automatedProvisioningSupported: false,
  discoverTargetsSupported: false,
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true,
  },
  PROXY_TOKEN: {
    clientOAuthSupported: false,
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

export const SHOPIFY_MANIFEST: PluginManifest = {
  platformKey: 'shopify',
  displayName: 'Shopify',
  pluginVersion: '1.0.0',
  category: 'E-commerce',
  domain: 'Ecommerce & Retail',
  description: 'Shopify store management, staff access, and API integrations',
  tier: 2,
  clientFacing: true,
  icon: 'fab fa-shopify',
  logoPath: '/logos/shopify.svg',
  brandColor: '#96BF48',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'PROXY_TOKEN' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};

export default SHOPIFY_MANIFEST;
