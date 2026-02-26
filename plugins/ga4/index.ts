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
  AccessItemType,
  PluginOperationParams,
  VerifyResult,
  GrantResult,
  RevokeResult,
  AccessProvisioningPlugin
} from '../../lib/plugins/types';
import { buildPluginError, resolveNativeRole, validateProvisioningRequest } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, IncomingRequest, DiscoverTargetsResult } from '../common/types';

// Import modular components
import { GA4_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { authorize, refreshToken, isGA4OAuthConfigured, getOAuthConfig, GA4OAuthNotConfiguredError } from './auth';
import { getAllAccountsAndProperties, checkUserAccess, listAllAccountSummaries, listAccessBindings, createAccessBinding, listAccountAccessBindings, createAccountAccessBinding, deleteAccessBinding } from './api/management';
import { runReport } from './api/reporting';
import { mapGA4Accounts, mapGA4Properties } from './mappers/account.mapper';
import { mapGA4Report } from './mappers/report.mapper';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';
import { buildAuthorizationUrl, exchangeCodeForTokens, generateState } from '../common/utils/auth';
import { ROLE_MAPPING, type GA4Role } from './types';

// ─── GA4 Plugin Implementation ─────────────────────────────────────────────────

class GA4Plugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
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
  // OAuth Methods (OAuthCapablePlugin interface)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start OAuth flow for GA4
   * Uses GA4-specific OAuth credentials (GOOGLE_GA4_CLIENT_ID/SECRET)
   */
  async startOAuth(context: { redirectUri: string; scopes?: string[]; scope?: string }): Promise<{ authUrl: string; state: string }> {
    // Fail fast if not configured
    if (!isGA4OAuthConfigured()) {
      throw new GA4OAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    
    // Generate state with platformKey metadata for callback routing
    const stateMetadata = {
      platformKey: 'ga4',
      scope: context.scope || 'AGENCY',
    };
    const metadataStr = Buffer.from(JSON.stringify(stateMetadata)).toString('base64url');
    const randomPart = generateState();
    const state = `${randomPart}.${metadataStr}`;
    
    const authUrl = buildAuthorizationUrl(config, state);

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback for GA4
   */
  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> {
    // Fail fast if not configured
    if (!isGA4OAuthConfigured()) {
      throw new GA4OAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    return exchangeCodeForTokens(config, context.code);
  }

  /**
   * Discover accessible GA4 accounts and properties
   */
  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    if (!auth.success || !auth.accessToken) {
      return { success: false, error: 'No valid access token provided', targets: [] };
    }

    try {
      const accountSummaries = await listAllAccountSummaries(auth);
      const targets: DiscoverTargetsResult['targets'] = [];

      // Add accounts as targets
      for (const account of accountSummaries) {
        targets.push({
          targetType: 'ACCOUNT',
          externalId: account.account || '',
          displayName: account.displayName || 'Unknown Account',
          metadata: { name: account.name },
        });

        // Add properties under each account
        for (const property of account.propertySummaries || []) {
          targets.push({
            targetType: 'PROPERTY',
            externalId: property.property || '',
            displayName: property.displayName || 'Unknown Property',
            parentExternalId: account.account,
            metadata: { name: property.name, parent: property.parent },
          });
        }
      }

      return { success: true, targets };
    } catch (error) {
      console.error('[GA4Plugin] discoverTargets error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to discover targets',
        targets: [] 
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Verification (using CLIENT OAuth token)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify that an identity has the expected role on a GA4 property.
   * Uses the CLIENT's OAuth token to call the GA4 Admin API and check access bindings.
   * 
   * @param params.auth - CLIENT OAuth token
   * @param params.target - GA4 Property ID (numeric, e.g., "123456789")
   * @param params.role - Expected role key ("viewer", "analyst", "editor", "administrator")
   * @param params.identity - Email address to verify
   * @param params.accessItemType - Type of access (NAMED_INVITE, GROUP_ACCESS)
   */
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const { auth, target, role, identity, accessItemType } = params;

    // Centralized validation
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; '), details: { found: false } };
    }

    try {
      // Build AuthResult for API calls
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      // Determine if target is an account or a property
      const isAccountTarget = target.startsWith('accounts/') || target.startsWith('accounts%2F');
      const resourceId = isAccountTarget
        ? target.replace(/^accounts\//, '').replace(/^accounts%2F/, '')
        : target.replace(/^properties\//, '');
      const resourceLabel = isAccountTarget ? 'account' : 'property';
      
      console.log(`[GA4Plugin] Verifying access for ${identity} on ${resourceLabel} ${resourceId} with role ${role}`);

      // List all access bindings at the appropriate level
      const bindings = isAccountTarget
        ? await listAccountAccessBindings(authResult, resourceId)
        : await listAccessBindings(authResult, resourceId);
      
      // Find binding for the identity
      const userBinding = bindings.find(b => 
        b.user?.toLowerCase() === identity.toLowerCase()
      );

      if (!userBinding) {
        console.log(`[GA4Plugin] No access binding found for ${identity}`);
        return {
          success: true,
          data: false,
          details: {
            found: false,
            identity,
            expectedRole: role
          }
        };
      }

      // Map expected role to GA4 role format
      const expectedGA4Role = ROLE_MAPPING[role.toLowerCase()] || `roles/${role.toLowerCase()}`;
      const foundRoles = userBinding.roles || [];
      
      console.log(`[GA4Plugin] Found binding for ${identity} with roles: ${foundRoles.join(', ')}`);
      console.log(`[GA4Plugin] Expected role: ${expectedGA4Role}`);

      // Check if user has the expected role (or a higher role)
      const hasExpectedRole = this.hasRoleOrHigher(foundRoles, expectedGA4Role);

      if (hasExpectedRole) {
        return {
          success: true,
          data: true,
          details: {
            found: true,
            foundRoles,
            expectedRole: expectedGA4Role,
            identity,
            binding: {
              name: userBinding.name,
              user: userBinding.user,
              roles: userBinding.roles
            }
          }
        };
      } else {
        return {
          success: true,
          data: false,
          details: {
            found: true,
            foundRoles,
            expectedRole: expectedGA4Role,
            identity
          }
        };
      }
    } catch (error) {
      console.error('[GA4Plugin] verifyAccess error:', error);
      
      // Extract full error details including Google API response body
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorBody = (error as any)?.body || '';
      let googleErrorDetail = '';
      try {
        if (errorBody) {
          const parsed = JSON.parse(errorBody);
          googleErrorDetail = parsed?.error?.message || parsed?.message || '';
        }
      } catch { /* not JSON */ }
      const fullError = googleErrorDetail || errorMessage;
      
      console.error(`[GA4Plugin] verifyAccess full error: message=${errorMessage}, body=${errorBody}`);
      
      const isAcct = target.startsWith('accounts/') || target.startsWith('accounts%2F');
      const resourceLabel = isAcct ? 'account' : 'property';
      
      if (errorMessage.includes('403') || fullError.toLowerCase().includes('permission denied')) {
        return {
          success: false,
          error: `Permission denied on ${resourceLabel} ${target}. The connected Google account needs Administrator role. Detail: ${fullError}`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('404') || fullError.toLowerCase().includes('not found')) {
        return {
          success: false,
          error: `${isAcct ? 'Account' : 'Property'} ${target} was not found or is not accessible. Detail: ${fullError}`,
          details: { found: false }
        };
      }
      
      return {
        success: false,
        error: `Failed to verify access: ${fullError}`,
        details: { found: false }
      };
    }
  }

  /**
   * Check if the user has the expected role or a higher privileged role.
   * GA4 role hierarchy: viewer < analyst < editor < admin
   */
  private hasRoleOrHigher(userRoles: string[], expectedRole: string): boolean {
    const roleHierarchy: GA4Role[] = ['predefinedRoles/viewer', 'predefinedRoles/analyst', 'predefinedRoles/editor', 'predefinedRoles/admin'];
    
    const expectedIndex = roleHierarchy.indexOf(expectedRole as GA4Role);
    if (expectedIndex === -1) {
      // Unknown role, check for exact match
      return userRoles.includes(expectedRole);
    }

    // Check if user has the expected role or any higher role
    for (const userRole of userRoles) {
      const userRoleIndex = roleHierarchy.indexOf(userRole as GA4Role);
      if (userRoleIndex !== -1 && userRoleIndex >= expectedIndex) {
        return true;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Granting
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Grant access to an identity on a GA4 property.
   * Uses the GA4 Admin API to create an access binding.
   * 
   * @param params.auth - OAuth token (CLIENT or AGENCY scoped)
   * @param params.target - GA4 Property ID (numeric, e.g., "123456789")
   * @param params.role - Role key ("viewer", "analyst", "editor", "administrator")
   * @param params.identity - Email address to grant access to
   * @param params.accessItemType - Type of access (NAMED_INVITE, GROUP_ACCESS)
   */
  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const { auth, target, role, identity, accessItemType } = params;

    // Centralized validation
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; '), details: { found: false } };
    }

    try {
      // Build AuthResult for API calls
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      // Determine if target is an account or a property
      const isAccountTarget = target.startsWith('accounts/') || target.startsWith('accounts%2F');
      const resourceId = isAccountTarget
        ? target.replace(/^accounts\//, '').replace(/^accounts%2F/, '')
        : target.replace(/^properties\//, '');
      const resourceLabel = isAccountTarget ? 'account' : 'property';
      
      // Map role key to GA4 role format
      const ga4Role = ROLE_MAPPING[role.toLowerCase()] || `roles/${role.toLowerCase()}`;
      
      console.log(`[GA4Plugin] Granting ${ga4Role} access to ${identity} on ${resourceLabel} ${resourceId}`);
      console.log(`[GA4Plugin] API: v1alpha, target="${target}", isAccountTarget=${isAccountTarget}, resourceId="${resourceId}"`);
      console.log(`[GA4Plugin] Will call: https://analyticsadmin.googleapis.com/v1alpha/${isAccountTarget ? 'accounts' : 'properties'}/${resourceId}/accessBindings`);

      // Check existing access using the appropriate API level
      const bindings = isAccountTarget
        ? await listAccountAccessBindings(authResult, resourceId)
        : await listAccessBindings(authResult, resourceId);
      
      const existingBinding = bindings.find(b => b.user?.toLowerCase() === identity.toLowerCase()) || null;
      
      if (existingBinding) {
        const existingRoles = existingBinding.roles || [];
        
        if (this.hasRoleOrHigher(existingRoles, ga4Role)) {
          console.log(`[GA4Plugin] User ${identity} already has ${existingRoles.join(', ')} on ${resourceLabel} ${resourceId}`);
          return {
            success: true,
            data: true,
            details: {
              found: true,
              foundRoles: existingRoles,
              expectedRole: ga4Role,
              identity,
              message: `User already has the required access level on this ${resourceLabel}`,
              binding: existingBinding
            }
          };
        }
        
        console.warn(`[GA4Plugin] User ${identity} has ${existingRoles.join(', ')} but requested ${ga4Role}. Manual update may be required.`);
        return {
          success: true,
          data: true,
          details: {
            found: true,
            foundRoles: existingRoles,
            expectedRole: ga4Role,
            identity,
            message: 'User already has access. To upgrade role, please remove and re-add the user.',
            binding: existingBinding
          }
        };
      }

      // Create new access binding at the appropriate level
      const newBinding = isAccountTarget
        ? await createAccountAccessBinding(authResult, resourceId, identity, [ga4Role as GA4Role])
        : await createAccessBinding(authResult, resourceId, identity, [ga4Role as GA4Role]);

      console.log(`[GA4Plugin] Successfully granted ${ga4Role} to ${identity} on ${resourceLabel} ${resourceId}`);

      return {
        success: true,
        data: true,
        details: {
          found: true,
          foundRoles: [ga4Role],
          expectedRole: ga4Role,
          identity,
          message: `Access granted successfully on ${resourceLabel}`,
          binding: {
            name: newBinding.name,
            user: newBinding.user,
            roles: newBinding.roles
          }
        }
      };
    } catch (error) {
      console.error('[GA4Plugin] grantAccess error:', error);
      
      // Extract full error details including Google API response body
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorBody = (error as any)?.body || '';
      let googleErrorDetail = '';
      try {
        if (errorBody) {
          const parsed = JSON.parse(errorBody);
          googleErrorDetail = parsed?.error?.message || parsed?.message || '';
        }
      } catch { /* not JSON */ }
      const fullError = googleErrorDetail || errorMessage;
      
      console.error(`[GA4Plugin] grantAccess full error: message=${errorMessage}, body=${errorBody}`);
      
      const isAcct = target.startsWith('accounts/') || target.startsWith('accounts%2F');
      const resourceLabel = isAcct ? 'account' : 'property';
      
      if (errorMessage.includes('403') || fullError.toLowerCase().includes('permission denied')) {
        return {
          success: false,
          error: `Permission denied on ${resourceLabel} ${target}. The connected Google account needs Administrator role. Detail: ${fullError}`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('404') || fullError.toLowerCase().includes('not found')) {
        return {
          success: false,
          error: `${isAcct ? 'Account' : 'Property'} ${target} was not found or is not accessible. Detail: ${fullError}`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('409') || fullError.toLowerCase().includes('already exists')) {
        return {
          success: false,
          error: `User ${identity} already has an access binding on ${resourceLabel} ${target}.`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('400')) {
        return {
          success: false,
          error: `Invalid request: ${fullError}. Please verify the email address and ${resourceLabel} ID are correct.`,
          details: { found: false }
        };
      }
      
      return {
        success: false,
        error: `Failed to grant access: ${fullError}`,
        details: { found: false }
      };
    }
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
  // Account Discovery (Legacy)
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
