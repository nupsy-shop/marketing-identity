import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import * as db from '@/lib/db';
import {
  IDENTITY_PURPOSE,
  HUMAN_IDENTITY_STRATEGY,
  validateAccessItemPayload,
  generateClientDedicatedIdentity
} from '@/lib/data/field-policy';

// Helper to parse request body
async function getBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
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
      return NextResponse.json({ success: true, data: agencyPlatforms });
    }

    // GET /api/agency/platforms/:id - Get single agency platform with items
    if (path.match(/^agency\/platforms\/[^/]+$/) && !path.endsWith('/toggle')) {
      const apId = path.split('/')[2];
      const ap = await db.getAgencyPlatformById(apId);
      if (!ap) {
        return NextResponse.json({ success: false, error: 'Agency platform not found' }, { status: 404 });
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
      return NextResponse.json({ success: true, data: req });
    }

    // GET /api/integration-identities - List all integration identities
    if (path === 'integration-identities') {
      const identities = await db.getAllIntegrationIdentities();
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
        integrationIdentityId, agencyData, pamConfig, validationMethod
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

      // Check supportedItemTypes
      const platform = ap.platform;
      if (platform?.supportedItemTypes?.length > 0 && !platform.supportedItemTypes.includes(itemType)) {
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
        validationMethod: validationMethod || 'ATTESTATION'
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
      const { name, type, identifier, description, metadata } = body || {};
      if (!name || !type || !identifier) {
        return NextResponse.json({ success: false, error: 'name, type, and identifier are required' }, { status: 400 });
      }
      const identity = await db.createIntegrationIdentity({
        id: uuidv4(),
        name,
        type,
        identifier,
        description,
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
