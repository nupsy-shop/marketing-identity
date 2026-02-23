/**
 * Modular Advertising Platform Plugin System
 * Plugin Manager
 * 
 * The PluginManager is responsible for:
 * - Registering and initializing plugins
 * - Managing plugin lifecycle
 * - Providing access to plugin instances
 * - Handling plugin dependencies
 */

import type { AdPlatformPlugin } from './plugin.interface';
import type { AppContext } from './types';

/**
 * Plugin Manager Class
 * Singleton pattern for managing all advertising platform plugins
 */
export class PluginManager {
  private plugins: Map<string, AdPlatformPlugin> = new Map();
  private initialized: boolean = false;
  private context: AppContext | null = null;

  /**
   * Set the application context
   * Must be called before registering plugins
   */
  setContext(context: AppContext): void {
    this.context = context;
  }

  /**
   * Register and initialize a plugin
   * @param plugin The plugin instance to register
   */
  async register(plugin: AdPlatformPlugin): Promise<void> {
    const key = plugin.name;
    
    if (this.plugins.has(key)) {
      console.warn(`[PluginManager] Plugin '${key}' already registered, overwriting...`);
      // Destroy existing plugin before overwriting
      const existing = this.plugins.get(key);
      if (existing?.destroy) {
        await existing.destroy();
      }
    }

    // Initialize the plugin with context
    if (this.context) {
      await plugin.initialize(this.context);
    }

    this.plugins.set(key, plugin);
    console.log(`[PluginManager] Plugin registered: ${key} v${plugin.manifest.pluginVersion}`);
  }

  /**
   * Unregister a plugin by name
   * @param name The plugin name to unregister
   */
  async unregister(name: string): Promise<boolean> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      console.warn(`[PluginManager] Plugin '${name}' not found`);
      return false;
    }

    // Call destroy hook if available
    if (plugin.destroy) {
      await plugin.destroy();
    }

    this.plugins.delete(name);
    console.log(`[PluginManager] Plugin unregistered: ${name}`);
    return true;
  }

  /**
   * Get a plugin by name
   * @param name The plugin name to retrieve
   */
  get(name: string): AdPlatformPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin exists
   * @param name The plugin name to check
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * List all registered plugin names
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all registered plugins
   */
  getAll(): AdPlatformPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugin manifests (for catalog display)
   */
  getAllManifests() {
    return this.getAll().map(p => p.manifest);
  }

  /**
   * Get plugin count
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark manager as initialized
   */
  setInitialized(): void {
    this.initialized = true;
  }

  /**
   * Get plugins by category
   * @param category The category to filter by
   */
  getByCategory(category: string): AdPlatformPlugin[] {
    return this.getAll().filter(p => p.manifest.category === category);
  }

  /**
   * Get plugins by tier
   * @param tier The tier level (1, 2, or 3)
   */
  getByTier(tier: 1 | 2 | 3): AdPlatformPlugin[] {
    return this.getAll().filter(p => p.manifest.tier === tier);
  }

  /**
   * Get client-facing plugins only
   */
  getClientFacing(): AdPlatformPlugin[] {
    return this.getAll().filter(p => p.manifest.clientFacing);
  }

  /**
   * Clear all plugins (useful for testing)
   */
  async clear(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        await plugin.destroy();
      }
    }
    this.plugins.clear();
    this.initialized = false;
    console.log('[PluginManager] All plugins cleared');
  }
}

// Export singleton instance
export const pluginManager = new PluginManager();
