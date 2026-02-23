/**
 * Modular Advertising Platform Plugin System
 * Plugin Manifest Types
 * 
 * Each plugin exposes metadata through a manifest that describes:
 * - Plugin identity and version
 * - Supported capabilities
 * - Access patterns and roles
 * - Security features
 */

import type { AccessItemType, RoleTemplate, SecurityCapabilities, AutomationCapabilities } from '../../lib/plugins/types';

/**
 * Access Item Type Metadata
 * Describes a type of access that can be granted through this plugin
 */
export interface AccessItemTypeMetadata {
  type: AccessItemType;
  label: string;
  description: string;
  icon: string;
  roleTemplates: RoleTemplate[];
}

/**
 * Plugin Manifest Interface
 * Comprehensive metadata describing plugin capabilities
 */
export interface PluginManifest {
  // ─── Identity ──────────────────────────────────────────────────────────────
  
  /** Unique platform key (e.g., 'ga4', 'meta', 'google-ads') */
  platformKey: string;
  
  /** Human-readable display name */
  displayName: string;
  
  /** Plugin version (semver) */
  pluginVersion: string;

  // ─── Categorization ────────────────────────────────────────────────────────
  
  /** Platform category */
  category: 'Paid Media' | 'Analytics' | 'Martech' | 'Data' | 'CRM' | 'Tag Management' | 'Ecommerce' | 'Social' | 'SEO' | 'Data Warehouse' | 'E-commerce';
  
  /** Brief description of the platform */
  description: string;
  
  /** Tier level (1 = core, 2 = extended, 3 = specialized) */
  tier: 1 | 2 | 3;
  
  /** Whether this platform is client-facing */
  clientFacing: boolean;

  // ─── Visual ────────────────────────────────────────────────────────────────
  
  /** Font Awesome icon class for fallback */
  icon: string;
  
  /** Path to SVG logo (e.g., '/logos/ga4.svg') */
  logoPath?: string;
  
  /** Primary brand color (hex) */
  brandColor?: string;

  // ─── Capabilities ──────────────────────────────────────────────────────────
  
  /** Supported access item types with their metadata */
  supportedAccessItemTypes: AccessItemTypeMetadata[];
  
  /** Security capabilities including PAM governance */
  securityCapabilities: SecurityCapabilities;
  
  /** Automation capabilities */
  automationCapabilities: AutomationCapabilities;

  // ─── Feature Flags ─────────────────────────────────────────────────────────
  
  /** Whether reporting is supported */
  supportsReporting?: boolean;
  
  /** Whether event upload is supported */
  supportsEventUpload?: boolean;
  
  /** Whether webhooks are supported */
  supportsWebhooks?: boolean;
  
  /** OAuth scopes required */
  scopes?: string[];
}

/**
 * Helper function to check if a manifest supports a specific access item type
 */
export function supportsAccessItemType(manifest: PluginManifest, type: AccessItemType): boolean {
  return manifest.supportedAccessItemTypes.some(item => item.type === type);
}

/**
 * Helper function to get role templates for a specific access item type
 */
export function getRoleTemplatesForType(manifest: PluginManifest, type: AccessItemType): RoleTemplate[] {
  const itemType = manifest.supportedAccessItemTypes.find(item => item.type === type);
  return itemType?.roleTemplates || [];
}

/**
 * Helper function to check if PAM (Shared Account) is supported
 */
export function supportsPam(manifest: PluginManifest): boolean {
  return supportsAccessItemType(manifest, 'SHARED_ACCOUNT' as AccessItemType);
}
