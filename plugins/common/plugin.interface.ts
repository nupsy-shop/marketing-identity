/**
 * Modular Advertising Platform Plugin System
 * Core Plugin Interface
 * 
 * This interface defines the contract that all advertising platform plugins must implement.
 * It provides type safety and forces each plugin to supply consistent methods for:
 * - Authentication (OAuth, API keys)
 * - Account discovery
 * - Data mapping
 * - Reporting
 * - Event handling
 */

import type { PluginManifest, AccessItemType, ValidationResult, VerificationMode, VerificationResult, InstructionContext, InstructionStep, VerificationContext } from '../../lib/plugins/types';
import type { AppContext, AuthParams, AuthResult, Account, ReportQuery, ReportResult, EventPayload, IncomingRequest } from './types';
import { z } from 'zod';

/**
 * Core AdPlatformPlugin Interface
 * All advertising platform plugins must implement this interface
 */
export interface AdPlatformPlugin {
  /** Unique identifier for this plugin (e.g., "ga4", "facebookAds") */
  readonly name: string;

  /** Human-friendly description and capabilities */
  readonly manifest: PluginManifest;

  // ─── Lifecycle Methods ─────────────────────────────────────────────────────

  /** Called when the plugin is registered with the PluginManager */
  initialize(context: AppContext): Promise<void>;

  /** Clean up on uninstall or disable (optional) */
  destroy?(): Promise<void>;

  // ─── Authentication Methods ────────────────────────────────────────────────

  /** Authenticate and return a credential/token */
  authorize(params: AuthParams): Promise<AuthResult>;

  /** Refresh an expired token */
  refreshToken(currentToken: string): Promise<AuthResult>;

  // ─── Account Discovery ─────────────────────────────────────────────────────

  /** List available accounts/properties for the authenticated user */
  fetchAccounts(auth: AuthResult): Promise<Account[]>;

  // ─── Reporting ─────────────────────────────────────────────────────────────

  /** Fetch reporting data (generic method; plugins map to platform-specific APIs) */
  fetchReport(auth: AuthResult, query: ReportQuery): Promise<ReportResult>;

  // ─── Event Handling ────────────────────────────────────────────────────────

  /** Send an event (e.g., conversion) to the platform */
  sendEvent(auth: AuthResult, event: EventPayload): Promise<void>;

  /** Handle incoming webhooks from the platform (optional) */
  handleWebhook?(req: IncomingRequest): Promise<void>;

  // ─── Schema Methods (for form generation) ──────────────────────────────────

  /** Get Zod schema for agency configuration based on access item type */
  getAgencyConfigSchema(accessItemType: AccessItemType): z.ZodType<unknown>;

  /** Get Zod schema for client target based on access item type */
  getClientTargetSchema(accessItemType: AccessItemType): z.ZodType<unknown>;

  /** Get Zod schema for request options (optional) */
  getRequestOptionsSchema?(accessItemType: AccessItemType): z.ZodType<unknown> | null;

  // ─── Validation Methods ────────────────────────────────────────────────────

  /** Validate agency configuration */
  validateAgencyConfig(accessItemType: AccessItemType, config: Record<string, unknown>): ValidationResult;

  /** Validate client target */
  validateClientTarget(accessItemType: AccessItemType, target: Record<string, unknown>): ValidationResult;

  // ─── Instruction Builder ───────────────────────────────────────────────────

  /** Build client-facing instructions for granting access */
  buildClientInstructions(context: InstructionContext): string | InstructionStep[];

  // ─── Verification Methods ──────────────────────────────────────────────────

  /** Get verification mode for access item type */
  getVerificationMode(accessItemType: AccessItemType): VerificationMode;

  /** Verify grant status */
  verifyGrant(context: VerificationContext): Promise<VerificationResult>;
}

/**
 * Extended Plugin Interface with OAuth Support
 */
export interface OAuthCapablePlugin extends AdPlatformPlugin {
  /** Start OAuth flow */
  startOAuth(context: { redirectUri: string }): Promise<{ authUrl: string; state: string }>;

  /** Handle OAuth callback */
  handleOAuthCallback(context: { code: string; state: string }): Promise<AuthResult>;
}

/**
 * Type guard to check if a plugin supports OAuth
 */
export function isOAuthCapable(plugin: AdPlatformPlugin): plugin is OAuthCapablePlugin {
  return 'startOAuth' in plugin && 'handleOAuthCallback' in plugin;
}
