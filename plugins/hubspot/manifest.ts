/**
 * HubSpot Plugin - Manifest
 */
import type { PluginManifest } from '../common/manifest';
import type { SecurityCapabilities, AutomationCapabilities, AccessItemType, AccessTypeCapabilities, PamOwnership, HumanIdentityStrategy, VerificationMode } from '../../lib/plugins/types';
import type { AccessItemTypeMetadata } from '../common/manifest';

export const ACCESS_ITEM_TYPES: AccessItemTypeMetadata[] = [
  { type: 'NAMED_INVITE' as AccessItemType, label: 'Named Invite', description: 'Invite user to HubSpot portal', icon: 'fas fa-user-plus',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full portal access' }, { key: 'admin', label: 'Admin', description: 'Admin access' }, { key: 'sales', label: 'Sales', description: 'Sales tools access' }, { key: 'marketing', label: 'Marketing', description: 'Marketing tools access' }, { key: 'service', label: 'Service', description: 'Service tools access' }, { key: 'viewer', label: 'Viewer', description: 'Read-only access' }] },
  { type: 'SHARED_ACCOUNT' as AccessItemType, label: 'Shared Account (PAM)', description: 'Privileged access via credential vault', icon: 'fas fa-key',
    roleTemplates: [{ key: 'super-admin', label: 'Super Admin', description: 'Full portal access' }] }
];

export const SECURITY_CAPABILITIES: SecurityCapabilities = {
  supportsDelegation: false, supportsGroupAccess: false, supportsOAuth: true, supportsCredentialLogin: true,
  pamRecommendation: 'not_recommended', pamRationale: 'HubSpot supports named-user invites with granular roles. PAM only for break-glass.'
};

export const AUTOMATION_CAPABILITIES: AutomationCapabilities = {
  oauthSupported: true, apiVerificationSupported: true, automatedProvisioningSupported: true,
  discoverTargetsSupported: true, targetTypes: ['PORTAL']
};

export const ACCESS_TYPE_CAPABILITIES: AccessTypeCapabilities = {
  NAMED_INVITE: { clientOAuthSupported: true, canGrantAccess: true, canVerifyAccess: true, canRevokeAccess: true, requiresEvidenceUpload: false, verificationMode: 'AUTO' as VerificationMode },
  SHARED_ACCOUNT: { clientOAuthSupported: false, canGrantAccess: false, canVerifyAccess: false, canRevokeAccess: false, requiresEvidenceUpload: true, verificationMode: 'EVIDENCE_REQUIRED' as VerificationMode }
};

export const HUBSPOT_MANIFEST: PluginManifest = {
  platformKey: 'hubspot', displayName: 'HubSpot', pluginVersion: '3.0.0', category: 'CRM & Marketing Automation', domain: 'CRM',
  description: 'HubSpot CRM, Marketing Hub, Sales Hub, Service Hub', tier: 2, clientFacing: true,
  icon: 'fab fa-hubspot', logoPath: '/logos/hubspot.svg', brandColor: '#FF7A59',
  supportedAccessItemTypes: ACCESS_ITEM_TYPES, securityCapabilities: SECURITY_CAPABILITIES, automationCapabilities: AUTOMATION_CAPABILITIES,
  accessTypeCapabilities: ACCESS_TYPE_CAPABILITIES,
  allowedOwnershipModels: ['CLIENT_OWNED' as PamOwnership, 'AGENCY_OWNED' as PamOwnership],
  allowedIdentityStrategies: ['INDIVIDUAL_USERS' as HumanIdentityStrategy],
  allowedAccessTypes: ['NAMED_INVITE' as AccessItemType, 'SHARED_ACCOUNT' as AccessItemType],
  verificationModes: ['AUTO' as VerificationMode, 'EVIDENCE_REQUIRED' as VerificationMode],
};
export default HUBSPOT_MANIFEST;
