/**
 * Salesforce Plugin - Full Implementation
 * Uses Salesforce REST API for user/permission management
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { SALESFORCE_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { findUserByEmail, getUserPermissionSets, deactivateUser, getIdentity } from './api/rest';
import { getProviderCredentials, isProviderConfigured } from '../common/oauth-config';
import { generateState } from '../common/utils/auth';

class SalesforcePlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'salesforce';
  readonly manifest: PluginManifest = SALESFORCE_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[SalesforcePlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    if (!isProviderConfigured('salesforce')) throw new Error('Salesforce OAuth not configured. Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET.');
    const creds = getProviderCredentials('salesforce');
    const state = generateState();
    const scopes = context.scopes || ['api', 'refresh_token', 'full'];
    const params = new URLSearchParams({ client_id: creds.clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(' '), state });
    return { authUrl: `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const creds = getProviderCredentials('salesforce');
      const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: creds.clientId, client_secret: creds.clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, metadata: { instanceUrl: data.instance_url, tokenType: data.token_type } };
    } catch (e) { return { success: false, error: `Salesforce OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const instanceUrl = (auth as any).instanceUrl || (auth as any).metadata?.instanceUrl || 'https://login.salesforce.com';
      const identity = await getIdentity(instanceUrl, auth.accessToken!);
      return { success: true, targets: [{ targetType: 'ORG', externalId: identity.organization_id, displayName: `Salesforce Org (${identity.display_name})`, metadata: identity }] };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, identity, role } = params;
    const instanceUrl = params.options?.instanceUrl as string || 'https://login.salesforce.com';
    try {
      const user = await findUserByEmail(instanceUrl, auth.accessToken!, identity);
      if (user) {
        if (user.IsActive) return { success: true, details: { found: true, alreadyExists: true, identity, binding: { userId: user.Id } } };
        return { success: false, error: `User ${identity} exists but is deactivated. Reactivate via Salesforce Setup.`, details: { found: true } };
      }
      return { success: false, error: `User ${identity} not found in Salesforce org. Create the user via Setup > Users > New User, or use Salesforce's built-in user provisioning.`, details: { found: false } };
    } catch (error) {
      const e = buildPluginError(error, 'salesforce', 'grant');
      return { success: false, error: `Grant failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const { auth, identity, role } = params;
    const instanceUrl = params.options?.instanceUrl as string || 'https://login.salesforce.com';
    try {
      const user = await findUserByEmail(instanceUrl, auth.accessToken!, identity);
      if (!user) return { success: true, data: false, details: { found: false, identity } };
      const permSets = await getUserPermissionSets(instanceUrl, auth.accessToken!, user.Id);
      return { success: true, data: user.IsActive, details: { found: true, identity: user.Email, foundRoles: permSets.map(p => p.PermissionSet?.Label || p.PermissionSetId), binding: { userId: user.Id, isActive: user.IsActive, profileId: user.ProfileId } } };
    } catch (error) {
      const e = buildPluginError(error, 'salesforce', 'verify');
      return { success: false, error: `Verify failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };
    const { auth, identity } = params;
    const instanceUrl = params.options?.instanceUrl as string || 'https://login.salesforce.com';
    try {
      const user = await findUserByEmail(instanceUrl, auth.accessToken!, identity);
      if (!user) return { success: false, error: `User ${identity} not found` };
      console.log(`[SalesforcePlugin] Deactivating user ${user.Id} (${identity})`);
      await deactivateUser(instanceUrl, auth.accessToken!, user.Id);
      return { success: true, details: { identity, bindingRemoved: user.Id } };
    } catch (error) {
      const e = buildPluginError(error, 'salesforce', 'revoke');
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
    if (r.success) { if (t === 'SHARED_ACCOUNT' && SECURITY_CAPABILITIES.pamRecommendation === 'not_recommended' && (c as any).pamOwnership === 'AGENCY_OWNED' && !(c as any).pamConfirmation) return { valid: false, errors: ['PAM confirmation required.'] }; return { valid: true, errors: [] }; }
    return { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) };
  }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Salesforce Setup', description: 'Go to Setup > Users', link: { url: 'https://login.salesforce.com', label: 'Open Salesforce' } }, { step: 2, title: 'Create User', description: `Create user with email and assign "${ctx.roleTemplate}" profile.` }];
      case 'SHARED_ACCOUNT': return (ctx.agencyConfig as any).pamOwnership === 'CLIENT_OWNED' ? [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }] : [{ step: 1, title: 'Agency-Managed', description: 'Agency will create identity.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'AUTO'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Verification pending' }; }
}

export default new SalesforcePlugin();
export { SalesforcePlugin };
