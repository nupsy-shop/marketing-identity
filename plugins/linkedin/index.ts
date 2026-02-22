/**
 * LinkedIn Ads Platform Plugin
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

class LinkedInPlugin extends BasePlugin {
  manifest: PluginManifest = {
    platformKey: 'linkedin',
    displayName: 'LinkedIn Ads',
    category: 'Paid Media',
    description: 'LinkedIn Campaign Manager for B2B advertising',
    icon: 'fab fa-linkedin',
    tier: 2,
    supportedAccessItemTypes: [
      AccessItemType.PARTNER_DELEGATION,
      AccessItemType.NAMED_INVITE,
    ],
    supportedRoleTemplates: [
      { key: 'account-manager', label: 'Account Manager', description: 'Full campaign management' },
      { key: 'campaign-manager', label: 'Campaign Manager', description: 'Create and edit campaigns' },
      { key: 'viewer', label: 'Viewer', description: 'View-only access' },
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
          businessManagerId: z.string().min(1).describe('LinkedIn Business ID'),
        });

      case AccessItemType.NAMED_INVITE:
        return humanIdentityStrategySchema;

      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    return z.object({
      adAccountId: z.string().min(1).describe('LinkedIn Ad Account ID'),
      adAccountName: z.string().optional().describe('Account name for reference'),
      companyPageId: z.string().optional().describe('LinkedIn Company Page ID (optional)'),
    });
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;

    if (accessItemType === AccessItemType.PARTNER_DELEGATION) {
      const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
      return [
        {
          step: 1,
          title: 'Open LinkedIn Campaign Manager',
          description: 'Go to linkedin.com/campaignmanager and sign in.',
          link: { url: 'https://www.linkedin.com/campaignmanager', label: 'Open Campaign Manager' },
        },
        {
          step: 2,
          title: 'Access Account Settings',
          description: 'Click the account name dropdown and select "Manage access".',
        },
        {
          step: 3,
          title: 'Add Partner',
          description: `Click "Add partner" and enter Business ID: ${bmId}`,
        },
        {
          step: 4,
          title: 'Set Permissions',
          description: `Assign "${this.formatRoleTemplate(roleTemplate)}" permissions and confirm.`,
        },
      ];
    }

    // Named Invite
    const identity = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail;
    return [
      {
        step: 1,
        title: 'Open LinkedIn Campaign Manager',
        description: 'Go to linkedin.com/campaignmanager and sign in.',
        link: { url: 'https://www.linkedin.com/campaignmanager', label: 'Open Campaign Manager' },
      },
      {
        step: 2,
        title: 'Access Account Settings',
        description: 'Click the account name dropdown and select "Manage access".',
      },
      {
        step: 3,
        title: 'Add User',
        description: `Click "Add user" and enter: ${identity}`,
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

export default new LinkedInPlugin();
