/**
 * Pinterest Ads Platform Plugin
 */

import { z } from 'zod';
import {
  BasePlugin,
  humanIdentityStrategySchema,
} from '@/lib/plugins/base-plugin';
import {
  PluginManifest,
  AccessItemType,
  VerificationMode,
  InstructionContext,
  InstructionStep,
} from '@/lib/plugins/types';

class PinterestPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'pinterest',
    displayName: 'Pinterest Ads',
    category: 'Paid Media',
    description: 'Pinterest advertising for visual discovery',
    icon: 'fab fa-pinterest',
    logoPath: '/logos/pinterest.svg',
    brandColor: '#E60023',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full business account access' },
      { key: 'campaign-manager', label: 'Campaign Manager', description: 'Manage campaigns' },
      { key: 'analyst', label: 'Analyst', description: 'View analytics only' },
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
      case AccessItemType.PARTNER_DELEGATION:
        return z.object({
          businessManagerId: z.string().min(1).describe('Pinterest Business ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('Pinterest Ad Account ID'),
      adAccountName: z.string().optional().describe('Account name for reference'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
      return [
        {
          step: 1,
          title: 'Open Pinterest Business Hub',
          description: 'Go to business.pinterest.com and sign in.',
          link: { url: 'https://business.pinterest.com', label: 'Open Pinterest Business' },
        },
        {
          step: 2,
          title: 'Go to Business Access',
          description: 'Navigate to Settings > Business Access.',
        },
        {
          step: 3,
          title: 'Add Partner',
          description: `Click "Add partner" and enter Business ID: ${bmId}`,
        },
        {
          step: 4,
          title: 'Assign Assets',
          description: 'Select ad accounts to share and confirm access.',
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open Pinterest Business Hub',
        description: 'Go to business.pinterest.com and sign in.',
        link: { url: 'https://business.pinterest.com', label: 'Open Pinterest Business' },
      },
      {
        step: 2,
        title: 'Go to Business Access',
        description: 'Navigate to Settings > Business Access > People.',
      },
      {
        step: 3,
        title: 'Invite Member',
        description: `Click "Invite" and enter: ${identity}`,
      },
      {
        step: 4,
        title: 'Set Role',
        description: `Assign the "${this.formatRoleTemplate(roleTemplate)}" role and send invitation.`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new PinterestPlugin();
