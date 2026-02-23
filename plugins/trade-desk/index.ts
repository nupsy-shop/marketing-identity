/**
 * The Trade Desk Platform Plugin
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

class TradeDeskPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'trade-desk',
    displayName: 'The Trade Desk',
    category: 'Paid Media',
    description: 'The Trade Desk DSP for programmatic advertising',
    icon: 'fas fa-bullhorn',
    logoPath: '/logos/trade-desk.svg',
    brandColor: '#00B140',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account administration' },
      { key: 'trader', label: 'Trader', description: 'Create and manage campaigns' },
      { key: 'reporting', label: 'Reporting', description: 'View reports only' },
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
      case AccessItemType.PARTNER_DELEGATION:
        return z.object({
          seatId: z.string().min(1).describe('The Trade Desk Seat ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      advertiserId: z.string().min(1).describe('Trade Desk Advertiser ID'),
      advertiserName: z.string().optional().describe('Advertiser name for reference'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const seatId = (agencyConfig as { seatId?: string }).seatId;
      return [
        {
          step: 1,
          title: 'Open The Trade Desk',
          description: 'Log in to your Trade Desk account.',
          link: { url: 'https://desk.thetradedesk.com', label: 'Open Trade Desk' },
        },
        {
          step: 2,
          title: 'Access Advertiser Settings',
          description: 'Navigate to your advertiser settings.',
        },
        {
          step: 3,
          title: 'Add Partner Seat',
          description: `Link the agency seat ID: ${seatId}`,
        },
        {
          step: 4,
          title: 'Confirm Permissions',
          description: `Assign "${this.formatRoleTemplate(roleTemplate)}" access and confirm.`,
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open The Trade Desk',
        description: 'Log in to your Trade Desk account.',
        link: { url: 'https://desk.thetradedesk.com', label: 'Open Trade Desk' },
      },
      {
        step: 2,
        title: 'Go to User Management',
        description: 'Navigate to Settings > User Management.',
      },
      {
        step: 3,
        title: 'Invite User',
        description: `Click "Invite User" and enter: ${identity}`,
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

export default new TradeDeskPlugin();
