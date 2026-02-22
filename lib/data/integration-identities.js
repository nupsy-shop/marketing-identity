// Integration Identities Store
// Pre-configured service accounts, OAuth apps, and API keys managed by the agency

import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export const INTEGRATION_TYPE = {
  SERVICE_ACCOUNT: 'SERVICE_ACCOUNT',
  OAUTH_APP: 'OAUTH_APP',
  API_KEY: 'API_KEY',
  SYSTEM_USER: 'SYSTEM_USER'
};

export const ROTATION_POLICY = {
  NONE: 'NONE',
  QUARTERLY: 'QUARTERLY',
  MONTHLY: 'MONTHLY',
  ON_OFFBOARD: 'ON_OFFBOARD'
};

// ─── In-memory Store ─────────────────────────────────────────────────────────

const integrationIdentities = [];

// ─── CRUD Operations ─────────────────────────────────────────────────────────

export function getAllIntegrationIdentities() {
  return integrationIdentities;
}

export function getIntegrationIdentityById(id) {
  return integrationIdentities.find(i => i.id === id);
}

export function getIntegrationIdentitiesByPlatform(platformId) {
  return integrationIdentities.filter(i => 
    i.allowedPlatforms.length === 0 || i.allowedPlatforms.includes(platformId)
  );
}

export function addIntegrationIdentity(identity) {
  const newIdentity = {
    id: uuidv4(),
    type: identity.type || INTEGRATION_TYPE.SERVICE_ACCOUNT,
    name: identity.name,
    description: identity.description || '',
    
    // Credentials (stored securely in production)
    email: identity.email,           // Service account email
    clientId: identity.clientId,     // OAuth client ID
    clientSecret: identity.clientSecret ? '***REDACTED***' : undefined,
    apiKey: identity.apiKey ? '***REDACTED***' : undefined,
    
    // Configuration
    allowedPlatforms: identity.allowedPlatforms || [], // Empty = all platforms
    scopes: identity.scopes || [],
    rotationPolicy: identity.rotationPolicy || ROTATION_POLICY.NONE,
    
    // Metadata
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: null,
    expiresAt: identity.expiresAt || null
  };
  
  // Store actual secrets (in production, use a vault)
  if (identity.clientSecret) {
    newIdentity._secretRef = Buffer.from(JSON.stringify({
      clientSecret: identity.clientSecret,
      apiKey: identity.apiKey
    })).toString('base64');
  }
  
  integrationIdentities.push(newIdentity);
  return newIdentity;
}

export function updateIntegrationIdentity(id, updates) {
  const identity = integrationIdentities.find(i => i.id === id);
  if (identity) {
    Object.assign(identity, {
      ...updates,
      updatedAt: new Date()
    });
  }
  return identity;
}

export function deleteIntegrationIdentity(id) {
  const index = integrationIdentities.findIndex(i => i.id === id);
  if (index !== -1) {
    integrationIdentities.splice(index, 1);
    return true;
  }
  return false;
}

export function toggleIntegrationIdentityStatus(id) {
  const identity = integrationIdentities.find(i => i.id === id);
  if (identity) {
    identity.isActive = !identity.isActive;
    identity.updatedAt = new Date();
  }
  return identity;
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

export function seedIntegrationIdentities() {
  if (integrationIdentities.length > 0) return;
  
  addIntegrationIdentity({
    type: INTEGRATION_TYPE.SERVICE_ACCOUNT,
    name: 'GA4 Data Export Service Account',
    description: 'Service account for GA4 BigQuery exports and API access',
    email: 'ga4-export@youragency-project.iam.gserviceaccount.com',
    allowedPlatforms: [], // All Google platforms
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    rotationPolicy: ROTATION_POLICY.QUARTERLY
  });
  
  addIntegrationIdentity({
    type: INTEGRATION_TYPE.SERVICE_ACCOUNT,
    name: 'GTM API Service Account',
    description: 'Service account for Tag Manager API operations',
    email: 'gtm-api@youragency-project.iam.gserviceaccount.com',
    allowedPlatforms: [],
    scopes: ['https://www.googleapis.com/auth/tagmanager.readonly'],
    rotationPolicy: ROTATION_POLICY.QUARTERLY
  });
  
  addIntegrationIdentity({
    type: INTEGRATION_TYPE.API_KEY,
    name: 'Fivetran Connector API',
    description: 'API credentials for Fivetran data connectors',
    apiKey: 'fvt_****',
    allowedPlatforms: [],
    rotationPolicy: ROTATION_POLICY.MONTHLY
  });
}
