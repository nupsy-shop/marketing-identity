/**
 * HubSpot Plugin - Full Implementation
 * Uses HubSpot Settings API v3 for user management
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { HUBSPOT_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { inviteUser, findUserByEmail, removeUser, listUsers, getPortalInfo, listRoles } from './api/settings';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

class HubSpotPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'hubspot';
  readonly manifest: PluginManifest = HUBSPOT_MANIFEST;
  private context: AppContext | null = null;
  async initialize(context: AppContext): Promise<void> { this.context = context; console.log(`[HubSpotPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    if (!isProviderConfigured('hubspot')) throw new Error('HubSpot OAuth not configured. Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET.');
    const creds = getProviderCredentials('hubspot');
    const state = generateState();
    const scopes = context.scopes || ['crm.objects.contacts.read', 'settings.users.read', 'settings.users.write', 'settings.users.teams.read'];
    const params = new URLSearchParams({ client_id: creds.clientId, redirect_uri: context.redirectUri, scope: scopes.join(' '), state });
    return { authUrl: `https://app.hubspot.com/oauth/authorize?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const creds = getProviderCredentials('hubspot');
      const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: creds.clientId, client_secret: creds.clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(), scopes: data.scope?.split(' ') };
    } catch (e) { return { success: false, error: `HubSpot OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const portal = await getPortalInfo(auth.accessToken!);
      return { success: true, targets: [{ targetType: 'PORTAL', externalId: String(portal.portalId), displayName: `HubSpot Portal ${portal.portalId}`, metadata: portal }] };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, role, identity } = params;
    try {
      const existing = await findUserByEmail(auth.accessToken!, identity);
      if (existing) return { success: true, details: { found: true, alreadyExists: true, identity, binding: { userId: existing.id } } };
      const roles = await listRoles(auth.accessToken!);
      const matchedRole = roles.find(r => r.name.toLowerCase() === role.toLowerCase());
      const roleId = matchedRole?.id || '';
      console.log(`[HubSpotPlugin] Inviting ${identity} with role ${role} (roleId: ${roleId})`);
      const user = await inviteUser(auth.accessToken!, identity, roleId);
      return { success: true, details: { found: false, identity, binding: { userId: user.id, email: user.email } } };
    } catch (error) {
      const e = buildPluginError(error, 'hubspot', 'grant');
      if (e.isConflict) return { success: true, details: { found: true, alreadyExists: true, identity } };
      return { success: false, error: `Grant failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, identity } = params;
    try {
      const user = await findUserByEmail(auth.accessToken!, identity);
      if (!user) return { success: true, data: false, details: { found: false, identity } };
      return { success: true, data: true, details: { found: true, identity: user.email, binding: { userId: user.id, roleId: user.roleId, superAdmin: user.superAdmin } } };
    } catch (error) {
      const e = buildPluginError(error, 'hubspot', 'verify');
      return { success: false, error: `Verify failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };
    const { auth, identity } = params;
    try {
      const user = await findUserByEmail(auth.accessToken!, identity);
      if (!user) return { success: false, error: `User ${identity} not found in HubSpot portal` };
      console.log(`[HubSpotPlugin] Removing user ${user.id} (${identity})`);
      await removeUser(auth.accessToken!, user.id);
      return { success: true, details: { identity, bindingRemoved: user.id } };
    } catch (error) {
      const e = buildPluginError(error, 'hubspot', 'revoke');
      return { success: false, error: `Revoke failed: ${e.message}` };
    }
  }

  async authorize(params: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(currentToken: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, event: EventPayload): Promise<void> { }

  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult {
    const r = this.getAgencyConfigSchema(t).safeParse(c);
    if (r.success) { if (t === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (c as any).pamOwnership === 'AGENCY_OWNED' && !(c as any).pamConfirmation) return { valid: false, errors: ['PAM confirmation required.'] }; return { valid: true, errors: [] }; }
    return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult {
    const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open HubSpot', description: 'Go to app.hubspot.com', link: { url: 'https://app.hubspot.com', label: 'Open HubSpot' } }, { step: 2, title: 'Go to Settings > Users & Teams', description: 'Navigate to user management.' }, { step: 3, title: 'Invite User', description: `Invite agency email with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return (ctx.agencyConfig as any).pamOwnership === 'CLIENT_OWNED' ? [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }] : [{ step: 1, title: 'Agency-Managed', description: 'Agency will create identity.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'AUTO'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Verification pending' }; }
}

export default new HubSpotPlugin();
export { HubSpotPlugin };
