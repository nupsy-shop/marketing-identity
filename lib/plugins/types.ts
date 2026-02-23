/**
 * PAM Identity Hub - Platform Plugin System
 * Core Types and Interfaces
 */

import { z } from 'zod';

// ─── Core Enums ────────────────────────────────────────────────────────────────

export enum AccessItemType {
  NAMED_INVITE = 'NAMED_INVITE',
  PARTNER_DELEGATION = 'PARTNER_DELEGATION',
  GROUP_SERVICE = 'GROUP_SERVICE',
  PROXY_TOKEN = 'PROXY_TOKEN',
  PAM_SHARED_ACCOUNT = 'PAM_SHARED_ACCOUNT'
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
}

// ─── Plugin Manifest ───────────────────────────────────────────────────────────

export interface PluginManifest {
  platformKey: string;
  displayName: string;
  category: 'Paid Media' | 'Analytics' | 'Martech' | 'Data' | 'CRM' | 'Tag Management' | 'Ecommerce' | 'Social';
  description: string;
  icon: string; // Font Awesome class for fallback
  logoPath?: string; // Path to SVG logo (e.g., '/logos/google-ads.svg')
  brandColor?: string; // Primary brand color (hex)
  tier: 1 | 2 | 3;
  supportedAccessItemTypes: AccessItemType[];
  supportedRoleTemplates: RoleTemplate[];
  automationCapabilities: AutomationCapabilities;
  pluginVersion: string;
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
  startOAuth?(context: { redirectUri: string }): Promise<OAuthStartResult>;
  handleOAuthCallback?(context: { code: string; state: string }): Promise<OAuthCallbackResult>;
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
