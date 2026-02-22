/**
 * PAM Identity Hub - Base Plugin
 * Provides common functionality for all platform plugins
 */

import { z } from 'zod';
import {
  PlatformPlugin,
  PluginManifest,
  AccessItemType,
  IdentityPurpose,
  HumanIdentityStrategy,
  PamOwnership,
  PamIdentityStrategy,
  PamIdentityType,
  ValidationResult,
  VerificationResult,
  VerificationMode,
  VerificationStatus,
  InstructionContext,
  InstructionStep,
  VerificationContext
} from './types';

// ─── Common Zod Schemas ────────────────────────────────────────────────────────

// Identity strategy schema for Named Invite
export const humanIdentityStrategySchema = z.object({
  humanIdentityStrategy: z.enum(['AGENCY_GROUP', 'INDIVIDUAL_USERS', 'CLIENT_DEDICATED']).describe('How the agency identity is determined'),
  agencyGroupEmail: z.string().email().optional().describe('Agency group email (required for AGENCY_GROUP strategy)'),
  namingTemplate: z.string().optional().describe('Template for generating client-dedicated identities'),
}).refine(
  (data) => {
    if (data.humanIdentityStrategy === 'AGENCY_GROUP' && !data.agencyGroupEmail) {
      return false;
    }
    if (data.humanIdentityStrategy === 'CLIENT_DEDICATED' && !data.namingTemplate) {
      return false;
    }
    return true;
  },
  {
    message: 'AGENCY_GROUP requires agencyGroupEmail, CLIENT_DEDICATED requires namingTemplate'
  }
);

// PAM Agency-Owned Human configuration
export const pamAgencyOwnedHumanSchema = z.object({
  pamOwnership: z.literal('AGENCY_OWNED'),
  identityPurpose: z.literal('HUMAN_INTERACTIVE'),
  pamIdentityStrategy: z.enum(['STATIC', 'CLIENT_DEDICATED']).describe('How the PAM identity is determined'),
  pamAgencyIdentityEmail: z.string().email().optional().describe('Static agency identity email'),
  pamIdentityType: z.enum(['GROUP', 'MAILBOX']).optional().describe('Type of client-dedicated identity'),
  pamNamingTemplate: z.string().optional().describe('Template for generating client-dedicated identities'),
  pamCheckoutDurationMinutes: z.number().min(15).max(480).default(60).describe('Checkout duration in minutes'),
  pamApprovalRequired: z.boolean().default(false).describe('Require approval for checkout'),
  pamRotationTrigger: z.enum(['onCheckin', 'scheduled', 'manual']).default('onCheckin').describe('When to rotate credentials'),
}).refine(
  (data) => {
    if (data.pamIdentityStrategy === 'STATIC' && !data.pamAgencyIdentityEmail) {
      return false;
    }
    if (data.pamIdentityStrategy === 'CLIENT_DEDICATED' && (!data.pamIdentityType || !data.pamNamingTemplate)) {
      return false;
    }
    return true;
  },
  {
    message: 'STATIC requires pamAgencyIdentityEmail, CLIENT_DEDICATED requires pamIdentityType and pamNamingTemplate'
  }
);

// PAM Agency-Owned Integration configuration
export const pamAgencyOwnedIntegrationSchema = z.object({
  pamOwnership: z.literal('AGENCY_OWNED'),
  identityPurpose: z.literal('INTEGRATION_NON_HUMAN'),
  integrationIdentityId: z.string().uuid().describe('Reference to integration identity'),
});

// PAM Client-Owned configuration
export const pamClientOwnedSchema = z.object({
  pamOwnership: z.literal('CLIENT_OWNED'),
  // No additional fields - client provides credentials during onboarding
});

// Integration identity schema (for GROUP_SERVICE and PROXY_TOKEN)
export const integrationIdentitySchema = z.object({
  identityPurpose: z.literal('INTEGRATION_NON_HUMAN'),
  integrationIdentityId: z.string().uuid().optional().describe('Reference to integration identity'),
  serviceAccountEmail: z.string().email().optional().describe('Service account email'),
  ssoGroupName: z.string().optional().describe('SSO group name'),
});

// Human group access schema
export const humanGroupAccessSchema = z.object({
  identityPurpose: z.literal('HUMAN_INTERACTIVE'),
  agencyGroupEmail: z.string().email().optional().describe('Agency group email'),
  ssoGroupName: z.string().optional().describe('SSO group name'),
});

// ─── Base Plugin Class ─────────────────────────────────────────────────────────

export abstract class BasePlugin implements PlatformPlugin {
  abstract manifest: PluginManifest;

  // ─── Schema Methods (to be overridden) ─────────────────────────────────────

  abstract getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown>;
  abstract getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown>;
  
  getRequestOptionsSchema(accessItemType: AccessItemType): z.ZodType<unknown> | null {
    // Default: Individual Users strategy needs invitee emails
    if (accessItemType === AccessItemType.NAMED_INVITE) {
      return z.object({
        inviteeEmails: z.array(z.string().email()).min(1).describe('Email addresses to invite'),
      }).optional();
    }
    return null;
  }

  // ─── Validation Methods ────────────────────────────────────────────────────

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    if (!schema) {
      return { valid: false, errors: [`Unsupported access item type: ${accessItemType}`] };
    }

    const result = schema.safeParse(config);
    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    if (!schema) {
      return { valid: false, errors: [`Unsupported access item type: ${accessItemType}`] };
    }

    const result = schema.safeParse(target);
    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  }

  // ─── Instruction Builder (to be overridden) ────────────────────────────────

  abstract buildClientInstructions(context: InstructionContext): string | InstructionStep[];

  // ─── Verification Methods ──────────────────────────────────────────────────

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    // Default: attestation only (override in plugins with API verification)
    return VerificationMode.ATTESTATION_ONLY;
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    // Default: manual attestation (override in plugins with API verification)
    return {
      status: VerificationStatus.PENDING,
      mode: VerificationMode.ATTESTATION_ONLY,
      message: 'Manual attestation required from client.'
    };
  }

  // ─── Helper Methods ────────────────────────────────────────────────────────

  protected generateClientDedicatedIdentity(template: string, clientName: string, clientSlug?: string): string {
    const slug = clientSlug || this.slugify(clientName);
    return template
      .replace(/{clientName}/g, clientName)
      .replace(/{clientSlug}/g, slug)
      .replace(/{platform}/g, this.manifest.platformKey)
      .replace(/{platformName}/g, this.manifest.displayName);
  }

  protected slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  protected formatRoleTemplate(roleKey: string): string {
    const role = this.manifest.supportedRoleTemplates.find(r => r.key === roleKey);
    return role?.label || roleKey;
  }
}
