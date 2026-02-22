/**
 * DV360 (Display & Video 360) Platform Plugin
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

class DV360Plugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'dv360',
    displayName: 'DV360 (Display & Video 360)',
    category: 'Paid Media',
    description: 'Google Display & Video 360 for programmatic advertising',
    icon: 'fas fa-tv',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full partner/advertiser management' },
      { key: 'standard', label: 'Standard User', description: 'Create and manage campaigns' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access' },
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
          seatId: z.string().min(1).describe('DV360 Seat/Partner ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      advertiserId: z.string().min(1).describe('DV360 Advertiser ID'),
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
          title: 'Open DV360',
          description: 'Go to displayvideo.google.com and sign in.',
          link: { url: 'https://displayvideo.google.com', label: 'Open DV360' },
        },
        {
          step: 2,
          title: 'Access Partner Settings',
          description: 'Navigate to Settings > Basic Details for your advertiser.',
        },
        {
          step: 3,
          title: 'Link Partner',
          description: `Add the agency partner seat ID: ${seatId}`,
        },
        {
          step: 4,
          title: 'Set Access Level',
          description: `Assign "${this.formatRoleTemplate(roleTemplate)}" access level and confirm.`,
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open DV360',
        description: 'Go to displayvideo.google.com and sign in.',
        link: { url: 'https://displayvideo.google.com', label: 'Open DV360' },
      },
      {
        step: 2,
        title: 'Go to User Management',
        description: 'Navigate to Settings > Users.',
      },
      {
        step: 3,
        title: 'Add User',
        description: `Click "Add User" and enter: ${identity}`,
      },
      {
        step: 4,
        title: 'Set Role',
        description: `Assign the "${this.formatRoleTemplate(roleTemplate)}" role and save.`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new DV360Plugin();
