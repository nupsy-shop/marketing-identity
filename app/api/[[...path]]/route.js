import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as db from '@/lib/db';
import {
  IDENTITY_PURPOSE,
  HUMAN_IDENTITY_STRATEGY,
  validateAccessItemPayload,
  generateClientDedicatedIdentity
} from '@/lib/data/field-policy';
import { initializePlugins, PluginRegistry } from '@/lib/plugins/loader';
import {
  getProviderForPlatform,
  getProviderConfig,
  isProviderConfigured,
  OAuthNotConfiguredError
} from '@/plugins/common/oauth-config';

// Initialize plugins on module load
initializePlugins();

// Helper to parse request body
async function getBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Helper to get platform key from display name
function getPlatformKeyFromName(name) {
  if (!name) return null;
  const normalized = name.toLowerCase();
  
  const keyMap = {
    'google ads': 'google-ads',
    'meta': 'meta',
    'facebook': 'meta',
    'google analytics': 'ga4',
    'ga4': 'ga4',
    'google search console': 'google-search-console',
    'search console': 'google-search-console',
    'snowflake': 'snowflake',
    'dv360': 'dv360',
    'display & video 360': 'dv360',
    'the trade desk': 'trade-desk',
    'trade desk': 'trade-desk',
    'tiktok': 'tiktok',
    'snapchat': 'snapchat',
    'linkedin': 'linkedin',
    'pinterest': 'pinterest',
    'hubspot': 'hubspot',
    'salesforce': 'salesforce',
    'google tag manager': 'gtm',
    'gtm': 'gtm',
    'universal analytics': 'ga-ua',
  };
  
  for (const [key, value] of Object.entries(keyMap)) {
    if (normalized.includes(key)) return value;
  }
  return normalized.replace(/[^a-z0-9]/g, '-');
}

// Map itemType to accessPattern
const ITEM_TYPE_TO_PATTERN = {
  'NAMED_INVITE': 'HUMAN_INVITE',
  'PARTNER_DELEGATION': 'DELEGATION',
  'GROUP_ACCESS': 'GROUP',
  'SHARED_ACCOUNT_PAM': 'PAM',
  'PROXY_TOKEN': 'PROXY'
};

// Client instructions by item type
function getClientInstructions(platformName, itemType, agencyData) {
  const defaultInstructions = {
    'NAMED_INVITE': `Log in to your ${platformName} account. Navigate to Settings → Users/Permissions. Add the email address provided and assign the requested role.`,
    'PARTNER_DELEGATION': `Log in to your ${platformName} account. Navigate to Settings → Partners or Agency Access. Accept the partner request or add the agency's identifier.`,
    'GROUP_ACCESS': `Ensure the agency's service account or group has been granted access to your ${platformName} resources with the requested permissions.`,
    'SHARED_ACCOUNT_PAM': `Follow the instructions to either provide credentials or invite the agency identity to your account.`,
    'PROXY_TOKEN': `Generate an API token or integration key in your ${platformName} account and provide it to your agency.`
  };
  return defaultInstructions[itemType] || `Grant the requested access in your ${platformName} account.`;
}

/**
 * Server-side validation for plugin-driven PAM governance rules
 * Enforces all rules from the plugin manifest and strict PAM gating logic
 * 
 * ═══ STRICT PAM VALIDATION MATRIX ═══
 * 
 * RULE A: CLIENT_OWNED
 *   - Must NOT contain: identityPurpose, pamIdentityStrategy, pamIdentityType,
 *     pamNamingTemplate, pamCheckoutDurationMinutes, pamApprovalRequired,
 *     agencyIdentityId, integrationIdentityId
 *   - Client provides credentials during onboarding
 * 
 * RULE B: AGENCY_OWNED + HUMAN_INTERACTIVE
 *   B1: STATIC_AGENCY_IDENTITY
 *       - Must have: integrationIdentityId (agency identity from dropdown)
 *       - Must NOT have: pamNamingTemplate, pamIdentityType, pamCheckoutDurationMinutes
 *   B2: CLIENT_DEDICATED_IDENTITY
 *       - Must have: pamIdentityType, pamNamingTemplate
 *       - Checkout policy fields allowed ONLY for MAILBOX type
 * 
 * RULE C: AGENCY_OWNED + INTEGRATION_NON_HUMAN
 *   - Must have: integrationIdentityId
 *   - Must NOT have: pamNamingTemplate, checkout policy fields
 */
function validateAgainstPluginRules(platformKey, itemType, role, agencyConfig, body) {
  const errors = [];
  
  if (!platformKey || !PluginRegistry.has(platformKey)) {
    return { valid: true, errors: [] }; // No plugin, skip validation
  }
  
  const plugin = PluginRegistry.get(platformKey);
  const manifest = plugin?.manifest;
  
  if (!manifest) {
    return { valid: true, errors: [] };
  }
  
  // Normalize item type for comparison
  const normalizeType = (t) => {
    if (!t) return '';
    return t.replace(/_PAM$/i, '').replace('PAM_', '').toUpperCase();
  };
  const normalizedItemType = normalizeType(itemType);
  
  // 1. Validate itemType is supported by plugin
  const supportedTypes = manifest.supportedAccessItemTypes || [];
  if (supportedTypes.length > 0) {
    const typeNames = supportedTypes.map(t => typeof t === 'string' ? t : (t.type || '')).map(normalizeType);
    if (!typeNames.includes(normalizedItemType)) {
      errors.push(`Item type "${itemType}" is not supported by this platform. Supported: ${typeNames.join(', ')}`);
    }
  }
  
  // 2. Validate role is allowed for the item type
  const typeMetadata = supportedTypes.find(t => {
    const typeName = typeof t === 'string' ? t : (t.type || '');
    return normalizeType(typeName) === normalizedItemType;
  });
  
  if (typeMetadata && typeof typeMetadata !== 'string' && typeMetadata.roleTemplates) {
    const allowedRoles = typeMetadata.roleTemplates.map(r => r.key?.toLowerCase() || r.toLowerCase());
    const submittedRole = (role || '').toLowerCase();
    
    // Allow if role matches any allowed role key OR if there's a custom role template
    const hasCustomRole = allowedRoles.includes('custom');
    if (!allowedRoles.includes(submittedRole) && !hasCustomRole) {
      errors.push(`Role "${role}" is not allowed for ${itemType}. Allowed roles: ${typeMetadata.roleTemplates.map(r => r.label || r.key).join(', ')}`);
    }
  }
  
  // 3. For SHARED_ACCOUNT, enforce STRICT PAM governance rules
  if (normalizedItemType === 'SHARED_ACCOUNT') {
    const secCaps = manifest.securityCapabilities;
    const pamConfig = agencyConfig || body?.agencyConfigJson || {};
    const pamOwnership = pamConfig.pamOwnership;
    const identityPurpose = pamConfig.identityPurpose;
    const identityStrategy = pamConfig.pamIdentityStrategy;
    
    // ═══ RULE A: CLIENT_OWNED - Reject identity generation fields ═══
    if (pamOwnership === 'CLIENT_OWNED') {
      const forbiddenFields = [
        'identityPurpose',
        'pamIdentityStrategy',
        'pamIdentityType',
        'pamNamingTemplate',
        'pamCheckoutDurationMinutes',
        'pamApprovalRequired',
        'agencyIdentityId',
        'integrationIdentityId'
      ];
      
      const foundForbiddenFields = forbiddenFields.filter(f => pamConfig[f] !== undefined && pamConfig[f] !== null && pamConfig[f] !== '');
      if (foundForbiddenFields.length > 0) {
        errors.push(`CLIENT_OWNED shared accounts must not specify identity generation fields. Found: ${foundForbiddenFields.join(', ')}. These are collected from the client during onboarding.`);
      }
    }
    
    // ═══ RULE B: AGENCY_OWNED - Require proper identity configuration ═══
    if (pamOwnership === 'AGENCY_OWNED') {
      // Must have identityPurpose
      if (!identityPurpose) {
        errors.push('AGENCY_OWNED shared accounts require an identityPurpose (HUMAN_INTERACTIVE or INTEGRATION_NON_HUMAN).');
      }
      
      // ═══ RULE B1: INTEGRATION_NON_HUMAN ═══
      if (identityPurpose === 'INTEGRATION_NON_HUMAN') {
        // Must have integrationIdentityId
        if (!pamConfig.integrationIdentityId) {
          errors.push('INTEGRATION_NON_HUMAN identity purpose requires selecting an Integration Identity.');
        }
        
        // Must NOT have naming template or checkout policy
        const forbiddenFields = ['pamNamingTemplate', 'pamCheckoutDurationMinutes', 'pamApprovalRequired', 'pamIdentityType'];
        const foundForbidden = forbiddenFields.filter(f => pamConfig[f] !== undefined && pamConfig[f] !== null && pamConfig[f] !== '');
        if (foundForbidden.length > 0) {
          errors.push(`INTEGRATION_NON_HUMAN identities do not use naming templates or checkout policies. Found: ${foundForbidden.join(', ')}`);
        }
      }
      
      // ═══ RULE B2: HUMAN_INTERACTIVE ═══
      if (identityPurpose === 'HUMAN_INTERACTIVE') {
        // Must have identity strategy
        if (!identityStrategy) {
          errors.push('HUMAN_INTERACTIVE identity purpose requires an identity strategy (STATIC_AGENCY_IDENTITY or CLIENT_DEDICATED_IDENTITY).');
        }
        
        // ═══ RULE B2a: STATIC_AGENCY_IDENTITY ═══
        if (identityStrategy === 'STATIC_AGENCY_IDENTITY') {
          // Must have agency identity selected
          if (!pamConfig.agencyIdentityId && !pamConfig.integrationIdentityId) {
            errors.push('STATIC_AGENCY_IDENTITY strategy requires selecting a pre-configured Agency Identity.');
          }
          
          // Must NOT have naming template or checkout policy
          const forbiddenFields = ['pamNamingTemplate', 'pamIdentityType', 'pamCheckoutDurationMinutes', 'pamApprovalRequired'];
          const foundForbidden = forbiddenFields.filter(f => pamConfig[f] !== undefined && pamConfig[f] !== null && pamConfig[f] !== '');
          if (foundForbidden.length > 0) {
            errors.push(`STATIC_AGENCY_IDENTITY does not use naming templates or checkout policies. Found: ${foundForbidden.join(', ')}`);
          }
        }
        
        // ═══ RULE B2b: CLIENT_DEDICATED_IDENTITY ═══
        if (identityStrategy === 'CLIENT_DEDICATED_IDENTITY') {
          // Must have identity type and naming template
          if (!pamConfig.pamIdentityType) {
            errors.push('CLIENT_DEDICATED_IDENTITY strategy requires an identity type (MAILBOX or GROUP).');
          }
          if (!pamConfig.pamNamingTemplate) {
            errors.push('CLIENT_DEDICATED_IDENTITY strategy requires a naming template.');
          }
          
          // Checkout policy fields ONLY allowed for MAILBOX type
          if (pamConfig.pamIdentityType === 'GROUP') {
            const mailboxOnlyFields = ['pamCheckoutDurationMinutes', 'pamApprovalRequired'];
            const foundMailboxFields = mailboxOnlyFields.filter(f => pamConfig[f] !== undefined && pamConfig[f] !== null);
            if (foundMailboxFields.length > 0) {
              errors.push(`Checkout policy fields are only available for MAILBOX identity type. Found: ${foundMailboxFields.join(', ')}`);
            }
          }
        }
      }
    }
    
    // Security capability checks (PAM recommendation)
    if (secCaps) {
      // If PAM is not_recommended or break_glass_only, require confirmation
      if (secCaps.pamRecommendation === 'not_recommended' || secCaps.pamRecommendation === 'break_glass_only') {
        // For agency-owned PAM with not_recommended, require confirmation
        if (pamOwnership === 'AGENCY_OWNED' && !pamConfig.pamConfirmation) {
          errors.push('PAM confirmation is required. Please acknowledge the security implications before creating shared account access.');
        }
        
        // For break_glass_only, require justification
        if (secCaps.pamRecommendation === 'break_glass_only') {
          const justification = body?.pamJustification || pamConfig.pamJustification;
          const reasonCode = body?.pamReasonCode || pamConfig.pamReasonCode;
          
          if (!justification || justification.length < 20) {
            errors.push('A justification (minimum 20 characters) is required for break-glass PAM access.');
          }
          if (!reasonCode) {
            errors.push('A reason code is required for break-glass PAM access.');
          }
        }
      }
      
      // If platform doesn't support credential login, reject SHARED_ACCOUNT
      if (secCaps.supportsCredentialLogin === false) {
        errors.push(`${manifest.displayName} does not support credential-based login. Shared account access is not available.`);
      }
    }
  }
  
  // 4. Reject agencyConfig containing client-side asset IDs (enforce asset separation)
  const clientAssetIdPatterns = ['clientAssetId', 'clientAccountId', 'clientPropertyId', 'clientAdAccountId'];
  if (agencyConfig && typeof agencyConfig === 'object') {
    for (const key of Object.keys(agencyConfig)) {
      if (clientAssetIdPatterns.some(pattern => key.toLowerCase().includes(pattern.toLowerCase()))) {
        errors.push(`Agency configuration must not contain client-side asset IDs. Found: "${key}". Client assets should only be provided during onboarding.`);
      }
    }
  }
  
  // 5. Reject if accessPattern is manually specified (it must be derived from itemType)
  if (body?.accessPattern && body.accessPattern !== ITEM_TYPE_TO_PATTERN[itemType]) {
    // Just ignore it - we'll override with the derived pattern
    console.warn(`accessPattern "${body.accessPattern}" will be ignored and derived from itemType "${itemType}"`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  const url = new URL(request.url);

  try {
    // GET /api/platforms - List all catalog platforms
    if (path === 'platforms') {
      const clientFacing = url.searchParams.get('clientFacing') === 'true';
      const domain = url.searchParams.get('domain');
      const tier = url.searchParams.get('tier');

      let platforms = await db.getAllCatalogPlatforms();
      
      if (clientFacing) {
        platforms = platforms.filter(p => p.clientFacing);
      }
      if (domain) {
        platforms = platforms.filter(p => p.domain === domain);
      }
      if (tier) {
        platforms = platforms.filter(p => p.tier === parseInt(tier));
      }

      return NextResponse.json({ success: true, data: platforms });
    }

    // GET /api/platforms/:id - Get single platform
    if (path.match(/^platforms\/[^/]+$/)) {
      const platformId = path.split('/')[1];
      const platform = await db.getCatalogPlatformById(platformId);
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Platform not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: platform });
    }

    // GET /api/clients - List all clients
    if (path === 'clients') {
      const clients = await db.getAllClients();
      return NextResponse.json({ success: true, data: clients });
    }

    // GET /api/clients/:id - Get single client
    if (path.match(/^clients\/[^/]+$/)) {
      const clientId = path.split('/')[1];
      const client = await db.getClientById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: client });
    }

    // GET /api/clients/:id/requests OR /api/clients/:id/access-requests - Get client's access requests
    if (path.match(/^clients\/[^/]+\/requests$/) || path.match(/^clients\/[^/]+\/access-requests$/)) {
      const clientId = path.split('/')[1];
      const requests = await db.getAccessRequestsByClientId(clientId);
      return NextResponse.json({ success: true, data: requests });
    }

    // GET /api/agency/platforms - List agency's configured platforms
    if (path === 'agency/platforms') {
      const agencyPlatforms = await db.getAllAgencyPlatforms();
      
      // Enrich with plugin manifest data (full manifest for access type detection)
      const enrichedPlatforms = agencyPlatforms.map(ap => {
        const platformKey = getPlatformKeyFromName(ap.platform?.name);
        if (platformKey && PluginRegistry.has(platformKey)) {
          const plugin = PluginRegistry.get(platformKey);
          if (plugin && plugin.manifest) {
            return {
              ...ap,
              platform: {
                ...ap.platform,
                platformKey: plugin.manifest.platformKey,
                displayName: plugin.manifest.displayName,
                logoPath: plugin.manifest.logoPath,
                brandColor: plugin.manifest.brandColor,
                category: plugin.manifest.category,
              },
              // Include full manifest for frontend to access supportedAccessItemTypes, securityCapabilities, etc.
              manifest: plugin.manifest
            };
          }
        }
        return ap;
      });
      
      return NextResponse.json({ success: true, data: enrichedPlatforms });
    }

    // GET /api/agency/platforms/:id - Get single agency platform with items
    if (path.match(/^agency\/platforms\/[^/]+$/) && !path.endsWith('/toggle')) {
      const apId = path.split('/')[2];
      const ap = await db.getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      
      // Enrich with plugin manifest data (full manifest for frontend)
      const platformKey = getPlatformKeyFromName(ap.platform?.name);
      if (platformKey && PluginRegistry.has(platformKey)) {
        const plugin = PluginRegistry.get(platformKey);
        if (plugin && plugin.manifest) {
          const enrichedAp = {
            ...ap,
            platform: {
              ...ap.platform,
              platformKey: plugin.manifest.platformKey,
              displayName: plugin.manifest.displayName,
              logoPath: plugin.manifest.logoPath,
              brandColor: plugin.manifest.brandColor,
              category: plugin.manifest.category,
            },
            // Include full manifest for frontend to access supportedAccessItemTypes, securityCapabilities, etc.
            manifest: plugin.manifest
          };
          return NextResponse.json({ success: true, data: enrichedAp });
        }
      }
      
      return NextResponse.json({ success: true, data: ap });
    }

    // GET /api/access-requests - List all access requests
    if (path === 'access-requests') {
      const requests = await db.getAllAccessRequests();
      return NextResponse.json({ success: true, data: requests });
    }

    // GET /api/access-requests/:id - Get single access request
    if (path.match(/^access-requests\/[^/]+$/)) {
      const reqId = path.split('/')[1];
      const req = await db.getAccessRequestById(reqId);
      if (!req) {
        return NextResponse.json({ success: false, error: 'Access request not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: req });
    }

    // GET /api/onboarding/:token - Get access request by token (for client onboarding)
    if (path.match(/^onboarding\/[^/]+$/)) {
      const token = path.split('/')[1];
      const req = await db.getAccessRequestByToken(token);
      if (!req) {
        return NextResponse.json({ success: false, error: 'Invalid onboarding token' }, { status: 404 });
      }
      
      // Enhance items with plugin schemas and instructions
      const enhancedItems = await Promise.all((req.items || []).map(async (item) => {
        const platformName = item.platform?.name;
        if (!platformName) return item;
        
        // Get platform key
        const platformKey = getPlatformKeyFromName(platformName);
        if (!platformKey || !PluginRegistry.has(platformKey)) return item;
        
        // Get client target schema
        const clientTargetSchema = PluginRegistry.getClientTargetJsonSchema(platformKey, item.itemType);
        
        // Build instructions using plugin
        const instructions = PluginRegistry.buildInstructions(platformKey, {
          accessItemType: item.itemType,
          agencyConfig: item.agencyConfigJson || item.agencyData || {},
          roleTemplate: item.role,
          clientName: req.client?.name,
          generatedIdentity: item.resolvedIdentity
        });
        
        return {
          ...item,
          clientTargetSchema,
          pluginInstructions: instructions,
          verificationMode: PluginRegistry.getVerificationMode(platformKey, item.itemType)
        };
      }));
      
      return NextResponse.json({ 
        success: true, 
        data: { ...req, items: enhancedItems }
      });
    }

    // GET /api/integration-identities - List all integration identities
    if (path === 'integration-identities') {
      const platformId = url.searchParams.get('platformId');
      const type = url.searchParams.get('type');
      const isActive = url.searchParams.get('isActive');
      
      const filters = {};
      if (platformId) filters.platformId = platformId;
      if (type) filters.type = type;
      if (isActive !== null && isActive !== undefined) filters.isActive = isActive === 'true';
      
      const identities = await db.getAllIntegrationIdentities(filters);
      return NextResponse.json({ success: true, data: identities });
    }

    // GET /api/agency-identities - Get agency identities for the "Agency Identity" dropdown
    // Returns SHARED_CREDENTIAL and SERVICE_ACCOUNT type identities that can be used for STATIC_AGENCY_IDENTITY
    if (path === 'agency-identities') {
      const platformId = url.searchParams.get('platformId');
      const isActive = url.searchParams.get('isActive');
      
      const filters = {};
      if (platformId) filters.platformId = platformId;
      // Default to active identities only unless explicitly requested otherwise
      filters.isActive = isActive === 'false' ? false : true;
      
      const identities = await db.getAgencyIdentities(filters);
      return NextResponse.json({ success: true, data: identities });
    }

    // GET /api/client-asset-fields - Get asset fields for onboarding
    if (path === 'client-asset-fields') {
      const platformName = url.searchParams.get('platformName') || '';
      const itemType = url.searchParams.get('itemType') || 'NAMED_INVITE';
      const { getClientAssetFields } = await import('@/lib/data/client-asset-fields.js');
      const fields = getClientAssetFields(platformName, itemType);
      return NextResponse.json({ success: true, fields });
    }

    // GET /api/audit-logs - Get audit logs
    if (path === 'audit-logs') {
      const logs = await db.getAuditLogs();
      return NextResponse.json({ success: true, data: logs });
    }

    // GET /api/pam/sessions - Get active PAM sessions
    if (path === 'pam/sessions') {
      const sessions = await db.getActivePamSessions();
      return NextResponse.json({ success: true, data: sessions });
    }

    // ─── PLUGIN API ENDPOINTS ─────────────────────────────────────────────────────

    // GET /api/plugins - List all registered plugins
    if (path === 'plugins') {
      const manifests = PluginRegistry.getAllManifests();
      return NextResponse.json({ success: true, data: manifests });
    }

    // GET /api/plugins/:platformKey - Get plugin details
    if (path.match(/^plugins\/[^/]+$/)) {
      const platformKey = path.split('/')[1];
      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: 'Plugin not found' }, { status: 404 });
      }
      return NextResponse.json({ 
        success: true, 
        data: {
          manifest: plugin.manifest,
          supportedAccessItemTypes: plugin.manifest.supportedAccessItemTypes,
          supportedRoleTemplates: plugin.manifest.supportedRoleTemplates,
        }
      });
    }

    // GET /api/plugins/:platformKey/schema/agency-config?accessItemType=X
    if (path.match(/^plugins\/[^/]+\/schema\/agency-config$/)) {
      const platformKey = path.split('/')[1];
      const accessItemType = url.searchParams.get('accessItemType');
      
      if (!accessItemType) {
        return NextResponse.json({ success: false, error: 'accessItemType query param required' }, { status: 400 });
      }
      
      const schema = PluginRegistry.getAgencyConfigJsonSchema(platformKey, accessItemType);
      if (!schema) {
        return NextResponse.json({ success: false, error: 'Schema not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: schema });
    }

    // GET /api/plugins/:platformKey/schema/client-target?accessItemType=X
    if (path.match(/^plugins\/[^/]+\/schema\/client-target$/)) {
      const platformKey = path.split('/')[1];
      const accessItemType = url.searchParams.get('accessItemType');
      
      if (!accessItemType) {
        return NextResponse.json({ success: false, error: 'accessItemType query param required' }, { status: 400 });
      }
      
      const schema = PluginRegistry.getClientTargetJsonSchema(platformKey, accessItemType);
      if (!schema) {
        return NextResponse.json({ success: false, error: 'Schema not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: schema });
    }

    // GET /api/plugins/:platformKey/schema/request-options?accessItemType=X
    if (path.match(/^plugins\/[^/]+\/schema\/request-options$/)) {
      const platformKey = path.split('/')[1];
      const accessItemType = url.searchParams.get('accessItemType');
      
      if (!accessItemType) {
        return NextResponse.json({ success: false, error: 'accessItemType query param required' }, { status: 400 });
      }
      
      const schema = PluginRegistry.getRequestOptionsJsonSchema(platformKey, accessItemType);
      // Request options schema is optional, so return empty object if not found
      return NextResponse.json({ success: true, data: schema || {} });
    }

    // GET /api/plugins/:platformKey/roles
    if (path.match(/^plugins\/[^/]+\/roles$/)) {
      const platformKey = path.split('/')[1];
      const roles = PluginRegistry.getRoleTemplates(platformKey);
      return NextResponse.json({ success: true, data: roles });
    }

    // GET /api/plugins/:platformKey/access-types
    if (path.match(/^plugins\/[^/]+\/access-types$/)) {
      const platformKey = path.split('/')[1];
      const types = PluginRegistry.getSupportedAccessItemTypes(platformKey);
      return NextResponse.json({ success: true, data: types });
    }

    // GET /api/oauth/status - Get OAuth configuration status for all providers
    if (path === 'oauth/status') {
      const { getProvidersStatus } = await import('@/plugins/common/oauth-config');
      const status = getProvidersStatus();
      return NextResponse.json({ success: true, data: status });
    }

    // GET /api/oauth/:platformKey/status - Get OAuth configuration status for a specific platform
    if (path.match(/^oauth\/[^/]+\/status$/)) {
      const platformKey = path.split('/')[1];
      const providerKey = getProviderForPlatform(platformKey);
      
      if (!providerKey) {
        return NextResponse.json({ 
          success: true, 
          data: { 
            platformKey,
            oauthSupported: false,
            configured: false,
            message: `Platform ${platformKey} does not support OAuth`
          }
        });
      }

      const providerConfig = getProviderConfig(providerKey);
      const configured = isProviderConfigured(providerKey);

      return NextResponse.json({ 
        success: true, 
        data: { 
          platformKey,
          provider: providerKey,
          oauthSupported: true,
          configured,
          displayName: providerConfig?.displayName,
          developerPortalUrl: providerConfig?.developerPortalUrl,
          requiredEnvVars: providerConfig?.envVars ? [providerConfig.envVars.clientId, providerConfig.envVars.clientSecret] : []
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  const body = await getBody(request);

  try {
    // POST /api/clients - Create new client
    if (path === 'clients') {
      const { name, email } = body || {};
      if (!name || !email) {
        return NextResponse.json({ success: false, error: 'name and email are required' }, { status: 400 });
      }
      const client = await db.createClient({
        id: uuidv4(),
        name,
        email
      });
      return NextResponse.json({ success: true, data: client });
    }

    // POST /api/agency/platforms - Add platform to agency
    if (path === 'agency/platforms') {
      const { platformId } = body || {};
      if (!platformId) {
        return NextResponse.json({ success: false, error: 'platformId is required' }, { status: 400 });
      }
      
      // Check if platform exists
      const platform = await db.getCatalogPlatformById(platformId);
      if (!platform) {
        return NextResponse.json({ success: false, error: 'Platform not found' }, { status: 404 });
      }
      
      // Check if already added
      const existing = await db.getAgencyPlatformByPlatformId(platformId);
      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }

      const ap = await db.createAgencyPlatform({
        id: uuidv4(),
        platformId,
        isEnabled: true
      });
      return NextResponse.json({ success: true, data: ap });
    }

    // POST /api/agency/platforms/:id/items - Add access item to agency platform
    if (path.match(/^agency\/platforms\/[^/]+\/items$/)) {
      const apId = path.split('/')[2];
      const ap = await db.getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }

      const {
        itemType, label, role, notes,
        identityPurpose, humanIdentityStrategy, agencyGroupEmail,
        integrationIdentityId, agencyData, pamConfig, validationMethod,
        agencyConfigJson // New plugin architecture field
      } = body || {};

      // Derive pattern from itemType - use proper pattern label
      const derivedPattern = ITEM_TYPE_TO_PATTERN[itemType] || itemType;
      const itemTypeLabels = {
        'NAMED_INVITE': 'Named Invite',
        'PARTNER_DELEGATION': 'Partner Delegation',
        'GROUP_ACCESS': 'Group / Service Account',
        'PROXY_TOKEN': 'API / Integration Token',
        'SHARED_ACCOUNT_PAM': 'Shared Account (PAM)'
      };
      const patternLabel = itemTypeLabels[itemType] || derivedPattern;

      if (!itemType || !label || !role) {
        return NextResponse.json({ success: false, error: 'itemType, label and role are required' }, { status: 400 });
      }

      // Get platform key for plugin
      const platform = ap.platform;
      const platformKey = getPlatformKeyFromName(platform?.name);

      // Check supportedItemTypes from plugin or platform
      if (platformKey && PluginRegistry.has(platformKey)) {
        const supportedTypes = PluginRegistry.getSupportedAccessItemTypes(platformKey);
        // Map legacy types to plugin types for checking
        const checkType = itemType === 'GROUP_ACCESS' ? 'GROUP_SERVICE' : 
                         itemType === 'SHARED_ACCOUNT_PAM' ? 'PAM_SHARED_ACCOUNT' : itemType;
        if (supportedTypes.length > 0 && !supportedTypes.includes(checkType)) {
          return NextResponse.json({
            success: false,
            error: `Item type "${itemType}" is not supported by ${platform.name}. Supported types: ${supportedTypes.join(', ')}`
          }, { status: 400 });
        }
      } else if (platform?.supportedItemTypes?.length > 0 && !platform.supportedItemTypes.includes(itemType)) {
        return NextResponse.json({
          success: false,
          error: `Item type "${itemType}" is not supported by ${platform.name}. Supported types: ${platform.supportedItemTypes.join(', ')}`
        }, { status: 400 });
      }

      // Run comprehensive validation with platform context
      const validation = validateAccessItemPayload(body, platform?.name || '');
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.errors.join(' ')
        }, { status: 400 });
      }

      // NEW: Validate against plugin-driven PAM governance rules
      const pluginValidation = validateAgainstPluginRules(platformKey, itemType, role, agencyConfigJson, body);
      if (!pluginValidation.valid) {
        return NextResponse.json({
          success: false,
          error: pluginValidation.errors.join(' ')
        }, { status: 400 });
      }

      const item = await db.createAccessItem(apId, {
        id: uuidv4(),
        itemType,
        accessPattern: derivedPattern,
        patternLabel: patternLabel,
        label,
        role,
        notes,
        identityPurpose,
        humanIdentityStrategy,
        agencyGroupEmail,
        integrationIdentityId,
        agencyData,
        pamConfig,
        validationMethod: validationMethod || 'ATTESTATION',
        // New plugin architecture fields
        agencyConfigJson: agencyConfigJson || null,
        platformKey: platformKey,
        pluginVersion: '1.0.0',
        migrationStatus: 'MIGRATED'
      });

      const updatedAp = await db.getAgencyPlatformById(apId);
      return NextResponse.json({ success: true, data: updatedAp });
    }

    // POST /api/access-requests - Create access request
    if (path === 'access-requests') {
      const { clientId, items = [], notes } = body || {};
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
      }

      const client = await db.getClientById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }

      const requestId = uuidv4();
      const token = uuidv4();

      // Create the access request
      await db.createAccessRequest({
        id: requestId,
        clientId,
        token,
        notes
      });

      // Create access request items
      for (const item of items) {
        const platform = await db.getCatalogPlatformById(item.platformId);
        
        // Generate resolved identity
        let resolvedIdentity = null;
        if (item.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
          resolvedIdentity = item.agencyGroupEmail;
        } else if (item.pamIdentityStrategy === 'CLIENT_DEDICATED' && item.pamNamingTemplate) {
          resolvedIdentity = generateClientDedicatedIdentity(item.pamNamingTemplate, client, platform);
        } else if (item.pamIdentityStrategy === 'STATIC' && item.pamAgencyIdentityEmail) {
          resolvedIdentity = item.pamAgencyIdentityEmail;
        }

        // Build PAM config
        let pamConfig = null;
        if (item.itemType === 'SHARED_ACCOUNT_PAM') {
          pamConfig = {
            ownership: item.pamOwnership,
            identityStrategy: item.pamIdentityStrategy,
            identityType: item.pamIdentityType,
            namingTemplate: item.pamNamingTemplate,
            agencyIdentityEmail: item.pamAgencyIdentityEmail,
            roleTemplate: item.pamRoleTemplate,
            grantMethod: item.pamOwnership === 'AGENCY_OWNED' ? 'INVITE_AGENCY_IDENTITY' : 'CREDENTIAL_HANDOFF'
          };
        }

        await db.createAccessRequestItem({
          id: uuidv4(),
          accessRequestId: requestId,
          platformId: item.platformId,
          itemType: item.itemType,
          accessPattern: item.accessPattern || ITEM_TYPE_TO_PATTERN[item.itemType],
          patternLabel: item.patternLabel,
          role: item.role,
          assetName: item.assetName,
          identityPurpose: item.identityPurpose,
          humanIdentityStrategy: item.humanIdentityStrategy,
          resolvedIdentity,
          agencyGroupEmail: item.agencyGroupEmail,
          agencyData: item.agencyData,
          pamOwnership: item.pamOwnership,
          pamConfig,
          clientInstructions: getClientInstructions(platform?.name, item.itemType, item.agencyData),
          status: 'pending'
        });
      }

      // Add audit log
      await db.addAuditLog({
        event: 'ACCESS_REQUEST_CREATED',
        actor: 'admin',
        requestId,
        details: { clientId, clientName: client.name, itemCount: items.length }
      });

      const createdRequest = await db.getAccessRequestById(requestId);
      return NextResponse.json({ success: true, data: createdRequest });
    }

    // POST /api/onboarding/:token/items/:itemId/attest - Client attestation
    if (path.match(/^onboarding\/[^/]+\/items\/[^/]+\/attest$/)) {
      const parts = path.split('/');
      const token = parts[1];
      const itemId = parts[3];
      const { attestationText, evidenceBase64, evidenceFileName, clientProvidedTarget } = body || {};

      const req = await db.getAccessRequestByToken(token);
      if (!req) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
      }

      const item = req.items.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }

      // Update item
      await db.updateAccessRequestItem(itemId, {
        status: 'validated',
        validatedAt: new Date(),
        validatedBy: 'client_attestation',
        validationMode: 'ATTESTATION',
        clientProvidedTarget,
        validationResult: {
          timestamp: new Date(),
          actor: 'client',
          attestationText,
          evidenceFileName,
          clientProvidedTarget
        }
      });

      // Check if all items are done
      const updatedReq = await db.getAccessRequestById(req.id);
      const allDone = updatedReq.items.every(i => i.status === 'validated');
      if (allDone) {
        await db.updateAccessRequest(req.id, { completedAt: new Date() });
      }

      await db.addAuditLog({
        event: 'ACCESS_VALIDATED',
        actor: 'client',
        requestId: req.id,
        itemId,
        platformId: item.platformId,
        details: { attestationText, clientProvidedTarget }
      });

      const finalReq = await db.getAccessRequestById(req.id);
      return NextResponse.json({ success: true, data: finalReq });
    }

    // POST /api/onboarding/:token/items/:itemId/submit-credentials - PAM credential submission
    if (path.match(/^onboarding\/[^/]+\/items\/[^/]+\/submit-credentials$/)) {
      const parts = path.split('/');
      const token = parts[1];
      const itemId = parts[3];
      const { username, password, clientProvidedTarget } = body || {};

      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'username and password are required' }, { status: 400 });
      }

      const req = await db.getAccessRequestByToken(token);
      if (!req) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
      }

      const item = req.items.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }

      const ownership = item.pamOwnership || item.pamConfig?.ownership;
      if (ownership !== 'CLIENT_OWNED') {
        return NextResponse.json({ success: false, error: 'This item is not a CLIENT_OWNED shared account' }, { status: 400 });
      }

      // Store credentials (in production: encrypt and store in vault)
      const secretRef = Buffer.from(JSON.stringify({ username, passwordHint: password.slice(0, 1) + '***' })).toString('base64');

      await db.updateAccessRequestItem(itemId, {
        status: 'validated',
        validatedAt: new Date(),
        validatedBy: 'client_credential_submission',
        validationMode: 'AUTO',
        pamUsername: username,
        pamSecretRef: secretRef,
        clientProvidedTarget,
        validationResult: {
          timestamp: new Date(),
          actor: 'client',
          mode: 'CREDENTIAL_HANDOFF',
          details: `Credentials submitted for username: ${username}`,
          clientProvidedTarget
        }
      });

      const updatedReq = await db.getAccessRequestById(req.id);
      const allDone = updatedReq.items.every(i => i.status === 'validated');
      if (allDone) {
        await db.updateAccessRequest(req.id, { completedAt: new Date() });
      }

      await db.addAuditLog({
        event: 'CREDENTIAL_SUBMITTED',
        actor: 'client',
        requestId: req.id,
        itemId,
        platformId: item.platformId,
        details: { username, clientProvidedTarget }
      });

      const finalReq = await db.getAccessRequestById(req.id);
      return NextResponse.json({ success: true, data: finalReq });
    }

    // POST /api/integration-identities - Create integration identity
    if (path === 'integration-identities') {
      const { name, type, identifier, description, platformId, metadata } = body || {};
      if (!name || !type || !identifier) {
        return NextResponse.json({ success: false, error: 'name, type, and identifier are required' }, { status: 400 });
      }
      
      // Validate platformId if provided
      if (platformId) {
        const platform = await db.getCatalogPlatformById(platformId);
        if (!platform) {
          return NextResponse.json({ success: false, error: 'Invalid platformId - platform not found' }, { status: 400 });
        }
      }
      
      const identity = await db.createIntegrationIdentity({
        id: uuidv4(),
        name,
        type,
        identifier,
        description,
        platformId: platformId || null,
        isActive: true,
        metadata
      });
      return NextResponse.json({ success: true, data: identity });
    }

    // POST /api/pam/checkout - Checkout PAM credentials
    if (path === 'pam/checkout') {
      const { requestId, itemId, userId } = body || {};
      if (!requestId || !itemId || !userId) {
        return NextResponse.json({ success: false, error: 'requestId, itemId, and userId are required' }, { status: 400 });
      }

      const req = await db.getAccessRequestById(requestId);
      if (!req) {
        return NextResponse.json({ success: false, error: 'Access request not found' }, { status: 404 });
      }

      const item = req.items.find(i => i.id === itemId);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }

      const durationMinutes = item.pamConfig?.checkoutPolicy?.durationMinutes || 60;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const session = await db.createPamSession({
        id: uuidv4(),
        requestId,
        itemId,
        platformId: item.platformId,
        userId,
        expiresAt,
        status: 'active',
        credentialRef: item.pamSecretRef
      });

      await db.addAuditLog({
        event: 'PAM_CHECKOUT',
        actor: userId,
        requestId,
        itemId,
        platformId: item.platformId,
        details: { sessionId: session.id, expiresAt }
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId: session.id,
          expiresAt,
          credentials: item.pamSecretRef ? JSON.parse(Buffer.from(item.pamSecretRef, 'base64').toString()) : null
        }
      });
    }

    // POST /api/pam/checkin - Checkin PAM credentials
    if (path === 'pam/checkin') {
      const { sessionId, userId } = body || {};
      if (!sessionId) {
        return NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
      }

      const session = await db.getPamSessionById(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      await db.updatePamSession(sessionId, {
        status: 'checked_in',
        checkedInAt: new Date()
      });

      await db.addAuditLog({
        event: 'PAM_CHECKIN',
        actor: userId || 'system',
        requestId: session.requestId,
        itemId: session.itemId,
        platformId: session.platformId,
        details: { sessionId }
      });

      return NextResponse.json({ success: true, message: 'Checked in successfully' });
    }

    // ─── PLUGIN VALIDATION ENDPOINTS ─────────────────────────────────────────────

    // POST /api/plugins/:platformKey/validate/agency-config - Validate agency config
    if (path.match(/^plugins\/[^/]+\/validate\/agency-config$/)) {
      const platformKey = path.split('/')[1];
      const { accessItemType, config } = body || {};
      
      if (!accessItemType || !config) {
        return NextResponse.json({ success: false, error: 'accessItemType and config are required' }, { status: 400 });
      }
      
      const result = PluginRegistry.validateAgencyConfig(platformKey, accessItemType, config);
      return NextResponse.json({ success: true, data: result });
    }

    // POST /api/plugins/:platformKey/validate/client-target - Validate client target
    if (path.match(/^plugins\/[^/]+\/validate\/client-target$/)) {
      const platformKey = path.split('/')[1];
      const { accessItemType, target } = body || {};
      
      if (!accessItemType || !target) {
        return NextResponse.json({ success: false, error: 'accessItemType and target are required' }, { status: 400 });
      }
      
      const result = PluginRegistry.validateClientTarget(platformKey, accessItemType, target);
      return NextResponse.json({ success: true, data: result });
    }

    // POST /api/plugins/:platformKey/instructions - Build client instructions
    if (path.match(/^plugins\/[^/]+\/instructions$/)) {
      const platformKey = path.split('/')[1];
      const { accessItemType, agencyConfig, clientTarget, roleTemplate, clientName, generatedIdentity } = body || {};
      
      if (!accessItemType) {
        return NextResponse.json({ success: false, error: 'accessItemType is required' }, { status: 400 });
      }
      
      const instructions = PluginRegistry.buildInstructions(platformKey, {
        accessItemType,
        agencyConfig: agencyConfig || {},
        clientTarget,
        roleTemplate: roleTemplate || '',
        clientName,
        generatedIdentity
      });
      
      return NextResponse.json({ success: true, data: instructions });
    }

    // ─── OAUTH ENDPOINTS ─────────────────────────────────────────────────────────

    // POST /api/oauth/:platformKey/start - Start OAuth flow
    if (path.match(/^oauth\/[^/]+\/start$/)) {
      const platformKey = path.split('/')[1];
      const { redirectUri, ...extraParams } = body || {};
      
      if (!redirectUri) {
        return NextResponse.json({ success: false, error: 'redirectUri is required' }, { status: 400 });
      }

      // Check if OAuth provider is configured (fail fast with clear message)
      const providerKey = getProviderForPlatform(platformKey);
      if (providerKey && !isProviderConfigured(providerKey)) {
        const providerConfig = getProviderConfig(providerKey);
        return NextResponse.json({ 
          success: false, 
          error: `${providerConfig?.displayName || platformKey} OAuth is not configured. Please set the required environment variables.`,
          details: {
            provider: providerKey,
            requiredEnvVars: providerConfig?.envVars ? [providerConfig.envVars.clientId, providerConfig.envVars.clientSecret] : [],
            developerPortalUrl: providerConfig?.developerPortalUrl || ''
          }
        }, { status: 501 });
      }

      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: `Plugin not found: ${platformKey}` }, { status: 404 });
      }

      // Check if plugin supports OAuth
      if (!plugin.startOAuth && typeof plugin.startOAuth !== 'function') {
        return NextResponse.json({ 
          success: false, 
          error: `Plugin ${platformKey} does not support OAuth. Check manifest.automationCapabilities.oauthSupported` 
        }, { status: 400 });
      }

      try {
        const result = await plugin.startOAuth({ redirectUri, ...extraParams });
        return NextResponse.json({ 
          success: true, 
          data: {
            authUrl: result.authUrl,
            state: result.state,
            platformKey,
          }
        });
      } catch (error) {
        // Handle OAuthNotConfiguredError specifically
        if (error instanceof OAuthNotConfiguredError) {
          return NextResponse.json({ 
            success: false, 
            error: error.message,
            details: error.toJSON()
          }, { status: 501 });
        }
        return NextResponse.json({ 
          success: false, 
          error: `Failed to start OAuth: ${error.message}` 
        }, { status: 500 });
      }
    }

    // POST /api/oauth/:platformKey/callback - Handle OAuth callback
    if (path.match(/^oauth\/[^/]+\/callback$/)) {
      const platformKey = path.split('/')[1];
      const { code, state, redirectUri, ...extraParams } = body || {};
      
      if (!code) {
        return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });
      }

      // Check if OAuth provider is configured (fail fast with clear message)
      const providerKey = getProviderForPlatform(platformKey);
      if (providerKey && !isProviderConfigured(providerKey)) {
        const providerConfig = getProviderConfig(providerKey);
        return NextResponse.json({ 
          success: false, 
          error: `${providerConfig?.displayName || platformKey} OAuth is not configured. Please set the required environment variables.`,
          details: {
            provider: providerKey,
            requiredEnvVars: providerConfig?.envVars ? [providerConfig.envVars.clientId, providerConfig.envVars.clientSecret] : [],
            developerPortalUrl: providerConfig?.developerPortalUrl || ''
          }
        }, { status: 501 });
      }

      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: `Plugin not found: ${platformKey}` }, { status: 404 });
      }

      if (!plugin.handleOAuthCallback && typeof plugin.handleOAuthCallback !== 'function') {
        return NextResponse.json({ 
          success: false, 
          error: `Plugin ${platformKey} does not support OAuth callbacks` 
        }, { status: 400 });
      }

      try {
        const result = await plugin.handleOAuthCallback({ code, state, redirectUri, ...extraParams });
        
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          data: {
            platformKey,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            tokenType: result.tokenType,
            scopes: result.scopes,
          }
        });
      } catch (error) {
        // Handle OAuthNotConfiguredError specifically
        if (error instanceof OAuthNotConfiguredError) {
          return NextResponse.json({ 
            success: false, 
            error: error.message,
            details: error.toJSON()
          }, { status: 501 });
        }
        return NextResponse.json({ 
          success: false, 
          error: `OAuth callback failed: ${error.message}` 
        }, { status: 500 });
      }
    }

    // POST /api/oauth/:platformKey/refresh - Refresh OAuth token
    if (path.match(/^oauth\/[^/]+\/refresh$/)) {
      const platformKey = path.split('/')[1];
      const { refreshToken, ...extraParams } = body || {};
      
      if (!refreshToken) {
        return NextResponse.json({ success: false, error: 'refreshToken is required' }, { status: 400 });
      }

      // Check if OAuth provider is configured (fail fast with clear message)
      const providerKey = getProviderForPlatform(platformKey);
      if (providerKey && !isProviderConfigured(providerKey)) {
        const providerConfig = getProviderConfig(providerKey);
        return NextResponse.json({ 
          success: false, 
          error: `${providerConfig?.displayName || platformKey} OAuth is not configured. Please set the required environment variables.`,
          details: {
            provider: providerKey,
            requiredEnvVars: providerConfig?.envVars ? [providerConfig.envVars.clientId, providerConfig.envVars.clientSecret] : [],
            developerPortalUrl: providerConfig?.developerPortalUrl || ''
          }
        }, { status: 501 });
      }

      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: `Plugin not found: ${platformKey}` }, { status: 404 });
      }

      try {
        const result = await plugin.refreshToken(refreshToken, extraParams.redirectUri || '');
        
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          data: {
            platformKey,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            tokenType: result.tokenType,
          }
        });
      } catch (error) {
        // Handle OAuthNotConfiguredError specifically
        if (error instanceof OAuthNotConfiguredError) {
          return NextResponse.json({ 
            success: false, 
            error: error.message,
            details: error.toJSON()
          }, { status: 501 });
        }
        return NextResponse.json({ 
          success: false, 
          error: `Token refresh failed: ${error.message}` 
        }, { status: 500 });
      }
    }

    // POST /api/oauth/:platformKey/fetch-accounts - Fetch accounts using OAuth token
    if (path.match(/^oauth\/[^/]+\/fetch-accounts$/)) {
      const platformKey = path.split('/')[1];
      const { accessToken, tokenType } = body || {};
      
      if (!accessToken) {
        return NextResponse.json({ success: false, error: 'accessToken is required' }, { status: 400 });
      }

      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: `Plugin not found: ${platformKey}` }, { status: 404 });
      }

      try {
        const accounts = await plugin.fetchAccounts({ 
          success: true, 
          accessToken, 
          tokenType: tokenType || 'Bearer' 
        });
        
        return NextResponse.json({ 
          success: true, 
          data: {
            platformKey,
            accounts,
          }
        });
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          error: `Failed to fetch accounts: ${error.message}` 
        }, { status: 500 });
      }
    }

    // POST /api/oauth/:platformKey/discover-targets - Discover accessible targets using OAuth token
    if (path.match(/^oauth\/[^/]+\/discover-targets$/)) {
      const platformKey = path.split('/')[1];
      const { accessToken, tokenType } = body || {};
      
      if (!accessToken) {
        return NextResponse.json({ success: false, error: 'accessToken is required' }, { status: 400 });
      }

      // Check if OAuth provider is configured
      const providerKey = getProviderForPlatform(platformKey);
      if (providerKey && !isProviderConfigured(providerKey)) {
        const providerConfig = getProviderConfig(providerKey);
        return NextResponse.json({ 
          success: false, 
          error: `${providerConfig?.displayName || platformKey} OAuth is not configured.`,
          details: {
            provider: providerKey,
            developerPortalUrl: providerConfig?.developerPortalUrl || ''
          }
        }, { status: 501 });
      }

      const plugin = PluginRegistry.get(platformKey);
      if (!plugin) {
        return NextResponse.json({ success: false, error: `Plugin not found: ${platformKey}` }, { status: 404 });
      }

      // Check if plugin supports target discovery
      if (!plugin.discoverTargets || typeof plugin.discoverTargets !== 'function') {
        return NextResponse.json({ 
          success: false, 
          error: `Plugin ${platformKey} does not support target discovery. Check manifest.automationCapabilities.discoverTargetsSupported` 
        }, { status: 400 });
      }

      try {
        const result = await plugin.discoverTargets({ 
          success: true, 
          accessToken, 
          tokenType: tokenType || 'Bearer' 
        });
        
        if (!result.success) {
          return NextResponse.json({ 
            success: false, 
            error: result.error || 'Target discovery failed'
          }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          data: {
            platformKey,
            targets: result.targets || [],
            targetTypes: plugin.manifest?.automationCapabilities?.targetTypes || [],
          }
        });
      } catch (error) {
        // Handle OAuthNotConfiguredError specifically
        if (error instanceof OAuthNotConfiguredError) {
          return NextResponse.json({ 
            success: false, 
            error: error.message,
            details: error.toJSON()
          }, { status: 501 });
        }
        return NextResponse.json({ 
          success: false, 
          error: `Target discovery failed: ${error.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  const body = await getBody(request);

  try {
    // PUT /api/clients/:id - Update client
    if (path.match(/^clients\/[^/]+$/)) {
      const clientId = path.split('/')[1];
      const { name, email } = body || {};
      const client = await db.updateClient(clientId, { name, email });
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: client });
    }

    // PUT /api/agency/platforms/:id/items/:itemId - Update access item
    if (path.match(/^agency\/platforms\/[^/]+\/items\/[^/]+$/)) {
      const parts = path.split('/');
      const apId = parts[2];
      const itemId = parts[4];

      const ap = await db.getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }

      const existingItem = ap.accessItems?.find(i => i.id === itemId);
      if (!existingItem) {
        return NextResponse.json({ success: false, error: 'Access item not found' }, { status: 404 });
      }

      const {
        itemType, label, role, notes, accessPattern,
        identityPurpose, humanIdentityStrategy, agencyGroupEmail,
        agencyData, pamConfig, validationMethod
      } = body || {};

      // Derive pattern from itemType if provided
      const derivedPattern = itemType ? (ITEM_TYPE_TO_PATTERN[itemType] || itemType) : accessPattern;

      if (!label || !role) {
        return NextResponse.json({ success: false, error: 'label and role are required' }, { status: 400 });
      }

      // Validate Named Invite - CLIENT_DEDICATED not allowed
      if (itemType === 'NAMED_INVITE' && humanIdentityStrategy === 'CLIENT_DEDICATED') {
        return NextResponse.json({
          success: false,
          error: 'CLIENT_DEDICATED identity strategy is not allowed for Named Invite items.'
        }, { status: 400 });
      }

      await db.updateAccessItem(itemId, {
        itemType,
        accessPattern: derivedPattern,
        patternLabel: derivedPattern,
        label,
        role,
        notes,
        identityPurpose,
        humanIdentityStrategy,
        agencyGroupEmail,
        agencyData,
        pamConfig,
        validationMethod
      });

      const updatedAp = await db.getAgencyPlatformById(apId);
      return NextResponse.json({ success: true, data: updatedAp });
    }

    // PUT /api/integration-identities/:id - Update integration identity
    if (path.match(/^integration-identities\/[^/]+$/)) {
      const identityId = path.split('/')[1];
      const updated = await db.updateIntegrationIdentity(identityId, body);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';

  try {
    // DELETE /api/clients/:id - Delete client
    if (path.match(/^clients\/[^/]+$/)) {
      const clientId = path.split('/')[1];
      await db.deleteClient(clientId);
      return NextResponse.json({ success: true, message: 'Client deleted' });
    }

    // DELETE /api/agency/platforms/:id - Remove agency platform
    if (path.match(/^agency\/platforms\/[^/]+$/)) {
      const apId = path.split('/')[1];
      await db.deleteAgencyPlatform(apId);
      return NextResponse.json({ success: true, message: 'Agency platform removed' });
    }

    // DELETE /api/agency/platforms/:id/items/:itemId - Delete access item
    if (path.match(/^agency\/platforms\/[^/]+\/items\/[^/]+$/)) {
      const parts = path.split('/');
      const apId = parts[2];
      const itemId = parts[4];
      await db.deleteAccessItem(itemId);
      const updatedAp = await db.getAgencyPlatformById(apId);
      return NextResponse.json({ success: true, data: updatedAp });
    }

    // DELETE /api/integration-identities/:id - Delete integration identity
    if (path.match(/^integration-identities\/[^/]+$/)) {
      const identityId = path.split('/')[1];
      await db.deleteIntegrationIdentity(identityId);
      return NextResponse.json({ success: true, message: 'Integration identity deleted' });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path?.join('/') || '';
  const body = await getBody(request);

  try {
    // PATCH /api/agency/platforms/:id/toggle - Toggle agency platform status
    if (path.match(/^agency\/platforms\/[^/]+\/toggle$/)) {
      const apId = path.split('/')[2];
      const ap = await db.getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      const updated = await db.updateAgencyPlatform(apId, { isEnabled: !ap.isEnabled });
      return NextResponse.json({ success: true, data: updated });
    }

    // PATCH /api/integration-identities/:id/toggle - Toggle integration identity status
    if (path.match(/^integration-identities\/[^/]+\/toggle$/)) {
      const identityId = path.split('/')[1];
      const identity = await db.getIntegrationIdentityById(identityId);
      if (!identity) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      const updated = await db.updateIntegrationIdentity(identityId, { isActive: !identity.isActive });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
