/**
 * Snowflake Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, PamIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named User', description: 'Create user in account', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' }, { key: 'sysadmin', label: 'SYSADMIN', description: 'Create warehouses, databases' }, { key: 'securityadmin', label: 'SECURITYADMIN', description: 'Manage grants and users' }, { key: 'analyst', label: 'Analyst', description: 'Query and report access' }] },
  { type: 'GROUP_ACCESS' as AccessItemType, label: 'Service Account', description: 'Service account for ETL/integrations', icon: 'fas fa-robot',
    roleTemplates: [{ key: 'service', label: 'Service Account', description: 'Programmatic access' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'break_glass_only', pamRationale: 'Snowflake supports SSO, key-pair auth, and named users. PAM should only be used for emergency break-glass scenarios.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = { 
  oauthSupported: true, 
  apiVerificationSupported: true, 
  automatedProvisioningSupported: true,
  discoverTargetsSupported: true,
  targetTypes: ['ACCOUNT', 'WAREHOUSE', 'DATABASE'],
};

// Snowflake doesn't expose user management via REST API (requires SQL)
export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: {
    clientOAuthSupported: true,
    canGrantAccess: false,     // User management requires SQL, not REST API
    canVerifyAccess: false,    // No REST API for user verification
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  },
  GROUP_ACCESS: {
    clientOAuthSupported: true,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  },
  SHARED_ACCOUNT: {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    canRevokeAccess: false,
    requiresEvidenceUpload: true
  }
};

export const SNOWFLAKE_MANIFEST: PluginManifest = {
  platformKey: 'snowflake', displayName: 'Snowflake', pluginVersion: '2.3.0', category: 'Data Warehouse',
  description: 'Snowflake Data Cloud', tier: 1, clientFacing: true,
  icon: 'fas fa-snowflake', logoPath: '/logos/snowflake.svg', brandColor: '#29B5E8',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy, 'STATIC' as PamIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'GROUP_ACCESS' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['EVIDENCE_REQUIRED' as VerificationMode, 'ATTESTATION_ONLY' as VerificationMode],
};
export default SNOWFLAKE_MANIFEST;
