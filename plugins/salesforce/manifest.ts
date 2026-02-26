/**
 * Salesforce Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named User', description: 'Salesforce user with profile and permissions', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'system-administrator', label: 'System Administrator', description: 'Full Salesforce access' }, { key: 'standard-user', label: 'Standard User', description: 'Standard CRM access' }, { key: 'marketing-user', label: 'Marketing User', description: 'Marketing features access' }, { key: 'read-only', label: 'Read Only', description: 'View-only access' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'system-administrator', label: 'System Administrator', description: 'Full access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'Salesforce supports named users with permission sets. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: true, automatedProvisioningSupported: true,
  discoverTargetsSupported: true, targetTypes: ['ORG']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: true, canVerifyAccess: true, canRevokeAccess: true, requiresEvidenceUpload: false, verificationMode: 'AUTO' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const SALESFORCE_MANIFEST: PluginManifest = {
  platformKey: 'salesforce', displayName: 'Salesforce', pluginVersion: '3.0.0', category: 'CRM & Marketing Automation', domain: 'CRM',
  description: 'Salesforce CRM, Marketing Cloud, Sales Cloud', tier: 1, clientFacing: true,
  icon: 'fab fa-salesforce', logoPath: '/logos/salesforce.svg', brandColor: '#00A1E0',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default SALESFORCE_MANIFEST;
