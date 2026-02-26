/**
 * Meta Business Manager Platform Plugin
 *
 * Full implementation with OAuth, target discovery, and access provisioning
 * via the Meta Graph API v21.0.
 */

import { z } from 'zod';
import type {
  PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult,
  InstructionContext, InstructionStep, VerificationContext, AccessItemType,
  PluginOperationParams, VerifyResult, GrantResult, RevokeResult,
  OAuthStartResult, OAuthCallbackResult,
} from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { META_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { ROLE_MAPPING } from './types';
import {
  listBusinesses, listBusinessAdAccounts, listUserAdAccounts,
  listAssignedUsers, assignUserToAdAccount, removeUserFromAdAccount,
  listBusinessUsers, inviteUserToBusiness, getTokenUser,
  roleToTasks,
} from './api/graph';
import {
  getPlatformCredentials, buildAuthorizationUrl, exchangeCodeForTokens,
} from '../common/oauth-config';
import { generateState, buildAuthorizationUrl as buildAuthUrl } from '../common/utils/auth';
import { PlatformOAuthError } from '../../lib/oauthProviders';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isMetaOAuthConfigured(): boolean {
  const id = process.env.META_CLIENT_ID;
  const secret = process.env.META_CLIENT_SECRET;
  return !!id && !id.startsWith('PLACEHOLDER_') && !!secret && !secret.startsWith('PLACEHOLDER_');
}

// ─── Plugin ─────────────────────────────────────────────────────────────────────

class MetaPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'meta';
  readonly manifest: PluginManifest = META_MANIFEST;
  private context: AppContext | null = null;

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    console.log(`[MetaPlugin] Initialized v${this.manifest.pluginVersion}`);
  }
  async destroy(): Promise<void> { this.context = null; }

  // ═══════════════════════════════════════════════════════════════════════════════
  // OAuth (OAuthCapablePlugin)
  // ═══════════════════════════════════════════════════════════════════════════════

  async startOAuth(context: { redirectUri: string; scopes?: string[]; scope?: string }): Promise<OAuthStartResult> {
    if (!isMetaOAuthConfigured()) {
      throw new PlatformOAuthError('meta', 'Meta OAuth is not configured. Set META_CLIENT_ID and META_CLIENT_SECRET.', 'https://developers.facebook.com/');
    }

    const clientId = process.env.META_CLIENT_ID!;
    const stateMetadata = { platformKey: 'meta', scope: context.scope || 'AGENCY' };
    const metadataStr = Buffer.from(JSON.stringify(stateMetadata)).toString('base64url');
    const randomPart = generateState();
    const state = `${randomPart}.${metadataStr}`;

    const scopes = context.scopes || ['ads_management', 'ads_read', 'business_management'];
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: context.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state,
    });

    return {
      authUrl: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
      state,
    };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    if (!isMetaOAuthConfigured()) {
      return { success: false, error: 'Meta OAuth not configured' };
    }

    const clientId = process.env.META_CLIENT_ID!;
    const clientSecret = process.env.META_CLIENT_SECRET!;

    try {
      // Exchange code for short-lived token
      const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      tokenUrl.searchParams.set('client_id', clientId);
      tokenUrl.searchParams.set('client_secret', clientSecret);
      tokenUrl.searchParams.set('redirect_uri', context.redirectUri);
      tokenUrl.searchParams.set('code', context.code);

      const tokenRes = await fetch(tokenUrl.toString());
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        return { success: false, error: `Token exchange failed: ${errText}` };
      }
      const tokenData = await tokenRes.json();

      // Exchange short-lived token for long-lived token
      const longUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
      longUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longUrl.searchParams.set('client_id', clientId);
      longUrl.searchParams.set('client_secret', clientSecret);
      longUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

      const longRes = await fetch(longUrl.toString());
      let accessToken = tokenData.access_token;
      let expiresIn = tokenData.expires_in;

      if (longRes.ok) {
        const longData = await longRes.json();
        accessToken = longData.access_token || accessToken;
        expiresIn = longData.expires_in || expiresIn;
      }

      return {
        success: true,
        accessToken,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
        tokenType: 'Bearer',
        scopes: ['ads_management', 'ads_read', 'business_management'],
      };
    } catch (error) {
      return { success: false, error: `Meta OAuth callback error: ${(error as Error).message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Target Discovery
  // ═══════════════════════════════════════════════════════════════════════════════

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const businesses = await listBusinesses(auth);
      const targets: DiscoverTargetsResult['targets'] = [];

      // Add businesses
      for (const biz of businesses) {
        targets!.push({
          targetType: 'BUSINESS',
          externalId: biz.id,
          displayName: biz.name,
          metadata: { created_time: biz.created_time },
        });

        // Add their ad accounts
        try {
          const accounts = await listBusinessAdAccounts(auth, biz.id);
          for (const acct of accounts) {
            targets!.push({
              targetType: 'AD_ACCOUNT',
              externalId: acct.id,
              displayName: acct.name || acct.account_id,
              parentExternalId: biz.id,
              metadata: { account_id: acct.account_id, currency: acct.currency, account_status: acct.account_status },
            });
          }
        } catch (e) {
          console.warn(`[MetaPlugin] Failed to list ad accounts for business ${biz.id}:`, (e as Error).message);
        }
      }

      // Fallback: user-level ad accounts
      if (targets!.length === 0 || businesses.length === 0) {
        try {
          const userAccounts = await listUserAdAccounts(auth);
          for (const acct of userAccounts) {
            targets!.push({
              targetType: 'AD_ACCOUNT',
              externalId: acct.id,
              displayName: acct.name || acct.account_id,
              metadata: { account_id: acct.account_id, currency: acct.currency, account_status: acct.account_status },
            });
          }
        } catch (e) {
          console.warn('[MetaPlugin] Failed to list user ad accounts:', (e as Error).message);
        }
      }

      console.log(`[MetaPlugin] Discovered ${targets!.length} targets (${businesses.length} businesses)`);
      return { success: true, targets };
    } catch (error) {
      return { success: false, error: `Target discovery failed: ${(error as Error).message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Access Provisioning (AccessProvisioningPlugin)
  // ═══════════════════════════════════════════════════════════════════════════════

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };

    const { auth, target, role, identity, accessItemType } = params;
    const authResult: AuthResult = { success: true, accessToken: auth.accessToken, tokenType: auth.tokenType || 'Bearer' };

    try {
      if (accessItemType === 'PARTNER_DELEGATION') {
        // Partner delegation: invite user to business as partner
        // target = business ID, identity = email or partner BM ID
        const businessId = target;
        console.log(`[MetaPlugin] Inviting ${identity} to business ${businessId} with role ${role}`);
        const result = await inviteUserToBusiness(authResult, businessId, identity, role);
        return {
          success: true,
          details: { found: false, identity, binding: { businessId, inviteResult: result } },
        };
      }

      if (accessItemType === 'NAMED_INVITE') {
        // Named invite: assign user to ad account
        // target = ad account ID (act_xxx), identity = user ID from Meta
        const tasks = roleToTasks(role);
        console.log(`[MetaPlugin] Assigning ${identity} to ad account ${target} with tasks ${tasks.join(',')}`);

        // Try to find user ID in the business first
        let userId = identity;
        const businessId = params.options?.businessId as string;
        if (businessId && identity.includes('@')) {
          // Identity is an email — resolve to a Meta user ID
          try {
            const users = await listBusinessUsers(authResult, businessId);
            const match = users.find(u => u.email?.toLowerCase() === identity.toLowerCase());
            if (match) {
              userId = match.id;
            } else {
              // Invite user first, then assign
              console.log(`[MetaPlugin] User ${identity} not found in business ${businessId}, inviting first...`);
              await inviteUserToBusiness(authResult, businessId, identity, role);
              return {
                success: true,
                details: { found: false, alreadyExists: false, identity,
                  binding: { note: 'Business invite sent. User must accept before ad account assignment.' } },
              };
            }
          } catch (e) {
            console.warn(`[MetaPlugin] Could not resolve email to user ID: ${(e as Error).message}`);
          }
        }

        const result = await assignUserToAdAccount(authResult, target, userId, tasks);
        return {
          success: true,
          details: { found: false, alreadyExists: false, identity,
            binding: { adAccountId: target, userId, tasks, assignResult: result } },
        };
      }

      return { success: false, error: `Unsupported access type for grant: ${accessItemType}`, details: { found: false } };
    } catch (error) {
      const e = buildPluginError(error, 'meta', 'grant');
      if (e.isPermissionDenied) return { success: false, error: `Permission denied: ${e.message}`, details: { found: false } };
      if (e.isConflict) return { success: true, details: { found: true, alreadyExists: true, identity } };
      return { success: false, error: `Grant access failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };

    const { auth, target, role, identity, accessItemType } = params;
    const authResult: AuthResult = { success: true, accessToken: auth.accessToken, tokenType: auth.tokenType || 'Bearer' };

    try {
      if (accessItemType === 'NAMED_INVITE' || accessItemType === 'PARTNER_DELEGATION') {
        // Check assigned users on the ad account
        const adAccountId = target;
        console.log(`[MetaPlugin] Verifying access for ${identity} on ${adAccountId}`);
        const users = await listAssignedUsers(authResult, adAccountId);

        // Match by user ID or email
        const match = users.find(u =>
          u.id === identity ||
          u.email?.toLowerCase() === identity.toLowerCase() ||
          u.name?.toLowerCase() === identity.toLowerCase()
        );

        if (!match) {
          return {
            success: true, data: false,
            details: { found: false, identity, expectedRole: role },
          };
        }

        const expectedTasks = roleToTasks(role);
        const hasTasks = expectedTasks.every(t => match.tasks?.includes(t));

        return {
          success: true, data: hasTasks,
          details: {
            found: true,
            foundRoles: match.tasks || [],
            expectedRole: role,
            identity: match.email || match.id,
            binding: { userId: match.id, name: match.name, tasks: match.tasks },
          },
        };
      }

      return { success: false, error: `Unsupported access type for verify: ${accessItemType}`, details: { found: false } };
    } catch (error) {
      const e = buildPluginError(error, 'meta', 'verify');
      if (e.isPermissionDenied) return { success: false, error: `Permission denied: ${e.message}`, details: { found: false } };
      if (e.isNotFound) return { success: false, error: `Ad account not found: ${e.message}`, details: { found: false } };
      return { success: false, error: `Verify access failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };

    const { auth, target, identity, accessItemType } = params;
    const authResult: AuthResult = { success: true, accessToken: auth.accessToken, tokenType: auth.tokenType || 'Bearer' };

    try {
      if (accessItemType === 'NAMED_INVITE') {
        // First find the user's ID if we have an email
        let userId = identity;
        const users = await listAssignedUsers(authResult, target);
        const match = users.find(u =>
          u.id === identity || u.email?.toLowerCase() === identity.toLowerCase()
        );
        if (match) userId = match.id;

        const previousTasks = match?.tasks || [];

        console.log(`[MetaPlugin] Revoking access for user ${userId} on ad account ${target}`);
        await removeUserFromAdAccount(authResult, target, userId);

        return {
          success: true,
          details: { identity, bindingRemoved: `${target}/assigned_users/${userId}`, previousRoles: previousTasks },
        };
      }

      return { success: false, error: `Revocation not supported for ${accessItemType}. Remove access manually via Business Settings.` };
    } catch (error) {
      const e = buildPluginError(error, 'meta', 'revoke');
      if (e.isPermissionDenied) return { success: false, error: `Permission denied: ${e.message}` };
      if (e.isNotFound) return { success: false, error: `User or account not found: ${e.message}` };
      return { success: false, error: `Revoke access failed: ${e.message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Legacy Interface (AdPlatformPlugin)
  // ═══════════════════════════════════════════════════════════════════════════════

  async authorize(params: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth / handleOAuthCallback' }; }
  async refreshToken(currentToken: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Schema / Validation / Instructions
  // ═══════════════════════════════════════════════════════════════════════════════

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
        if (SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && pamConfig.pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          return { valid: false, errors: ['PAM confirmation required for Meta.'] };
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
      case 'PARTNER_DELEGATION': {
        const bmId = (agencyConfig as { businessManagerId?: string }).businessManagerId;
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click gear icon, select "Business Settings".' },
          { step: 3, title: 'Navigate to Partners', description: 'Click "Partners" under "Users".' },
          { step: 4, title: 'Add Partner', description: `Click "Add" and enter Business Manager ID: ${bmId}` },
          { step: 5, title: 'Assign Assets', description: 'Select ad accounts, pages, and pixels to share.' },
        ];
      }
      case 'NAMED_INVITE':
        return [
          { step: 1, title: 'Open Meta Business Suite', description: 'Go to business.facebook.com', link: { url: 'https://business.facebook.com', label: 'Open Meta Business Suite' } },
          { step: 2, title: 'Go to Business Settings', description: 'Click gear icon, select "Business Settings".' },
          { step: 3, title: 'Navigate to People', description: 'Click "People" under "Users".' },
          { step: 4, title: 'Add Person', description: 'Click "Add" and enter agency email.' },
          { step: 5, title: 'Set Role', description: `Set role to "${roleTemplate}" and assign assets.` },
        ];
      case 'SHARED_ACCOUNT': {
        const pamConfig = agencyConfig as { pamOwnership?: string };
        if (pamConfig.pamOwnership === 'CLIENT_OWNED') {
          return [
            { step: 1, title: 'Provide Credentials', description: 'Enter shared account email and password.' },
            { step: 2, title: 'Enable 2FA', description: 'Enable two-factor authentication.' },
            { step: 3, title: 'Credentials Stored', description: 'Credentials encrypted in PAM vault.' },
          ];
        }
        return [
          { step: 1, title: 'Agency-Managed Access', description: 'Agency will create dedicated identity.' },
          { step: 2, title: 'Grant Admin Access', description: 'Grant access to agency-managed identity.' },
        ];
      }
      default: return [];
    }
  }

  getVerificationMode(accessItemType: AccessItemType): VerificationMode {
    return accessItemType === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'AUTO';
  }

  async verifyGrant(context: VerificationContext): Promise<VerificationResult> {
    return { status: 'PENDING', mode: this.getVerificationMode(context.accessItemType), message: 'Manual verification required' };
  }
}

export default new MetaPlugin();
export { MetaPlugin };
