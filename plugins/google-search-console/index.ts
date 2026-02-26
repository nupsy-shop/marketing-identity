/**
 * Google Search Console Platform Plugin
 * 
 * Implements OAuth, target discovery, and access verification for GSC.
 * 
 * IMPORTANT: The Search Console API does NOT support adding users programmatically.
 * grantAccess will always return false with instructions for manual granting.
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
  RevokeResult
} from '../../lib/plugins/types';
import { buildPluginError, validateProvisioningRequest } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { GSC_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { isGSCOAuthConfigured, getOAuthConfig, GSCOAuthNotConfiguredError } from './auth';
import { 
  listSites, 
  checkSiteAccess, 
  verifyUserAccess,
  discoverSites,
  mapRoleToPermission,
  hasPermissionOrHigher
} from './api/management';
import { buildAuthorizationUrl, exchangeCodeForTokens, generateState } from '../common/utils/auth';
import { ROLE_MAPPING, type GSCRole } from './types';

// ─── GSC Plugin Implementation ──────────────────────────────────────────────────

class GSCPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'google-search-console';
  readonly manifest: PluginManifest = GSC_MANIFEST;
  private context: AppContext | null = null;

  async initialize(context: AppContext): Promise<void> { 
    this.context = context;
    console.log(`[GSCPlugin] Initialized v${this.manifest.pluginVersion}`);
  }
  
  async destroy(): Promise<void> { 
    this.context = null; 
    console.log('[GSCPlugin] Destroyed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAuth Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async startOAuth(context: { redirectUri: string; scopes?: string[]; scope?: string }): Promise<{ authUrl: string; state: string }> {
    if (!isGSCOAuthConfigured()) {
      throw new GSCOAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    
    // Generate state with platformKey metadata for callback routing
    const stateMetadata = {
      platformKey: 'google-search-console',
      scope: context.scope || 'AGENCY',
    };
    const metadataStr = Buffer.from(JSON.stringify(stateMetadata)).toString('base64url');
    const randomPart = generateState();
    const state = `${randomPart}.${metadataStr}`;
    
    const authUrl = buildAuthorizationUrl(config, state);

    return { authUrl, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> {
    if (!isGSCOAuthConfigured()) {
      throw new GSCOAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    return exchangeCodeForTokens(config, context.code);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Target Discovery
  // ═══════════════════════════════════════════════════════════════════════════

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    if (!auth.success || !auth.accessToken) {
      return { success: false, error: 'No valid access token provided', targets: [] };
    }

    try {
      const targets = await discoverSites(auth);
      return { success: true, targets };
    } catch (error) {
      console.error('[GSCPlugin] discoverTargets error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to discover sites',
        targets: [] 
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Verification
  // ═══════════════════════════════════════════════════════════════════════════

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const { auth, target, role, identity, accessItemType } = params;

    // Centralized validation
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; '), details: { found: false } };
    }

    try {
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      console.log(`[GSCPlugin] Verifying access for ${identity} on site ${target} with role ${role}`);

      // Verify access using the Search Console API
      const verificationResult = await verifyUserAccess(authResult, target, identity, role);
      
      if (!verificationResult.verified && !verificationResult.permissionLevel) {
        // No access at all
        return {
          success: true,
          data: false,
          details: {
            found: false,
            identity,
            expectedRole: role,
            siteUrl: target,
            message: verificationResult.message || 'No access to this site'
          }
        };
      }

      return {
        success: true,
        data: verificationResult.verified,
        details: {
          found: true,
          foundPermission: verificationResult.permissionLevel,
          expectedRole: role,
          identity,
          siteUrl: target,
          message: verificationResult.message
        }
      };

    } catch (error) {
      console.error('[GSCPlugin] verifyAccess error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('403') || errorMessage.includes('Permission denied')) {
        return {
          success: false,
          error: 'The OAuth token does not have permission to access Search Console data.',
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: `Site ${target} was not found or is not accessible.`,
          details: { found: false }
        };
      }
      
      return {
        success: false,
        error: `Failed to verify access: ${errorMessage}`,
        details: { found: false }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Granting
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Grant access to an identity on a Search Console property.
   * 
   * IMPORTANT: The Search Console API does NOT support adding users programmatically.
   * This method always returns with instructions for manual granting.
   */
  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const { auth, target, role, identity, accessItemType } = params;

    // Centralized validation
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) {
      return { success: false, error: errors.join('; '), details: { found: false } };
    }

    // Search Console API limitation: Cannot add users programmatically
    // Check if user already has access
    try {
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      console.log(`[GSCPlugin] Checking if ${identity} already has access to ${target}`);

      // First verify if the user already has access
      const verificationResult = await verifyUserAccess(authResult, target, identity, role);
      
      if (verificationResult.verified) {
        // User already has sufficient access
        return {
          success: true,
          data: true,
          details: {
            found: true,
            foundPermission: verificationResult.permissionLevel,
            expectedRole: role,
            identity,
            siteUrl: target,
            message: 'User already has the required access level'
          }
        };
      }

      // User doesn't have access or has insufficient permission
      // Return instructions for manual granting
      const roleLabel = role === 'owner' ? 'Owner' : role === 'full' ? 'Full User' : 'Restricted User';
      
      return {
        success: false,
        error: `Google Search Console does not support programmatic user management. Please add ${identity} manually with ${roleLabel} permission via the Search Console web interface: Settings → Users and permissions → Add user`,
        details: {
          found: verificationResult.permissionLevel ? true : false,
          foundPermission: verificationResult.permissionLevel,
          expectedRole: role,
          identity,
          siteUrl: target,
          message: `Manual action required: Go to Search Console → ${target} → Settings → Users and permissions → Add user → Enter ${identity} → Select ${roleLabel} → Save`
        }
      };

    } catch (error) {
      console.error('[GSCPlugin] grantAccess error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Even on error, provide manual instructions
      return {
        success: false,
        error: `Cannot grant access automatically. ${errorMessage}. Please add ${identity} manually via the Search Console web interface.`,
        details: { 
          found: false,
          identity,
          siteUrl: target,
          expectedRole: role
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async authorize(params: AuthParams): Promise<AuthResult> { 
    return { success: false, error: 'Use startOAuth() for OAuth flow' }; 
  }
  
  async refreshToken(currentToken: string): Promise<AuthResult> { 
    return { success: false, error: 'Not implemented' }; 
  }
  
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { 
    return []; 
  }
  
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { 
    return { headers: [], rows: [] }; 
  }
  
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  // ═══════════════════════════════════════════════════════════════════════════
  // Schema Methods
  // ═══════════════════════════════════════════════════════════════════════════

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { 
      case 'NAMED_INVITE': return NamedInviteAgencySchema; 
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; 
      default: return z.object({}); 
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { 
      case 'NAMED_INVITE': return NamedInviteClientSchema; 
      case 'SHARED_ACCOUNT': return SharedAccountClientSchema; 
      default: return z.object({}); 
    }
  }

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const result = this.getAgencyConfigSchema(accessItemType).safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (config as any).pamOwnership === 'AGENCY_OWNED' && !(config as any).pamConfirmation)
        return { valid: false, errors: ['PAM confirmation required.'] };
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const result = this.getClientTargetSchema(accessItemType).safeParse(target);
    return result.success ? { valid: true, errors: [] } : { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { roleTemplate } = context;
    const roleLabel = roleTemplate === 'owner' ? 'Owner' : roleTemplate === 'full' ? 'Full' : 'Restricted';
    
    return [
      { 
        step: 1, 
        title: 'Open Search Console', 
        description: 'Go to Google Search Console and select your property.', 
        link: { url: 'https://search.google.com/search-console', label: 'Open Search Console' } 
      },
      { 
        step: 2, 
        title: 'Go to Settings', 
        description: 'Click the Settings gear icon in the left sidebar.' 
      },
      { 
        step: 3, 
        title: 'Users and permissions', 
        description: 'Click on "Users and permissions" to manage access.' 
      },
      { 
        step: 4, 
        title: 'Add User', 
        description: 'Click "Add user" button.' 
      },
      { 
        step: 5, 
        title: 'Enter Email & Set Permission', 
        description: `Enter the agency email address and select "${roleLabel}" permission level, then click "Add".` 
      }
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode { 
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; 
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { 
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; 
  }
}

export default new GSCPlugin();
export { GSCPlugin };
