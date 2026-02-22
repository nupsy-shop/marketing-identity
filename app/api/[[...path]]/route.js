import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { platforms, getPlatformById, getClientFacingPlatforms, getAllDomains, getPlatformsByTier } from '@/lib/data/platforms-enhanced';
import {
  clients,
  accessRequests,
  addClient,
  getClientById,
  getAllClients,
  addAccessRequest,
  getAccessRequestById,
  getAccessRequestByToken,
  getAccessRequestsByClientId,
  updateAccessRequest
} from '@/lib/data/stores';
import { getConnectorForPlatform } from '@/lib/connectors';

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

    // GET /api/clients/:id/access-requests - Get all access requests for a client
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

      // Include client and platform details
      const client = getClientById(request.clientId);
      const platformDetails = request.platformStatuses.map(ps => ({
        ...ps,
        platform: getPlatformById(ps.platformId)
      }));
      
      return NextResponse.json({
        success: true,
        data: {
          ...request,
          client,
          platformStatuses: platformDetails
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

    // POST /api/access-requests - Create new access request
    if (path === 'access-requests') {
      const { clientId, items } = body || {};
      
      // Support both old format (platformIds) and new format (items)
      let requestItems = [];
      
      if (items && Array.isArray(items)) {
        // New format: enhanced with pattern, role, assets
        requestItems = items.map(item => ({
          id: uuidv4(),
          platformId: item.platformId,
          accessPattern: item.accessPattern,
          role: item.role,
          assetType: item.assetType,
          assetId: item.assetId,
          assetName: item.assetName,
          status: 'pending'
        }));
      } else if (body.platformIds && Array.isArray(body.platformIds)) {
        // Old format: just platformIds (backward compatibility)
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
          { status: 400 }\n        );\n      }
      
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
      for (const platformStatus of accessRequest.platformStatuses) {
        const platform = getPlatformById(platformStatus.platformId);
        if (!platform) continue;

        const connector = getConnectorForPlatform(platform);
        const client = getClientById(accessRequest.clientId);
        
        try {
          const result = await connector.verifyAccess({
            accountId: client?.email || '',
            userEmail: 'agency@example.com'
          });

          if (result.success && result.data === true) {
            platformStatus.status = 'validated';
            platformStatus.validatedAt = new Date();
          }
          
          results.push({
            platformId: platformStatus.platformId,
            verified: result.data,
            error: result.error
          });
        } catch (error) {
          results.push({
            platformId: platformStatus.platformId,
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

// DELETE handler
export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api/', '');

  try {
    // DELETE /api/access-requests/:id/platforms/:platformId - Revoke platform access
    if (path.match(/^access-requests\/[^/]+\/platforms\/[^/]+$/)) {
      const parts = path.split('/');
      const requestId = parts[1];
      const platformId = parts[3];

      const accessRequest = getAccessRequestById(requestId);
      if (!accessRequest) {
        return NextResponse.json(
          { success: false, error: 'Access request not found' },
          { status: 404 }
        );
      }

      const platformStatus = accessRequest.platformStatuses.find(
        ps => ps.platformId === platformId
      );

      if (!platformStatus) {
        return NextResponse.json(
          { success: false, error: 'Platform not found in this access request' },
          { status: 404 }
        );
      }

      const platform = getPlatformById(platformId);
      if (platform) {
        const connector = getConnectorForPlatform(platform);
        const client = getClientById(accessRequest.clientId);
        
        await connector.revokeAccess({
          accountId: client?.email || '',
          userEmail: 'agency@example.com'
        });
      }

      platformStatus.status = 'pending';
      platformStatus.validatedAt = undefined;
      platformStatus.notes = 'Access revoked by admin';

      updateAccessRequest(requestId, accessRequest);
      
      return NextResponse.json({
        success: true,
        data: accessRequest
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
