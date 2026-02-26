/**
 * Google Analytics Universal Analytics (GA-UA) Plugin - Full Implementation
 * Uses Google Analytics Management API v3 for user link management
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { GA_UA_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { listAccounts, listWebProperties, addAccountUserLink, findUserLink, deleteAccountUserLink, roleToPermissions } from './api/management';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

class GAUAPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'ga-ua';
  readonly manifest: PluginManifest = GA_UA_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[GAUAPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    if (!isProviderConfigured('google')) throw new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    const creds = getProviderCredentials('google');
    const state = generateState();
    const scopes = context.scopes || ['https://www.googleapis.com/auth/analytics.manage.users', 'https://www.googleapis.com/auth/analytics.readonly'];
    const params = new URLSearchParams({ client_id: creds.clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(' '), state, access_type: 'offline', prompt: 'consent' });
    return { authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const creds = getProviderCredentials('google');
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: creds.clientId, client_secret: creds.clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() };
    } catch (e) { return { success: false, error: `Google OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const accounts = await listAccounts(auth.accessToken!);
      const targets: any[] = [];
      for (const acct of accounts) {
        targets.push({ targetType: 'ACCOUNT', externalId: acct.id, displayName: acct.name, metadata: { created: acct.created } });
        try {
          const props = await listWebProperties(auth.accessToken!, acct.id);
          for (const prop of props) targets.push({ targetType: 'WEB_PROPERTY', externalId: prop.id, displayName: prop.name, parentExternalId: acct.id, metadata: { websiteUrl: prop.websiteUrl } });
        } catch (e) { console.warn(`[GAUAPlugin] Failed to list properties for ${acct.id}: ${(e as Error).message}`); }
      }
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, target, role, identity } = params;
    try {
      const existing = await findUserLink(auth.accessToken!, target, identity);
      if (existing) return { success: true, details: { found: true, alreadyExists: true, identity, binding: { linkId: existing.id, permissions: existing.permissions } } };
      const permissions = roleToPermissions(role);
      console.log(`[GAUAPlugin] Adding user link: ${identity} with ${permissions.join(',')} on account ${target}`);
      const link = await addAccountUserLink(auth.accessToken!, target, identity, permissions);
      return { success: true, details: { found: false, identity, binding: { linkId: link.id, permissions: link.permissions } } };
    } catch (error) {
      const e = buildPluginError(error, 'ga-ua', 'grant');
      if (e.isConflict) return { success: true, details: { found: true, alreadyExists: true, identity } };
      return { success: false, error: `Grant failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, target, role, identity } = params;
    try {
      const link = await findUserLink(auth.accessToken!, target, identity);
      if (!link) return { success: true, data: false, details: { found: false, identity, expectedRole: role } };
      const expectedPerms = roleToPermissions(role);
      const hasAll = expectedPerms.every(p => link.permissions.effective.includes(p));
      return { success: true, data: hasAll, details: { found: true, foundRoles: link.permissions.effective, expectedRole: role, identity: link.userRef.email, binding: { linkId: link.id } } };
    } catch (error) {
      const e = buildPluginError(error, 'ga-ua', 'verify');
      return { success: false, error: `Verify failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };
    const { auth, target, identity } = params;
    try {
      const link = await findUserLink(auth.accessToken!, target, identity);
      if (!link) return { success: false, error: `User link for ${identity} not found on account ${target}` };
      console.log(`[GAUAPlugin] Deleting user link ${link.id} for ${identity}`);
      await deleteAccountUserLink(auth.accessToken!, target, link.id);
      return { success: true, details: { identity, bindingRemoved: link.id, previousRoles: link.permissions.effective } };
    } catch (error) {
      const e = buildPluginError(error, 'ga-ua', 'revoke');
      return { success: false, error: `Revoke failed: ${e.message}` };
    }
  }

  async authorize(params: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }
  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult {
    const r = this.getAgencyConfigSchema(t).safeParse(c);
    if (r.success) return { valid: true, errors: [] };
    return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Google Analytics', description: 'Go to analytics.google.com', link: { url: 'https://analytics.google.com', label: 'Open GA' } }, { step: 2, title: 'Admin > User Management', description: `Add user with "${ctx.roleTemplate}" permissions.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter Google account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'AUTO'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Verification pending' }; }
}

export default new GAUAPlugin();
export { GAUAPlugin };
