/**
 * Google Analytics 4 Plugin - Manifest
 * Describes GA4 platform capabilities and metadata
 */

import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, AccessTypeCapabilityWithRules, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

// ─── Access Item Type Definitions ────────────────────────────────────────────

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  {
    type: 'NAMED_INVITE' as AccessItemType,
    label: 'Named Invite',
    description: 'Invite user to property with email-based access',
    icon: 'fas fa-user-plus',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration including user management' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration, create reports, manage data streams' },
      { key: 'analyst', label: 'Analyst', description: 'Create and edit reports, explorations' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' }
    ]
  },
  {
    type: 'GROUP_ACCESS' as AccessItemType,
    label: 'Group/Service Account',
    description: 'Grant access to service accounts or Google Groups',
    icon: 'fas fa-users',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' },
      { key: 'analyst', label: 'Analyst', description: 'Create and edit reports' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' }
    ]
  },
  {
    type: 'SHARED_ACCOUNT' as AccessItemType,
    label: 'Shared Account (PAM)',
    description: 'Privileged access via credential vault for shared logins',
    icon: 'fas fa-key',
    roleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' }
    ]
  }
];

// ─── Security Capabilities (PAM Governance) ──────────────────────────────────

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false,
  supportsGroupAccess: true,
  supportsOAuth: false, // GA4 Admin API does support OAuth but not implemented yet
  supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended',
  pamRationale: 'Google Analytics / GA4 supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass scenarios, legacy constraints, or client-mandated shared logins. Prefer the native delegation/RBAC options.'
};

// ─── Automation Capabilities ────────────────────────────────────────────────

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true,
  apiVerificationSupported: true,
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'PROPERTY']
};

// ─── Access Type Capabilities ───────────────────────────────────────────────
// Per-access-type connection and provisioning capabilities
// SHARED_ACCOUNT now supports conditional rules based on PAM configuration

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // GA Admin API can create access bindings
    canVerifyAccess: true,     // GA Admin API can list user links to verify access
    requiresEvidenceUpload: false
  },
  GROUP_ACCESS: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // GA Admin API can create access bindings
    canVerifyAccess: true,     // GA Admin API can list user links to verify access
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    // Default: evidence/manual flow (for CLIENT_OWNED or unspecified config)
    default: {
      clientOAuthSupported: false,
      canGrantAccess: false,
      canVerifyAccess: false,
      requiresEvidenceUpload: true
    },
    // Conditional rules: override capabilities based on PAM configuration
    rules: [
      // AGENCY_OWNED + HUMAN_INTERACTIVE: Identity-based PAM - can use OAuth + verify
      // The agency identity (email) is granted access, so we can verify via API
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'HUMAN_INTERACTIVE' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: true,      // GA4 Admin API can create access bindings for agency identity
          canVerifyAccess: true,     // Can verify agency identity has access
          requiresEvidenceUpload: false
        }
      },
      // AGENCY_OWNED + INTEGRATION_NON_HUMAN: Service account access
      // Can verify if service account email has access
      {
        when: { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'INTEGRATION_NON_HUMAN' },
        set: {
          clientOAuthSupported: true,
          canGrantAccess: true,
          canVerifyAccess: true,
          requiresEvidenceUpload: false
        }
      },
      // CLIENT_OWNED: Client provides credentials - must use evidence
      {
        when: { pamOwnership: 'CLIENT_OWNED' },
        set: {
          clientOAuthSupported: false,
          canGrantAccess: false,
          canVerifyAccess: false,
          requiresEvidenceUpload: true
        }
      }
    ]
  } as AccessTypeCapabilityWithRules
};

// ─── Plugin Manifest ────────────────────────────────────────────────────────

export const GA4_MANIFEST: PluginManifest = {
  // Identity
  platformKey: 'ga4',
  displayName: 'Google Analytics / GA4',
  pluginVersion: '2.3.0',

  // Categorization
  category: 'Analytics',
  description: 'Google Analytics 4 property access for web and app analytics',
  tier: 1,
  clientFacing: true,

  // Visual
  icon: 'fas fa-chart-line',
  logoPath: '/logos/ga4.svg',
  brandColor: '#E37400',

  // Capabilities
  supportedAccessItemTypes: ACCESS_ITEM_TYPES,
  securityCapabilities: SECURITY_CAPABILITIES,
  automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,

  // Allowed configuration models
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: [
    'AGENCY_GROUP' as HumanIdentityStrategy,
    'INDIVIDUAL_USERS' as HumanIdentityStrategy,
    'CLIENT_DEDICATED' as HumanIdentityStrategy,
    'STATIC' as PamIdentityStrategy,
    'CLIENT_DEDICATED' as PamIdentityStrategy,
  ],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'GROUP_ACCESS' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],

  // Feature Flags
  supportsReporting: true,
  supportsEventUpload: false,
  supportsWebhooks: false,
  scopes: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.manage.users'
  ],
};

export default GA4_MANIFEST;
