/**
 * Google Analytics (Universal Analytics) Platform Plugin
 * Note: UA is being deprecated, but some clients may still have it
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

class GAUAPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'ga-ua',
    displayName: 'Google Analytics (Universal)',
    category: 'Analytics',
    description: 'Legacy Universal Analytics (being sunset - migrate to GA4)',
    icon: 'fas fa-chart-bar',
    logoPath: '/logos/ga-ua.svg',
    brandColor: '#F9AB00',
    tier: 3,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
    ],
    supportedRoleTemplates: [
      { key: 'administrator', label: 'Administrator', description: 'Full property management' },
      { key: 'editor', label: 'Editor', description: 'Edit views and settings' },
      { key: 'analyst', label: 'Analyst', description: 'Create and share reports' },
      { key: 'viewer', label: 'Viewer', description: 'View reports only' },
    ],
    automationCapabilities: {
      oauthSupported: true,
      apiVerificationSupported: true,
      automatedProvisioningSupported: false,
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

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      propertyId: z.string().min(1).describe('UA Property ID (e.g., UA-XXXXXX-X)'),
      propertyName: z.string().optional().describe('Property name for reference'),
      accountId: z.string().optional().describe('Analytics Account ID'),
      viewId: z.string().optional().describe('View ID (optional, for view-level access)'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    const identity = generatedIdentity || 
      (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail ||
      (agencyConfig as { serviceAccountEmail?: string }).serviceAccountEmail;

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
        title: 'Select Property',
        description: 'In the Property column, select the UA property you want to share.',
      },
      {
        step: 4,
        title: 'Access User Management',
        description: 'Click "Property User Management" in the Property column.',
      },
      {
        step: 5,
        title: 'Add User',
        description: `Click the "+" button, select "Add users", and enter: ${identity}`,
      },
      {
        step: 6,
        title: 'Set Permissions',
        description: `Check the "${this.formatRoleTemplate(roleTemplate)}" permission and click "Add".`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new GAUAPlugin();
