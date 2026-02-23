/**
 * Snowflake Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType } from '../../lib/plugins/types';
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

export const SNOWFLAKE_MANIFEST: PluginManifest = {
  platformKey: 'snowflake', displayName: 'Snowflake', pluginVersion: '2.1.0', category: 'Data Warehouse',
  description: 'Snowflake Data Cloud', tier: 1, clientFacing: true,
  icon: 'fas fa-snowflake', logoPath: '/logos/snowflake.svg', brandColor: '#29B5E8',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
};
export default SNOWFLAKE_MANIFEST;
