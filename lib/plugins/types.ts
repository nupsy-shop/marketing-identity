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
  /** Does this flow require evidence upload and attestation? */
  requiresEvidenceUpload: boolean;
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
 * Get access type capabilities for a specific item type.
 * Returns defaults if not explicitly defined in manifest.
 */
export function getAccessTypeCapability(
  manifest: PluginManifest,
  itemType: AccessItemType
): AccessTypeCapability {
  // Default capabilities - manual flow with evidence upload
  const defaults: AccessTypeCapability = {
    clientOAuthSupported: false,
    canGrantAccess: false,
    canVerifyAccess: false,
    requiresEvidenceUpload: true,
  };

  // SHARED_ACCOUNT (PAM) always has manual flow
  if (itemType === AccessItemType.SHARED_ACCOUNT) {
    return {
      clientOAuthSupported: false,
      canGrantAccess: false,
      canVerifyAccess: false,
      requiresEvidenceUpload: true,
    };
  }

  // Return explicit capabilities or defaults
  return manifest.accessTypeCapabilities?.[itemType] || defaults;
}

/**
 * Check if a plugin supports a specific capability for an access type
 */
export function pluginSupportsCapability(
  manifest: PluginManifest,
  itemType: AccessItemType,
  capability: keyof AccessTypeCapability
): boolean {
  const caps = getAccessTypeCapability(manifest, itemType);
  return caps[capability] === true;
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
