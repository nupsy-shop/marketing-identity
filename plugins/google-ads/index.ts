/**
 * Google Ads Platform Plugin
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

class GoogleAdsPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'google-ads',
    displayName: 'Google Ads',
    category: 'Paid Media',
    description: 'Google Ads campaign management and reporting',
    icon: 'fab fa-google',
    tier: 1,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'admin', label: 'Admin', description: 'Full account access including billing' },
      { key: 'standard', label: 'Standard', description: 'Manage campaigns, no billing access' },
      { key: 'read-only', label: 'Read-only', description: 'View-only access to reports' },
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
          managerAccountId: z.string().min(1).describe('Google Ads Manager (MCC) ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('Google Ads Account ID (e.g., 123-456-7890)'),
      adAccountName: z.string().optional().describe('Account name for reference'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const mccId = (agencyConfig as { managerAccountId?: string }).managerAccountId;
      return [
        {
          step: 1,
          title: 'Sign in to Google Ads',
          description: 'Go to ads.google.com and sign in to your account.',
          link: { url: 'https://ads.google.com', label: 'Open Google Ads' },
        },
        {
          step: 2,
          title: 'Access Account Settings',
          description: 'Click the tools icon in the top menu, then select "Account Access" under Setup.',
        },
        {
          step: 3,
          title: 'Link Manager Account',
          description: `Click "Link to Manager Account" and enter the following MCC ID: ${mccId}`,
        },
        {
          step: 4,
          title: 'Accept Link Request',
          description: `Set the access level to "${this.formatRoleTemplate(roleTemplate)}" and confirm the link.`,
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Sign in to Google Ads',
        description: 'Go to ads.google.com and sign in to your account.',
        link: { url: 'https://ads.google.com', label: 'Open Google Ads' },
      },
      {
        step: 2,
        title: 'Access Account Settings',
        description: 'Click the tools icon in the top menu, then select "Account Access" under Setup.',
      },
      {
        step: 3,
        title: 'Invite User',
        description: `Click the "+" button to add a new user. Enter the email: ${identity}`,
      },
      {
        step: 4,
        title: 'Set Access Level',
        description: `Set the access level to "${this.formatRoleTemplate(roleTemplate)}" and send the invitation.`,
      },
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    // Google Ads API can verify access
    return VerificationMode.ATTESTATION_ONLY; // Would be AUTO with OAuth
  }
}

export default new GoogleAdsPlugin();
