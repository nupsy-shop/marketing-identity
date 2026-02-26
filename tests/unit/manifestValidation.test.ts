import {
  isOwnershipModelAllowed,
  isIdentityStrategyAllowed,
  isAccessTypeAllowed,
  isVerificationModeSupported,
  validateConfigAgainstManifest,
  getRoleTemplatesForItemType,
  AccessItemType,
  PamOwnership,
  VerificationMode,
} from '@/lib/plugins/types';
import { GA4_MANIFEST } from '@/plugins/ga4/manifest';
import { META_MANIFEST } from '@/plugins/meta/manifest';

describe('isOwnershipModelAllowed', () => {
  it('GA4 allows CLIENT_OWNED', () => {
    expect(isOwnershipModelAllowed(GA4_MANIFEST, PamOwnership.CLIENT_OWNED)).toBe(true);
  });
  it('GA4 allows AGENCY_OWNED', () => {
    expect(isOwnershipModelAllowed(GA4_MANIFEST, PamOwnership.AGENCY_OWNED)).toBe(true);
  });
  it('rejects unknown ownership model', () => {
    expect(isOwnershipModelAllowed(GA4_MANIFEST, 'THIRD_PARTY' as any)).toBe(false);
  });
});

describe('isIdentityStrategyAllowed', () => {
  it('GA4 allows AGENCY_GROUP', () => {
    expect(isIdentityStrategyAllowed(GA4_MANIFEST, 'AGENCY_GROUP')).toBe(true);
  });
  it('GA4 allows INDIVIDUAL_USERS', () => {
    expect(isIdentityStrategyAllowed(GA4_MANIFEST, 'INDIVIDUAL_USERS')).toBe(true);
  });
  it('Meta does not allow CLIENT_DEDICATED', () => {
    expect(isIdentityStrategyAllowed(META_MANIFEST, 'CLIENT_DEDICATED')).toBe(false);
  });
});

describe('isAccessTypeAllowed', () => {
  it('GA4 allows NAMED_INVITE', () => {
    expect(isAccessTypeAllowed(GA4_MANIFEST, AccessItemType.NAMED_INVITE)).toBe(true);
  });
  it('GA4 does not allow PROXY_TOKEN', () => {
    expect(isAccessTypeAllowed(GA4_MANIFEST, AccessItemType.PROXY_TOKEN)).toBe(false);
  });
  it('Meta allows PARTNER_DELEGATION', () => {
    expect(isAccessTypeAllowed(META_MANIFEST, AccessItemType.PARTNER_DELEGATION)).toBe(true);
  });
});

describe('isVerificationModeSupported', () => {
  it('GA4 supports AUTO', () => {
    expect(isVerificationModeSupported(GA4_MANIFEST, VerificationMode.AUTO)).toBe(true);
  });
  it('GA4 supports EVIDENCE_REQUIRED', () => {
    expect(isVerificationModeSupported(GA4_MANIFEST, VerificationMode.EVIDENCE_REQUIRED)).toBe(true);
  });
  it('GA4 does not support ATTESTATION_ONLY', () => {
    expect(isVerificationModeSupported(GA4_MANIFEST, VerificationMode.ATTESTATION_ONLY)).toBe(false);
  });
});

describe('validateConfigAgainstManifest', () => {
  it('returns no errors for a fully valid config', () => {
    const errors = validateConfigAgainstManifest(GA4_MANIFEST, {
      accessItemType: AccessItemType.NAMED_INVITE,
      pamOwnership: PamOwnership.CLIENT_OWNED,
      identityStrategy: 'AGENCY_GROUP',
      verificationMode: VerificationMode.AUTO,
    });
    expect(errors).toEqual([]);
  });

  it('reports invalid access type', () => {
    const errors = validateConfigAgainstManifest(GA4_MANIFEST, {
      accessItemType: AccessItemType.PROXY_TOKEN,
    });
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('PROXY_TOKEN');
  });

  it('reports multiple invalid fields', () => {
    const errors = validateConfigAgainstManifest(GA4_MANIFEST, {
      accessItemType: AccessItemType.PROXY_TOKEN,
      verificationMode: VerificationMode.ATTESTATION_ONLY,
    });
    expect(errors.length).toBe(2);
  });

  it('skips validation for fields not provided', () => {
    const errors = validateConfigAgainstManifest(GA4_MANIFEST, {});
    expect(errors).toEqual([]);
  });
});

describe('getRoleTemplatesForItemType', () => {
  it('returns GA4 NAMED_INVITE role templates', () => {
    const roles = getRoleTemplatesForItemType(GA4_MANIFEST, AccessItemType.NAMED_INVITE);
    expect(roles.length).toBeGreaterThan(0);
    const keys = roles.map(r => r.key);
    expect(keys).toContain('editor');
    expect(keys).toContain('viewer');
  });

  it('returns empty array for unsupported item type', () => {
    const roles = getRoleTemplatesForItemType(GA4_MANIFEST, AccessItemType.PROXY_TOKEN);
    expect(roles).toEqual([]);
  });
});
