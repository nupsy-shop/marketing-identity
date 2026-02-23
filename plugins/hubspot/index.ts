/**
 * HubSpot Platform Plugin
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

class HubSpotPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'hubspot',
    displayName: 'HubSpot',
    category: 'Martech',
    description: 'HubSpot CRM and marketing automation platform',
    icon: 'fab fa-hubspot',
    logoPath: '/logos/hubspot.svg',
    brandColor: '#FF7A59',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.NAMED_INVITE,
      AccessItemType.GROUP_SERVICE,
    ],
    supportedRoleTemplates: [
      { key: 'super-admin', label: 'Super Admin', description: 'Full account access' },
      { key: 'marketing-admin', label: 'Marketing Admin', description: 'Marketing hub administration' },
      { key: 'sales-admin', label: 'Sales Admin', description: 'Sales hub administration' },
      { key: 'view-only', label: 'View Only', description: 'Read-only access' },
    ],
    automationCapabilities: {
      oauthSupported: true,
      apiVerificationSupported: false,
      automatedProvisioningSupported: false,
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
          ssoGroupName: z.string().optional().describe('SSO/Team name for group access'),
          integrationIdentityId: z.string().uuid().optional().describe('Integration identity reference'),
        });

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      portalId: z.string().min(1).describe('HubSpot Portal ID'),
      portalName: z.string().optional().describe('Portal name for reference'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;

    return [
      {
        step: 1,
        title: 'Open HubSpot Settings',
        description: 'Go to app.hubspot.com, click the gear icon to access Settings.',
        link: { url: 'https://app.hubspot.com', label: 'Open HubSpot' },
      },
      {
        step: 2,
        title: 'Navigate to Users & Teams',
        description: 'In the left sidebar, click "Users & Teams".',
      },
      {
        step: 3,
        title: 'Create User',
        description: `Click "Create user" and enter: ${identity}`,
      },
      {
        step: 4,
        title: 'Set Permissions',
        description: `Assign the "${this.formatRoleTemplate(roleTemplate)}" permission set.`,
      },
      {
        step: 5,
        title: 'Send Invitation',
        description: 'Click "Send" to send the invitation email.',
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new HubSpotPlugin();
