/**
 * TikTok Ads Platform Plugin
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

class TikTokPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'tiktok',
    displayName: 'TikTok Ads',
    category: 'Paid Media',
    description: 'TikTok for Business advertising platform',
    icon: 'fab fa-tiktok',
    logoPath: '/logos/tiktok.svg',
    brandColor: '#000000',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access' },
      { key: 'operator', label: 'Operator', description: 'Manage campaigns' },
      { key: 'analyst', label: 'Analyst', description: 'View-only access' },
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
          businessCenterId: z.string().min(1).describe('TikTok Business Center ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('TikTok Ad Account ID'),
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
          title: 'Open TikTok Business Center',
          description: 'Go to business.tiktok.com and sign in.',
          link: { url: 'https://business.tiktok.com', label: 'Open TikTok Business Center' },
        },
        {
          step: 2,
          title: 'Go to Partner Center',
          description: 'Navigate to Settings > Partner Center.',
        },
        {
          step: 3,
          title: 'Add Partner',
          description: `Click "Add Partner" and enter Business Center ID: ${bcId}`,
        },
        {
          step: 4,
          title: 'Assign Assets',
          description: 'Select the ad accounts to share and set the permission level.',
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open TikTok Business Center',
        description: 'Go to business.tiktok.com and sign in.',
        link: { url: 'https://business.tiktok.com', label: 'Open TikTok Business Center' },
      },
      {
        step: 2,
        title: 'Go to Members',
        description: 'Navigate to Settings > Members.',
      },
      {
        step: 3,
        title: 'Invite Member',
        description: `Click "Invite" and enter email: ${identity}`,
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

export default new TikTokPlugin();
