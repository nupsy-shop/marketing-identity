/**
 * Salesforce Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named User', description: 'Create user in org', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'system-admin', label: 'System Administrator', description: 'Full admin access' }, { key: 'marketing-user', label: 'Marketing User', description: 'Marketing Cloud access' }, { key: 'standard-user', label: 'Standard User', description: 'Standard CRM access' }, { key: 'read-only', label: 'Read Only', description: 'View access only' }] },
  { type: 'GROUP_ACCESS' as AccessItemType, label: 'Integration User', description: 'API/Integration user access', icon: 'fas fa-plug',
    roleTemplates: [{ key: 'integration', label: 'Integration User', description: 'API access for integrations' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'system-admin', label: 'System Administrator', description: 'Full admin access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'break_glass_only', pamRationale: 'Salesforce has robust SSO and named-user licensing. PAM should only be used for emergency break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ORG'],
};

// Salesforce REST APIs support user/permission management
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Salesforce API can create users
    canVerifyAccess: true,     // Can query User/PermissionSetAssignment
    requiresEvidenceUpload: false
  },
  GROUP_ACCESS: {
    clientOAuthSupported: true,
    canGrantAccess: true,      // Can create integration users
    canVerifyAccess: true,
    requiresEvidenceUpload: false
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true
  }
};

export const SALESFORCE_MANIFEST: PluginManifest = {
  platformKey: 'salesforce', displayName: 'Salesforce', pluginVersion: '2.2.0', category: 'CRM',
  description: 'Salesforce CRM and Marketing Cloud', tier: 1, clientFacing: true,
  icon: 'fab fa-salesforce', logoPath: '/logos/salesforce.svg', brandColor: '#00A1E0',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy, 'STATIC' as PamIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'GROUP_ACCESS' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default SALESFORCE_MANIFEST;
