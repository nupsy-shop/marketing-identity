// Manual connector for platforms that require manual access provisioning
// Pattern 2 (Named Invites), Pattern 5 (PAM) - Low automation

import { BasePlatformConnector, ConnectorResponse, AccountInfo, GrantAccessParams, RevokeAccessParams } from './base';

export class ManualConnector extends BasePlatformConnector {
  /**
   * For manual platforms, we don't have API access to list accounts
   * The client will provide account identifiers during onboarding
   */
  async getAccounts(): Promise<ConnectorResponse<AccountInfo[]>> {
    return {
      success: true,
      data: [],
      error: 'Manual platform - accounts must be configured by client'
    };
  }

  /**
   * For manual platforms, we provide instructions instead of automated provisioning
   */
  async grantAccess(params: GrantAccessParams): Promise<ConnectorResponse> {
    const instructions = this.getManualInstructions();
    
    return {
      success: true,
      data: {
        message: 'Manual access required',
        instructions: instructions
      }
    };
  }

  /**
   * Manual revocation requires client action
   */
  async revokeAccess(params: RevokeAccessParams): Promise<ConnectorResponse> {
    return {
      success: true,
      data: {
        message: 'Manual revocation required',
        instructions: `Please remove ${params.userEmail} from ${this.platform.name} manually.`
      }
    };
  }

  /**
   * For manual platforms, verification is done by client confirmation
   */
  async verifyAccess(params: { accountId: string; userEmail: string }): Promise<ConnectorResponse<boolean>> {
    return {
      success: true,
      data: false, // Always false until client manually confirms
      error: 'Manual verification required'
    };
  }

  /**
   * Get platform-specific manual instructions
   */
  private getManualInstructions(): string {
    const platformName = this.platform.name;
    const agencyEmail = 'agency@example.com'; // TODO: Make this configurable

    // Generate instructions based on access pattern
    if (this.platform.accessPattern.includes('Named Invites')) {
      return `To grant access to ${platformName}:

1. Log into your ${platformName} account
2. Navigate to User Management or Team Settings
3. Invite ${agencyEmail} with appropriate permissions
4. The agency will receive an invitation email
5. Click "I have granted access" below once completed

${this.platform.notes ? `Note: ${this.platform.notes}` : ''}`;
    }

    if (this.platform.accessPattern.includes('PAM')) {
      return `To grant access to ${platformName}:

1. This platform requires credential sharing via our secure PAM system
2. Our team will contact you to coordinate credential exchange
3. Credentials will be stored in our privileged access management vault
4. Access will be audited and time-boxed per your requirements

${this.platform.notes ? `Note: ${this.platform.notes}` : ''}`;
    }

    return `To grant access to ${platformName}:

1. Log into your ${platformName} account
2. Follow the platform's standard process to add agency access
3. Add ${agencyEmail} with the requested permissions
4. Click "I have granted access" below once completed

${this.platform.notes ? `Note: ${this.platform.notes}` : ''}`;
  }
}
