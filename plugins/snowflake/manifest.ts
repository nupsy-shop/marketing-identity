/**
 * Snowflake Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Role Grant', description: 'Grant Snowflake role to user', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'ACCOUNTADMIN', label: 'Account Admin', description: 'Full account control' }, { key: 'SYSADMIN', label: 'Sys Admin', description: 'Create and manage objects' }, { key: 'SECURITYADMIN', label: 'Security Admin', description: 'Manage grants and users' }, { key: 'PUBLIC', label: 'Public', description: 'Default minimal role' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'ACCOUNTADMIN', label: 'Account Admin', description: 'Full account control' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: true, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'conditional', pamRationale: 'Snowflake supports role-based access with GRANT/REVOKE. PAM useful for service accounts or break-glass admin access.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: true, automatedProvisioningSupported: true,
  discoverTargetsSupported: true, targetTypes: ['ACCOUNT', 'DATABASE']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: true, canVerifyAccess: true, canRevokeAccess: true, requiresEvidenceUpload: false, verificationMode: 'AUTO' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const SNOWFLAKE_MANIFEST: PluginManifest = {
  platformKey: 'snowflake', displayName: 'Snowflake', pluginVersion: '3.0.0', category: 'Data & Analytics', domain: 'Data Warehouse',
  description: 'Snowflake Data Cloud - role-based access management', tier: 2, clientFacing: true,
  icon: 'fas fa-snowflake', logoPath: '/logos/snowflake.svg', brandColor: '#29B5E8',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy, 'AGENCY_GROUP' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default SNOWFLAKE_MANIFEST;
