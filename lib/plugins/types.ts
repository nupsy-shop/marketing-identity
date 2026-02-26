/**
 * PAM Identity Hub - Platform Plugin System
 * Core Types and Interfaces
 */

import { z } from 'zod';

// ─── Core Enums ────────────────────────────────────────────────────────────────

export enum AccessItemType {
  NAMED_INVITE = 'NAMED_INVITE',
  PARTNER_DELEGATION = 'PARTNER_DELEGATION',
  GROUP_ACCESS = 'GROUP_ACCESS',
  PROXY_TOKEN = 'PROXY_TOKEN',
  SHARED_ACCOUNT = 'SHARED_ACCOUNT'
}

// PAM Recommendation levels
export enum PamRecommendation {
  RECOMMENDED = 'recommended',
  NOT_RECOMMENDED = 'not_recommended',
  BREAK_GLASS_ONLY = 'break_glass_only'
}

export enum IdentityPurpose {
  HUMAN_INTERACTIVE = 'HUMAN_INTERACTIVE',
  INTEGRATION_NON_HUMAN = 'INTEGRATION_NON_HUMAN'
}

export enum HumanIdentityStrategy {
  AGENCY_GROUP = 'AGENCY_GROUP',
  INDIVIDUAL_USERS = 'INDIVIDUAL_USERS',
  CLIENT_DEDICATED = 'CLIENT_DEDICATED'
}

export enum PamOwnership {
  CLIENT_OWNED = 'CLIENT_OWNED',
  AGENCY_OWNED = 'AGENCY_OWNED'
}

export enum PamIdentityStrategy {
  STATIC = 'STATIC',
  CLIENT_DEDICATED = 'CLIENT_DEDICATED'
}

export enum PamIdentityType {
  GROUP = 'GROUP',
  MAILBOX = 'MAILBOX'
}

export enum VerificationMode {
  AUTO = 'AUTO',
  EVIDENCE_REQUIRED = 'EVIDENCE_REQUIRED',
  ATTESTATION_ONLY = 'ATTESTATION_ONLY'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  NEEDS_REVIEW = 'NEEDS_REVIEW'
}

export enum MigrationStatus {
  MIGRATED = 'MIGRATED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  LEGACY = 'LEGACY'
}

// ─── Role Template ─────────────────────────────────────────────────────────────

export interface RoleTemplate {
  key: string;
  label: string;
  description?: string;
}

// ─── Automation Capabilities ───────────────────────────────────────────────────

export interface AutomationCapabilities {
  oauthSupported: boolean;
  apiVerificationSupported: boolean;
  automatedProvisioningSupported: boolean;
  /** Whether this plugin supports target discovery after OAuth */
  discoverTargetsSupported?: boolean;
  /** Types of targets this plugin can discover */
  targetTypes?: ('ACCOUNT' | 'PROPERTY' | 'ORG' | 'WORKSPACE' | 'AD_ACCOUNT' | 'SITE' | 'PROJECT' | 'PORTAL' | 'BUSINESS' | 'CONTAINER' | 'WAREHOUSE' | 'DATABASE')[];
}

// ─── Access Type Capabilities (Per-AccessItemType) ─────────────────────────────

/**
 * Defines the connection and provisioning capabilities for each access item type.
 * This drives the entire onboarding flow UI and backend logic.
 */
export interface AccessTypeCapability {
  /** Does the platform support client OAuth at onboarding? */
  clientOAuthSupported: boolean;
  /** Can we programmatically grant the requested access via API? */
  canGrantAccess: boolean;
  /** Can we verify a manual step using the client OAuth token? */
  canVerifyAccess: boolean;
  /** Can we programmatically revoke access via API? */
  canRevokeAccess?: boolean;
  /** Does this flow require evidence upload and attestation? */
  requiresEvidenceUpload: boolean;
  /** Per-access-type verification mode (overrides manifest-level default) */
  verificationMode?: VerificationMode;
}

/**
 * Condition for matching capability rules based on PAM configuration.
 * Used to dynamically compute effective capabilities for SHARED_ACCOUNT.
 */
export interface CapabilityCondition {
  pamOwnership?: 'CLIENT_OWNED' | 'AGENCY_OWNED';
  identityPurpose?: 'HUMAN_INTERACTIVE' | 'INTEGRATION_NON_HUMAN';
  identityStrategy?: 'STATIC_AGENCY_IDENTITY' | 'CLIENT_DEDICATED_IDENTITY';
}

/**
 * Conditional rule for overriding capabilities based on configuration.
 * Rules are evaluated in order; later matching rules override earlier ones.
 */
export interface ConditionalCapabilityRule {
  when: CapabilityCondition;
  set: Partial<AccessTypeCapability>;
}

/**
 * Extended capability definition that supports conditional rules.
 * For SHARED_ACCOUNT, `default` provides base capabilities,
 * and `rules` can override based on pamOwnership/identityPurpose/identityStrategy.
 */
export interface AccessTypeCapabilityWithRules {
  /** Default capabilities when no rules match */
  default: AccessTypeCapability;
  /** Conditional override rules - evaluated in order */
  rules?: ConditionalCapabilityRule[];
}

/**
 * Maps each AccessItemType to its connection capabilities.
 * For simple cases: directly use AccessTypeCapability.
 * For conditional logic (e.g., SHARED_ACCOUNT): use AccessTypeCapabilityWithRules.
 */
export type AccessTypeCapabilities = {
  [key in AccessItemType]?: AccessTypeCapability | AccessTypeCapabilityWithRules;
};

/**
 * Configuration context for computing effective capabilities.
 * These values come from the AccessRequestItem/AccessItem configuration.
 */
export interface CapabilityConfigContext {
  pamOwnership?: string;
  identityPurpose?: string;
  identityStrategy?: string;
  pamIdentityStrategy?: string; // Alternative field name
}

// ─── OAuth Token Scope ─────────────────────────────────────────────────────────

/**
 * Distinguishes between agency-level and client-level OAuth tokens.
 * - AGENCY: Created from admin "Platform Integration" page; used for discovery and agency config
 * - CLIENT: Created during client onboarding; used for client-specific discovery and verification
 */
export type OAuthScope = 'AGENCY' | 'CLIENT';

// ─── Connector Response Types ──────────────────────────────────────────────────

/**
 * Standard response type for plugin connector operations (grant, verify, etc.)
 */
export interface ConnectorResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  /** Platform-specific details for debugging */
  details?: Record<string, unknown>;
}

/**
 * Context for granting access via plugin API
 */
export interface GrantAccessContext {
  /** OAuth auth result with tokens */
  auth: {
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
  };
  /** Client target information (property, account, etc.) */
  target: Record<string, unknown>;
  /** Role to grant (from roleTemplates) */
  role: string;
  /** Identity to grant access to (email, group, etc.) */
  identity: string;
  /** Access item type being granted */
  accessItemType: AccessItemType;
  /** Additional platform-specific options */
  options?: Record<string, unknown>;
}

/**
 * Context for verifying access via plugin API
 */
export interface VerifyAccessContext {
  /** OAuth auth result with tokens */
  auth: {
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
  };
  /** Client target information (property, account, etc.) */
  target: Record<string, unknown>;
  /** Role to verify */
  role: string;
  /** Identity to check for */
  identity: string;
  /** Access item type being verified */
  accessItemType: AccessItemType;
}

// ─── Security Capabilities (PAM Governance) ────────────────────────────────────

export interface SecurityCapabilities {
  supportsDelegation: boolean;
  supportsGroupAccess: boolean;
  supportsOAuth: boolean;
  supportsCredentialLogin: boolean;
  pamRecommendation: PamRecommendation;
  pamRationale: string;
}

// ─── Access Item Type Metadata ─────────────────────────────────────────────────

export interface AccessItemTypeMetadata {
  type: AccessItemType;
  label: string;
  description: string;
  icon: string;
  roleTemplates: RoleTemplate[];
}

// ─── Plugin Manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  platformKey: string;
  displayName: string;
  category: 'Paid Media' | 'Analytics' | 'Martech' | 'Data' | 'CRM' | 'Tag Management' | 'Ecommerce' | 'Social' | 'SEO' | 'Data Warehouse' | 'E-commerce';
  description: string;
  icon: string; // Font Awesome class for fallback
  logoPath?: string; // Path to SVG logo (e.g., '/logos/google-ads.svg')
  brandColor?: string; // Primary brand color (hex)
  tier: 1 | 2 | 3;
  clientFacing: boolean;
  
  // Access item types supported by this plugin (single source of truth)
  supportedAccessItemTypes: AccessItemTypeMetadata[];
  
  // Security capabilities - PAM governance
  securityCapabilities: SecurityCapabilities;
  
  // Automation capabilities
  automationCapabilities: AutomationCapabilities;
  
  /**
   * Per-access-type connection and provisioning capabilities.
   * Drives the entire onboarding flow UI and backend logic.
   * If not specified for an access type, defaults to manual flow with evidence upload.
   */
  accessTypeCapabilities?: AccessTypeCapabilities;

  // ─── Allowed Configuration Models ─────────────────────────────────────────
  
  /** Which PAM ownership models are valid for SHARED_ACCOUNT on this platform */
  allowedOwnershipModels: PamOwnership[];

  /** Which identity strategies (human + PAM) this platform supports */
  allowedIdentityStrategies: (HumanIdentityStrategy | PamIdentityStrategy)[];

  /** Which access item types this platform supports (enum array, mirrors supportedAccessItemTypes) */
  allowedAccessTypes: AccessItemType[];

  /** Which verification modes are available for this platform */
  verificationModes: VerificationMode[];
  
  pluginVersion: string;
}

// Legacy interface for backward compatibility
export interface LegacyRoleTemplate {
  key: string;
  label: string;
  description?: string;
}

// Helper to get role templates for a specific item type
export function getRoleTemplatesForItemType(
  manifest: PluginManifest, 
  itemType: AccessItemType
): RoleTemplate[] {
  const itemMeta = manifest.supportedAccessItemTypes.find(t => t.type === itemType);
  return itemMeta?.roleTemplates || [];
}

/**
 * Default capabilities - manual flow with evidence upload.
 * Used when no explicit capabilities are defined in the manifest.
 */
const DEFAULT_CAPABILITIES: AccessTypeCapability = {
  clientOAuthSupported: false,
  canGrantAccess: false,
  canVerifyAccess: false,
  requiresEvidenceUpload: true,
};

/**
 * Check if a capability definition has conditional rules.
 */
function hasConditionalRules(
  capability: AccessTypeCapability | AccessTypeCapabilityWithRules | undefined
): capability is AccessTypeCapabilityWithRules {
  return capability !== undefined && 'default' in capability;
}

/**
 * Check if a configuration matches a condition.
 * All specified condition fields must match for a rule to apply.
 */
function matchesCondition(
  condition: CapabilityCondition,
  config: CapabilityConfigContext
): boolean {
  // Normalize identity strategy field names
  const identityStrategy = config.identityStrategy || config.pamIdentityStrategy;
  
  // Check pamOwnership
  if (condition.pamOwnership !== undefined) {
    if (config.pamOwnership !== condition.pamOwnership) {
      return false;
    }
  }
  
  // Check identityPurpose
  if (condition.identityPurpose !== undefined) {
    if (config.identityPurpose !== condition.identityPurpose) {
      return false;
    }
  }
  
  // Check identityStrategy
  if (condition.identityStrategy !== undefined) {
    if (identityStrategy !== condition.identityStrategy) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get base access type capabilities for a specific item type.
 * Does NOT apply conditional rules - use getEffectiveCapabilities for that.
 * Returns defaults if not explicitly defined in manifest.
 * 
 * @deprecated Use getEffectiveCapabilities for runtime capability resolution.
 */
export function getAccessTypeCapability(
  manifest: PluginManifest,
  itemType: AccessItemType
): AccessTypeCapability {
  const capability = manifest.accessTypeCapabilities?.[itemType];
  
  if (!capability) {
    return { ...DEFAULT_CAPABILITIES };
  }
  
  // If it has conditional rules, return the default
  if (hasConditionalRules(capability)) {
    return { ...capability.default };
  }
  
  // Direct capability definition
  return { ...capability } as AccessTypeCapability;
}

/**
 * Compute effective capabilities based on manifest + runtime configuration.
 * This is the primary function to use for determining UI behavior and API gates.
 * 
 * For SHARED_ACCOUNT with conditional rules:
 * - CLIENT_OWNED → evidence/manual flow
 * - AGENCY_OWNED + HUMAN_INTERACTIVE → OAuth + API verify (like NAMED_INVITE)
 * - AGENCY_OWNED + INTEGRATION_NON_HUMAN → depends on plugin
 * 
 * @param manifest - Plugin manifest containing accessTypeCapabilities
 * @param itemType - The access item type (NAMED_INVITE, SHARED_ACCOUNT, etc.)
 * @param config - Runtime configuration from AccessRequestItem (pamOwnership, identityPurpose, etc.)
 * @returns Computed effective capabilities for this specific access item
 */
export function getEffectiveCapabilities(
  manifest: PluginManifest,
  itemType: AccessItemType | string,
  config: CapabilityConfigContext = {}
): AccessTypeCapability {
  // Start with default capabilities
  const effective: AccessTypeCapability = { ...DEFAULT_CAPABILITIES };
  
  // Get capability definition from manifest
  const capability = manifest.accessTypeCapabilities?.[itemType as AccessItemType];
  
  if (!capability) {
    return effective;
  }
  
  // Check if this capability has conditional rules
  if (hasConditionalRules(capability)) {
    // Apply default first
    Object.assign(effective, capability.default);
    
    // Apply matching rules in order (later rules override earlier)
    if (capability.rules) {
      for (const rule of capability.rules) {
        if (matchesCondition(rule.when, config)) {
          Object.assign(effective, rule.set);
        }
      }
    }
  } else {
    // Simple capability - apply directly
    Object.assign(effective, capability);
  }
  
  return effective;
}

/**
 * Check if a plugin supports a specific capability for an access type.
 * This uses base capabilities without config context.
 * For runtime checks with config, use getEffectiveCapabilities directly.
 */
export function pluginSupportsCapability(
  manifest: PluginManifest,
  itemType: AccessItemType,
  capability: keyof AccessTypeCapability
): boolean {
  const caps = getAccessTypeCapability(manifest, itemType);
  return caps[capability] === true;
}

/**
 * Check if a plugin supports a specific capability with config context.
 * This applies conditional rules based on PAM configuration.
 */
export function pluginSupportsCapabilityWithConfig(
  manifest: PluginManifest,
  itemType: AccessItemType | string,
  capability: keyof AccessTypeCapability,
  config: CapabilityConfigContext
): boolean {
  const caps = getEffectiveCapabilities(manifest, itemType, config);
  return caps[capability] === true;
}

// ─── Manifest Configuration Validators ──────────────────────────────────────

/**
 * Check if a platform allows a specific ownership model.
 */
export function isOwnershipModelAllowed(
  manifest: PluginManifest,
  ownership: PamOwnership | string
): boolean {
  return manifest.allowedOwnershipModels.includes(ownership as PamOwnership);
}

/**
 * Check if a platform allows a specific identity strategy.
 */
export function isIdentityStrategyAllowed(
  manifest: PluginManifest,
  strategy: HumanIdentityStrategy | PamIdentityStrategy | string
): boolean {
  return manifest.allowedIdentityStrategies.includes(strategy as HumanIdentityStrategy | PamIdentityStrategy);
}

/**
 * Check if a platform allows a specific access item type.
 */
export function isAccessTypeAllowed(
  manifest: PluginManifest,
  itemType: AccessItemType | string
): boolean {
  return manifest.allowedAccessTypes.includes(itemType as AccessItemType);
}

/**
 * Check if a platform supports a specific verification mode.
 */
export function isVerificationModeSupported(
  manifest: PluginManifest,
  mode: VerificationMode | string
): boolean {
  return manifest.verificationModes.includes(mode as VerificationMode);
}

/**
 * Validate a full configuration context against the manifest's allowed models.
 * Returns an array of error strings (empty = valid).
 */
export function validateConfigAgainstManifest(
  manifest: PluginManifest,
  config: {
    accessItemType?: AccessItemType | string;
    pamOwnership?: PamOwnership | string;
    identityStrategy?: HumanIdentityStrategy | PamIdentityStrategy | string;
    verificationMode?: VerificationMode | string;
  }
): string[] {
  const errors: string[] = [];
  
  if (config.accessItemType && !isAccessTypeAllowed(manifest, config.accessItemType)) {
    errors.push(`Access type "${config.accessItemType}" is not allowed for ${manifest.displayName}. Allowed: ${manifest.allowedAccessTypes.join(', ')}`);
  }
  
  if (config.pamOwnership && !isOwnershipModelAllowed(manifest, config.pamOwnership)) {
    errors.push(`Ownership model "${config.pamOwnership}" is not allowed for ${manifest.displayName}. Allowed: ${manifest.allowedOwnershipModels.join(', ')}`);
  }
  
  if (config.identityStrategy && !isIdentityStrategyAllowed(manifest, config.identityStrategy)) {
    errors.push(`Identity strategy "${config.identityStrategy}" is not allowed for ${manifest.displayName}. Allowed: ${manifest.allowedIdentityStrategies.join(', ')}`);
  }
  
  if (config.verificationMode && !isVerificationModeSupported(manifest, config.verificationMode)) {
    errors.push(`Verification mode "${config.verificationMode}" is not supported for ${manifest.displayName}. Supported: ${manifest.verificationModes.join(', ')}`);
  }
  
  return errors;
}

// ─── Validation Result ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Verification Result ───────────────────────────────────────────────────────

export interface VerificationResult {
  status: VerificationStatus;
  mode: VerificationMode;
  message?: string;
  evidence?: Record<string, unknown>;
}

// ─── OAuth Types ───────────────────────────────────────────────────────────────

export interface OAuthStartResult {
  authUrl: string;
  state: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// ─── Context Types ─────────────────────────────────────────────────────────────

export interface InstructionContext {
  accessItemType: AccessItemType;
  agencyConfig: Record<string, unknown>;
  clientTarget?: Record<string, unknown>;
  roleTemplate: string;
  clientName?: string;
  generatedIdentity?: string;
}

export interface VerificationContext {
  accessItemType: AccessItemType;
  agencyConfig: Record<string, unknown>;
  clientTarget: Record<string, unknown>;
  oauthTokens?: {
    accessToken: string;
    refreshToken?: string;
  };
}

// ─── Instruction Step ──────────────────────────────────────────────────────────

export interface InstructionStep {
  step: number;
  title: string;
  description: string;
  imageUrl?: string;
  link?: { url: string; label: string };
}

// ─── Platform Plugin Interface ─────────────────────────────────────────────────

export interface PlatformPlugin {
  // Manifest
  manifest: PluginManifest;

  // Schema getters (return Zod schemas)
  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown>;
  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown>;
  getRequestOptionsSchema?(accessItemType: AccessItemType): z.ZodType<unknown> | null;

  // Validation hooks
  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult;
  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult;

  // Instruction builder
  buildClientInstructions(context: InstructionContext): string | InstructionStep[];

  // Verification
  getVerificationMode(accessItemType: AccessItemType): VerificationMode;
  verifyGrant(context: VerificationContext): Promise<VerificationResult>;

  // OAuth hooks (optional)
  startOAuth?(context: { redirectUri: string; scopes?: string[] }): Promise<OAuthStartResult>;
  handleOAuthCallback?(context: { code: string; state?: string; redirectUri: string }): Promise<OAuthCallbackResult>;

  /**
   * Programmatically grant access via platform API.
   * Only implement when accessTypeCapabilities[type].canGrantAccess = true.
   * Returns success if access was granted, error otherwise.
   */
  grantAccess?(context: GrantAccessContext): Promise<ConnectorResponse>;

  /**
   * Programmatically verify that access has been granted (after manual steps).
   * Only implement when accessTypeCapabilities[type].canVerifyAccess = true.
   * Returns success with data=true if access is verified, data=false if not found.
   */
  verifyAccess?(context: VerifyAccessContext): Promise<ConnectorResponse<boolean>>;
}

// ─── Schema UI Metadata Extensions ─────────────────────────────────────────────

// Extended JSON Schema with UI hints
export interface UISchemaExtensions {
  'ui:widget'?: string;
  'ui:placeholder'?: string;
  'ui:help'?: string;
  'ui:order'?: string[];
  'ui:options'?: Record<string, unknown>;
}

// ─── Stored Configuration Types ────────────────────────────────────────────────

export interface StoredAgencyConfig {
  // Common fields
  identityPurpose?: IdentityPurpose;
  humanIdentityStrategy?: HumanIdentityStrategy;
  agencyGroupEmail?: string;
  integrationIdentityId?: string;
  
  // PAM fields
  pamOwnership?: PamOwnership;
  pamIdentityStrategy?: PamIdentityStrategy;
  pamIdentityType?: PamIdentityType;
  pamNamingTemplate?: string;
  pamAgencyIdentityEmail?: string;
  pamCheckoutDurationMinutes?: number;
  pamApprovalRequired?: boolean;
  pamRotationTrigger?: string;
  
  // Platform-specific agency identifiers
  managerAccountId?: string;
  businessManagerId?: string;
  businessCenterId?: string;
  seatId?: string;
  partnerId?: string;
  serviceAccountEmail?: string;
  ssoGroupName?: string;
  
  // Additional platform-specific fields
  [key: string]: unknown;
}

export interface StoredClientTarget {
  // Common target fields
  accountId?: string;
  propertyId?: string;
  containerId?: string;
  workspaceId?: string;
  adAccountId?: string;
  pageId?: string;
  pixelId?: string;
  datasetId?: string;
  warehouseId?: string;
  
  // Additional platform-specific fields
  [key: string]: unknown;
}

export interface StoredRequestOptions {
  inviteeEmails?: string[];
  [key: string]: unknown;
}
