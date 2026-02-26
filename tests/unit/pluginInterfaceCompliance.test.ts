/**
 * Plugin Interface Compliance Tests
 *
 * Verifies that every plugin in the system:
 *   1. Exports a default instance with a valid manifest
 *   2. Implements grantAccess / verifyAccess / revokeAccess
 *   3. Uses validateProvisioningRequest consistently
 *   4. Returns standardised response shapes
 */

import { AccessItemType, PluginOperationParams, validateProvisioningRequest } from '@/lib/plugins/types';

// All 15 plugin keys
const PLUGIN_KEYS = [
  'ga4', 'gtm', 'google-ads', 'google-search-console',
  'meta', 'dv360', 'trade-desk', 'tiktok', 'snapchat',
  'linkedin', 'pinterest', 'hubspot', 'salesforce', 'snowflake', 'ga-ua',
];

// Dynamic imports for each plugin
function loadPlugin(key: string) {
  return require(`@/plugins/${key}/index`);
}

function loadManifest(key: string) {
  return require(`@/plugins/${key}/manifest`);
}

describe.each(PLUGIN_KEYS)('Plugin: %s', (pluginKey) => {
  let pluginModule: any;
  let manifestModule: any;
  let pluginInstance: any;
  let manifest: any;

  beforeAll(() => {
    pluginModule = loadPlugin(pluginKey);
    manifestModule = loadManifest(pluginKey);
    pluginInstance = pluginModule.default;
    // Manifest exported from the plugin instance or from the manifest file
    manifest = pluginInstance?.manifest || Object.values(manifestModule).find((v: any) => v?.platformKey);
  });

  // ── Manifest structure ────────────────────────────────────────────────
  it('exports a default plugin instance', () => {
    expect(pluginInstance).toBeDefined();
  });

  it('has a valid manifest with required fields', () => {
    expect(manifest).toBeDefined();
    expect(manifest.platformKey).toBe(pluginKey);
    expect(manifest.displayName).toBeTruthy();
    expect(manifest.pluginVersion).toBeTruthy();
    expect(manifest.category).toBeTruthy();
    expect(manifest.tier).toBeGreaterThanOrEqual(1);
    expect(manifest.tier).toBeLessThanOrEqual(3);
  });

  it('declares supportedAccessItemTypes array', () => {
    expect(Array.isArray(manifest.supportedAccessItemTypes)).toBe(true);
    expect(manifest.supportedAccessItemTypes.length).toBeGreaterThan(0);
  });

  it('declares allowedAccessTypes array', () => {
    expect(Array.isArray(manifest.allowedAccessTypes)).toBe(true);
    expect(manifest.allowedAccessTypes.length).toBeGreaterThan(0);
  });

  it('declares allowedOwnershipModels array', () => {
    expect(Array.isArray(manifest.allowedOwnershipModels)).toBe(true);
  });

  it('declares verificationModes array', () => {
    expect(Array.isArray(manifest.verificationModes)).toBe(true);
    expect(manifest.verificationModes.length).toBeGreaterThan(0);
  });

  it('has securityCapabilities', () => {
    expect(manifest.securityCapabilities).toBeDefined();
    expect(typeof manifest.securityCapabilities.pamRecommendation).toBe('string');
  });

  it('has automationCapabilities', () => {
    expect(manifest.automationCapabilities).toBeDefined();
    expect(typeof manifest.automationCapabilities.oauthSupported).toBe('boolean');
  });

  // ── Interface compliance ──────────────────────────────────────────────
  it('implements grantAccess method', () => {
    expect(typeof pluginInstance.grantAccess).toBe('function');
  });

  it('implements verifyAccess method', () => {
    expect(typeof pluginInstance.verifyAccess).toBe('function');
  });

  it('implements revokeAccess method', () => {
    expect(typeof pluginInstance.revokeAccess).toBe('function');
  });

  // ── Validation integration ────────────────────────────────────────────
  it('grantAccess rejects invalid params via validateProvisioningRequest', async () => {
    const result = await pluginInstance.grantAccess({
      auth: { accessToken: '' },
      target: '',
      role: '',
      identity: '',
      accessItemType: '' as AccessItemType,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('verifyAccess rejects invalid params via validateProvisioningRequest', async () => {
    const result = await pluginInstance.verifyAccess({
      auth: { accessToken: '' },
      target: '',
      role: '',
      identity: '',
      accessItemType: '' as AccessItemType,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('grantAccess rejects SHARED_ACCOUNT with appropriate error', async () => {
    const result = await pluginInstance.grantAccess({
      auth: { accessToken: 'tok' },
      target: 'resource/1',
      role: 'editor',
      identity: 'user@test.com',
      accessItemType: AccessItemType.SHARED_ACCOUNT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('SHARED_ACCOUNT');
  });

  // ── Response shape ────────────────────────────────────────────────────
  it('grantAccess returns { success, error? } shape', async () => {
    const firstAllowed = manifest.allowedAccessTypes.find(
      (t: string) => t !== 'SHARED_ACCOUNT',
    );
    if (!firstAllowed) return; // skip if only SHARED_ACCOUNT
    const result = await pluginInstance.grantAccess({
      auth: { accessToken: 'tok_test' },
      target: 'resource/1',
      role: 'editor',
      identity: 'user@test.com',
      accessItemType: firstAllowed,
    });
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  it('verifyAccess returns { success, error? } shape', async () => {
    const firstAllowed = manifest.allowedAccessTypes.find(
      (t: string) => t !== 'SHARED_ACCOUNT',
    );
    if (!firstAllowed) return;
    const result = await pluginInstance.verifyAccess({
      auth: { accessToken: 'tok_test' },
      target: 'resource/1',
      role: 'editor',
      identity: 'user@test.com',
      accessItemType: firstAllowed,
    });
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });

  it('revokeAccess returns { success, error? } shape', async () => {
    const firstAllowed = manifest.allowedAccessTypes.find(
      (t: string) => t !== 'SHARED_ACCOUNT',
    );
    if (!firstAllowed) return;
    const result = await pluginInstance.revokeAccess({
      auth: { accessToken: 'tok_test' },
      target: 'resource/1',
      role: 'editor',
      identity: 'user@test.com',
      accessItemType: firstAllowed,
    });
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(typeof result.error).toBe('string');
    }
  });
});
