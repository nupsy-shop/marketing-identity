/**
 * Modular Advertising Platform Plugin System
 * Common Module Exports
 * 
 * This module provides the core infrastructure for the plugin system.
 */

// Plugin Interface
export type { AdPlatformPlugin, OAuthCapablePlugin } from './plugin.interface';
export { isOAuthCapable } from './plugin.interface';

// Plugin Manager
export { PluginManager, pluginManager } from './pluginManager';

// Manifest Types
export type { PluginManifest, AccessItemTypeMetadata } from './manifest';
export { supportsAccessItemType, getRoleTemplatesForType, supportsPam } from './manifest';

// Common Types
export type {
  AppContext,
  Logger,
  HttpClient,
  RequestOptions,
  Cache,
  AuthParams,
  AuthResult,
  Account,
  ReportQuery,
  ReportFilter,
  ReportOrderBy,
  ReportResult,
  ReportHeader,
  ReportRow,
  EventPayload,
  IncomingRequest,
} from './types';
export { PluginError, AuthenticationError, RateLimitError } from './types';

// Utilities
export { HttpClient as HttpClientImpl, HttpError, createPlatformClient } from './utils/httpClient';
export {
  buildAuthorizationUrl as buildAuthUrl,
  exchangeCodeForTokens as exchangeCode,
  refreshAccessToken as refreshToken,
  isTokenExpired,
  generateState as generateOAuthState,
  validateState,
  type OAuthConfig,
} from './utils/auth';
export {
  mapArray,
  createAccount,
  createReportResult,
  snakeToCamel,
  camelToSnake,
  transformKeysToCamel,
  transformKeysToSnake,
  getNestedValue,
  parseNumericValues,
} from './utils/mappers';

// Centralized OAuth Configuration
export {
  OAUTH_PROVIDERS,
  PLATFORM_TO_PROVIDER,
  getProviderForPlatform,
  getProviderConfig,
  isProviderConfigured,
  getProviderCredentials,
  getCredentialsForPlatform,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getConfiguredProviders,
  getProvidersStatus,
  OAuthNotConfiguredError,
  type OAuthProviderConfig,
  type OAuthCredentials,
  type OAuthStartResult,
  type OAuthConfigError,
} from './oauth-config';
