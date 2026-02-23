/**
 * Google Analytics 4 Platform Plugin
 * 
 * Modular implementation following the AdPlatformPlugin interface.
 * This plugin provides:
 * - Named Invite access (invite users to GA4 properties)
 * - Group/Service Account access (service accounts, Google Groups)
 * - Shared Account (PAM) access (credential vault for shared logins)
 * 
 * Architecture:
 * - manifest.ts: Plugin metadata and capabilities
 * - auth.ts: Google OAuth authentication
 * - api/management.ts: GA4 Admin API calls
 * - api/reporting.ts: GA4 Data API calls
 * - mappers/*: Data transformation utilities
 * - schemas/*: Zod validation schemas
 */

import { z } from 'zod';
import type { 
  PlatformPlugin, 
  PluginManifest, 
  ValidationResult, 
  VerificationMode,
  VerificationResult,
  InstructionContext,
  InstructionStep,
  VerificationContext,
  AccessItemType
} from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, IncomingRequest } from '../common/types';

// Import modular components
import { GA4_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { authorize, refreshToken } from './auth';
import { getAllAccountsAndProperties, checkUserAccess } from './api/management';
import { runReport } from './api/reporting';
import { mapGA4Accounts, mapGA4Properties } from './mappers/account.mapper';
import { mapGA4Report } from './mappers/report.mapper';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';

// ─── GA4 Plugin Implementation ─────────────────────────────────────────────────

class GA4Plugin implements PlatformPlugin, AdPlatformPlugin {
  // Plugin identifier
  readonly name = 'ga4';
  
  // Plugin manifest (from manifest.ts)
  readonly manifest: PluginManifest = GA4_MANIFEST;

  // Application context (set during initialization)
  private context: AppContext | null = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    console.log(`[GA4Plugin] Initialized v${this.manifest.pluginVersion}`);
  }

  async destroy(): Promise<void> {
    this.context = null;
    console.log('[GA4Plugin] Destroyed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async authorize(params: AuthParams): Promise<AuthResult> {
    return authorize(params);
  }

  async refreshToken(currentToken: string): Promise<AuthResult> {
    return refreshToken(currentToken);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Account Discovery
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchAccounts(auth: AuthResult): Promise<Account[]> {
    return getAllAccountsAndProperties(auth);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Reporting
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> {
    return runReport(auth, query);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Handling
  // ═══════════════════════════════════════════════════════════════════════════

  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> {
    // GA4 doesn't support server-side event uploads via Admin API
    // Measurement Protocol would require different implementation
    throw new Error('GA4 does not support server-side event uploads via this plugin. Use Measurement Protocol directly.');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Schema Methods
  // ═══════════════════════════════════════════════════════════════════════════

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'NAMED_INVITE':
        return NamedInviteAgencySchema;
      case 'GROUP_ACCESS':
        return GroupAccessAgencySchema;
      case 'SHARED_ACCOUNT':
        return SharedAccountAgencySchema;
      default:
        return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'NAMED_INVITE':
        return NamedInviteClientSchema;
      case 'GROUP_ACCESS':
        return GroupAccessClientSchema;
      case 'SHARED_ACCOUNT':
        return SharedAccountClientSchema;
      default:
        return z.object({});
    }
  }

  getRequestOptionsSchema(accessItemType: AccessItemType): z.ZodType<unknown> | null {
    // For INDIVIDUAL_USERS strategy in Named Invite, we need invitee emails
    if (accessItemType === 'NAMED_INVITE') {
      return z.object({
        inviteeEmails: z.array(z.string().email()).min(1).optional()
          .describe('Email addresses to invite (for INDIVIDUAL_USERS strategy)'),
      }).optional();
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Validation Methods
  // ═══════════════════════════════════════════════════════════════════════════

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    
    if (result.success) {
      // Additional PAM validation for not_recommended platforms
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        
        // Require confirmation for not_recommended PAM when AGENCY_OWNED
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && 
            pamConfig.pamOwnership === 'AGENCY_OWNED' && 
            !pamConfig.pamConfirmation) {
          return {
            valid: false,
            errors: ['PAM confirmation is required. Please acknowledge the security implications of using shared credentials for GA4.']
          };
        }
      }
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    const result = schema.safeParse(target);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Instruction Builder
  // ═══════════════════════════════════════════════════════════════════════════

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate, generatedIdentity } = context;
    
    switch (accessItemType) {
      case 'NAMED_INVITE':
        return this.buildNamedInviteInstructions(agencyConfig, roleTemplate, generatedIdentity);
      
      case 'GROUP_ACCESS':
        return this.buildGroupAccessInstructions(agencyConfig, roleTemplate);
      
      case 'SHARED_ACCOUNT':
        return this.buildSharedAccountInstructions(agencyConfig);
      
      default:
        return [];
    }
  }

  private buildNamedInviteInstructions(
    agencyConfig: Record<string, unknown>, 
    roleTemplate: string,
    generatedIdentity?: string
  ): InstructionStep[] {
    const emailToAdd = generatedIdentity || (agencyConfig as { agencyGroupEmail?: string }).agencyGroupEmail || '[Agency email]';
    
    return [
      {
        step: 1,
        title: 'Open Google Analytics',
        description: 'Go to analytics.google.com and sign in with your Google account.',
        link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' }
      },
      {
        step: 2,
        title: 'Go to Admin',
        description: 'Click the Admin gear icon in the bottom left corner of the screen.'
      },
      {
        step: 3,
        title: 'Access Management',
        description: 'In the Property column, click "Property Access Management" or "Property User Management".'
      },
      {
        step: 4,
        title: 'Add User',
        description: `Click the "+" button to add a new user. Enter the email: ${emailToAdd}`
      },
      {
        step: 5,
        title: 'Set Permissions',
        description: `Set the role to "${roleTemplate}" and click "Add" to save.`
      }
    ];
  }

  private buildGroupAccessInstructions(
    agencyConfig: Record<string, unknown>,
    roleTemplate: string
  ): InstructionStep[] {
    const serviceAccountEmail = (agencyConfig as { serviceAccountEmail?: string }).serviceAccountEmail || '[Service account email]';
    
    return [
      {
        step: 1,
        title: 'Open Google Analytics',
        description: 'Go to analytics.google.com and sign in.',
        link: { url: 'https://analytics.google.com', label: 'Open Google Analytics' }
      },
      {
        step: 2,
        title: 'Go to Admin',
        description: 'Click the Admin gear icon in the bottom left corner.'
      },
      {
        step: 3,
        title: 'Access Management',
        description: 'Click "Property Access Management" at the property level.'
      },
      {
        step: 4,
        title: 'Add Service Account',
        description: `Click "+" and add the service account email: ${serviceAccountEmail}`
      },
      {
        step: 5,
        title: 'Set Permissions',
        description: `Set the role to "${roleTemplate}" and save.`
      }
    ];
  }

  private buildSharedAccountInstructions(agencyConfig: Record<string, unknown>): InstructionStep[] {
    const pamConfig = agencyConfig as { pamOwnership?: string; identityPurpose?: string };
    
    if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
      return [
        {
          step: 1,
          title: 'Provide Account Credentials',
          description: 'Enter the shared Google account email and password that has access to your GA4 property.'
        },
        {
          step: 2,
          title: 'Enable 2FA (Recommended)',
          description: 'For security, ensure two-factor authentication is enabled on the shared account.'
        },
        {
          step: 3,
          title: 'Credentials Stored Securely',
          description: 'Your credentials will be encrypted and stored in the PAM vault. Agency users will check out access as needed.'
        }
      ];
    }
    
    // AGENCY_OWNED
    return [
      {
        step: 1,
        title: 'Agency-Managed Access',
        description: 'The agency will create and manage a dedicated identity for accessing your GA4 property.'
      },
      {
        step: 2,
        title: 'Grant Admin Access',
        description: 'You will need to grant access to the agency-managed identity once it is provided.'
      },
      {
        step: 3,
        title: 'Confirm Access',
        description: 'After granting access, mark this step as complete to notify the agency.'
      }
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Verification Methods
  // ═══════════════════════════════════════════════════════════════════════════

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    switch (accessItemType) {
      case 'SHARED_ACCOUNT':
        return 'EVIDENCE_REQUIRED';
      case 'GROUP_ACCESS':
        return 'ATTESTATION_ONLY'; // Could be AUTO if we implement API verification
      default:
        return 'ATTESTATION_ONLY';
    }
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    const { accessItemType, clientTarget, oauthTokens } = context;
    
    // If we have OAuth tokens, we can verify via API
    if (oauthTokens?.accessToken && accessItemType !== 'SHARED_ACCOUNT') {
      try {
        const auth: AuthResult = {
          success: true,
          accessToken: oauthTokens.accessToken,
          tokenType: 'Bearer'
        };
        
        // Get the email to check
        const emailToCheck = this.getEmailToCheck(context);
        const propertyId = (clientTarget as { propertyId?: string }).propertyId;
        
        if (emailToCheck && propertyId) {
          const binding = await checkUserAccess(auth, propertyId, emailToCheck);
          
          if (binding) {
            return {
              status: 'VERIFIED',
              mode: 'AUTO',
              message: `Access verified for ${emailToCheck}`,
              evidence: { binding }
            };
          } else {
            return {
              status: 'FAILED',
              mode: 'AUTO',
              message: `No access found for ${emailToCheck} on property ${propertyId}`
            };
          }
        }
      } catch (error) {
        console.error('[GA4Plugin] Verification error:', error);
        // Fall through to manual verification
      }
    }
    
    // Default: Manual verification required
    return {
      status: 'PENDING',
      mode: this.getVerificationMode(accessItemType),
      message: 'Manual verification required. Please confirm access has been granted.'
    };
  }

  private getEmailToCheck(context: VerificationContext): string | null {
    const { agencyConfig } = context;
    const config = agencyConfig as Record<string, unknown>;
    
    // Check various email fields
    return (config.agencyGroupEmail as string) ||
           (config.serviceAccountEmail as string) ||
           (config.resolvedIdentity as string) ||
           null;
  }
}

// Export singleton instance (maintains backward compatibility)
export default new GA4Plugin();

// Also export the class for testing
export { GA4Plugin };
