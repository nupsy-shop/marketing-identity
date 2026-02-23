/**
 * Modular Advertising Platform Plugin System
 * Shared Types and DTOs
 * 
 * This file contains shared data transfer objects and types
 * used across all advertising platform plugins.
 */

// ─── Application Context ─────────────────────────────────────────────────────

/**
 * Application context passed to plugins during initialization
 */
export interface AppContext {
  /** Application environment */
  environment: 'development' | 'staging' | 'production';
  
  /** Logger instance */
  logger?: Logger;
  
  /** Configuration settings */
  config?: Record<string, unknown>;
  
  /** HTTP client for API calls */
  httpClient?: HttpClient;
  
  /** Cache instance */
  cache?: Cache;
}

/**
 * Simple logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * HTTP client interface for making API calls
 */
export interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<T>;
  post<T>(url: string, data: unknown, options?: RequestOptions): Promise<T>;
  put<T>(url: string, data: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(url: string, options?: RequestOptions): Promise<T>;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * Cache interface
 */
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// ─── Authentication ──────────────────────────────────────────────────────────

/**
 * Parameters for authorization
 */
export interface AuthParams {
  /** OAuth authorization code */
  code?: string;
  
  /** OAuth state parameter */
  state?: string;
  
  /** API key (for non-OAuth platforms) */
  apiKey?: string;
  
  /** Client credentials */
  clientId?: string;
  clientSecret?: string;
  
  /** Redirect URI for OAuth */
  redirectUri?: string;
  
  /** Requested scopes */
  scopes?: string[];
}

/**
 * Authentication result
 */
export interface AuthResult {
  /** Whether authentication was successful */
  success: boolean;
  
  /** Access token */
  accessToken?: string;
  
  /** Refresh token */
  refreshToken?: string;
  
  /** Token expiration time (ISO string) */
  expiresAt?: string;
  
  /** Token type (e.g., 'Bearer') */
  tokenType?: string;
  
  /** Granted scopes */
  scopes?: string[];
  
  /** Error message if failed */
  error?: string;
}

// ─── Accessible Target Discovery ─────────────────────────────────────────────

/**
 * Target types for different platforms
 */
export type TargetType = 
  | 'ACCOUNT'
  | 'PROPERTY'
  | 'ORG'
  | 'WORKSPACE'
  | 'AD_ACCOUNT'
  | 'SITE'
  | 'PROJECT'
  | 'PORTAL'
  | 'BUSINESS'
  | 'CONTAINER'
  | 'WAREHOUSE'
  | 'DATABASE';

/**
 * Represents a discoverable resource/target from an OAuth-connected platform
 */
export interface AccessibleTarget {
  /** Type of the target resource */
  targetType: TargetType;
  
  /** Provider's unique identifier for this resource */
  externalId: string;
  
  /** Human-readable name */
  displayName: string;
  
  /** Parent resource ID (for hierarchical resources like org -> account -> property) */
  parentExternalId?: string;
  
  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of target discovery
 */
export interface DiscoverTargetsResult {
  /** Whether discovery was successful */
  success: boolean;
  
  /** List of discovered targets */
  targets?: AccessibleTarget[];
  
  /** Error message if failed */
  error?: string;
}

// ─── Account Discovery (Legacy - use AccessibleTarget) ──────────────────────

/**
 * Generic account/property representation
 * @deprecated Use AccessibleTarget instead
 */
export interface Account {
  /** Unique account identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Account type (e.g., 'property', 'account', 'container') */
  type?: string;
  
  /** Parent account ID (for hierarchical accounts) */
  parentId?: string;
  
  /** Platform-specific metadata */
  metadata?: Record<string, unknown>;
  
  /** Whether the account is accessible */
  isAccessible?: boolean;
  
  /** Account status */
  status?: 'active' | 'inactive' | 'suspended';
}

// ─── Reporting ───────────────────────────────────────────────────────────────

/**
 * Report query parameters
 */
export interface ReportQuery {
  /** Account/property ID to query */
  accountId: string;
  
  /** Start date (YYYY-MM-DD) */
  startDate: string;
  
  /** End date (YYYY-MM-DD) */
  endDate: string;
  
  /** Metrics to retrieve */
  metrics: string[];
  
  /** Dimensions to group by */
  dimensions?: string[];
  
  /** Filters to apply */
  filters?: ReportFilter[];
  
  /** Maximum rows to return */
  limit?: number;
  
  /** Pagination offset */
  offset?: number;
  
  /** Sort order */
  orderBy?: ReportOrderBy[];
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: string | number | string[] | number[];
}

export interface ReportOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Report result
 */
export interface ReportResult {
  /** Column headers */
  headers: ReportHeader[];
  
  /** Data rows */
  rows: ReportRow[];
  
  /** Total row count (for pagination) */
  totalRows?: number;
  
  /** Summary/aggregate data */
  summary?: Record<string, unknown>;
  
  /** Report metadata */
  metadata?: {
    generatedAt: string;
    currency?: string;
    timezone?: string;
  };
}

export interface ReportHeader {
  name: string;
  type: 'dimension' | 'metric';
  dataType?: 'string' | 'number' | 'date' | 'currency' | 'percentage';
}

export interface ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, number>;
}

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Event payload for sending conversions/events
 */
export interface EventPayload {
  /** Event name */
  eventName: string;
  
  /** Timestamp (ISO string) */
  timestamp?: string;
  
  /** User identifier */
  userId?: string;
  
  /** Client ID / device ID */
  clientId?: string;
  
  /** Event parameters */
  params?: Record<string, unknown>;
  
  /** User properties */
  userProperties?: Record<string, unknown>;
  
  /** Consent status */
  consent?: {
    adStorage?: boolean;
    analyticsStorage?: boolean;
  };
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

/**
 * Incoming webhook request
 */
export interface IncomingRequest {
  /** HTTP method */
  method: string;
  
  /** Request headers */
  headers: Record<string, string>;
  
  /** Request body */
  body: unknown;
  
  /** Query parameters */
  query?: Record<string, string>;
  
  /** Request signature (for verification) */
  signature?: string;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

/**
 * Plugin error class
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends PluginError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends PluginError {
  constructor(message: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}
