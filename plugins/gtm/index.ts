/**
 * Google Tag Manager Platform Plugin
 * 
 * Implements OAuth, target discovery, and access verification for GTM.
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
import { GTM_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { NamedInviteAgencySchema, GroupAccessAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { NamedInviteClientSchema, GroupAccessClientSchema, SharedAccountClientSchema } from './schemas/client';
import { isGTMOAuthConfigured, getOAuthConfig, GTMOAuthNotConfiguredError } from './auth';
import { 
  listAccountsWithContainers, 
  listAccountUserPermissions, 
  getUserContainerPermission,
  createUserPermission,
  type GTMContainerPermission,
  type GTMAccountPermission,
  type GTMContainerAccess
} from './api/management';
import { buildAuthorizationUrl, exchangeCodeForTokens, generateState } from '../common/utils/auth';
import { ROLE_MAPPING, type GTMRole } from './types';
  details?: {
    found: boolean;
    foundPermission?: string;
    expectedRole?: string;
    identity?: string;
    containerAccess?: Array<{ containerId: string; permission: string }>;
  };
}

// ─── Permission Hierarchy ───────────────────────────────────────────────────────

// GTM Container permission hierarchy: read < edit < approve < publish
const CONTAINER_PERMISSION_HIERARCHY: GTMContainerPermission[] = ['read', 'edit', 'approve', 'publish'];

function hasPermissionOrHigher(userPermission: GTMContainerPermission | undefined, requiredPermission: string): boolean {
  if (!userPermission || userPermission === 'noAccess') return false;
  
  const requiredIndex = CONTAINER_PERMISSION_HIERARCHY.indexOf(requiredPermission as GTMContainerPermission);
  const userIndex = CONTAINER_PERMISSION_HIERARCHY.indexOf(userPermission);
  
  // If required permission not in hierarchy, check for exact match
  if (requiredIndex === -1) {
    return userPermission === requiredPermission;
  }
  
  return userIndex >= requiredIndex;
}

// ─── GTM Plugin Implementation ──────────────────────────────────────────────────

class GTMPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'gtm';
  readonly manifest: PluginManifest = GTM_MANIFEST;
  private context: AppContext | null = null;

  async initialize(context: AppContext): Promise<void> { 
    this.context = context;
    console.log(`[GTMPlugin] Initialized v${this.manifest.pluginVersion}`);
  }
  
  async destroy(): Promise<void> { 
    this.context = null; 
    console.log('[GTMPlugin] Destroyed');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAuth Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async startOAuth(context: { redirectUri: string; scopes?: string[]; scope?: string }): Promise<{ authUrl: string; state: string }> {
    if (!isGTMOAuthConfigured()) {
      throw new GTMOAuthNotConfiguredError();
    }

    const config = getOAuthConfig(context.redirectUri);
    
    // Generate state with platformKey metadata for callback routing
    const stateMetadata = {
      platformKey: 'gtm',
      scope: context.scope || 'AGENCY',
    };
    const metadataStr = Buffer.from(JSON.stringify(stateMetadata)).toString('base64url');
    const randomPart = generateState();
    const state = `${randomPart}.${metadataStr}`;
    
    const authUrl = buildAuthorizationUrl(config, state);

    return { authUrl, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<AuthResult> {
    if (!isGTMOAuthConfigured()) {
      throw new GTMOAuthNotConfiguredError();
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
      const accountsWithContainers = await listAccountsWithContainers(auth);
      const targets: DiscoverTargetsResult['targets'] = [];

      for (const { account, containers } of accountsWithContainers) {
        // Add account as target
        targets.push({
          targetType: 'ACCOUNT',
          externalId: account.accountId,
          displayName: account.name || `Account ${account.accountId}`,
          metadata: { path: account.path },
        });

        // Add containers under each account
        for (const container of containers) {
          targets.push({
            targetType: 'CONTAINER',
            externalId: `${account.accountId}/${container.containerId}`,
            displayName: `${container.name} (${container.publicId})`,
            parentExternalId: account.accountId,
            metadata: { 
              path: container.path, 
              publicId: container.publicId,
              accountId: account.accountId,
              containerId: container.containerId
            },
          });
        }
      }

      return { success: true, targets };
    } catch (error) {
      console.error('[GTMPlugin] discoverTargets error:', error);
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

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const { auth, target, role, identity, accessItemType } = params;

    if (!target) {
      return { success: false, error: 'Account/Container ID (target) is required', details: { found: false } };
    }

    if (!identity) {
      return { success: false, error: 'Identity (email) to verify is required', details: { found: false } };
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

      // Parse target: can be "accountId" or "accountId/containerId"
      const [accountId, containerId] = target.split('/');
      
      console.log(`[GTMPlugin] Verifying access for ${identity} on ${containerId ? `container ${containerId}` : `account ${accountId}`} with role ${role}`);

      // List all user permissions for the account
      const permissions = await listAccountUserPermissions(authResult, accountId);
      
      // Find the user's permission
      const userPermission = permissions.find(p => 
        p.emailAddress?.toLowerCase() === identity.toLowerCase()
      );

      if (!userPermission) {
        console.log(`[GTMPlugin] No permission found for ${identity} on account ${accountId}`);
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

      // If checking container-level access
      if (containerId) {
        const containerAccess = userPermission.containerAccess?.find(c => c.containerId === containerId);
        
        if (!containerAccess || containerAccess.permission === 'noAccess') {
          return {
            success: true,
            data: false,
            details: {
              found: true,
              foundPermission: 'noAccess',
              expectedRole: role,
              identity,
              containerAccess: userPermission.containerAccess?.map(c => ({
                containerId: c.containerId,
                permission: c.permission
              }))
            }
          };
        }

        // Check permission hierarchy
        const hasRequiredPermission = hasPermissionOrHigher(containerAccess.permission, role);

        return {
          success: true,
          data: hasRequiredPermission,
          details: {
            found: true,
            foundPermission: containerAccess.permission,
            expectedRole: role,
            identity,
            containerAccess: userPermission.containerAccess?.map(c => ({
              containerId: c.containerId,
              permission: c.permission
            }))
          }
        };
      }

      // Account-level access check
      const accountPermission = userPermission.accountAccess?.permission;
      if (!accountPermission || accountPermission === 'noAccess') {
        return {
          success: true,
          data: false,
          details: {
            found: true,
            foundPermission: 'noAccess',
            expectedRole: role,
            identity
          }
        };
      }

      // For account-level, 'admin' is highest, 'user' is basic
      const hasAccountAccess = role === 'admin' 
        ? accountPermission === 'admin'
        : accountPermission === 'admin' || accountPermission === 'user';

      return {
        success: true,
        data: hasAccountAccess,
        details: {
          found: true,
          foundPermission: accountPermission,
          expectedRole: role,
          identity,
          containerAccess: userPermission.containerAccess?.map(c => ({
            containerId: c.containerId,
            permission: c.permission
          }))
        }
      };

    } catch (error) {
      console.error('[GTMPlugin] verifyAccess error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('403') || errorMessage.includes('Permission denied')) {
        return {
          success: false,
          error: 'The OAuth token does not have permission to view user permissions. The client may need to grant Admin access.',
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: `Account ${target.split('/')[0]} was not found or is not accessible.`,
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

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const { auth, target, role, identity, accessItemType } = params;

    if (!target) {
      return { success: false, error: 'Account/Container ID (target) is required', details: { found: false } };
    }

    if (!identity) {
      return { success: false, error: 'Identity (email) to grant access to is required', details: { found: false } };
    }

    if (!role) {
      return { success: false, error: 'Role is required', details: { found: false } };
    }

    if (accessItemType === 'SHARED_ACCOUNT') {
      return {
        success: false,
        error: 'Shared Account (PAM) access cannot be granted via API. Manual credential handoff required.',
        details: { found: false }
      };
    }

    try {
      const authResult: AuthResult = {
        success: true,
        accessToken: auth.accessToken,
        tokenType: auth.tokenType || 'Bearer'
      };

      // Parse target: can be "accountId" or "accountId/containerId"
      const [accountId, containerId] = target.split('/');
      
      console.log(`[GTMPlugin] Granting ${role} access to ${identity} on ${containerId ? `container ${containerId}` : `account ${accountId}`}`);

      // Check if user already has access
      const permissions = await listAccountUserPermissions(authResult, accountId);
      const existingPermission = permissions.find(p => 
        p.emailAddress?.toLowerCase() === identity.toLowerCase()
      );

      if (existingPermission) {
        // User already has some access - check if they have the required permission
        if (containerId) {
          const containerAccess = existingPermission.containerAccess?.find(c => c.containerId === containerId);
          if (containerAccess && hasPermissionOrHigher(containerAccess.permission, role)) {
            console.log(`[GTMPlugin] User ${identity} already has ${containerAccess.permission} on container ${containerId}`);
            return {
              success: true,
              data: true,
              details: {
                found: true,
                foundPermission: containerAccess.permission,
                expectedRole: role,
                identity,
                message: 'User already has the required access level'
              }
            };
          }
        } else {
          const accountPerm = existingPermission.accountAccess?.permission;
          if (accountPerm && (role === 'admin' ? accountPerm === 'admin' : accountPerm !== 'noAccess')) {
            console.log(`[GTMPlugin] User ${identity} already has ${accountPerm} on account ${accountId}`);
            return {
              success: true,
              data: true,
              details: {
                found: true,
                foundPermission: accountPerm,
                expectedRole: role,
                identity,
                message: 'User already has account access'
              }
            };
          }
        }
        
        // User exists but needs higher permission - would need to update (not creating new)
        console.log(`[GTMPlugin] User ${identity} exists but may need higher permission`);
        return {
          success: true,
          data: true,
          details: {
            found: true,
            foundPermission: existingPermission.accountAccess?.permission || 'existing',
            expectedRole: role,
            identity,
            message: 'User already has some access. To upgrade permission, please update manually in GTM.',
            containerAccess: existingPermission.containerAccess?.map(c => ({
              containerId: c.containerId,
              permission: c.permission
            }))
          }
        };
      }

      // Determine account permission based on role
      // For container-level roles, grant 'user' account access + specific container access
      // For admin role at account level, grant 'admin' account access
      let accountPermission: GTMAccountPermission = 'user';
      let containerAccessList: GTMContainerAccess[] | undefined;
      
      if (containerId) {
        // Container-level access: map role to container permission
        const containerPermission = (role === 'admin' ? 'publish' : role) as GTMContainerPermission;
        containerAccessList = [{
          containerId,
          permission: containerPermission
        }];
      } else {
        // Account-level access
        accountPermission = role === 'admin' ? 'admin' : 'user';
      }

      // Create the user permission
      const newPermission = await createUserPermission(
        authResult,
        accountId,
        identity,
        accountPermission,
        containerAccessList
      );

      console.log(`[GTMPlugin] Successfully granted ${role} to ${identity} on ${containerId ? `container ${containerId}` : `account ${accountId}`}`);

      return {
        success: true,
        data: true,
        details: {
          found: true,
          foundPermission: containerId ? containerAccessList?.[0]?.permission : accountPermission,
          expectedRole: role,
          identity,
          message: 'Access granted successfully',
          containerAccess: newPermission.containerAccess?.map(c => ({
            containerId: c.containerId,
            permission: c.permission
          }))
        }
      };

    } catch (error) {
      console.error('[GTMPlugin] grantAccess error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('403') || errorMessage.includes('Permission denied')) {
        return {
          success: false,
          error: 'The OAuth token does not have permission to manage user permissions. The client needs to grant Admin access.',
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
          success: false,
          error: `Account ${target.split('/')[0]} was not found or is not accessible.`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('409') || errorMessage.includes('already exists')) {
        return {
          success: false,
          error: `User ${identity} already has an access permission on this account.`,
          details: { found: false }
        };
      }
      
      if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
        return {
          success: false,
          error: `Invalid request: ${errorMessage}. Please verify the email address and account ID are correct.`,
          details: { found: false }
        };
      }
      
      return {
        success: false,
        error: `Failed to grant access: ${errorMessage}`,
        details: { found: false }
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
      case 'GROUP_ACCESS': return GroupAccessAgencySchema; 
      case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; 
      default: return z.object({}); 
    }
  }

  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown> {
    switch (accessItemType) { 
      case 'NAMED_INVITE': return NamedInviteClientSchema; 
      case 'GROUP_ACCESS': return GroupAccessClientSchema; 
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
    return [
      { step: 1, title: 'Open GTM', description: 'Go to tagmanager.google.com', link: { url: 'https://tagmanager.google.com', label: 'Open GTM' } }, 
      { step: 2, title: 'Add User', description: `Add user with "${roleTemplate}" permission.` }
    ];
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode { 
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'ATTESTATION_ONLY'; 
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> { 
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' }; 
  }
}

export default new GTMPlugin();
export { GTMPlugin };
