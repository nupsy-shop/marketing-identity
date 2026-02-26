import {
  getEffectiveCapabilities,
  getAccessTypeCapability,
  pluginSupportsCapability,
  pluginSupportsCapabilityWithConfig,
  AccessItemType,
} from '@/lib/plugins/types';
import { GA4_MANIFEST } from '@/plugins/ga4/manifest';
import { META_MANIFEST } from '@/plugins/meta/manifest';

describe('getAccessTypeCapability (base, no config)', () => {
  it('returns NAMED_INVITE capabilities for GA4', () => {
    const caps = getAccessTypeCapability(GA4_MANIFEST, AccessItemType.NAMED_INVITE);
    expect(caps.canGrantAccess).toBe(true);
    expect(caps.canVerifyAccess).toBe(true);
    expect(caps.canRevokeAccess).toBe(true);
    expect(caps.requiresEvidenceUpload).toBe(false);
  });

  it('returns defaults for SHARED_ACCOUNT (conditional rules → returns default block)', () => {
    const caps = getAccessTypeCapability(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT);
    expect(caps.canGrantAccess).toBe(false);
    expect(caps.requiresEvidenceUpload).toBe(true);
  });

  it('returns default capabilities for an undefined access type', () => {
    const caps = getAccessTypeCapability(GA4_MANIFEST, AccessItemType.PROXY_TOKEN);
    expect(caps.canGrantAccess).toBe(false);
    expect(caps.canVerifyAccess).toBe(false);
    expect(caps.requiresEvidenceUpload).toBe(true);
  });
});

describe('getEffectiveCapabilities (with config context)', () => {
  // GA4 SHARED_ACCOUNT conditional rules
  it('GA4 SHARED_ACCOUNT defaults to manual flow without config', () => {
    const caps = getEffectiveCapabilities(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT);
    expect(caps.canGrantAccess).toBe(false);
    expect(caps.canVerifyAccess).toBe(false);
    expect(caps.requiresEvidenceUpload).toBe(true);
  });

  it('GA4 SHARED_ACCOUNT with AGENCY_OWNED + HUMAN_INTERACTIVE enables API flow', () => {
    const caps = getEffectiveCapabilities(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT, {
      pamOwnership: 'AGENCY_OWNED',
      identityPurpose: 'HUMAN_INTERACTIVE',
    });
    expect(caps.canGrantAccess).toBe(true);
    expect(caps.canVerifyAccess).toBe(true);
    expect(caps.canRevokeAccess).toBe(true);
    expect(caps.requiresEvidenceUpload).toBe(false);
  });

  it('GA4 SHARED_ACCOUNT with AGENCY_OWNED + INTEGRATION_NON_HUMAN enables API flow', () => {
    const caps = getEffectiveCapabilities(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT, {
      pamOwnership: 'AGENCY_OWNED',
      identityPurpose: 'INTEGRATION_NON_HUMAN',
    });
    expect(caps.canGrantAccess).toBe(true);
    expect(caps.canVerifyAccess).toBe(true);
  });

  it('GA4 SHARED_ACCOUNT with CLIENT_OWNED stays manual', () => {
    const caps = getEffectiveCapabilities(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT, {
      pamOwnership: 'CLIENT_OWNED',
    });
    expect(caps.canGrantAccess).toBe(false);
    expect(caps.canVerifyAccess).toBe(false);
    expect(caps.requiresEvidenceUpload).toBe(true);
  });

  // Meta has no conditional rules — simple capabilities
  it('Meta NAMED_INVITE supports grant and verify but not revoke', () => {
    const caps = getEffectiveCapabilities(META_MANIFEST, AccessItemType.NAMED_INVITE);
    expect(caps.canGrantAccess).toBe(true);
    expect(caps.canVerifyAccess).toBe(true);
    expect(caps.canRevokeAccess).toBe(false);
  });

  it('Meta SHARED_ACCOUNT requires evidence upload', () => {
    const caps = getEffectiveCapabilities(META_MANIFEST, AccessItemType.SHARED_ACCOUNT);
    expect(caps.canGrantAccess).toBe(false);
    expect(caps.requiresEvidenceUpload).toBe(true);
  });
});

describe('pluginSupportsCapability', () => {
  it('GA4 supports canGrantAccess for NAMED_INVITE', () => {
    expect(pluginSupportsCapability(GA4_MANIFEST, AccessItemType.NAMED_INVITE, 'canGrantAccess')).toBe(true);
  });

  it('GA4 does not support canGrantAccess for SHARED_ACCOUNT (base)', () => {
    expect(pluginSupportsCapability(GA4_MANIFEST, AccessItemType.SHARED_ACCOUNT, 'canGrantAccess')).toBe(false);
  });
});

describe('pluginSupportsCapabilityWithConfig', () => {
  it('GA4 supports canGrantAccess for SHARED_ACCOUNT when AGENCY_OWNED+HUMAN', () => {
    expect(
      pluginSupportsCapabilityWithConfig(
        GA4_MANIFEST,
        AccessItemType.SHARED_ACCOUNT,
        'canGrantAccess',
        { pamOwnership: 'AGENCY_OWNED', identityPurpose: 'HUMAN_INTERACTIVE' },
      ),
    ).toBe(true);
  });

  it('GA4 does NOT support canGrantAccess for SHARED_ACCOUNT when CLIENT_OWNED', () => {
    expect(
      pluginSupportsCapabilityWithConfig(
        GA4_MANIFEST,
        AccessItemType.SHARED_ACCOUNT,
        'canGrantAccess',
        { pamOwnership: 'CLIENT_OWNED' },
      ),
    ).toBe(false);
  });
});
