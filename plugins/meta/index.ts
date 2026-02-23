/**
 * Meta (Facebook) Business Manager Platform Plugin
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

class MetaPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'meta',
    displayName: 'Meta Business Manager / Facebook Ads',
    category: 'Paid Media',
    description: 'Meta Business Suite for Facebook, Instagram, and WhatsApp advertising',
    icon: 'fab fa-meta',
    logoPath: '/logos/meta.svg',
    brandColor: '#0668E1',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full business manager access' },
      { key: 'employee', label: 'Employee', description: 'Standard access to assigned assets' },
      { key: 'analyst', label: 'Analyst', description: 'View-only access to insights' },
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
      case AccessItemType.PARTNER_DELEGATION:
        return z.object({
          businessManagerId: z.string().min(1).describe('Meta Business Manager ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('Ad Account ID (e.g., act_123456789)'),
      adAccountName: z.string().optional().describe('Ad account name for reference'),
      pageIds: z.array(z.string()).optional().describe('Facebook Page IDs to grant access'),
      pixelIds: z.array(z.string()).optional().describe('Pixel IDs to grant access'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
      return [
        {
          step: 1,
          title: 'Open Meta Business Suite',
          description: 'Go to business.facebook.com and sign in.',
          link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' },
        },
        {
          step: 2,
          title: 'Go to Business Settings',
          description: 'Click the gear icon in the bottom left, then select "Business Settings".',
        },
        {
          step: 3,
          title: 'Navigate to Partners',
          description: 'In the left menu, click "Partners" under "Users".',
        },
        {
          step: 4,
          title: 'Add Partner',
          description: `Click "Add" and enter the Business Manager ID: ${bmId}`,
        },
        {
          step: 5,
          title: 'Assign Assets',
          description: 'Select the ad accounts, pages, and pixels you want to share, then confirm.',
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open Meta Business Suite',
        description: 'Go to business.facebook.com and sign in.',
        link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' },
      },
      {
        step: 2,
        title: 'Go to Business Settings',
        description: 'Click the gear icon in the bottom left, then select "Business Settings".',
      },
      {
        step: 3,
        title: 'Navigate to People',
        description: 'In the left menu, click "People" under "Users".',
      },
      {
        step: 4,
        title: 'Add Person',
        description: `Click "Add" and enter the email: ${identity}`,
      },
      {
        step: 5,
        title: 'Set Role and Assign Assets',
        description: `Set the role to "${this.formatRoleTemplate(roleTemplate)}" and assign the relevant ad accounts and assets.`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return VerificationMode.ATTESTATION_ONLY;
  }
}

export default new MetaPlugin();
