// Database Service Layer - PostgreSQL Operations
// Replaces in-memory stores with Prisma/PostgreSQL queries

import { Pool } from 'pg';

// Create a connection pool with SSL for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_Uk0aJn7LlZOd@ep-small-mode-ai4td3or-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// ============================================================================
// CATALOG PLATFORMS
// ============================================================================

export async function getAllCatalogPlatforms() {
  const result = await pool.query(
    `SELECT * FROM catalog_platforms ORDER BY name`
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain: row.domain,
    description: row.description,
    icon: row.icon,
    tier: row.tier,
    clientFacing: row.clientFacing,
    automationFeasibility: row.automationFeasibility,
    supportedItemTypes: row.supportedItemTypes || [],
    accessPatterns: row.accessPatterns || [],
    oauthSupported: row.oauthSupported || false,
    oauthConfig: row.oauthConfig,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function getCatalogPlatformById(id) {
  const result = await pool.query(
    `SELECT * FROM catalog_platforms WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain: row.domain,
    description: row.description,
    icon: row.icon,
    tier: row.tier,
    clientFacing: row.clientFacing,
    automationFeasibility: row.automationFeasibility,
    supportedItemTypes: row.supportedItemTypes || [],
    accessPatterns: row.accessPatterns || [],
    oauthSupported: row.oauthSupported || false,
    oauthConfig: row.oauthConfig,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

// ============================================================================
// CLIENTS
// ============================================================================

export async function getAllClients() {
  const result = await pool.query(`SELECT * FROM clients ORDER BY "createdAt" DESC`);
  return result.rows;
}

export async function getClientById(id) {
  const result = await pool.query(`SELECT * FROM clients WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function createClient(client) {
  const result = await pool.query(
    `INSERT INTO clients (id, name, email, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [client.id, client.name, client.email]
  );
  return result.rows[0];
}

export async function updateClient(id, updates) {
  const result = await pool.query(
    `UPDATE clients SET name = $2, email = $3, "updatedAt" = NOW()
     WHERE id = $1 RETURNING *`,
    [id, updates.name, updates.email]
  );
  return result.rows[0];
}

export async function deleteClient(id) {
  await pool.query(`DELETE FROM clients WHERE id = $1`, [id]);
}

// ============================================================================
// AGENCY PLATFORMS (with nested access items)
// ============================================================================

export async function getAllAgencyPlatforms() {
  const result = await pool.query(`
    SELECT 
      ap.*,
      cp.name as platform_name,
      cp.slug as platform_slug,
      cp.domain as platform_domain,
      cp.icon as platform_icon,
      cp."supportedItemTypes" as platform_supported_item_types,
      cp."accessPatterns" as platform_access_patterns
    FROM agency_platforms ap
    JOIN catalog_platforms cp ON ap."platformId" = cp.id
    ORDER BY ap."createdAt" DESC
  `);
  
  // Get access items for each agency platform
  const agencyPlatforms = [];
  for (const row of result.rows) {
    const itemsResult = await pool.query(
      `SELECT * FROM access_items WHERE "agencyPlatformId" = $1`,
      [row.id]
    );
    agencyPlatforms.push({
      id: row.id,
      platformId: row.platformId,
      isEnabled: row.isEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      accessItems: itemsResult.rows.map(mapAccessItem),
      platform: {
        id: row.platformId,
        name: row.platform_name,
        slug: row.platform_slug,
        domain: row.platform_domain,
        icon: row.platform_icon,
        supportedItemTypes: row.platform_supported_item_types || [],
        accessPatterns: row.platform_access_patterns || []
      }
    });
  }
  return agencyPlatforms;
}

export async function getAgencyPlatformById(id) {
  const result = await pool.query(`
    SELECT 
      ap.*,
      cp.name as platform_name,
      cp.slug as platform_slug,
      cp.domain as platform_domain,
      cp.icon as platform_icon,
      cp."supportedItemTypes" as platform_supported_item_types,
      cp."accessPatterns" as platform_access_patterns
    FROM agency_platforms ap
    JOIN catalog_platforms cp ON ap."platformId" = cp.id
    WHERE ap.id = $1
  `, [id]);
  
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  
  const itemsResult = await pool.query(
    `SELECT * FROM access_items WHERE "agencyPlatformId" = $1`,
    [row.id]
  );
  
  return {
    id: row.id,
    platformId: row.platformId,
    isEnabled: row.isEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    accessItems: itemsResult.rows.map(mapAccessItem),
    platform: {
      id: row.platformId,
      name: row.platform_name,
      slug: row.platform_slug,
      domain: row.platform_domain,
      icon: row.platform_icon,
      supportedItemTypes: row.platform_supported_item_types || [],
      accessPatterns: row.platform_access_patterns || []
    }
  };
}

export async function getAgencyPlatformByPlatformId(platformId) {
  const result = await pool.query(
    `SELECT id FROM agency_platforms WHERE "platformId" = $1`,
    [platformId]
  );
  if (result.rows.length === 0) return null;
  return getAgencyPlatformById(result.rows[0].id);
}

export async function createAgencyPlatform(ap) {
  const result = await pool.query(
    `INSERT INTO agency_platforms (id, "platformId", "isEnabled", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING *`,
    [ap.id, ap.platformId, ap.isEnabled ?? true]
  );
  return getAgencyPlatformById(result.rows[0].id);
}

export async function updateAgencyPlatform(id, updates) {
  if (updates.isEnabled !== undefined) {
    await pool.query(
      `UPDATE agency_platforms SET "isEnabled" = $2, "updatedAt" = NOW() WHERE id = $1`,
      [id, updates.isEnabled]
    );
  }
  return getAgencyPlatformById(id);
}

export async function deleteAgencyPlatform(id) {
  await pool.query(`DELETE FROM agency_platforms WHERE id = $1`, [id]);
}

// ============================================================================
// ACCESS ITEMS
// ============================================================================

function mapAccessItem(row) {
  return {
    id: row.id,
    agencyPlatformId: row.agencyPlatformId,
    itemType: row.itemType,
    accessPattern: row.accessPattern,
    patternLabel: row.patternLabel,
    label: row.label,
    role: row.role,
    notes: row.notes,
    identityPurpose: row.identityPurpose,
    humanIdentityStrategy: row.humanIdentityStrategy,
    agencyGroupEmail: row.agencyGroupEmail,
    integrationIdentityId: row.integrationIdentityId,
    agencyData: row.agencyData,
    pamConfig: row.pamConfig,
    validationMethod: row.validationMethod,
    // New plugin architecture fields
    agencyConfigJson: row.agency_config_json,
    platformKey: row.platform_key,
    pluginVersion: row.plugin_version,
    migrationStatus: row.migration_status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function createAccessItem(agencyPlatformId, item) {
  const result = await pool.query(
    `INSERT INTO access_items (
      id, "agencyPlatformId", "itemType", "accessPattern", "patternLabel",
      label, role, notes, "identityPurpose", "humanIdentityStrategy",
      "agencyGroupEmail", "integrationIdentityId", "agencyData", "pamConfig",
      "validationMethod", agency_config_json, platform_key, plugin_version, migration_status,
      "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
    ) RETURNING *`,
    [
      item.id,
      agencyPlatformId,
      item.itemType,
      item.accessPattern,
      item.patternLabel,
      item.label,
      item.role,
      item.notes,
      item.identityPurpose,
      item.humanIdentityStrategy,
      item.agencyGroupEmail,
      item.integrationIdentityId,
      item.agencyData ? JSON.stringify(item.agencyData) : null,
      item.pamConfig ? JSON.stringify(item.pamConfig) : null,
      item.validationMethod,
      item.agencyConfigJson ? JSON.stringify(item.agencyConfigJson) : null,
      item.platformKey,
      item.pluginVersion || '1.0.0',
      item.migrationStatus || 'MIGRATED'
    ]
  );
  return mapAccessItem(result.rows[0]);
}

export async function updateAccessItem(id, updates) {
  const result = await pool.query(
    `UPDATE access_items SET
      "itemType" = COALESCE($2, "itemType"),
      "accessPattern" = COALESCE($3, "accessPattern"),
      "patternLabel" = COALESCE($4, "patternLabel"),
      label = COALESCE($5, label),
      role = COALESCE($6, role),
      notes = COALESCE($7, notes),
      "identityPurpose" = COALESCE($8, "identityPurpose"),
      "humanIdentityStrategy" = COALESCE($9, "humanIdentityStrategy"),
      "agencyGroupEmail" = COALESCE($10, "agencyGroupEmail"),
      "agencyData" = COALESCE($11, "agencyData"),
      "pamConfig" = COALESCE($12, "pamConfig"),
      "validationMethod" = COALESCE($13, "validationMethod"),
      "updatedAt" = NOW()
    WHERE id = $1 RETURNING *`,
    [
      id,
      updates.itemType,
      updates.accessPattern,
      updates.patternLabel,
      updates.label,
      updates.role,
      updates.notes,
      updates.identityPurpose,
      updates.humanIdentityStrategy,
      updates.agencyGroupEmail,
      updates.agencyData ? JSON.stringify(updates.agencyData) : null,
      updates.pamConfig ? JSON.stringify(updates.pamConfig) : null,
      updates.validationMethod
    ]
  );
  return result.rows[0] ? mapAccessItem(result.rows[0]) : null;
}

export async function deleteAccessItem(id) {
  await pool.query(`DELETE FROM access_items WHERE id = $1`, [id]);
}

export async function getAccessItemById(id) {
  const result = await pool.query(`SELECT * FROM access_items WHERE id = $1`, [id]);
  return result.rows[0] ? mapAccessItem(result.rows[0]) : null;
}

// ============================================================================
// ACCESS REQUESTS
// ============================================================================

function mapAccessRequestItem(row) {
  return {
    id: row.id,
    accessRequestId: row.accessRequestId,
    platformId: row.platformId,
    itemType: row.itemType,
    accessPattern: row.accessPattern,
    patternLabel: row.patternLabel,
    role: row.role,
    assetName: row.assetName,
    identityPurpose: row.identityPurpose,
    humanIdentityStrategy: row.humanIdentityStrategy,
    resolvedIdentity: row.resolvedIdentity,
    agencyGroupEmail: row.agencyGroupEmail,
    agencyData: row.agencyData,
    pamOwnership: row.pamOwnership,
    pamConfig: row.pamConfig,
    pamUsername: row.pamUsername,
    pamSecretRef: row.pamSecretRef,
    clientProvidedTarget: row.clientProvidedTarget,
    clientInstructions: row.clientInstructions,
    status: row.status,
    validatedAt: row.validatedAt,
    validatedBy: row.validatedBy,
    validationMode: row.validationMode,
    validationResult: row.validationResult,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function getAllAccessRequests() {
  const result = await pool.query(`
    SELECT ar.*, c.name as client_name, c.email as client_email
    FROM access_requests ar
    JOIN clients c ON ar."clientId" = c.id
    ORDER BY ar."createdAt" DESC
  `);
  
  const requests = [];
  for (const row of result.rows) {
    const itemsResult = await pool.query(
      `SELECT ari.*, cp.name as platform_name, cp.icon as platform_icon
       FROM access_request_items ari
       JOIN catalog_platforms cp ON ari."platformId" = cp.id
       WHERE ari."accessRequestId" = $1`,
      [row.id]
    );
    
    requests.push({
      id: row.id,
      clientId: row.clientId,
      token: row.token,
      notes: row.notes,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      client: { id: row.clientId, name: row.client_name, email: row.client_email },
      items: itemsResult.rows.map(item => ({
        ...mapAccessRequestItem(item),
        platform: { id: item.platformId, name: item.platform_name, icon: item.platform_icon }
      }))
    });
  }
  return requests;
}

export async function getAccessRequestById(id) {
  const result = await pool.query(`
    SELECT ar.*, c.name as client_name, c.email as client_email
    FROM access_requests ar
    JOIN clients c ON ar."clientId" = c.id
    WHERE ar.id = $1
  `, [id]);
  
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  
  const itemsResult = await pool.query(
    `SELECT ari.*, cp.name as platform_name, cp.icon as platform_icon,
            cp."supportedItemTypes" as platform_supported_item_types
     FROM access_request_items ari
     JOIN catalog_platforms cp ON ari."platformId" = cp.id
     WHERE ari."accessRequestId" = $1`,
    [row.id]
  );
  
  return {
    id: row.id,
    clientId: row.clientId,
    token: row.token,
    notes: row.notes,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    client: { id: row.clientId, name: row.client_name, email: row.client_email },
    items: itemsResult.rows.map(item => ({
      ...mapAccessRequestItem(item),
      platform: { 
        id: item.platformId, 
        name: item.platform_name, 
        icon: item.platform_icon,
        supportedItemTypes: item.platform_supported_item_types || []
      }
    }))
  };
}

export async function getAccessRequestByToken(token) {
  const result = await pool.query(
    `SELECT id FROM access_requests WHERE token = $1`,
    [token]
  );
  if (result.rows.length === 0) return null;
  return getAccessRequestById(result.rows[0].id);
}

export async function createAccessRequest(request) {
  const result = await pool.query(
    `INSERT INTO access_requests (id, "clientId", token, notes, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [request.id, request.clientId, request.token, request.notes]
  );
  return result.rows[0];
}

export async function createAccessRequestItem(item) {
  const result = await pool.query(
    `INSERT INTO access_request_items (
      id, "accessRequestId", "platformId", "itemType", "accessPattern", "patternLabel",
      role, "assetName", "identityPurpose", "humanIdentityStrategy", "resolvedIdentity",
      "agencyGroupEmail", "agencyData", "pamOwnership", "pamConfig", "clientInstructions",
      status, "createdAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
    ) RETURNING *`,
    [
      item.id,
      item.accessRequestId,
      item.platformId,
      item.itemType,
      item.accessPattern,
      item.patternLabel,
      item.role,
      item.assetName,
      item.identityPurpose,
      item.humanIdentityStrategy,
      item.resolvedIdentity,
      item.agencyGroupEmail,
      item.agencyData ? JSON.stringify(item.agencyData) : null,
      item.pamOwnership,
      item.pamConfig ? JSON.stringify(item.pamConfig) : null,
      item.clientInstructions,
      item.status || 'pending'
    ]
  );
  return mapAccessRequestItem(result.rows[0]);
}

export async function updateAccessRequestItem(id, updates) {
  // Build dynamic update query
  const setClauses = [];
  const values = [id];
  let paramIndex = 2;
  
  const fields = [
    'status', 'validatedAt', 'validatedBy', 'validationMode', 'validationResult',
    'clientProvidedTarget', 'pamUsername', 'pamSecretRef'
  ];
  
  for (const field of fields) {
    if (updates[field] !== undefined) {
      const dbField = field === 'validationResult' || field === 'clientProvidedTarget'
        ? `"${field}"`
        : `"${field}"`;
      const value = typeof updates[field] === 'object' && updates[field] !== null
        ? JSON.stringify(updates[field])
        : updates[field];
      setClauses.push(`${dbField} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }
  
  if (setClauses.length === 0) return getAccessRequestItemById(id);
  
  setClauses.push(`"updatedAt" = NOW()`);
  
  const query = `UPDATE access_request_items SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0] ? mapAccessRequestItem(result.rows[0]) : null;
}

export async function getAccessRequestItemById(id) {
  const result = await pool.query(`SELECT * FROM access_request_items WHERE id = $1`, [id]);
  return result.rows[0] ? mapAccessRequestItem(result.rows[0]) : null;
}

export async function updateAccessRequest(id, updates) {
  if (updates.completedAt !== undefined) {
    await pool.query(
      `UPDATE access_requests SET "completedAt" = $2, "updatedAt" = NOW() WHERE id = $1`,
      [id, updates.completedAt]
    );
  }
  return getAccessRequestById(id);
}

export async function getAccessRequestsByClientId(clientId) {
  const result = await pool.query(
    `SELECT id FROM access_requests WHERE "clientId" = $1 ORDER BY "createdAt" DESC`,
    [clientId]
  );
  const requests = [];
  for (const row of result.rows) {
    requests.push(await getAccessRequestById(row.id));
  }
  return requests;
}

// ============================================================================
// INTEGRATION IDENTITIES
// ============================================================================

export async function getAllIntegrationIdentities(filters = {}) {
  let query = `SELECT ii.*, cp.name as "platformName", cp.slug as "platformSlug"
               FROM integration_identities ii
               LEFT JOIN catalog_platforms cp ON ii."platformId" = cp.id`;
  const params = [];
  const conditions = [];
  
  if (filters.platformId) {
    params.push(filters.platformId);
    conditions.push(`ii."platformId" = $${params.length}`);
  }
  
  if (filters.type) {
    params.push(filters.type);
    conditions.push(`ii.type = $${params.length}`);
  }
  
  if (filters.isActive !== undefined) {
    params.push(filters.isActive);
    conditions.push(`ii."isActive" = $${params.length}`);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` ORDER BY ii.name`;
  
  const result = await pool.query(query, params);
  return result.rows.map(row => ({
    ...row,
    platform: row.platformId ? {
      id: row.platformId,
      name: row.platformName,
      slug: row.platformSlug
    } : null
  }));
}

// Get identities for agency (optionally filtered by platform)
// This returns identities suitable for the "Agency Identity" dropdown
export async function getAgencyIdentities(filters = {}) {
  // Agency identities are integration_identities of type SHARED_CREDENTIAL
  // that can be used for STATIC_AGENCY_IDENTITY PAM strategy
  let query = `SELECT ii.*, cp.name as "platformName", cp.slug as "platformSlug"
               FROM integration_identities ii
               LEFT JOIN catalog_platforms cp ON ii."platformId" = cp.id
               WHERE ii.type IN ('SHARED_CREDENTIAL', 'SERVICE_ACCOUNT')`;
  const params = [];
  
  if (filters.platformId) {
    params.push(filters.platformId);
    query += ` AND (ii."platformId" = $${params.length} OR ii."platformId" IS NULL)`;
  }
  
  if (filters.isActive !== undefined) {
    params.push(filters.isActive);
    query += ` AND ii."isActive" = $${params.length}`;
  }
  
  query += ` ORDER BY ii.name`;
  
  const result = await pool.query(query, params);
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    identifier: row.identifier, // email/login
    email: row.identifier, // alias for easier access
    description: row.description,
    platformId: row.platformId,
    isActive: row.isActive,
    metadata: row.metadata,
    platform: row.platformId ? {
      id: row.platformId,
      name: row.platformName,
      slug: row.platformSlug
    } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function getIntegrationIdentityById(id) {
  const result = await pool.query(
    `SELECT ii.*, cp.name as "platformName", cp.slug as "platformSlug"
     FROM integration_identities ii
     LEFT JOIN catalog_platforms cp ON ii."platformId" = cp.id
     WHERE ii.id = $1`, 
    [id]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    platform: row.platformId ? {
      id: row.platformId,
      name: row.platformName,
      slug: row.platformSlug
    } : null
  };
}

export async function createIntegrationIdentity(identity) {
  const result = await pool.query(
    `INSERT INTO integration_identities (id, name, type, identifier, description, "platformId", "isActive", metadata, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      identity.id,
      identity.name,
      identity.type,
      identity.identifier,
      identity.description,
      identity.platformId || null,
      identity.isActive ?? true,
      identity.metadata ? JSON.stringify(identity.metadata) : null
    ]
  );
  return result.rows[0];
}

export async function updateIntegrationIdentity(id, updates) {
  const result = await pool.query(
    `UPDATE integration_identities SET
      name = COALESCE($2, name),
      type = COALESCE($3, type),
      identifier = COALESCE($4, identifier),
      description = COALESCE($5, description),
      "platformId" = COALESCE($6, "platformId"),
      "isActive" = COALESCE($7, "isActive"),
      metadata = COALESCE($8, metadata),
      "updatedAt" = NOW()
    WHERE id = $1 RETURNING *`,
    [
      id,
      updates.name,
      updates.type,
      updates.identifier,
      updates.description,
      updates.platformId,
      updates.isActive,
      updates.metadata ? JSON.stringify(updates.metadata) : null
    ]
  );
  return result.rows[0];
}

export async function deleteIntegrationIdentity(id) {
  await pool.query(`DELETE FROM integration_identities WHERE id = $1`, [id]);
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function addAuditLog(entry) {
  const result = await pool.query(
    `INSERT INTO audit_logs (id, event, actor, "requestId", "itemId", "platformId", details, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      entry.id || require('uuid').v4(),
      entry.event,
      entry.actor,
      entry.requestId,
      entry.itemId,
      entry.platformId,
      entry.details ? JSON.stringify(entry.details) : null
    ]
  );
  return result.rows[0];
}

export async function getAuditLogs(filters = {}) {
  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const values = [];
  let paramIndex = 1;
  
  if (filters.requestId) {
    query += ` AND "requestId" = $${paramIndex}`;
    values.push(filters.requestId);
    paramIndex++;
  }
  if (filters.event) {
    query += ` AND event = $${paramIndex}`;
    values.push(filters.event);
    paramIndex++;
  }
  
  query += ` ORDER BY timestamp DESC LIMIT 100`;
  
  const result = await pool.query(query, values);
  return result.rows;
}

// ============================================================================
// PAM SESSIONS
// ============================================================================

export async function createPamSession(session) {
  const result = await pool.query(
    `INSERT INTO pam_sessions (id, "requestId", "itemId", "platformId", "userId", "expiresAt", status, "credentialRef", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *`,
    [
      session.id,
      session.requestId,
      session.itemId,
      session.platformId,
      session.userId,
      session.expiresAt,
      session.status || 'active',
      session.credentialRef
    ]
  );
  return result.rows[0];
}

export async function getPamSessionById(id) {
  const result = await pool.query(`SELECT * FROM pam_sessions WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function updatePamSession(id, updates) {
  const setClauses = [];
  const values = [id];
  let paramIndex = 2;
  
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`);
    values.push(updates.status);
    paramIndex++;
  }
  if (updates.checkedInAt !== undefined) {
    setClauses.push(`"checkedInAt" = $${paramIndex}`);
    values.push(updates.checkedInAt);
    paramIndex++;
  }
  
  if (setClauses.length === 0) return getPamSessionById(id);
  
  setClauses.push(`"updatedAt" = NOW()`);
  
  const result = await pool.query(
    `UPDATE pam_sessions SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function getActivePamSessions() {
  const result = await pool.query(
    `SELECT * FROM pam_sessions WHERE status = 'active' ORDER BY "checkedOutAt" DESC`
  );
  return result.rows;
}

// Export pool for raw queries if needed
export { pool };
