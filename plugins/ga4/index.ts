/**
 * Google Analytics 4 (GA4) Platform Plugin
 */

import { z } from 'zod';
import {
  BasePlugin,
  humanIdentityStrategySchema,
  pamAgencyOwnedHumanSchema,
  pamAgencyOwnedIntegrationSchema,
  pamClientOwnedSchema,
  integrationIdentitySchema,
} from '@/lib/plugins/base-plugin';
import {
  PluginManifest,
  AccessItemType,
  VerificationMode,
  InstructionContext,
  InstructionStep,
} from '@/lib/plugins/types';

class GA4Plugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'ga4',
    displayName: 'Google Analytics / GA4',
    category: 'Analytics',
    description: 'Google Analytics 4 for website and app analytics',
    icon: 'fas fa-chart-line',
    logoPath: '/logos/ga4.svg',
    brandColor: '#E37400',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
      AccessItemType.PAM_SHARED_ACCOUNT,
    ],
    supportedRoleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property management' },
      { key: 'editor', label: 'Editor', description: 'Edit configuration, no user management' },
      { key: 'analyst', label: 'Analyst', description: 'Create and share reports' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' },
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
        return z.union([integrationIdentitySchema, z.object({
          identityPurpose: z.literal('HUMAN_INTERACTIVE'),
          agencyGroupEmail: z.string().email().describe('Agency group email'),
        })]);

      case AccessItemType.PAM_SHARED_ACCOUNT:
        return z.union([pamAgencyOwnedHumanSchema, pamAgencyOwnedIntegrationSchema, pamClientOwnedSchema]);

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      propertyId: z.string().min(1).describe('GA4 Property ID (e.g., 123456789)'),
      propertyName: z.string().optional().describe('Property name for reference'),
      accountId: z.string().optional().describe('GA4 Account ID'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PAM_SHARED_ACCOUNT) {
      const pamConfig = agencyConfig as { pamOwnership?: string };
      if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
        return [
          {
            step: 1,
            title: 'Prepare Account Credentials',
            description: 'You will need to provide credentials for an account with the required access level.',
          },
          {
            step: 2,
            title: 'Submit Credentials Securely',
            description: 'Use the secure form below to submit your account credentials. They will be encrypted and stored safely.',
          },
        ];
      }
      // Agency-owned PAM
      const identity = generatedIdentity || (agencyConfig as { pamAgencyIdentityEmail?: string }).pamAgencyIdentityEmail;
      return [
        {
          step: 1,
          title: 'Open Google Analytics',
          description: 'Go to analytics.google.com and sign in.',
          link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' },
        },
        {
          step: 2,
          title: 'Go to Admin',
          description: 'Click the gear icon in the bottom left to access Admin settings.',
        },
        {
          step: 3,
          title: 'Access Property Access Management',
          description: 'In the Property column, click "Property Access Management".',
        },
        {
          step: 4,
          title: 'Add User',
          description: `Click the "+" button and add the email: ${identity}`,
        },
        {
          step: 5,
          title: 'Set Role',
          description: `Set the role to "${this.formatRoleTemplate(roleTemplate)}" and save.`,
        },
      ];
    }

    // Named Invite or Group Service
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open Google Analytics',
        description: 'Go to analytics.google.com and sign in.',
        link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' },
      },
      {
        step: 2,
        title: 'Go to Admin',
        description: 'Click the gear icon in the bottom left to access Admin settings.',
      },
      {
        step: 3,
        title: 'Access Property Access Management',
        description: 'In the Property column, click "Property Access Management".',
      },
      {
        step: 4,
        title: 'Add User',
        description: `Click the "+" button and add the email: ${identity}`,
      },
      {
        step: 5,
        title: 'Set Role',
        description: `Set the role to "${this.formatRoleTemplate(roleTemplate)}" and save.`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    // GA4 API can verify access with OAuth
    return VerificationMode.ATTESTATION_ONLY; // Would be AUTO with OAuth
  }
}

export default new GA4Plugin();
