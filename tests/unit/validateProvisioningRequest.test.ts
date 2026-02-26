import {
  validateProvisioningRequest,
  AccessItemType,
  PluginManifest,
  PluginOperationParams,
} from '@/lib/plugins/types';
import { GA4_MANIFEST } from '@/plugins/ga4/manifest';
import { META_MANIFEST } from '@/plugins/meta/manifest';

// Helper to build valid params
function validParams(overrides: Partial<PluginOperationParams> = {}): PluginOperationParams {
  return {
    auth: { accessToken: 'tok_abc' },
    target: 'properties/123',
    role: 'editor',
    identity: 'user@example.com',
    accessItemType: AccessItemType.NAMED_INVITE,
    ...overrides,
  };
}

describe('validateProvisioningRequest', () => {
  // ── Happy path ─────────────────────────────────────────────────────────
  it('returns no errors for a valid NAMED_INVITE request against GA4', () => {
    const errors = validateProvisioningRequest(GA4_MANIFEST, validParams());
    expect(errors).toEqual([]);
  });

  it('returns no errors for a valid GROUP_ACCESS request against GA4', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ accessItemType: AccessItemType.GROUP_ACCESS }),
    );
    expect(errors).toEqual([]);
  });

  it('returns no errors for PARTNER_DELEGATION against Meta', () => {
    const errors = validateProvisioningRequest(
      META_MANIFEST,
      validParams({ accessItemType: AccessItemType.PARTNER_DELEGATION }),
    );
    expect(errors).toEqual([]);
  });

  // ── Missing required fields ────────────────────────────────────────────
  it('reports missing accessToken', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ auth: { accessToken: '' } }),
    );
    expect(errors).toContain('OAuth access token is required');
  });

  it('reports missing target', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ target: '' }),
    );
    expect(errors).toContain('Target resource identifier is required');
  });

  it('reports missing role', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ role: '' }),
    );
    expect(errors).toContain('Role is required');
  });

  it('reports missing identity', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ identity: '' }),
    );
    expect(errors).toContain('Identity (email) is required');
  });

  it('reports missing accessItemType', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ accessItemType: '' as AccessItemType }),
    );
    expect(errors).toContain('Access item type is required');
  });

  it('reports multiple missing fields at once', () => {
    const errors = validateProvisioningRequest(GA4_MANIFEST, {
      auth: { accessToken: '' },
      target: '',
      role: '',
      identity: '',
      accessItemType: '' as AccessItemType,
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });

  // ── SHARED_ACCOUNT rejection ───────────────────────────────────────────
  it('rejects SHARED_ACCOUNT access type', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ accessItemType: AccessItemType.SHARED_ACCOUNT }),
    );
    expect(errors).toContain(
      'SHARED_ACCOUNT access cannot be granted/verified via API. Use evidence upload flow instead.',
    );
  });

  // ── Unsupported access type ────────────────────────────────────────────
  it('rejects an access type not in allowedAccessTypes', () => {
    // GA4 does not support PROXY_TOKEN
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ accessItemType: AccessItemType.PROXY_TOKEN }),
    );
    expect(errors.some(e => e.includes('not supported by'))).toBe(true);
  });

  it('rejects PARTNER_DELEGATION against GA4 (not supported)', () => {
    const errors = validateProvisioningRequest(
      GA4_MANIFEST,
      validParams({ accessItemType: AccessItemType.PARTNER_DELEGATION }),
    );
    expect(errors.some(e => e.includes('not supported by'))).toBe(true);
  });
});
