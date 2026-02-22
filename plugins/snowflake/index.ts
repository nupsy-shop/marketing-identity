/**
 * Snowflake Platform Plugin
 */

import { z } from 'zod';
import {
  BasePlugin,
  integrationIdentitySchema,
} from '@/lib/plugins/base-plugin';
import {
  PluginManifest,
  AccessItemType,
  VerificationMode,
  InstructionContext,
  InstructionStep,
} from '@/lib/plugins/types';

class SnowflakePlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'snowflake',
    displayName: 'Snowflake',
    category: 'Data',
    description: 'Cloud data platform for data warehousing and analytics',
    icon: 'fas fa-snowflake',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.GROUP_SERVICE,
      // Note: Snowflake does NOT support Named Invite - access is via roles/service accounts
    ],
    supportedRoleTemplates: [
      { key: 'accountadmin', label: 'Account Admin', description: 'Full account administration' },
      { key: 'sysadmin', label: 'Sys Admin', description: 'Create and manage warehouses and databases' },
      { key: 'securityadmin', label: 'Security Admin', description: 'Manage grants and users' },
      { key: 'analyst', label: 'Analyst', description: 'Read-only access to specified databases' },
      { key: 'custom', label: 'Custom Role', description: 'Custom role defined by client' },
    ],
    automationCapabilities: {
      oauthSupported: false,
      apiVerificationSupported: false,
      automatedProvisioningSupported: false,
    },
    pluginVersion: '1.0.0',
  };

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case AccessItemType.GROUP_SERVICE:
        return z.object({
          identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN']).describe('Purpose of the identity'),
          ssoGroupName: z.string().optional().describe('SSO group name to assign (for human access)'),
          integrationIdentityId: z.string().uuid().optional().describe('Integration identity reference'),
          serviceAccountName: z.string().optional().describe('Service account name in Snowflake'),
        });

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      accountIdentifier: z.string().min(1).describe('Snowflake Account Identifier (e.g., xy12345.us-east-1)'),
      warehouseName: z.string().optional().describe('Warehouse name to grant access to'),
      databaseName: z.string().optional().describe('Database name to grant access to'),
      schemaName: z.string().optional().describe('Schema name to grant access to'),
      roleName: z.string().optional().describe('Snowflake role to assign'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { agencyConfig, roleTemplate } = context;
    const config = agencyConfig as { ssoGroupName?: string; serviceAccountName?: string; identityPurpose?: string };

    if (config.identityPurpose === 'INTEGRATION_NON_HUMAN') {
      return [
        {
          step: 1,
          title: 'Open Snowflake Console',
          description: 'Log in to your Snowflake account with ACCOUNTADMIN privileges.',
        },
        {
          step: 2,
          title: 'Create Service Account User',
          description: `Run the following SQL to create a service account:\nCREATE USER ${config.serviceAccountName || 'agency_service_account'} TYPE = SERVICE;`,
        },
        {
          step: 3,
          title: 'Assign Role',
          description: `Grant the appropriate role:\nGRANT ROLE ${this.formatRoleTemplate(roleTemplate)} TO USER ${config.serviceAccountName || 'agency_service_account'};`,
        },
        {
          step: 4,
          title: 'Configure Key-Pair Authentication',
          description: 'Set up key-pair authentication for the service account and share the public key.',
        },
      ];
    }

    // Human/SSO access
    return [
      {
        step: 1,
        title: 'Open Snowflake Console',
        description: 'Log in to your Snowflake account with SECURITYADMIN privileges.',
      },
      {
        step: 2,
        title: 'Configure SSO Group Mapping',
        description: `Map the SSO group "${config.ssoGroupName}" to a Snowflake role.`,
      },
      {
        step: 3,
        title: 'Grant Role Permissions',
        description: `Ensure the role "${this.formatRoleTemplate(roleTemplate)}" has appropriate access to the required databases and warehouses.`,
      },
      {
        step: 4,
        title: 'Confirm Access',
        description: 'Test that SSO users in the mapped group can access Snowflake with the expected permissions.',
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new SnowflakePlugin();
