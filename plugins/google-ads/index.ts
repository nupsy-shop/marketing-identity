/**
 * Google Ads Platform Plugin
 * 
 * Implements OAuth, target discovery, and access verification for Google Ads.
 * Supports both PARTNER_DELEGATION (MCC link) and NAMED_INVITE (user access).
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
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';

import { GOOGLE_ADS_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { isGoogleAdsOAuthConfigured, getOAuthConfig, GoogleAdsOAuthNotConfiguredError } from './auth';
import { 
  listAccessibleCustomers,
  listAllCustomers,
  checkManagerLink,
  checkUserAccess,
  createUserAccessInvitation,
  createManagerClientLink
} from './api/management';
import { buildAuthorizationUrl, exchangeCodeForTokens, generateState } from '../common/utils/auth';
import { ROLE_MAPPING, type GoogleAdsRole } from './types';

// ─── Verify Access Types ────────────────────────────────────────────────────────

interface VerifyAccessParams {
  auth: { accessToken: string; tokenType?: string };
  target: string;  // Customer/Account ID
  role: string;    // Expected role key
  identity: string; // Email or MCC ID to verify
  accessItemType: AccessItemType;
}

interface VerifyAccessResult {
  success: boolean;
  data?: boolean;
  error?: string;
  details?: {
    found: boolean;
    foundRole?: string;
    expectedRole?: string;
    identity?: string;
    linkStatus?: string;
  };
}

// ─── Role Hierarchy ─────────────────────────────────────────────────────────────

// Google Ads access role hierarchy: EMAIL_ONLY < READ_ONLY < STANDARD < ADMIN
const ROLE_HIERARCHY: GoogleAdsRole[] = ['EMAIL_ONLY', 'READ_ONLY', 'STANDARD', 'ADMIN'];

function hasRoleOrHigher(userRole: string | undefined, requiredRole: string): boolean {
  if (!userRole) return false;
  
  const normalizedRequired = ROLE_MAPPING[requiredRole.toLowerCase()] || requiredRole.toUpperCase();
  const normalizedUser = userRole.toUpperCase();
  
  const requiredIndex = ROLE_HIERARCHY.indexOf(normalizedRequired as GoogleAdsRole);
  const userIndex = ROLE_HIERARCHY.indexOf(normalizedUser as GoogleAdsRole);
  
  if (requiredIndex === -1 || userIndex === -1) {
    return normalizedUser === normalizedRequired;
  }
  
  return userIndex >= requiredIndex;
}

// ─── Google Ads Plugin Implementation ───────────────────────────────────────────

class GoogleAdsPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'google-ads';
  readonly manifest: PluginManifest = GOOGLE_ADS_MANIFEST;
  private context: AppContext | null = null;

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    console.log(`[GoogleAdsPlugin] Initialized v${this.manifest.pluginVersion}`);
  }

  async destroy(): Promise<void> {
    this.context = null;
    console.log('[GoogleAdsPlugin] Destroyed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAuth Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async startOAuth(context: { redirectUri: string; scopes?: string[]; scope?: string }): Promise<{ authUrl: string; state: string }> {
    if (!isGoogleAdsOAuthConfigured()) {
      throw new GoogleAdsOAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    
    // Generate state with platformKey metadata for callback routing
    const stateMetadata = {
      platformKey: 'google-ads',
      scope: context.scope || 'AGENCY',
    };
    const metadataStr = Buffer.from(JSON.stringify(stateMetadata)).toString('base64url');
    const randomPart = generateState();
    const state = `${randomPart}.${metadataStr}`;
    
    const authUrl = buildAuthorizationUrl(config, state);

    return { authUrl, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> {
    if (!isGoogleAdsOAuthConfigured()) {
      throw new GoogleAdsOAuthNotConfiguredError();
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
      const customers = await listAllCustomers(auth);
      const targets: DiscoverTargetsResult['targets'] = [];

      for (const customer of customers) {
        targets.push({
          targetType: customer.isManager ? 'MCC' : 'AD_ACCOUNT',
          externalId: customer.id,
          displayName: customer.name,
          metadata: { isManager: customer.isManager },
        });
      }

      return { success: true, targets };
    } catch (error) {
      console.error('[GoogleAdsPlugin] discoverTargets error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to discover targets',
        targets: [] 
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Verification
  // ═══════════════════════════════════════════════════════════════════════════

  async verifyAccess(params: VerifyAccessParams): Promise<VerifyAccessResult> {
    const { auth, target, role, identity, accessItemType } = params;

    if (!target) {
      return { success: false, error: 'Customer/Account ID (target) is required', details: { found: false } };
    }

    if (!identity) {
      return { success: false, error: 'Identity (email or MCC ID) to verify is required', details: { found: false } };
    }

    if (accessItemType === 'SHARED_ACCOUNT') {
      return {
        success: false,
        error: 'Shared Account (PAM) access cannot be verified via API. Manual evidence required.',
        details: { found: false }
      };
    }

    try {
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      // Normalize customer ID (remove any prefix)
      const customerId = target.replace(/^customers\//, '').replace(/-/g, '');
      
      console.log(`[GoogleAdsPlugin] Verifying ${accessItemType} access for ${identity} on customer ${customerId}`);

      // PARTNER_DELEGATION: Check if MCC link exists
      if (accessItemType === 'PARTNER_DELEGATION') {
        const managerCustomerId = identity.replace(/^customers\//, '').replace(/-/g, '');
        
        try {
          const linkResult = await checkManagerLink(authResult, customerId, managerCustomerId);
          
          if (!linkResult.found) {
            return {
              success: true,
              data: false,
              details: {
                found: false,
                identity: managerCustomerId,
                expectedRole: 'PARTNER_LINK'
              }
            };
          }

          // Check if link is ACTIVE
          const isActive = linkResult.status === 'ACTIVE';
          
          return {
            success: true,
            data: isActive,
            details: {
              found: true,
              linkStatus: linkResult.status,
              identity: managerCustomerId,
              expectedRole: 'PARTNER_LINK'
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // If we can't check manager links, it might be a permission issue
          if (errorMessage.includes('403') || errorMessage.includes('Permission')) {
            return {
              success: false,
              error: 'Unable to verify MCC link. The client account token may not have permission to view manager links.',
              details: { found: false }
            };
          }
          
          throw error;
        }
      }

      // NAMED_INVITE: Check if user email has access
      if (accessItemType === 'NAMED_INVITE') {
        try {
          const accessResult = await checkUserAccess(authResult, customerId, identity);
          
          if (!accessResult.found) {
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

          // Check if user has required role level
          const hasRequiredRole = hasRoleOrHigher(accessResult.accessRole, role);
          
          return {
            success: true,
            data: hasRequiredRole,
            details: {
              found: true,
              foundRole: accessResult.accessRole,
              expectedRole: role,
              identity
            }
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMessage.includes('403') || errorMessage.includes('Permission')) {
            return {
              success: false,
              error: 'Unable to verify user access. The token may not have permission to view user access roles.',
              details: { found: false }
            };
          }
          
          throw error;
        }
      }

      return {
        success: false,
        error: `Unsupported access type for verification: ${accessItemType}`,
        details: { found: false }
      };

    } catch (error) {
      console.error('[GoogleAdsPlugin] verifyAccess error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: `Customer account ${target} was not found or is not accessible.`,
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

  async grantAccess(_params: VerifyAccessParams): Promise<VerifyAccessResult> {
    return {
      success: false,
      error: 'Google Ads automated access granting is not yet implemented. Manual granting required.',
      details: { found: false }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async authorize(params: AuthParams): Promise<AuthResult> {
    return { success: false, error: 'Use startOAuth() for OAuth flow' };
  }

  async refreshToken(currentToken: string): Promise<AuthResult> {
    return { success: false, error: 'Token refresh not implemented' };
  }

  async fetchAccounts(auth: AuthResult): Promise<Account[]> {
    return [];
  }

  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> {
    return { headers: [], rows: [] };
  }

  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> {
    throw new Error('Google Ads does not support event uploads via this plugin');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Schema Methods
  // ═══════════════════════════════════════════════════════════════════════════

  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema;
      case 'NAMED_INVITE': return NamedInviteAgencySchema;
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema;
      default: return z.object({});
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) {
      case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema;
      case 'NAMED_INVITE': return NamedInviteClientSchema;
      case 'SHARED_ACCOUNT': return SharedAccountClientSchema;
      default: return z.object({});
    }
  }

  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult {
    const schema = this.getAgencyConfigSchema(accessItemType);
    const result = schema.safeParse(config);
    if (result.success) {
      if (accessItemType === 'SHARED_ACCOUNT') {
        const pamConfig = config as { pamOwnership?: string; pamConfirmation?: boolean };
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && 
            pamConfig.pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          return { valid: false, errors: ['PAM confirmation is required for Google Ads.'] };
        }
      }
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult {
    const schema = this.getClientTargetSchema(accessItemType);
    const result = schema.safeParse(target);
    if (result.success) return { valid: true, errors: [] };
    return { valid: false, errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }

  buildClientInstructions(context: InstructionContext): InstructionStep[] {
    const { accessItemType, agencyConfig, roleTemplate } = context;
    switch (accessItemType) {
      case 'PARTNER_DELEGATION':
        const mccId = (agencyConfig as { managerAccountId?: string }).managerAccountId || '[MCC ID]';
        return [
          { step: 1, title: 'Sign in to Google Ads', description: 'Go to ads.google.com and sign in.', link: { url: 'https://ads.google.com', label: 'Open Google Ads' } },
          { step: 2, title: 'Access Account Settings', description: 'Click the tools icon, then select "Account Access" under Setup.' },
          { step: 3, title: 'Link Manager Account', description: `Click "Link to Manager Account" and enter MCC ID: ${mccId}` },
          { step: 4, title: 'Accept Link Request', description: `Set access level to "${roleTemplate}" and confirm.` }
        ];
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Sign in to Google Ads', description: 'Go to ads.google.com and sign in.', link: { url: 'https://ads.google.com', label: 'Open Google Ads' } },
          { step: 2, title: 'Access Account Settings', description: 'Click the tools icon, then select "Account Access".' },
          { step: 3, title: 'Invite User', description: `Click + to add user. Enter the agency email and select "${roleTemplate}" access.` },
          { step: 4, title: 'Send Invitation', description: 'Click "Send invitation" to complete.' }
        ];
      case 'SHARED_ACCOUNT':
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter the shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Ensure two-factor authentication is enabled.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials will be encrypted in the PAM vault.' }
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'Agency will create a dedicated identity.' },
          { step: 2, title: 'Grant Access', description: 'Grant access to the agency-managed identity.' }
        ];
      default: return [];
    }
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY';
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' };
  }
}

export default new GoogleAdsPlugin();
export { GoogleAdsPlugin };
