/**
 * Microsoft Ads (Bing Ads) Plugin - Full Implementation
 * Uses Microsoft Identity OAuth + Bing Ads Customer Management API.
 * Supports programmatic user invite/verify/revoke via SendUserInvitation, GetUsersInfo, DeleteUser.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin, OAuthCapablePlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { MICROSOFT_ADS_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';
import { generateState } from '../common/utils/auth';

const BING_API = 'https://clientcenter.api.bingads.microsoft.com/Api/CustomerManagement/v13';

const ROLE_MAP: Record<string, number> = {
  'super-admin': 41, 'standard-user': 100, 'advertiser-campaign-manager': 203, 'viewer': 16,
};

async function bingSoapRequest(action: string, accessToken: string, customerId: string, body: string): Promise<string> {
  const devToken = process.env.MICROSOFT_ADS_DEVELOPER_TOKEN || '';
  const envelope = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header>
<AuthenticationToken xmlns="https://bingads.microsoft.com/Customer/v13">${accessToken}</AuthenticationToken>
<DeveloperToken xmlns="https://bingads.microsoft.com/Customer/v13">${devToken}</DeveloperToken>
<CustomerId xmlns="https://bingads.microsoft.com/Customer/v13">${customerId}</CustomerId>
</s:Header><s:Body>${body}</s:Body></s:Envelope>`;
  const res = await fetch(BING_API, {
    method: 'POST', headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: action },
    body: envelope,
  });
  return res.text();
}

class MicrosoftAdsPlugin implements PlatformPlugin, AdPlatformPlugin, OAuthCapablePlugin {
  readonly name = 'microsoft-ads';
  readonly manifest: PluginManifest = MICROSOFT_ADS_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[MicrosoftAdsPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async startOAuth(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult> {
    const clientId = process.env.MICROSOFT_ADS_CLIENT_ID;
    if (!clientId || clientId.startsWith('PLACEHOLDER_')) throw new Error('Microsoft Ads OAuth not configured. Set MICROSOFT_ADS_CLIENT_ID and MICROSOFT_ADS_CLIENT_SECRET.');
    const state = generateState();
    const scopes = context.scopes || ['https://ads.microsoft.com/msads.manage', 'offline_access'];
    const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: context.redirectUri, scope: scopes.join(' '), state });
    return { authUrl: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`, state };
  }

  async handleOAuthCallback(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult> {
    try {
      const clientId = process.env.MICROSOFT_ADS_CLIENT_ID!;
      const clientSecret = process.env.MICROSOFT_ADS_CLIENT_SECRET!;
      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: context.redirectUri, code: context.code }),
      });
      if (!res.ok) return { success: false, error: `Token exchange failed: ${await res.text()}` };
      const data = await res.json();
      return { success: true, accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() };
    } catch (e) { return { success: false, error: `Microsoft OAuth error: ${(e as Error).message}` }; }
  }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const body = `<GetCustomersInfoRequest xmlns="https://bingads.microsoft.com/Customer/v13"><ApplicationScope>Advertiser</ApplicationScope><CustomerNameFilter></CustomerNameFilter><TopN>100</TopN></GetCustomersInfoRequest>`;
      const xml = await bingSoapRequest('GetCustomersInfo', auth.accessToken!, '', body);
      const customers: any[] = [];
      const matches = xml.match(/<CustomerInfo>.*?<\/CustomerInfo>/gs) || [];
      for (const m of matches) {
        const id = m.match(/<Id>(\d+)<\/Id>/)?.[1];
        const name = m.match(/<Name>([^<]+)<\/Name>/)?.[1];
        if (id) customers.push({ targetType: 'CUSTOMER', externalId: id, displayName: name || `Customer ${id}` });
      }
      return { success: true, targets: customers };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    if (params.accessItemType !== 'NAMED_INVITE') return { success: false, error: `Grant not supported for ${params.accessItemType}`, details: { found: false } };
    try {
      const roleId = ROLE_MAP[params.role.toLowerCase()] || ROLE_MAP['standard-user'];
      const body = `<SendUserInvitationRequest xmlns="https://bingads.microsoft.com/Customer/v13"><UserInvitation><Email>${params.identity}</Email><CustomerId>${params.target}</CustomerId><RoleId>${roleId}</RoleId></UserInvitation></SendUserInvitationRequest>`;
      const xml = await bingSoapRequest('SendUserInvitation', params.auth.accessToken!, params.target, body);
      if (xml.includes('UserInvitationId')) {
        const invId = xml.match(/<UserInvitationId>(\d+)<\/UserInvitationId>/)?.[1];
        return { success: true, details: { found: false, identity: params.identity, binding: { invitationId: invId } } };
      }
      if (xml.includes('already exists') || xml.includes('already has')) return { success: true, details: { found: true, alreadyExists: true, identity: params.identity } };
      return { success: false, error: `Invitation failed: ${xml.substring(0, 200)}`, details: { found: false } };
    } catch (error) {
      const e = buildPluginError(error, 'microsoft-ads', 'grant');
      return { success: false, error: `Grant failed: ${e.message}`, details: { found: false } };
    }
  }

  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    try {
      const body = `<GetUsersInfoRequest xmlns="https://bingads.microsoft.com/Customer/v13"><CustomerId>${params.target}</CustomerId><StatusFilter>Active</StatusFilter></GetUsersInfoRequest>`;
      const xml = await bingSoapRequest('GetUsersInfo', params.auth.accessToken!, params.target, body);
      const userInfos = xml.match(/<UserInfo>.*?<\/UserInfo>/gs) || [];
      for (const u of userInfos) {
        const email = u.match(/<UserName>([^<]+)<\/UserName>/)?.[1];
        if (email?.toLowerCase() === params.identity.toLowerCase()) {
          const userId = u.match(/<Id>(\d+)<\/Id>/)?.[1];
          return { success: true, data: true, details: { found: true, identity: email, binding: { userId } } };
        }
      }
      return { success: true, data: false, details: { found: false, identity: params.identity } };
    } catch (error) {
      const e = buildPluginError(error, 'microsoft-ads', 'verify');
      return { success: false, error: `Verify failed: ${e.message}`, details: { found: false } };
    }
  }

  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; ') };
    try {
      // First find the user ID
      const verifyResult = await this.verifyAccess(params);
      const userId = verifyResult.details?.binding?.userId;
      if (!userId) return { success: false, error: `User ${params.identity} not found in customer ${params.target}` };
      const body = `<DeleteUserRequest xmlns="https://bingads.microsoft.com/Customer/v13"><CustomerId>${params.target}</CustomerId><UserId>${userId}</UserId></DeleteUserRequest>`;
      await bingSoapRequest('DeleteUser', params.auth.accessToken!, params.target, body);
      return { success: true, details: { identity: params.identity, bindingRemoved: userId } };
    } catch (error) {
      const e = buildPluginError(error, 'microsoft-ads', 'revoke');
      return { success: false, error: `Revoke failed: ${e.message}` };
    }
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use startOAuth' }; }
  async refreshToken(t: string): Promise<AuthResult> { return { success: false, error: 'Not implemented' }; }
  async fetchAccounts(auth: AuthResult): Promise<Account[]> { return []; }
  async fetchReport(auth: AuthResult, q: ReportQuery): Promise<ReportResult> { return { headers: [], rows: [] }; }
  async sendEvent(auth: AuthResult, e: EventPayload): Promise<void> { }
  getAgencyConfigSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationAgencySchema; case 'NAMED_INVITE': return NamedInviteAgencySchema; case 'SHARED_ACCOUNT': return SharedAccountAgencySchema; default: return z.object({}); } }
  getClientTargetSchema(t: AccessItemType) { switch(t) { case 'PARTNER_DELEGATION': return PartnerDelegationClientSchema; case 'NAMED_INVITE': return NamedInviteClientSchema; case 'SHARED_ACCOUNT': return SharedAccountClientSchema; default: return z.object({}); } }
  validateAgencyConfig(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getAgencyConfigSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  validateClientTarget(t: AccessItemType, c: Record<string, unknown>): ValidationResult { const r = this.getClientTargetSchema(t).safeParse(c); return r.success ? { valid: true, errors: [] } : { valid: false, errors: r.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }; }
  buildClientInstructions(ctx: InstructionContext): InstructionStep[] {
    switch (ctx.accessItemType) {
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open Microsoft Advertising', description: 'Go to ads.microsoft.com', link: { url: 'https://ads.microsoft.com', label: 'Open Microsoft Ads' } }, { step: 2, title: 'Tools > Account access', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'PARTNER_DELEGATION': return [{ step: 1, title: 'Open Microsoft Advertising', description: 'Go to ads.microsoft.com' }, { step: 2, title: 'Accounts > Link to manager', description: `Link to manager account: ${(ctx.agencyConfig as any).managerId}` }];
      default: return [{ step: 1, title: 'Provide Credentials', description: 'Enter Microsoft account email and password.' }];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return t === 'NAMED_INVITE' ? 'AUTO' : 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: this.getVerificationMode(ctx.accessItemType), message: 'Verification pending' }; }
}

export default new MicrosoftAdsPlugin();
export { MicrosoftAdsPlugin };
