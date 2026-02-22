/**
 * Salesforce Platform Plugin
 */

import { z } from 'zod';
import {
  BasePlugin,
  humanIdentityStrategySchema,
  integrationIdentitySchema,
} from '@/lib/plugins/base-plugin';
import {
  PluginManifest,
  AccessItemType,
  VerificationMode,
  InstructionContext,
  InstructionStep,
} from '@/lib/plugins/types';

class SalesforcePlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'salesforce',
    displayName: 'Salesforce',
    category: 'CRM',
    description: 'Salesforce CRM and Sales Cloud',
    icon: 'fab fa-salesforce',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
    ],
    supportedRoleTemplates: [
      { key: 'system-admin', label: 'System Administrator', description: 'Full system access' },
      { key: 'standard-user', label: 'Standard User', description: 'Standard CRM access' },
      { key: 'marketing-user', label: 'Marketing User', description: 'Marketing Cloud access' },
      { key: 'read-only', label: 'Read Only', description: 'View-only access' },
    ],
    automationCapabilities: {
      oauthSupported: true,
      apiVerificationSupported: true,
      automatedProvisioningSupported: true,
    },
    pluginVersion: '1.0.0',
  };

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      case AccessItemType.GROUP_SERVICE:
        return z.object({
          identityPurpose: z.enum(['HUMAN_INTERACTIVE', 'INTEGRATION_NON_HUMAN']).describe('Purpose of the identity'),
          ssoGroupName: z.string().optional().describe('SSO Profile/Permission Set name'),
          integrationIdentityId: z.string().uuid().optional().describe('Integration identity reference'),
          profileName: z.string().optional().describe('Salesforce Profile name'),
        });

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      orgId: z.string().min(1).describe('Salesforce Organization ID'),
      instanceUrl: z.string().url().optional().describe('Salesforce instance URL'),
      sandboxName: z.string().optional().describe('Sandbox name (if applicable)'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;

    return [
      {
        step: 1,
        title: 'Open Salesforce Setup',
        description: 'Log in to Salesforce and click the gear icon > Setup.',
      },
      {
        step: 2,
        title: 'Navigate to Users',
        description: 'In Quick Find, search for "Users" and click "Users" under Administration.',
      },
      {
        step: 3,
        title: 'Create New User',
        description: `Click "New User" and enter the email: ${identity}`,
      },
      {
        step: 4,
        title: 'Set Profile and Role',
        description: `Assign the "${this.formatRoleTemplate(roleTemplate)}" profile and appropriate role.`,
      },
      {
        step: 5,
        title: 'Save and Send',
        description: 'Save the user record. Salesforce will send a welcome email.',
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new SalesforcePlugin();
