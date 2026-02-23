/**
 * Google Tag Manager Platform Plugin
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

class GTMPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'gtm',
    displayName: 'Google Tag Manager',
    category: 'Tag Management',
    description: 'Google Tag Manager for marketing tag deployment',
    icon: 'fas fa-tags',
    logoPath: '/logos/gtm.svg',
    brandColor: '#4285F4',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full container management' },
      { key: 'publish', label: 'Publish', description: 'Create and publish changes' },
      { key: 'approve', label: 'Approve', description: 'Approve changes only' },
      { key: 'edit', label: 'Edit', description: 'Edit tags without publishing' },
      { key: 'read', label: 'Read', description: 'View-only access' },
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

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      containerId: z.string().min(1).describe('GTM Container ID (e.g., GTM-XXXXXX)'),
      containerName: z.string().optional().describe('Container name for reference'),
      accountId: z.string().optional().describe('GTM Account ID'),
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
        title: 'Open Google Tag Manager',
        description: 'Go to tagmanager.google.com and sign in.',
        link: { url: 'https://tagmanager.google.com', label: 'Open Tag Manager' },
      },
      {
        step: 2,
        title: 'Select Container',
        description: 'Click on the container you want to share access to.',
      },
      {
        step: 3,
        title: 'Go to User Management',
        description: 'Click Admin in the top menu, then "User Management" under Container.',
      },
      {
        step: 4,
        title: 'Add User',
        description: `Click the "+" button and enter: ${identity}`,
      },
      {
        step: 5,
        title: 'Set Permission',
        description: `Set Container Permission to "${this.formatRoleTemplate(roleTemplate)}" and click "Invite".`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new GTMPlugin();
