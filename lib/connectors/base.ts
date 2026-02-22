// Base connector interface for platform integrations
// Each platform should implement this interface

import { Platform } from '@/types';

export interface ConnectorConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  [key: string]: any;
}

export interface AccountInfo {
  accountId: string;
  accountName: string;
  accountEmail?: string;
  metadata?: Record<string, any>;
}

export interface GrantAccessParams {
  accountId: string;
  userEmail: string;
  role: string;
}

export interface RevokeAccessParams {
  accountId: string;
  userEmail: string;
}

export interface ConnectorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base abstract class for platform connectors
 * Each platform should extend this and implement the required methods
 */
export abstract class BasePlatformConnector {
  protected platform: Platform;
  protected config: ConnectorConfig;

  constructor(platform: Platform, config: ConnectorConfig = {}) {
    this.platform = platform;
    this.config = config;
  }

  /**
   * Get the platform this connector is for
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Check if this connector supports automated provisioning
   */
  isAutomated(): boolean {
    return this.platform.automationFeasibility === 'High' || 
           this.platform.automationFeasibility === 'Medium-High';
  }

  /**
   * Get all accounts accessible with the configured credentials
   * For Partner Hub (Pattern 1) platforms, this returns all client accounts under the agency
   * For Named Invite (Pattern 2) platforms, this may require manual input
   */
  abstract getAccounts(): Promise<ConnectorResponse<AccountInfo[]>>;

  /**
   * Grant access to a specific account for a user
   * Implementation varies by access pattern:
   * - Pattern 1 (Partner Hub): API call to link account
   * - Pattern 2 (Named Invites): Send invitation email
   * - Pattern 4 (Proxy): Configure proxy credentials
   * - Pattern 5 (PAM): Create PAM vault entry
   */
  abstract grantAccess(params: GrantAccessParams): Promise<ConnectorResponse>;

  /**
   * Revoke access to a specific account for a user
   */
  abstract revokeAccess(params: RevokeAccessParams): Promise<ConnectorResponse>;

  /**
   * Verify that access has been granted
   * Used by the onboarding flow to confirm client has completed the setup
   */
  abstract verifyAccess(params: { accountId: string; userEmail: string }): Promise<ConnectorResponse<boolean>>;

  /**
   * Get OAuth URL for platforms that support OAuth
   * Returns null if OAuth is not supported
   */
  getOAuthUrl?(redirectUri: string, state: string): string | null;

  /**
   * Handle OAuth callback
   * Returns null if OAuth is not supported
   */
  handleOAuthCallback?(code: string, state: string): Promise<ConnectorResponse>;
}
