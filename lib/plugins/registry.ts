/**
 * PAM Identity Hub - Plugin Registry
 * Manages registration and retrieval of platform plugins
 */

import { PlatformPlugin, AccessItemType, PluginManifest } from './types';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

class PluginRegistryClass {
  private plugins: Map<string, PlatformPlugin> = new Map();
  private initialized: boolean = false;

  /**
   * Register a plugin
   */
  register(plugin: PlatformPlugin): void {
    const key = plugin.manifest.platformKey;
    if (this.plugins.has(key)) {
      console.warn(`Plugin ${key} already registered, overwriting...`);
    }
    this.plugins.set(key, plugin);
    console.log(`Plugin registered: ${key} v${plugin.manifest.pluginVersion}`);
  }

  /**
   * Get a plugin by platform key
   */
  get(platformKey: string): PlatformPlugin | undefined {
    return this.plugins.get(platformKey);
  }

  /**
   * Get all registered plugins
   */
  getAll(): PlatformPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugin manifests (for catalog display)
   */
  getAllManifests(): PluginManifest[] {
    return this.getAll().map(p => p.manifest);
  }

  /**
   * Check if a plugin exists
   */
  has(platformKey: string): boolean {
    return this.plugins.has(platformKey);
  }

  /**
   * Get JSON Schema for agency config form
   */
  getAgencyConfigJsonSchema(platformKey: string, accessItemType: AccessItemType): Record<string, unknown> | null {
    const plugin = this.get(platformKey);
    if (!plugin) return null;
    
    const zodSchema = plugin.getAgencyConfigSchema(accessItemType);
    if (!zodSchema) return null;
    
    try {
      const jsonSchema = zodToJsonSchema(zodSchema as z.ZodType, {
        name: 'AgencyConfig',
        $refStrategy: 'none'
      }) as Record<string, unknown>;
      
      // Inline the definitions (dereference $ref)
      return this.inlineDefinitions(jsonSchema);
    } catch (e) {
      console.error(`Error converting agency config schema for ${platformKey}:`, e);
      return null;
    }
  }

  /**
   * Get JSON Schema for client target form
   */
  getClientTargetJsonSchema(platformKey: string, accessItemType: AccessItemType): Record<string, unknown> | null {
    const plugin = this.get(platformKey);
    if (!plugin) return null;
    
    const zodSchema = plugin.getClientTargetSchema(accessItemType);
    if (!zodSchema) return null;
    
    try {
      const jsonSchema = zodToJsonSchema(zodSchema as z.ZodType, {
        name: 'ClientTarget',
        $refStrategy: 'none'
      }) as Record<string, unknown>;
      
      // Inline the definitions (dereference $ref)
      return this.inlineDefinitions(jsonSchema);
    } catch (e) {
      console.error(`Error converting client target schema for ${platformKey}:`, e);
      return null;
    }
  }

  /**
   * Get JSON Schema for request options form
   */
  getRequestOptionsJsonSchema(platformKey: string, accessItemType: AccessItemType): Record<string, unknown> | null {
    const plugin = this.get(platformKey);
    if (!plugin || !plugin.getRequestOptionsSchema) return null;
    
    const zodSchema = plugin.getRequestOptionsSchema(accessItemType);
    if (!zodSchema) return null;
    
    try {
      const jsonSchema = zodToJsonSchema(zodSchema as z.ZodType, {
        name: 'RequestOptions',
        $refStrategy: 'none'
      }) as Record<string, unknown>;
      
      // Inline the definitions (dereference $ref)
      return this.inlineDefinitions(jsonSchema);
    } catch (e) {
      console.error(`Error converting request options schema for ${platformKey}:`, e);
      return null;
    }
  }

  /**
   * Helper to inline JSON Schema definitions (dereference $ref)
   */
  private inlineDefinitions(schema: Record<string, unknown>): Record<string, unknown> {
    const definitions = (schema.definitions || {}) as Record<string, unknown>;
    const $ref = schema.$ref as string | undefined;
    
    if ($ref && $ref.startsWith('#/definitions/')) {
      const defName = $ref.replace('#/definitions/', '');
      const inlined = { ...definitions[defName] } as Record<string, unknown>;
      
      // Copy over $schema if needed
      if (schema.$schema) {
        inlined.$schema = schema.$schema;
      }
      
      return inlined;
    }
    
    // Handle anyOf/oneOf with $refs
    if (schema.anyOf) {
      const anyOf = (schema.anyOf as Array<Record<string, unknown>>).map(item => {
        if (item.$ref) {
          const defName = (item.$ref as string).replace('#/definitions/', '');
          return definitions[defName] || item;
        }
        return item;
      });
      return { ...schema, anyOf, definitions: undefined };
    }
    
    if (schema.oneOf) {
      const oneOf = (schema.oneOf as Array<Record<string, unknown>>).map(item => {
        if (item.$ref) {
          const defName = (item.$ref as string).replace('#/definitions/', '');
          return definitions[defName] || item;
        }
        return item;
      });
      return { ...schema, oneOf, definitions: undefined };
    }
    
    return schema;
  }

  /**
   * Validate agency config using plugin
   */
  validateAgencyConfig(platformKey: string, accessItemType: AccessItemType, config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const plugin = this.get(platformKey);
    if (!plugin) {
      return { valid: false, errors: [`Plugin not found: ${platformKey}`] };
    }
    return plugin.validateAgencyConfig(accessItemType, config);
  }

  /**
   * Validate client target using plugin
   */
  validateClientTarget(platformKey: string, accessItemType: AccessItemType, target: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const plugin = this.get(platformKey);
    if (!plugin) {
      return { valid: false, errors: [`Plugin not found: ${platformKey}`] };
    }
    return plugin.validateClientTarget(accessItemType, target);
  }

  /**
   * Check if access item type is supported by platform
   */
  isAccessItemTypeSupported(platformKey: string, accessItemType: AccessItemType): boolean {
    const plugin = this.get(platformKey);
    if (!plugin) return false;
    
    // Handle both old and new manifest formats
    const types = plugin.manifest.supportedAccessItemTypes;
    if (!types || types.length === 0) return false;
    
    // Check if it's the new format (array of AccessItemTypeMetadata)
    if (typeof types[0] === 'object' && 'type' in types[0]) {
      return (types as any[]).some(t => t.type === accessItemType);
    }
    
    // Old format (array of AccessItemType strings)
    return (types as string[]).includes(accessItemType);
  }

  /**
   * Get supported access item types for a platform
   */
  getSupportedAccessItemTypes(platformKey: string): AccessItemType[] {
    const plugin = this.get(platformKey);
    if (!plugin) return [];
    
    const types = plugin.manifest.supportedAccessItemTypes;
    if (!types || types.length === 0) return [];
    
    // Check if it's the new format (array of AccessItemTypeMetadata)
    if (typeof types[0] === 'object' && 'type' in types[0]) {
      return (types as any[]).map(t => t.type);
    }
    
    // Old format (array of AccessItemType strings)
    return types as AccessItemType[];
  }

  /**
   * Get access item type metadata (new format)
   */
  getAccessItemTypeMetadata(platformKey: string, accessItemType: AccessItemType): any | null {
    const plugin = this.get(platformKey);
    if (!plugin) return null;
    
    const types = plugin.manifest.supportedAccessItemTypes;
    if (!types || types.length === 0) return null;
    
    // Check if it's the new format
    if (typeof types[0] === 'object' && 'type' in types[0]) {
      return (types as any[]).find(t => t.type === accessItemType) || null;
    }
    
    return null;
  }

  /**
   * Get all access item type metadata for a platform
   */
  getAllAccessItemTypeMetadata(platformKey: string): any[] {
    const plugin = this.get(platformKey);
    if (!plugin) return [];
    
    const types = plugin.manifest.supportedAccessItemTypes;
    if (!types || types.length === 0) return [];
    
    // Check if it's the new format
    if (typeof types[0] === 'object' && 'type' in types[0]) {
      return types as any[];
    }
    
    // Convert old format to basic metadata
    return (types as AccessItemType[]).map(type => ({
      type,
      label: type.replace(/_/g, ' '),
      description: '',
      icon: 'fas fa-cog',
      roleTemplates: []
    }));
  }

  /**
   * Get role templates for a platform and specific access item type
   */
  getRoleTemplates(platformKey: string, accessItemType?: AccessItemType): { key: string; label: string; description?: string }[] {
    const plugin = this.get(platformKey);
    if (!plugin) return [];
    
    // If access item type specified and using new format, get roles for that type
    if (accessItemType) {
      const metadata = this.getAccessItemTypeMetadata(platformKey, accessItemType);
      if (metadata && metadata.roleTemplates) {
        return metadata.roleTemplates;
      }
    }
    
    // Fall back to legacy format
    const manifest = plugin.manifest as any;
    if (manifest.supportedRoleTemplates) {
      return manifest.supportedRoleTemplates;
    }
    
    return [];
  }

  /**
   * Get security capabilities for a platform
   */
  getSecurityCapabilities(platformKey: string): any | null {
    const plugin = this.get(platformKey);
    if (!plugin) return null;
    return (plugin.manifest as any).securityCapabilities || null;
  }

  /**
   * Check if SHARED_ACCOUNT (PAM) is supported
   */
  isPamSupported(platformKey: string): boolean {
    return this.isAccessItemTypeSupported(platformKey, 'SHARED_ACCOUNT' as AccessItemType);
  }

  /**
   * Get PAM recommendation for a platform
   */
  getPamRecommendation(platformKey: string): { recommendation: string; rationale: string } | null {
    const security = this.getSecurityCapabilities(platformKey);
    if (!security) return null;
    
    return {
      recommendation: security.pamRecommendation || 'not_recommended',
      rationale: security.pamRationale || ''
    };
  }

  /**
   * Build client instructions
   */
  buildInstructions(platformKey: string, context: Parameters<PlatformPlugin['buildClientInstructions']>[0]): string | ReturnType<PlatformPlugin['buildClientInstructions']> {
    const plugin = this.get(platformKey);
    if (!plugin) return 'Instructions not available for this platform.';
    return plugin.buildClientInstructions(context);
  }

  /**
   * Get verification mode for access item type
   */
  getVerificationMode(platformKey: string, accessItemType: AccessItemType): string {
    const plugin = this.get(platformKey);
    if (!plugin) return 'ATTESTATION_ONLY';
    return plugin.getVerificationMode(accessItemType);
  }

  /**
   * Mark registry as initialized
   */
  setInitialized(): void {
    this.initialized = true;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get plugin count
   */
  count(): number {
    return this.plugins.size;
  }
}

// Singleton instance
export const PluginRegistry = new PluginRegistryClass();

// Helper to ensure plugins are loaded
export async function ensurePluginsLoaded(): Promise<void> {
  if (PluginRegistry.isInitialized()) return;
  
  // Dynamically import all plugins
  const pluginModules = await Promise.all([
    import('@/plugins/google-ads'),
    import('@/plugins/meta'),
    import('@/plugins/ga4'),
    import('@/plugins/google-search-console'),
    import('@/plugins/snowflake'),
    import('@/plugins/dv360'),
    import('@/plugins/trade-desk'),
    import('@/plugins/tiktok'),
    import('@/plugins/snapchat'),
    import('@/plugins/linkedin'),
    import('@/plugins/pinterest'),
    import('@/plugins/hubspot'),
    import('@/plugins/salesforce'),
    import('@/plugins/gtm'),
    import('@/plugins/ga-ua'),
  ]);

  for (const mod of pluginModules) {
    if (mod.default) {
      PluginRegistry.register(mod.default);
    }
  }

  PluginRegistry.setInitialized();
  console.log(`Plugin registry initialized with ${PluginRegistry.count()} plugins`);
}
