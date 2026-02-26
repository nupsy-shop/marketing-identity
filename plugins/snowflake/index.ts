/**
 * Snowflake Plugin - Full Implementation
 * Uses Snowflake SQL REST API for role-based access management
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { SNOWFLAKE_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { grantRole, revokeRole, showGrantsToUser, listRoles, listDatabases, getCurrentContext, type SnowflakeConfig } from './api/sql';
import { generateState } from '../common/utils/auth';

function buildSfConfig(params: PluginOperationParams): SnowflakeConfig {
  return { accountUrl: params.options?.accountUrl as string || '', accessToken: params.auth.accessToken! };
}

class SnowflakePlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'snowflake';
  readonly manifest: PluginManifest = SNOWFLAKE_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[SnowflakePlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[]; accountUrl?: string }): Promise<OAuthStartResult> {
    const accountUrl = (context as any).accountUrl;
    if (!accountUrl) throw new Error('Snowflake accountUrl is required for OAuth (e.g. https://xy12345.snowflakecomputing.com)');
    const clientId = process.env.SNOWFLAKE_CLIENT_ID;
    if (!clientId || clientId.startsWith('PLACEHOLDER_')) throw new Error('Snowflake OAuth not configured. Set SNOWFLAKE_CLIENT_ID and SNOWFLAKE_CLIENT_SECRET.');
    const state = generateState();
    const scopes = context.scopes || ['session:role:PUBLIC'];
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: context.redirectUri, response_type: 'code', scope: scopes.join(' '), state });
    return { authUrl: `${accountUrl}/oauth/authorize?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string; accountUrl?: string }): Promise<OAuthCallbackResult> {
    try {
      const accountUrl = (context as any).accountUrl;
      if (!accountUrl) return { success: false, error: 'accountUrl required' };
      const clientId = process.env.SNOWFLAKE_CLIENT_ID!;
      const clientSecret = process.env.SNOWFLAKE_CLIENT_SECRET!;
      const res = await fetch(`${accountUrl}/oauth/token-request`, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
        body: new URLSearchParams({ grant_type: 'authorization_code', redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(), metadata: { accountUrl } };
    } catch (e) { return { success: false, error: `Snowflake OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const config: SnowflakeConfig = { accountUrl: (auth as any).accountUrl || (auth as any).metadata?.accountUrl || '', accessToken: auth.accessToken! };
      const ctx = await getCurrentContext(config);
      const databases = await listDatabases(config);
      const targets = [{ targetType: 'ACCOUNT', externalId: config.accountUrl, displayName: `Snowflake (${ctx.user}@${ctx.role})`, metadata: ctx }];
      for (const db of databases) targets.push({ targetType: 'DATABASE', externalId: db, displayName: db, metadata: {} });
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const config = buildSfConfig(params);
    const { role, identity } = params;
    try {
      const existingRoles = await showGrantsToUser(config, identity);
      if (existingRoles.map(r => r.toUpperCase()).includes(role.toUpperCase())) {
        return { success: true, details: { found: true, alreadyExists: true, identity, binding: { existingRoles } } };
      }
      console.log(`[SnowflakePlugin] GRANT ROLE "${role}" TO USER "${identity}"`);
      const result = await grantRole(config, role, identity);
      return { success: true, details: { found: false, identity, binding: { statementHandle: result.statementHandle } } };
    } catch (error) {
      const e = buildPluginError(error, 'snowflake', 'grant');
      return { success: false, error: `Grant failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    const config = buildSfConfig(params);
    const { role, identity } = params;
    try {
      const roles = await showGrantsToUser(config, identity);
      const hasRole = roles.map(r => r.toUpperCase()).includes(role.toUpperCase());
      return { success: true, data: hasRole, details: { found: hasRole, foundRoles: roles, expectedRole: role, identity } };
    } catch (error) {
      const e = buildPluginError(error, 'snowflake', 'verify');
      return { success: false, error: `Verify failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };
    const config = buildSfConfig(params);
    const { role, identity } = params;
    try {
      console.log(`[SnowflakePlugin] REVOKE ROLE "${role}" FROM USER "${identity}"`);
      const result = await revokeRole(config, role, identity);
      return { success: true, details: { identity, bindingRemoved: `ROLE:${role}`, previousRoles: [role] } };
    } catch (error) {
      const e = buildPluginError(error, 'snowflake', 'revoke');
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
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Snowflake', description: 'Go to your Snowflake account', link: { url: 'https://app.snowflake.com', label: 'Open Snowflake' } }, { step: 2, title: 'Grant Role', description: `Run: GRANT ROLE "${ctx.roleTemplate}" TO USER "<username>"` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter Snowflake username and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'SHARED_ACCOUNT' ? 'EVIDENCE_REQUIRED' : 'AUTO'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Verification pending' }; }
}

export default new SnowflakePlugin();
export { SnowflakePlugin };
