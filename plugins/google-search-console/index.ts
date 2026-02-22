/**
 * Google Search Console Platform Plugin
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

class GoogleSearchConsolePlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'google-search-console',
    displayName: 'Google Search Console',
    category: 'Analytics',
    description: 'Monitor and maintain your site\'s presence in Google Search results',
    icon: 'fab fa-google',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
    ],
    supportedRoleTemplates: [
      { key: 'owner', label: 'Owner', description: 'Full control including user management' },
      { key: 'full', label: 'Full User', description: 'View all data and take most actions' },
      { key: 'restricted', label: 'Restricted User', description: 'View most data' },
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
        return integrationIdentitySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      siteUrl: z.string().url().describe('Site URL (e.g., https://example.com or sc-domain:example.com)'),
      siteName: z.string().optional().describe('Site name for reference'),
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
        title: 'Open Google Search Console',
        description: 'Go to search.google.com/search-console and sign in.',
        link: { url: 'https://search.google.com/search-console', label: 'Open Search Console' },
      },
      {
        step: 2,
        title: 'Select Property',
        description: 'Select the property you want to share access to.',
      },
      {
        step: 3,
        title: 'Go to Settings',
        description: 'Click "Settings" in the left sidebar, then click "Users and permissions".',
      },
      {
        step: 4,
        title: 'Add User',
        description: `Click "Add user" and enter the email: ${identity}`,
      },
      {
        step: 5,
        title: 'Set Permission',
        description: `Set the permission to "${this.formatRoleTemplate(roleTemplate)}" and click "Add".`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new GoogleSearchConsolePlugin();
