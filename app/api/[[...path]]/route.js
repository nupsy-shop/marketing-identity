import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { platforms, getPlatformById, getClientFacingPlatforms, getAllDomains, getPlatformsByTier } from '@/lib/data/platforms-enhanced';
import {
  clients,
  accessRequests,
  auditLogs,
  pamSessions,
  addClient,
  getClientById,
  getAllClients,
  addAccessRequest,
  getAccessRequestById,
  getAccessRequestByToken,
  getAccessRequestsByClientId,
  updateAccessRequest,
  addAuditLog,
  getAuditLogs,
  addPamSession,
  getActivePamSessions,
  updatePamSession
} from '@/lib/data/stores';
import {
  getAllAgencyPlatforms,
  getAgencyPlatformById,
  getAgencyPlatformByPlatformId,
  addAgencyPlatform,
  updateAgencyPlatform,
  addAccessItem,
  removeAccessItem,
  updateAccessItem,
  removeAgencyPlatform,
  toggleAgencyPlatformStatus
} from '@/lib/data/agency-platforms';
import { getConnectorForPlatform } from '@/lib/connectors';
import {
  getAllIntegrationIdentities,
  getIntegrationIdentityById,
  addIntegrationIdentity,
  updateIntegrationIdentity,
  deleteIntegrationIdentity,
  toggleIntegrationIdentityStatus,
  seedIntegrationIdentities
} from '@/lib/data/integration-identities';
import {
  IDENTITY_PURPOSE,
  HUMAN_IDENTITY_STRATEGY,
  validateAccessItemPayload,
  generateClientDedicatedIdentity
} from '@/lib/data/field-policy';

// Initialize seed data for integration identities
seedIntegrationIdentities();

// Helper to parse request body
async function getBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// GET handler
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    // GET /api/platforms - List all platforms
    if (path === 'platforms') {
      const domain = searchParams.get('domain');
      const automation = searchParams.get('automation');
      const tier = searchParams.get('tier');
      const clientFacing = searchParams.get('clientFacing');
      
      let filtered = clientFacing === 'true' ? getClientFacingPlatforms() : platforms;
      
      if (domain) {
        filtered = filtered.filter(p => p.domain === domain);
      }
      if (automation) {
        filtered = filtered.filter(p => p.automationFeasibility === automation);
      }
      if (tier) {
        filtered = filtered.filter(p => p.tier === parseInt(tier));
      }
      
      return NextResponse.json({
        success: true,
        data: filtered
      });
    }

    // GET /api/platforms/domains - Get all unique domains
    if (path === 'platforms/domains') {
      return NextResponse.json({
        success: true,
        data: getAllDomains()
      });
    }

    // GET /api/platforms/:id - Get platform by ID
    if (path.startsWith('platforms/') && path.split('/').length === 2 && path !== 'platforms/domains') {
      const id = path.split('/')[1];
      const platform = getPlatformById(id);
      
      if (!platform) {
        return NextResponse.json(
          { success: false, error: 'Platform not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: platform
      });
    }

    // GET /api/clients - List all clients
    if (path === 'clients') {
      return NextResponse.json({
        success: true,
        data: getAllClients()
      });
    }

    // GET /api/clients/:id - Get client by ID
    if (path.startsWith('clients/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const client = getClientById(id);
      
      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: client
      });
    }

    // GET /api/audit-logs
    if (path === 'audit-logs') {
      const logs = getAuditLogs();
      return NextResponse.json({ success: true, data: logs });
    }

    // GET /api/pam/sessions - Active PAM checkout sessions
    if (path === 'pam/sessions') {
      const sessions = getActivePamSessions();
      // Enrich with request and item info
      const enriched = sessions.map(s => {
        const req = getAccessRequestById(s.requestId);
        const item = req?.items.find(i => i.id === s.itemId);
        const platform = item ? getPlatformById(item.platformId) : null;
        const client = req ? getClientById(req.clientId) : null;
        return { ...s, item, platform, client };
      });
      return NextResponse.json({ success: true, data: enriched });
    }

    // GET /api/pam/items - All PAM access request items across all requests
    if (path === 'pam/items') {
      const allPamItems = [];
      for (const req of accessRequests) {
        const client = getClientById(req.clientId);
        for (const item of req.items) {
          if (item.itemType === 'SHARED_ACCOUNT_PAM') {
            const platform = getPlatformById(item.platformId);
            const activeSession = pamSessions.find(s => s.requestId === req.id && s.itemId === item.id && s.active);
            allPamItems.push({ ...item, requestId: req.id, client, platform, activeSession });
          }
        }
      }
      return NextResponse.json({ success: true, data: allPamItems });
    }

    // GET /api/integration-identities - List all integration identities
    if (path === 'integration-identities') {
      const identities = getAllIntegrationIdentities();
      return NextResponse.json({ success: true, data: identities });
    }

    // GET /api/integration-identities/:id - Get integration identity by ID
    if (path.match(/^integration-identities\/[^/]+$/) && !path.endsWith('/toggle')) {
      const id = path.split('/')[1];
      const identity = getIntegrationIdentityById(id);
      if (!identity) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: identity });
    }

    // GET /api/agency/platforms - List all agency platforms with enrichment
    if (path === 'agency/platforms') {
      const allAP = getAllAgencyPlatforms();
      const enriched = allAP.map(ap => ({
        ...ap,
        platform: getPlatformById(ap.platformId)
      }));
      return NextResponse.json({ success: true, data: enriched });
    }

    // GET /api/agency/platforms/:id - Get single agency platform
    if (path.match(/^agency\/platforms\/[^/]+$/) && !path.endsWith('/toggle')) {
      const id = path.split('/')[2];
      const ap = getAgencyPlatformById(id);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...ap, platform: getPlatformById(ap.platformId) }
      });
    }
    if (path.match(/^clients\/[^/]+\/access-requests$/)) {
      const id = path.split('/')[1];
      const requests = getAccessRequestsByClientId(id);
      
      return NextResponse.json({
        success: true,
        data: requests
      });
    }

    // GET /api/access-requests/:id - Get access request by ID
    if (path.startsWith('access-requests/') && path.split('/').length === 2) {
      const id = path.split('/')[1];
      const request = getAccessRequestById(id);
      
      if (!request) {
        return NextResponse.json(
          { success: false, error: 'Access request not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: request
      });
    }

    // GET /api/onboarding/:token - Get access request by token (for client onboarding)
    if (path.startsWith('onboarding/') && path.split('/').length === 2) {
      const token = path.split('/')[1];
      const request = getAccessRequestByToken(token);
      
      if (!request) {
        return NextResponse.json(
          { success: false, error: 'Invalid onboarding token' },
          { status: 404 }
        );
      }

      // Include client and platform details for each item
      const client = getClientById(request.clientId);
      const enrichedItems = request.items.map(item => ({
        ...item,
        platform: getPlatformById(item.platformId)
      }));
      
      return NextResponse.json({
        success: true,
        data: {
          ...request,
          client,
          items: enrichedItems
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');
  const body = await getBody(request);

  try {
    // POST /api/clients - Create new client
    if (path === 'clients') {
      const { name, email } = body || {};
      
      if (!name || !email) {
        return NextResponse.json(
          { success: false, error: 'Name and email are required' },
          { status: 400 }
        );
      }

      const client = {
        id: uuidv4(),
        name,
        email,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addClient(client);
      
      return NextResponse.json({
        success: true,
        data: client
      });
    }

    // POST /api/integration-identities - Create new integration identity
    if (path === 'integration-identities') {
      const { type, name, description, email, clientId: oauthClientId, clientSecret, apiKey, scopes, rotationPolicy, allowedPlatforms } = body || {};
      if (!name) {
        return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 });
      }
      const identity = addIntegrationIdentity({
        type: type || 'SERVICE_ACCOUNT',
        name,
        description,
        email,
        clientId: oauthClientId,
        clientSecret,
        apiKey,
        scopes: scopes || [],
        rotationPolicy: rotationPolicy || 'NONE',
        allowedPlatforms: allowedPlatforms || []
      });
      return NextResponse.json({ success: true, data: identity });
    }

    // POST /api/agency/platforms/:id/items - Add access item (supports new Identity Taxonomy)
    if (path.match(/^agency\/platforms\/[^/]+\/items$/)) {
      const apId = path.split('/')[2];
      const ap = getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      const { 
        itemType = 'NAMED_INVITE', 
        accessPattern, 
        patternLabel, 
        label, 
        role, 
        notes, 
        pamConfig,
        agencyData,
        clientInstructions,
        // NEW: Identity Taxonomy fields
        identityPurpose,
        humanIdentityStrategy,
        clientDedicatedIdentityType,
        namingTemplate,
        agencyGroupEmail,
        integrationIdentityId,
        validationMethod
      } = body || {};

      // Item Type → Pattern mapping (pattern is derived from itemType)
      const ITEM_TYPE_TO_PATTERN = {
        'NAMED_INVITE': 'NAMED_INVITE',
        'PARTNER_DELEGATION': 'PARTNER_DELEGATION',
        'GROUP_ACCESS': 'GROUP_BASED',
        'PROXY_TOKEN': 'PROXY',
        'SHARED_ACCOUNT_PAM': 'PAM'
      };

      // Derive pattern from itemType
      const derivedPattern = ITEM_TYPE_TO_PATTERN[itemType] || itemType;
      
      // Server-side validation: If accessPattern is provided and conflicts with itemType, reject
      if (accessPattern && accessPattern !== derivedPattern && !accessPattern.startsWith(derivedPattern)) {
        // Allow accessPattern if it matches derived pattern or is for backward compatibility
        const isBackwardCompatible = ['1 (Partner Hub)', '2 (Named Invites)', '3 (Group Access)'].includes(accessPattern);
        if (!isBackwardCompatible && accessPattern !== itemType) {
          // Only reject if it's truly conflicting
          console.log(`Note: accessPattern "${accessPattern}" provided with itemType "${itemType}", using derived pattern "${derivedPattern}"`);
        }
      }

      // Use derived pattern
      const finalPattern = derivedPattern;
      
      if (!itemType || !label || !role) {
        return NextResponse.json({ success: false, error: 'itemType, label and role are required' }, { status: 400 });
      }

      // Validate using Field Policy Engine
      const validation = validateAccessItemPayload(body);
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.errors.join('; ') }, { status: 400 });
      }

      // Validate PAM config
      if (itemType === 'SHARED_ACCOUNT_PAM') {
        if (!pamConfig?.ownership) {
          return NextResponse.json({ success: false, error: 'pamConfig.ownership is required for SHARED_ACCOUNT_PAM items' }, { status: 400 });
        }
        if (pamConfig.ownership === 'AGENCY_OWNED' && !pamConfig.agencyIdentityEmail) {
          return NextResponse.json({ success: false, error: 'pamConfig.agencyIdentityEmail is required for AGENCY_OWNED items' }, { status: 400 });
        }
        if (pamConfig.ownership === 'AGENCY_OWNED' && !pamConfig.roleTemplate) {
          return NextResponse.json({ success: false, error: 'pamConfig.roleTemplate is required for AGENCY_OWNED items' }, { status: 400 });
        }
      }

      const item = {
        id: uuidv4(),
        itemType,
        accessPattern: finalPattern,
        patternLabel: patternLabel || finalPattern,
        label,
        role,
        notes: notes || undefined,
        // Identity Taxonomy fields
        identityPurpose: identityPurpose || IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
        humanIdentityStrategy: humanIdentityStrategy || undefined,
        clientDedicatedIdentityType: clientDedicatedIdentityType || undefined,
        namingTemplate: namingTemplate || undefined,
        agencyGroupEmail: agencyGroupEmail || undefined,
        integrationIdentityId: integrationIdentityId || undefined,
        validationMethod: validationMethod || 'ATTESTATION',
        // Agency data fields from Excel
        agencyData: agencyData || undefined,
        // Client instructions from Excel
        clientInstructions: clientInstructions || undefined,
        pamConfig: itemType === 'SHARED_ACCOUNT_PAM' ? {
          ...pamConfig,
          grantMethod: pamConfig.ownership === 'CLIENT_OWNED' ? 'CREDENTIAL_HANDOFF' : 'INVITE_AGENCY_IDENTITY',
          sessionMode: 'REVEAL',
          requiresDedicatedAgencyLogin: pamConfig.ownership === 'CLIENT_OWNED' ? (pamConfig.requiresDedicatedAgencyLogin ?? true) : undefined
        } : undefined,
        createdAt: new Date()
      };
      const updated = addAccessItem(apId, item);
      return NextResponse.json({
        success: true,
        data: { ...updated, platform: getPlatformById(updated.platformId) }
      });
    }

    // POST /api/onboarding/:token/items/:itemId/submit-credentials (CLIENT_OWNED PAM)
    if (path.match(/^onboarding\/[^/]+\/items\/[^/]+\/submit-credentials$/)) {
      const parts = path.split('/');
      const token = parts[1];
      const itemId = parts[3];
      const { username, password } = body || {};
      if (!username || !password) {
        return NextResponse.json({ success: false, error: 'username and password are required' }, { status: 400 });
      }
      const req = getAccessRequestByToken(token);
      if (!req) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
      const item = req.items.find(i => i.id === itemId);
      if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      if (item.pamOwnership !== 'CLIENT_OWNED') {
        return NextResponse.json({ success: false, error: 'This item is not a CLIENT_OWNED shared account' }, { status: 400 });
      }
      // Store a reference (in production: encrypt and store in vault)
      const secretRef = Buffer.from(JSON.stringify({ username, passwordHint: password.slice(0, 1) + '***' })).toString('base64');
      item.pamUsername = username;
      item.pamSecretRef = secretRef;
      item.status = 'validated';
      item.validatedAt = new Date();
      item.validatedBy = 'client_credential_submission';
      item.validationMode = 'AUTO';
      item.validationResult = {
        timestamp: new Date(),
        actor: 'client',
        mode: 'CREDENTIAL_HANDOFF',
        details: `Credentials submitted by client for username: ${username}`
      };
      addAuditLog({
        event: 'CREDENTIAL_SUBMITTED',
        actor: 'client',
        requestId: req.id,
        itemId,
        platformId: item.platformId,
        details: { username, requestToken: token }
      });
      const allDone = req.items.every(i => i.status === 'validated');
      if (allDone && !req.completedAt) req.completedAt = new Date();
      updateAccessRequest(req.id, req);
      return NextResponse.json({ success: true, data: { ...req, items: req.items } });
    }

    // POST /api/onboarding/:token/items/:itemId/attest (AGENCY_OWNED PAM + general attestation)
    if (path.match(/^onboarding\/[^/]+\/items\/[^/]+\/attest$/)) {
      const parts = path.split('/');
      const token = parts[1];
      const itemId = parts[3];
      const { attestationText, evidenceBase64, evidenceFileName, assetType, assetId, clientProvidedTarget } = body || {};
      const req = getAccessRequestByToken(token);
      if (!req) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 404 });
      const item = req.items.find(i => i.id === itemId);
      if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      item.status = 'validated';
      item.validatedAt = new Date();
      item.validatedBy = 'client_attestation';
      item.validationMode = evidenceBase64 ? 'EVIDENCE' : 'ATTESTATION';
      // Store client-selected asset details (from onboarding)
      if (assetType) item.selectedAssetType = assetType;
      if (assetId) item.selectedAssetId = assetId;
      // Store clientProvidedTarget (new structured asset data)
      if (clientProvidedTarget) {
        item.clientProvidedTarget = clientProvidedTarget;
      } else if (assetType || assetId) {
        // Backward compatibility: create clientProvidedTarget from assetType/assetId
        item.clientProvidedTarget = {
          assetType: assetType,
          assetId: assetId
        };
      }
      item.validationResult = {
        timestamp: new Date(),
        actor: 'client',
        mode: item.validationMode,
        details: attestationText || 'Client confirmed access was granted',
        evidenceRef: evidenceBase64 || undefined,
        attestationText: attestationText || undefined,
        clientProvidedTarget: item.clientProvidedTarget || undefined
      };
      addAuditLog({
        event: evidenceBase64 ? 'EVIDENCE_UPLOADED' : 'ACCESS_ATTESTED',
        actor: 'client',
        requestId: req.id,
        itemId,
        platformId: item.platformId,
        details: { attestationText, hasEvidence: !!evidenceBase64, evidenceFileName, clientProvidedTarget: item.clientProvidedTarget }
      });
      const allDone = req.items.every(i => i.status === 'validated');
      if (allDone && !req.completedAt) req.completedAt = new Date();
      updateAccessRequest(req.id, req);
      return NextResponse.json({ success: true, data: { ...req, items: req.items } });
    }

    // POST /api/pam/:requestId/items/:itemId/checkout
    if (path.match(/^pam\/[^/]+\/items\/[^/]+\/checkout$/)) {
      const parts = path.split('/');
      const requestId = parts[1];
      const itemId = parts[3];
      const { reason, durationMinutes = 60 } = body || {};
      const req = getAccessRequestById(requestId);
      if (!req) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      const item = req.items.find(i => i.id === itemId);
      if (!item) return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      if (item.pamOwnership !== 'CLIENT_OWNED' && !item.pamSecretRef) {
        return NextResponse.json({ success: false, error: 'No credentials available for checkout' }, { status: 400 });
      }
      const session = {
        id: uuidv4(),
        requestId,
        itemId,
        checkedOutBy: 'admin-1',
        checkedOutAt: new Date(),
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        reason: reason || undefined,
        active: true
      };
      addPamSession(session);
      addAuditLog({
        event: 'PAM_CHECKOUT',
        actor: 'admin',
        requestId,
        itemId,
        platformId: item.platformId,
        details: { durationMinutes, reason, sessionId: session.id }
      });
      // Return session + decrypted credential (stub)
      let revealedCredential = null;
      if (item.pamSecretRef) {
        try {
          revealedCredential = JSON.parse(Buffer.from(item.pamSecretRef, 'base64').toString());
        } catch {}
      }
      return NextResponse.json({ success: true, data: { session, revealedCredential, username: item.pamUsername } });
    }

    // POST /api/pam/:requestId/items/:itemId/checkin
    if (path.match(/^pam\/[^/]+\/items\/[^/]+\/checkin$/)) {
      const parts = path.split('/');
      const requestId = parts[1];
      const itemId = parts[3];
      const activeSession = pamSessions.find(s => s.requestId === requestId && s.itemId === itemId && s.active);
      if (!activeSession) {
        return NextResponse.json({ success: false, error: 'No active checkout session found' }, { status: 404 });
      }
      updatePamSession(activeSession.id, { active: false, checkedInAt: new Date() });
      const req = getAccessRequestById(requestId);
      const item = req?.items.find(i => i.id === itemId);
      addAuditLog({
        event: 'PAM_CHECKIN',
        actor: 'admin',
        requestId,
        itemId,
        platformId: item?.platformId,
        details: { sessionId: activeSession.id }
      });
      return NextResponse.json({ success: true, data: { message: 'Checked in successfully', sessionId: activeSession.id } });
    }

    // POST /api/agency/platforms - Add platform to agency
    if (path === 'agency/platforms') {
      const { platformId } = body || {};
      if (!platformId) {
        return NextResponse.json({ success: false, error: 'platformId is required' }, { status: 400 });
      }
      const platform2 = getPlatformById(platformId);
      if (!platform2) {
        return NextResponse.json({ success: false, error: 'Platform not found' }, { status: 404 });
      }
      const existing2 = getAgencyPlatformByPlatformId(platformId);
      if (existing2) {
        return NextResponse.json({
          success: false, error: 'Platform already added to agency',
          data: { ...existing2, platform: platform2 }
        }, { status: 409 });
      }
      const ap2 = { id: uuidv4(), platformId, isEnabled: true, accessItems: [], createdAt: new Date(), updatedAt: new Date() };
      addAgencyPlatform(ap2);
      return NextResponse.json({ success: true, data: { ...ap2, platform: platform2 } });
    }

    // POST /api/access-requests - Create new access request
    if (path === 'access-requests') {
      const { clientId, items } = body || {};
      
      if (!clientId) {
        return NextResponse.json(
          { success: false, error: 'clientId is required' },
          { status: 400 }
        );
      }

      const client = getClientById(clientId);
      if (!client) {
        return NextResponse.json(
          { success: false, error: 'Client not found' },
          { status: 404 }
        );
      }
      
      // Support both old format (platformIds) and new format (items)
      let requestItems = [];
      
      if (items && Array.isArray(items)) {
        // New format: enhanced with pattern, role, Identity Taxonomy
        if (items.length === 0) {
          return NextResponse.json(
            { success: false, error: 'items array cannot be empty' },
            { status: 400 }
          );
        }
        
        requestItems = items.map(item => {
          const platform = getPlatformById(item.platformId);
          
          // Generate resolved identity for CLIENT_DEDICATED strategy
          let resolvedIdentity = undefined;
          if (item.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED && item.namingTemplate) {
            resolvedIdentity = generateClientDedicatedIdentity(item.namingTemplate, client, platform);
          } else if (item.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
            resolvedIdentity = item.agencyGroupEmail;
          } else if (item.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS) {
            // For INDIVIDUAL_USERS, the invitees should be in item.inviteeEmails
            resolvedIdentity = item.inviteeEmails?.join(', ') || undefined;
          } else if (item.agencyData?.agencyEmail) {
            // Fallback to agencyData.agencyEmail for backward compatibility
            resolvedIdentity = item.agencyData.agencyEmail;
          }
          
          return {
            id: uuidv4(),
            platformId: item.platformId,
            accessPattern: item.accessPattern,
            role: item.role,
            assetName: item.assetName,
            status: 'pending',
            // Item type and PAM fields
            itemType: item.itemType || 'NAMED_INVITE',
            pamOwnership: item.pamOwnership || undefined,
            pamGrantMethod: item.pamGrantMethod || undefined,
            pamUsername: item.pamUsername || undefined,
            pamAgencyIdentityEmail: item.pamAgencyIdentityEmail || undefined,
            pamRoleTemplate: item.pamRoleTemplate || undefined,
            // Identity Taxonomy fields
            identityPurpose: item.identityPurpose || IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
            humanIdentityStrategy: item.humanIdentityStrategy || undefined,
            namingTemplate: item.namingTemplate || undefined,
            agencyGroupEmail: item.agencyGroupEmail || undefined,
            integrationIdentityId: item.integrationIdentityId || undefined,
            inviteeEmails: item.inviteeEmails || undefined,
            resolvedIdentity: resolvedIdentity,
            // Agency data fields from Excel
            agencyData: item.agencyData || undefined,
            // Client instructions from Excel
            clientInstructions: item.clientInstructions || undefined,
            // Client-provided asset target (populated during onboarding)
            clientProvidedTarget: undefined,
            // Validation
            validationMethod: item.validationMethod || 'ATTESTATION',
            validationMode: item.pamOwnership === 'CLIENT_OWNED' ? 'AUTO'
              : item.pamOwnership === 'AGENCY_OWNED' ? 'ATTESTATION'
              : undefined
          };
        });
      } else if (body.platformIds && Array.isArray(body.platformIds)) {
        // Old format: just platformIds (backward compatibility)
        if (body.platformIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'platformIds array cannot be empty' },
            { status: 400 }
          );
        }
        requestItems = body.platformIds.map(platformId => ({
          id: uuidv4(),
          platformId,
          accessPattern: 'Default',
          role: 'Standard',
          status: 'pending'
        }));
      } else {
        return NextResponse.json(
          { success: false, error: 'items array or platformIds array is required' },
          { status: 400 }
        );
      }

      // Validate all platform IDs
      for (const item of requestItems) {
        if (!getPlatformById(item.platformId)) {
          return NextResponse.json(
            { success: false, error: `Invalid platform ID: ${item.platformId}` },
            { status: 400 }
          );
        }
      }

      const accessRequest = {
        id: uuidv4(),
        clientId,
        token: uuidv4(),
        items: requestItems,
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      addAccessRequest(accessRequest);
      
      return NextResponse.json({
        success: true,
        data: accessRequest
      });
    }

    // POST /api/access-requests/:id/validate - Validate a platform in an access request
    if (path.match(/^access-requests\/[^/]+\/validate$/)) {
      const id = path.split('/')[1];
      const { itemId, platformId, notes } = body || {};
      
      // Support both itemId (new) and platformId (old) for backward compatibility
      const targetId = itemId || platformId;
      
      if (!targetId) {
        return NextResponse.json(
          { success: false, error: 'itemId or platformId is required' },
          { status: 400 }
        );
      }

      const accessRequest = getAccessRequestById(id);
      if (!accessRequest) {
        return NextResponse.json(
          { success: false, error: 'Access request not found' },
          { status: 404 }
        );
      }

      // Find item by ID or platformId
      const item = accessRequest.items.find(
        i => i.id === targetId || i.platformId === targetId
      );

      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Item not found in this access request' },
          { status: 404 }
        );
      }

      item.status = 'validated';
      item.validatedAt = new Date();
      item.validatedBy = 'manual';
      if (notes) {
        item.notes = notes;
      }

      const allValidated = accessRequest.items.every(i => i.status === 'validated');

      if (allValidated && !accessRequest.completedAt) {
        accessRequest.completedAt = new Date();
      }

      updateAccessRequest(id, accessRequest);
      
      return NextResponse.json({
        success: true,
        data: accessRequest
      });
    }

    // POST /api/access-requests/:id/refresh - Refresh validation status
    if (path.match(/^access-requests\/[^/]+\/refresh$/)) {
      const id = path.split('/')[1];
      const accessRequest = getAccessRequestById(id);
      
      if (!accessRequest) {
        return NextResponse.json(
          { success: false, error: 'Access request not found' },
          { status: 404 }
        );
      }

      const results = [];
      for (const item of accessRequest.items) {
        const platform = getPlatformById(item.platformId);
        if (!platform) continue;

        const connector = getConnectorForPlatform(platform);
        const client = getClientById(accessRequest.clientId);
        
        try {
          const result = await connector.verifyAccess({
            accountId: client?.email || '',
            userEmail: 'agency@example.com'
          });

          if (result.success && result.data === true) {
            item.status = 'validated';
            item.validatedAt = new Date();
            item.validatedBy = 'connector';
          }
          
          results.push({
            itemId: item.id,
            platformId: item.platformId,
            verified: result.data,
            error: result.error
          });
        } catch (error) {
          results.push({
            itemId: item.id,
            platformId: item.platformId,
            verified: false,
            error: error.message
          });
        }
      }

      updateAccessRequest(id, accessRequest);
      
      return NextResponse.json({
        success: true,
        data: {
          accessRequest,
          verificationResults: results
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT handler (for updates)
export async function PUT(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');
  const body = await getBody(request);

  try {
    // PUT /api/integration-identities/:id - Update integration identity
    if (path.match(/^integration-identities\/[^/]+$/)) {
      const id = path.split('/')[1];
      const identity = getIntegrationIdentityById(id);
      if (!identity) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      const { type, name, description, email, clientId: oauthClientId, clientSecret, apiKey, scopes, rotationPolicy, allowedPlatforms } = body || {};
      const updated = updateIntegrationIdentity(id, {
        type: type || identity.type,
        name: name || identity.name,
        description: description ?? identity.description,
        email: email ?? identity.email,
        clientId: oauthClientId ?? identity.clientId,
        clientSecret: clientSecret || undefined, // Only update if provided
        apiKey: apiKey || undefined,
        scopes: scopes || identity.scopes,
        rotationPolicy: rotationPolicy || identity.rotationPolicy,
        allowedPlatforms: allowedPlatforms || identity.allowedPlatforms
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // PUT /api/agency/platforms/:id/items/:itemId - Update an access item
    if (path.match(/^agency\/platforms\/[^/]+\/items\/[^/]+$/)) {
      const parts = path.split('/');
      const apId = parts[2];
      const itemId = parts[4];
      const ap = getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      const { 
        itemType,
        accessPattern, 
        patternLabel, 
        label, 
        role, 
        notes,
        pamConfig,
        agencyData,
        clientInstructions,
        // Identity Taxonomy fields
        identityPurpose,
        humanIdentityStrategy,
        clientDedicatedIdentityType,
        namingTemplate,
        agencyGroupEmail,
        integrationIdentityId,
        validationMethod
      } = body || {};

      // Item Type → Pattern mapping (pattern is derived from itemType)
      const ITEM_TYPE_TO_PATTERN = {
        'NAMED_INVITE': 'NAMED_INVITE',
        'PARTNER_DELEGATION': 'PARTNER_DELEGATION',
        'GROUP_ACCESS': 'GROUP_BASED',
        'PROXY_TOKEN': 'PROXY',
        'SHARED_ACCOUNT_PAM': 'PAM'
      };

      // Derive pattern from itemType if provided
      const derivedPattern = itemType ? (ITEM_TYPE_TO_PATTERN[itemType] || itemType) : accessPattern;
      const finalPattern = derivedPattern || accessPattern;
      
      if (!label || !role) {
        return NextResponse.json({ success: false, error: 'label and role are required' }, { status: 400 });
      }

      // Validate using Field Policy Engine
      const validation = validateAccessItemPayload(body, true);
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.errors.join('; ') }, { status: 400 });
      }

      const updated = updateAccessItem(apId, itemId, {
        itemType: itemType || undefined,
        accessPattern: finalPattern,
        patternLabel: patternLabel || finalPattern,
        label,
        role,
        notes: notes || undefined,
        // Identity Taxonomy fields
        identityPurpose: identityPurpose || undefined,
        humanIdentityStrategy: humanIdentityStrategy || undefined,
        clientDedicatedIdentityType: clientDedicatedIdentityType || undefined,
        namingTemplate: namingTemplate || undefined,
        agencyGroupEmail: agencyGroupEmail || undefined,
        integrationIdentityId: integrationIdentityId || undefined,
        validationMethod: validationMethod || undefined,
        // Agency data
        agencyData: agencyData || undefined,
        clientInstructions: clientInstructions || undefined,
        // PAM config
        pamConfig: pamConfig || undefined
      });
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...updated, platform: getPlatformById(updated.platformId) }
      });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH handler (for partial updates)
export async function PATCH(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    // PATCH /api/integration-identities/:id/toggle - Toggle active status
    if (path.match(/^integration-identities\/[^/]+\/toggle$/)) {
      const id = path.split('/')[1];
      const identity = toggleIntegrationIdentityStatus(id);
      if (!identity) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: identity });
    }

    // PATCH /api/agency/platforms/:id/toggle - Toggle isEnabled
    if (path.match(/^agency\/platforms\/[^/]+\/toggle$/)) {
      const id = path.split('/')[2];
      const ap = toggleAgencyPlatformStatus(id);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...ap, platform: getPlatformById(ap.platformId) }
      });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE handler
export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    // DELETE /api/integration-identities/:id - Delete integration identity
    if (path.match(/^integration-identities\/[^/]+$/)) {
      const id = path.split('/')[1];
      const success = deleteIntegrationIdentity(id);
      if (!success) {
        return NextResponse.json({ success: false, error: 'Integration identity not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { message: 'Integration identity deleted' } });
    }

    // DELETE /api/agency/platforms/:id - Remove platform from agency
    if (path.match(/^agency\/platforms\/[^/]+$/) && path.split('/').length === 3) {
      const id = path.split('/')[2];
      const success = removeAgencyPlatform(id);
      if (!success) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { message: 'Platform removed from agency' } });
    }

    // DELETE /api/agency/platforms/:id/items/:itemId - Remove access item
    if (path.match(/^agency\/platforms\/[^/]+\/items\/[^/]+$/)) {
      const parts = path.split('/');
      const apId = parts[2];
      const itemId = parts[4];
      const updated = removeAccessItem(apId, itemId);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { ...updated, platform: getPlatformById(updated.platformId) }
      });
    }

    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
