/**
 * Snapchat Ads Platform Plugin
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

class SnapchatPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'snapchat',
    displayName: 'Snapchat Ads',
    category: 'Paid Media',
    description: 'Snapchat advertising platform',
    icon: 'fab fa-snapchat',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account management' },
      { key: 'general', label: 'General User', description: 'Create and manage campaigns' },
      { key: 'reports', label: 'Reports Only', description: 'View reports only' },
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
          businessCenterId: z.string().min(1).describe('Snapchat Business ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('Snapchat Ad Account ID'),
      adAccountName: z.string().optional().describe('Account name for reference'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const bcId = (agencyConfig as { businessCenterId?: string }).businessCenterId;
      return [
        {
          step: 1,
          title: 'Open Snapchat Ads Manager',
          description: 'Go to ads.snapchat.com and sign in.',
          link: { url: 'https://ads.snapchat.com', label: 'Open Snapchat Ads' },
        },
        {
          step: 2,
          title: 'Go to Business Settings',
          description: 'Click your organization name and select "Business Settings".',
        },
        {
          step: 3,
          title: 'Add Partner',
          description: `Navigate to Partners and add Business ID: ${bcId}`,
        },
        {
          step: 4,
          title: 'Assign Ad Accounts',
          description: 'Select ad accounts to share and confirm partner access.',
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open Snapchat Ads Manager',
        description: 'Go to ads.snapchat.com and sign in.',
        link: { url: 'https://ads.snapchat.com', label: 'Open Snapchat Ads' },
      },
      {
        step: 2,
        title: 'Go to Members',
        description: 'Navigate to Business Settings > Members.',
      },
      {
        step: 3,
        title: 'Invite Member',
        description: `Click "Invite Member" and enter: ${identity}`,
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

export default new SnapchatPlugin();
