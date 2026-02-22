# Marketing Identity Platform

A unified identity and access management platform for marketing agencies to manage client access across 60+ marketing tools and platforms.

## Overview

This platform automates the onboarding, provisioning, and offboarding of client accounts across multiple SaaS marketing platforms while enforcing least-privilege access and auditability.

## Key Features

- **60+ Platform Integrations** - Pre-configured support for major marketing platforms including:
  - Paid Media: Google Ads, Meta/Facebook Ads, TikTok, LinkedIn, Pinterest, Snapchat
  - Analytics: Google Analytics/GA4, Adobe Analytics, Heap, Microsoft Clarity
  - CRM: Salesforce, HubSpot, Gong, Apollo
  - Ecommerce: Shopify, BigCommerce, Google Merchant Center
  - Email/SMS: Klaviyo, Mailchimp, Attentive, Postscript
  - Data Warehouses: Snowflake, Fivetran, Looker Studio
  - And many more...

- **Automated Provisioning** - Platform connectors with varying automation levels:
  - High/Medium: OAuth flows and API-based provisioning
  - Low: Guided manual onboarding with clear instructions

- **Streamlined Onboarding** - Single link per client for all platform access
- **Real-time Validation** - Track onboarding progress and access status
- **Role-based Access Control** - Admin dashboard with client management
- **Extensible Architecture** - Clean separation of concerns for easy database and API integration

## Architecture

### Data Model

```typescript
Platform {
  id: string
  name: string
  domain: string (Paid Media, Analytics, CRM, etc.)
  accessPattern: string (Partner Hub, Named Invites, Proxy, PAM)
  automationFeasibility: string (High, Medium, Low)
  notes: string
}

Client {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
}

AccessRequest {
  id: string
  clientId: string
  token: string (unique onboarding URL)
  platformStatuses: Array<{
    platformId: string
    status: 'pending' | 'validated' | 'failed'
    validatedAt?: Date
    notes?: string
  }>
  createdBy: string
  createdAt: Date
  completedAt?: Date
}
```

### Project Structure

```
/app
├── types/
│   └── index.ts              # TypeScript type definitions
├── lib/
│   ├── data/
│   │   ├── platforms.ts      # Platform registry (from Excel)
│   │   └── stores.ts         # In-memory data stores
│   ├── connectors/
│   │   ├── base.ts           # Abstract connector interface
│   │   ├── google-ads.ts     # Google Ads implementation
│   │   ├── manual.ts         # Manual platform connector
│   │   └── index.ts          # Connector factory
│   └── auth.ts               # Stub auth (Okta integration ready)
├── app/
│   ├── api/[[...path]]/      # API routes
│   ├── admin/                # Admin dashboard
│   │   ├── page.js           # Client list
│   │   └── clients/[id]/     # Client detail & request management
│   └── onboarding/[token]/   # Client onboarding flow
└── components/ui/            # shadcn UI components
```

## API Endpoints

### Platforms
- `GET /api/platforms` - List all platforms (with optional filters)
- `GET /api/platforms/:id` - Get platform details

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/:id` - Get client details
- `GET /api/clients/:id/access-requests` - Get client's access requests

### Access Requests
- `POST /api/access-requests` - Create new access request
- `GET /api/access-requests/:id` - Get access request details
- `POST /api/access-requests/:id/validate` - Validate a platform
- `POST /api/access-requests/:id/refresh` - Refresh validation status
- `DELETE /api/access-requests/:id/platforms/:platformId` - Revoke access

### Onboarding
- `GET /api/onboarding/:token` - Get access request by token

## User Flows

### Admin Flow

1. **Create Client**
   - Navigate to Admin Dashboard
   - Click "New Client"
   - Enter client name and email
   
2. **Generate Access Request**
   - Select client from list
   - Click "New Access Request"
   - Select platforms (search, filter by domain)
   - Generate unique onboarding link
   
3. **Monitor Progress**
   - View real-time validation status
   - Refresh to check automated validation
   - Revoke access if needed

### Client Onboarding Flow

1. **Receive Link** - Client receives unique onboarding URL via email
2. **View Checklist** - See all required platforms with progress tracker
3. **Follow Instructions** - Platform-specific instructions based on access pattern
4. **Validate Access** - Mark as complete or connect via OAuth (where supported)
5. **Completion** - Receive confirmation when all platforms are validated

## Platform Connector Architecture

Each platform has a connector that implements the `BasePlatformConnector` interface:

```typescript
interface BasePlatformConnector {
  getAccounts(): Promise<AccountInfo[]>
  grantAccess(params: GrantAccessParams): Promise<ConnectorResponse>
  revokeAccess(params: RevokeAccessParams): Promise<ConnectorResponse>
  verifyAccess(params: VerifyAccessParams): Promise<ConnectorResponse<boolean>>
  getOAuthUrl?(redirectUri: string, state: string): string
  handleOAuthCallback?(code: string, state: string): Promise<ConnectorResponse>
}
```

### Implemented Connectors

- **GoogleAdsConnector** - OAuth-based connector for Google Ads (Pattern 1: Partner Hub)
- **ManualConnector** - Fallback for platforms requiring manual provisioning

### Adding New Connectors

To add a new platform connector:

1. Create a new file in `/lib/connectors/[platform-name].ts`
2. Extend `BasePlatformConnector`
3. Implement all required methods
4. Add to connector factory in `/lib/connectors/index.ts`

Example:
```typescript
export class FacebookAdsConnector extends BasePlatformConnector {
  async getAccounts() {
    // Implement Facebook Business Manager API call
  }
  
  async grantAccess(params) {
    // Implement partner access linking
  }
  // ... other methods
}
```

## Authentication & Authorization

### Current Implementation (Stub)
- Basic role-based auth with `admin` and `user` roles
- Default admin user for demonstration
- Session management placeholders

### Okta Integration (Ready to Implement)

The platform is designed to integrate with Okta as the identity provider:

1. **Install Okta SDK**
   ```bash
   yarn add @okta/okta-auth-js @okta/okta-react
   ```

2. **Configure Environment Variables**
   ```bash
   OKTA_DOMAIN=your-domain.okta.com
   OKTA_CLIENT_ID=your-client-id
   OKTA_CLIENT_SECRET=your-client-secret
   ```

3. **Update `/lib/auth.ts`**
   - Replace stub functions with Okta OIDC calls
   - Map Okta groups to platform roles
   - Implement SCIM for automated user provisioning

## Data Persistence

### Current Implementation (In-Memory)
- Arrays in `/lib/data/stores.ts`
- Resets on server restart
- Fast for prototyping

### Migration to Database (PostgreSQL)

To replace in-memory storage with a database:

1. **Install Database Client**
   ```bash
   yarn add pg
   ```

2. **Update Store Functions**
   - Replace array operations with SQL queries
   - Keep the same function signatures
   - Example:
   ```typescript
   // Before (in-memory)
   export function getClientById(id: string): Client | undefined {
     return clients.find(c => c.id === id);
   }
   
   // After (database)
   export async function getClientById(id: string): Promise<Client | undefined> {
     const result = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
     return result.rows[0];
   }
   ```

3. **Database Schema**
   ```sql
   CREATE TABLE clients (
     id UUID PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE access_requests (
     id UUID PRIMARY KEY,
     client_id UUID REFERENCES clients(id),
     token UUID UNIQUE NOT NULL,
     created_by UUID,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP
   );
   
   CREATE TABLE platform_statuses (
     id UUID PRIMARY KEY,
     access_request_id UUID REFERENCES access_requests(id),
     platform_id UUID NOT NULL,
     status VARCHAR(50) NOT NULL,
     validated_at TIMESTAMP,
     notes TEXT
   );
   ```

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript + JavaScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Data Storage**: In-memory (migration-ready for PostgreSQL)
- **Authentication**: Stub (Okta-ready)

## Getting Started

### Prerequisites
- Node.js 18+
- Yarn package manager

### Installation

1. Clone and navigate to the project
2. Install dependencies:
   ```bash
   yarn install
   ```

3. Start the development server:
   ```bash
   yarn dev
   ```

4. Open http://localhost:3000

### Default Credentials
- Admin access is automatically granted (no login required in stub mode)
- When Okta is integrated, use your Okta credentials

## Usage Examples

### Create a Client and Generate Onboarding Link

```javascript
// 1. Create client via API
const client = await fetch('/api/clients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Acme Corporation',
    email: 'contact@acme.com'
  })
});

// 2. Create access request
const request = await fetch('/api/access-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: client.data.id,
    platformIds: ['google-ads-id', 'facebook-ads-id', 'ga4-id']
  })
});

// 3. Send onboarding link to client
const onboardingUrl = `${window.location.origin}/onboarding/${request.data.token}`;
// Email this link to the client
```

### Implement a Custom Connector

```typescript
import { BasePlatformConnector, ConnectorResponse, AccountInfo } from '@/lib/connectors/base';

export class LinkedInAdsConnector extends BasePlatformConnector {
  async getAccounts(): Promise<ConnectorResponse<AccountInfo[]>> {
    try {
      // Call LinkedIn Marketing API
      const response = await fetch('https://api.linkedin.com/v2/adAccounts', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'LinkedIn-Version': '202401'
        }
      });
      
      const data = await response.json();
      return {
        success: true,
        data: data.elements.map(account => ({
          accountId: account.id,
          accountName: account.name,
          metadata: { status: account.status }
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async grantAccess(params) {
    // Implement LinkedIn partner access
  }
  
  async revokeAccess(params) {
    // Implement access revocation
  }
  
  async verifyAccess(params) {
    // Check if access exists
  }
}
```

## Access Patterns Explained

The platform supports 5 different access patterns based on how platforms handle agency access:

### Pattern 1: Partner Hub / Manager Account
- **Examples**: Google Ads, Meta/Facebook Ads, TikTok Ads
- **Method**: Agency has a master account that links to client accounts
- **Automation**: High - Can be done via API
- **Client Action**: Grant permission for agency to link

### Pattern 2: Named Invites
- **Examples**: HubSpot, Salesforce, Klaviyo
- **Method**: Client invites agency user by email
- **Automation**: Low-Medium - Requires manual invitation
- **Client Action**: Send invitation from their platform

### Pattern 3: Group-based Access
- **Examples**: Google Analytics (some configurations)
- **Method**: Access granted via groups rather than individuals
- **Automation**: Medium - Depends on platform support

### Pattern 4: Proxy / Service Account
- **Examples**: Snowflake, Fivetran, Looker Studio
- **Method**: Agency uses service account or proxy credentials
- **Automation**: Medium - Can be configured programmatically
- **Client Action**: Provide credentials or configure proxy

### Pattern 5: PAM (Privileged Access Management)
- **Examples**: Commission Junction, ShareASale, Impact
- **Method**: Shared credentials stored in secure vault
- **Automation**: Low - Manual credential management
- **Client Action**: Coordinate credential sharing

## Security Considerations

- **Token-based Onboarding**: Unique, non-guessable tokens for each access request
- **Least Privilege**: Platform-specific role recommendations
- **Audit Trail**: All actions timestamped and attributed to users
- **Credential Management**: PAM integration for secure credential storage
- **Session Management**: Ready for Okta SSO and MFA
- **Access Revocation**: Immediate revocation via API or manual process

## Future Enhancements

1. **Okta Integration**
   - OIDC authentication
   - SCIM user provisioning
   - Group-based role mapping

2. **Database Migration**
   - PostgreSQL for persistence
   - Audit log tables
   - Performance optimization

3. **Additional Connectors**
   - Complete implementations for all 60+ platforms
   - OAuth flows for high-automation platforms
   - Webhook handlers for real-time updates

4. **Monitoring & Alerts**
   - Email notifications for access request status
   - Slack integration for team notifications
   - Dashboard analytics and reporting

5. **Advanced Features**
   - Automated access recertification
   - Time-boxed access for contractors
   - Bulk operations for multi-client agencies
   - API rate limiting and caching

## Support & Documentation

For questions or issues:
- Review this README
- Check inline code comments
- Examine TypeScript interfaces in `/types`
- Review connector implementations in `/lib/connectors`

## License

Proprietary - Agency Internal Use Only
