/**
 * The Trade Desk Plugin - Full Implementation
 * Uses Trade Desk API for discovery. User management is manual.
 */
import { z } from 'zod';
import type { PlatformPlugin, PluginManifest, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext, AccessItemType, PluginOperationParams, VerifyResult, GrantResult, RevokeResult, OAuthStartResult, OAuthCallbackResult } from '../../lib/plugins/types';
import { validateProvisioningRequest, buildPluginError } from '../../lib/plugins/types';
import type { AdPlatformPlugin } from '../common/plugin.interface';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, DiscoverTargetsResult } from '../common/types';
import { TRADE_DESK_MANIFEST, SECURITY_CAPABILITIES } from './manifest';
import { PartnerDelegationAgencySchema, NamedInviteAgencySchema, SharedAccountAgencySchema } from './schemas/agency';
import { PartnerDelegationClientSchema, NamedInviteClientSchema, SharedAccountClientSchema } from './schemas/client';

const TTD_API = 'https://api.thetradedesk.com/v3';

class TradeDeskPlugin implements PlatformPlugin, AdPlatformPlugin {
  readonly name = 'trade-desk';
  readonly manifest: PluginManifest = TRADE_DESK_MANIFEST;
  private context: AppContext | null = null;
  async initialize(ctx: AppContext): Promise<void> { this.context = ctx; console.log(`[TradeDeskPlugin] Initialized v${this.manifest.pluginVersion}`); }
  async destroy(): Promise<void> { this.context = null; }

  async discoverTargets(auth: AuthResult): Promise<DiscoverTargetsResult> {
    try {
      const res = await fetch(`${TTD_API}/advertiser/query`, {
        method: 'POST', headers: { 'TTD-Auth': auth.accessToken!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ PageStartIndex: 0, PageSize: 100 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const targets = (data.Result || []).map((a: any) => ({ targetType: 'ADVERTISER', externalId: a.AdvertiserId, displayName: a.AdvertiserName || a.AdvertiserId, metadata: { partnerId: a.PartnerId, currencyCode: a.CurrencyCode } }));
      return { success: true, targets };
    } catch (e) { return { success: false, error: `Discovery failed: ${(e as Error).message}` }; }
  }

  async grantAccess(params: PluginOperationParams): Promise<GrantResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'The Trade Desk does not expose a public API for user access management. Manage users via: desk.thetradedesk.com > Partner/Advertiser Settings > Users.', details: { found: false } };
  }
  async verifyAccess(params: PluginOperationParams): Promise<VerifyResult> {
    const errors = validateProvisioningRequest(this.manifest, params);
    if (errors.length > 0) return { success: false, error: errors.join('; '), details: { found: false } };
    return { success: false, error: 'The Trade Desk does not expose a public API for verifying user access.', details: { found: false } };
  }
  async revokeAccess(params: PluginOperationParams): Promise<RevokeResult> {
    return { success: false, error: 'The Trade Desk does not expose a public API for revoking user access.' };
  }

  async authorize(p: AuthParams): Promise<AuthResult> { return { success: false, error: 'Use API key authentication' }; }
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
      case 'PARTNER_DELEGATION': return [{ step: 1, title: 'Open The Trade Desk', description: 'Go to desk.thetradedesk.com', link: { url: 'https://desk.thetradedesk.com', label: 'Open TTD' } }, { step: 2, title: 'Add Partner', description: `Add partner ID: ${(ctx.agencyConfig as any).partnerId}` }];
      case 'NAMED_INVITE': return [{ step: 1, title: 'Open The Trade Desk', description: 'Go to desk.thetradedesk.com' }, { step: 2, title: 'Settings > Users', description: `Invite user with "${ctx.roleTemplate}" role.` }];
      case 'SHARED_ACCOUNT': return [{ step: 1, title: 'Provide Credentials', description: 'Enter account email and password.' }];
      default: return [];
    }
  }
  getVerificationMode(t: AccessItemType): VerificationMode { return 'ATTESTATION_ONLY'; }
  async verifyGrant(ctx: VerificationContext): Promise<VerificationResult> { return { status: 'PENDING', mode: 'ATTESTATION_ONLY', message: 'Manual verification required' }; }
}

export default new TradeDeskPlugin();
export { TradeDeskPlugin };
