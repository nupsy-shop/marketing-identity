/**
 * Plugin Generator Script
 * Generates plugin files based on the manifest matrix CSV
 * Run with: node scripts/generate-plugins.js
 */

const fs = require('fs');
const path = require('path');

// Plugin configuration data from CSV
const PLUGIN_CONFIGS = {
  'ga4': {
    platformKey: 'ga4',
    displayName: 'Google Analytics / GA4',
    category: 'Analytics',
    description: 'Google Analytics 4 property access',
    icon: 'fas fa-chart-line',
    logoPath: '/logos/ga4.svg',
    brandColor: '#E37400',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'NAMED_INVITE',
        label: 'Named Invite',
        description: 'Invite user to property',
        icon: 'fas fa-user-plus',
        roleTemplates: [
          { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
          { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' },
          { key: 'analyst', label: 'Analyst', description: 'Create and edit reports' },
          { key: 'viewer', label: 'Viewer', description: 'View reports only' }
        ]
      },
      {
        type: 'GROUP_ACCESS',
        label: 'Group Access',
        description: 'Service account access',
        icon: 'fas fa-users',
        roleTemplates: [
          { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
          { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' },
          { key: 'analyst', label: 'Analyst', description: 'Create and edit reports' },
          { key: 'viewer', label: 'Viewer', description: 'View reports only' }
        ]
      },
      {
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'administrator', label: 'Administrator', description: 'Full property administration' },
          { key: 'editor', label: 'Editor', description: 'Edit configuration and reports' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: false,
      supportsGroupAccess: true,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'Google Analytics / GA4 supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: true,
      automatedProvisioningSupported: true
    },
    agencyConfigFields: {
      NAMED_INVITE: ['agencyGroupEmail'],
      GROUP_ACCESS: ['serviceAccountEmail'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      NAMED_INVITE: ['propertyId', 'propertyName'],
      GROUP_ACCESS: ['propertyId', 'propertyName'],
      SHARED_ACCOUNT: ['propertyId', 'propertyName', 'accountEmail', 'accountPassword']
    }
  },
  
  'google-ads': {
    platformKey: 'google-ads',
    displayName: 'Google Ads',
    category: 'Paid Media',
    description: 'Google Ads Manager and MCC access',
    icon: 'fab fa-google',
    logoPath: '/logos/google-ads.svg',
    brandColor: '#4285F4',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'PARTNER_DELEGATION',
        label: 'Partner Delegation',
        description: 'Link via Manager Account (MCC)',
        icon: 'fas fa-handshake',
        roleTemplates: [
          { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
          { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
          { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
        ]
      },
      {
        type: 'NAMED_INVITE',
        label: 'Named Invite',
        description: 'Invite user to account',
        icon: 'fas fa-user-plus',
        roleTemplates: [
          { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
          { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
          { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' }
        ]
      },
      {
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
          { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: true,
      supportsGroupAccess: false,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'Google Ads supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: true,
      automatedProvisioningSupported: true
    },
    agencyConfigFields: {
      PARTNER_DELEGATION: ['managerAccountId'],
      NAMED_INVITE: ['agencyGroupEmail'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      PARTNER_DELEGATION: ['adAccountId', 'adAccountName'],
      NAMED_INVITE: ['adAccountId', 'adAccountName'],
      SHARED_ACCOUNT: ['adAccountId', 'adAccountName', 'accountEmail', 'accountPassword']
    }
  },
  
  'meta': {
    platformKey: 'meta',
    displayName: 'Meta Business Manager / Facebook Ads',
    category: 'Paid Media',
    description: 'Meta Business Manager, Facebook Ads, Instagram',
    icon: 'fab fa-meta',
    logoPath: '/logos/meta.svg',
    brandColor: '#0668E1',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'PARTNER_DELEGATION',
        label: 'Partner Delegation',
        description: 'Add as Business Manager partner',
        icon: 'fas fa-handshake',
        roleTemplates: [
          { key: 'admin', label: 'Admin', description: 'Full Business Manager access' },
          { key: 'analyst', label: 'Analyst', description: 'View and analyze performance' }
        ]
      },
      {
        type: 'NAMED_INVITE',
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
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'admin', label: 'Admin', description: 'Full Business Manager access' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: true,
      supportsGroupAccess: false,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'Meta Business Manager supports partner delegation and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
      automatedProvisioningSupported: false
    },
    agencyConfigFields: {
      PARTNER_DELEGATION: ['businessManagerId'],
      NAMED_INVITE: ['agencyGroupEmail'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      PARTNER_DELEGATION: ['adAccountId', 'businessManagerId'],
      NAMED_INVITE: ['adAccountId', 'pageId', 'pixelId'],
      SHARED_ACCOUNT: ['adAccountId', 'accountEmail', 'accountPassword']
    }
  },
  
  'snowflake': {
    platformKey: 'snowflake',
    displayName: 'Snowflake',
    category: 'Data Warehouse',
    description: 'Snowflake data warehouse',
    icon: 'fas fa-snowflake',
    logoPath: '/logos/snowflake.svg',
    brandColor: '#29B5E8',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'GROUP_ACCESS',
        label: 'Group Access',
        description: 'SSO/SCIM role assignment',
        icon: 'fas fa-users',
        roleTemplates: [
          { key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' },
          { key: 'sysadmin', label: 'SYSADMIN', description: 'System administration' },
          { key: 'custom', label: 'Custom', description: 'Custom role (specify name)' }
        ]
      },
      {
        type: 'PROXY_TOKEN',
        label: 'Proxy Token',
        description: 'Service account access',
        icon: 'fas fa-robot',
        roleTemplates: [
          { key: 'service_account', label: 'Service Account', description: 'Programmatic access' }
        ]
      },
      {
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'accountadmin', label: 'ACCOUNTADMIN', description: 'Full account administration' },
          { key: 'sysadmin', label: 'SYSADMIN', description: 'System administration' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: false,
      supportsGroupAccess: true,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'Snowflake supports group/SSO-based access. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: true,
      automatedProvisioningSupported: true
    },
    agencyConfigFields: {
      GROUP_ACCESS: ['ssoGroupName', 'customRoleName'],
      PROXY_TOKEN: ['serviceAccountEmail'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      GROUP_ACCESS: ['accountLocator', 'warehouseId', 'databaseId'],
      PROXY_TOKEN: ['accountLocator', 'warehouseId'],
      SHARED_ACCOUNT: ['accountLocator', 'accountUsername', 'accountPassword']
    }
  },
  
  'hubspot': {
    platformKey: 'hubspot',
    displayName: 'HubSpot',
    category: 'CRM',
    description: 'HubSpot CRM and Marketing Hub',
    icon: 'fab fa-hubspot',
    logoPath: '/logos/hubspot.svg',
    brandColor: '#FF7A59',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'NAMED_INVITE',
        label: 'Named Invite',
        description: 'Invite user to portal',
        icon: 'fas fa-user-plus',
        roleTemplates: [
          { key: 'super_admin', label: 'Super Admin', description: 'Full portal administration' },
          { key: 'marketing', label: 'Marketing', description: 'Marketing access' },
          { key: 'sales', label: 'Sales', description: 'Sales access' },
          { key: 'service', label: 'Service', description: 'Service access' }
        ]
      },
      {
        type: 'GROUP_ACCESS',
        label: 'Group Access',
        description: 'SCIM group assignment',
        icon: 'fas fa-users',
        roleTemplates: [
          { key: 'team_access', label: 'Team Access', description: 'Team-based access' }
        ]
      },
      {
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'super_admin', label: 'Super Admin', description: 'Full portal administration' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: false,
      supportsGroupAccess: true,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'HubSpot supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
      automatedProvisioningSupported: true
    },
    agencyConfigFields: {
      NAMED_INVITE: ['agencyGroupEmail'],
      GROUP_ACCESS: ['ssoGroupName'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      NAMED_INVITE: ['portalId', 'portalName'],
      GROUP_ACCESS: ['portalId', 'portalName'],
      SHARED_ACCOUNT: ['portalId', 'accountEmail', 'accountPassword']
    }
  },
  
  'salesforce': {
    platformKey: 'salesforce',
    displayName: 'Salesforce',
    category: 'CRM',
    description: 'Salesforce CRM',
    icon: 'fab fa-salesforce',
    logoPath: '/logos/salesforce.svg',
    brandColor: '#00A1E0',
    tier: 1,
    clientFacing: true,
    supportedAccessItemTypes: [
      {
        type: 'NAMED_INVITE',
        label: 'Named Invite',
        description: 'Invite user to org',
        icon: 'fas fa-user-plus',
        roleTemplates: [
          { key: 'system_admin', label: 'System Admin', description: 'Full org administration' },
          { key: 'standard_user', label: 'Standard User', description: 'Standard CRM access' },
          { key: 'custom', label: 'Custom', description: 'Custom profile (specify name)' }
        ]
      },
      {
        type: 'GROUP_ACCESS',
        label: 'Group Access',
        description: 'SSO group assignment',
        icon: 'fas fa-users',
        roleTemplates: [
          { key: 'sso_scim_role', label: 'SSO/SCIM Role', description: 'SSO-based role assignment' }
        ]
      },
      {
        type: 'SHARED_ACCOUNT',
        label: 'Shared Account (PAM)',
        description: 'Privileged access via credential vault',
        icon: 'fas fa-key',
        roleTemplates: [
          { key: 'system_admin', label: 'System Admin', description: 'Full org administration' }
        ]
      }
    ],
    securityCapabilities: {
      supportsDelegation: false,
      supportsGroupAccess: true,
      supportsOAuth: false,
      supportsCredentialLogin: true,
      pamRecommendation: 'not_recommended',
      pamRationale: 'Salesforce supports group/SSO-based access and named-user invites. Shared credentials (PAM) should be used only for break-glass, legacy constraints, or client-mandated shared logins; prefer the native delegation/RBAC options.'
    },
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
      automatedProvisioningSupported: true
    },
    agencyConfigFields: {
      NAMED_INVITE: ['agencyGroupEmail', 'customRoleName'],
      GROUP_ACCESS: ['ssoGroupName'],
      SHARED_ACCOUNT: ['pamOwnership', 'pamIdentityStrategy', 'pamIdentityType', 'pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired']
    },
    clientTargetFields: {
      NAMED_INVITE: ['orgId', 'orgName', 'instanceUrl'],
      GROUP_ACCESS: ['orgId', 'orgName', 'instanceUrl'],
      SHARED_ACCOUNT: ['orgId', 'accountEmail', 'accountPassword']
    }
  }
};

// Export for use in other scripts
module.exports = { PLUGIN_CONFIGS };

console.log('Plugin configuration loaded:', Object.keys(PLUGIN_CONFIGS).length, 'plugins');
