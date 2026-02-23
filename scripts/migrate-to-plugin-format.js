/**
 * Data Migration Script - Migrate Legacy Access Items to Plugin Architecture
 * 
 * This script migrates existing AccessItems from the old field-based format
 * to the new agencyConfigJson format used by the plugin system.
 * 
 * Run with: node scripts/migrate-to-plugin-format.js
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Map platform names to plugin keys
function getPlatformKey(platformName) {
  if (!platformName) return null;
  const normalized = platformName.toLowerCase();
  
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
    'display': 'dv360',
    'video 360': 'dv360',
    'the trade desk': 'trade-desk',
    'trade desk': 'trade-desk',
    'tiktok': 'tiktok',
    'snapchat': 'snapchat',
    'linkedin': 'linkedin',
    'pinterest': 'pinterest',
    'hubspot': 'hubspot',
    'salesforce': 'salesforce',
    'google tag manager': 'gtm',
    'tag manager': 'gtm',
    'gtm': 'gtm',
    'universal analytics': 'ga-ua',
    'looker': 'ga4',
    'data studio': 'ga4',
  };
  
  for (const [key, value] of Object.entries(keyMap)) {
    if (normalized.includes(key)) return value;
  }
  return null;
}

// Convert legacy fields to agencyConfigJson
function buildAgencyConfigJson(item) {
  const config = {};
  
  // Agency data fields (platform identifiers)
  if (item.agency_data) {
    const agencyData = typeof item.agency_data === 'string' 
      ? JSON.parse(item.agency_data) 
      : item.agency_data;
    
    if (agencyData.managerAccountId) config.managerAccountId = agencyData.managerAccountId;
    if (agencyData.businessManagerId) config.businessManagerId = agencyData.businessManagerId;
    if (agencyData.businessCenterId) config.businessCenterId = agencyData.businessCenterId;
    if (agencyData.seatId) config.seatId = agencyData.seatId;
    if (agencyData.serviceAccountEmail) config.serviceAccountEmail = agencyData.serviceAccountEmail;
    if (agencyData.ssoGroupName) config.ssoGroupName = agencyData.ssoGroupName;
    if (agencyData.partnerId) config.partnerId = agencyData.partnerId;
  }
  
  // Identity strategy fields
  if (item.human_identity_strategy) {
    config.humanIdentityStrategy = item.human_identity_strategy;
  }
  if (item.agency_group_email) {
    config.agencyGroupEmail = item.agency_group_email;
  }
  if (item.identity_purpose) {
    config.identityPurpose = item.identity_purpose;
  }
  if (item.integration_identity_id) {
    config.integrationIdentityId = item.integration_identity_id;
  }
  if (item.naming_template) {
    config.namingTemplate = item.naming_template;
  }
  
  // PAM config
  if (item.pam_config) {
    const pamConfig = typeof item.pam_config === 'string' 
      ? JSON.parse(item.pam_config) 
      : item.pam_config;
    
    if (pamConfig.ownership) config.pamOwnership = pamConfig.ownership;
    if (pamConfig.identityStrategy) config.pamIdentityStrategy = pamConfig.identityStrategy;
    if (pamConfig.agencyIdentityEmail) config.pamAgencyIdentityEmail = pamConfig.agencyIdentityEmail;
    if (pamConfig.identityType) config.pamIdentityType = pamConfig.identityType;
    if (pamConfig.namingTemplate) config.pamNamingTemplate = pamConfig.namingTemplate;
    if (pamConfig.checkoutPolicy) {
      if (pamConfig.checkoutPolicy.durationMinutes) {
        config.pamCheckoutDurationMinutes = pamConfig.checkoutPolicy.durationMinutes;
      }
      if (pamConfig.checkoutPolicy.approvalRequired !== undefined) {
        config.pamApprovalRequired = pamConfig.checkoutPolicy.approvalRequired;
      }
      if (pamConfig.checkoutPolicy.rotationTrigger) {
        config.pamRotationTrigger = pamConfig.checkoutPolicy.rotationTrigger;
      }
    }
  }
  
  return config;
}

// Determine migration status
function getMigrationStatus(item, agencyConfigJson) {
  // Check if we have enough data to consider it migrated
  const hasConfig = Object.keys(agencyConfigJson).length > 0;
  const hasBasicFields = item.item_type && item.role;
  
  if (hasConfig && hasBasicFields) {
    return 'MIGRATED';
  } else if (hasBasicFields) {
    return 'MIGRATED'; // Basic items without config are OK
  } else {
    return 'NEEDS_REVIEW';
  }
}

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration to plugin architecture...\n');
    
    // First, check if columns exist and add them if not
    console.log('Checking database schema...');
    
    const schemaCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'access_items' 
      AND column_name IN ('agency_config_json', 'platform_key', 'plugin_version', 'migration_status')
    `);
    
    const existingColumns = schemaCheck.rows.map(r => r.column_name);
    
    // Add missing columns
    if (!existingColumns.includes('agency_config_json')) {
      console.log('Adding agency_config_json column...');
      await client.query(`ALTER TABLE access_items ADD COLUMN IF NOT EXISTS agency_config_json JSONB DEFAULT '{}'`);
    }
    if (!existingColumns.includes('platform_key')) {
      console.log('Adding platform_key column...');
      await client.query(`ALTER TABLE access_items ADD COLUMN IF NOT EXISTS platform_key VARCHAR(100)`);
    }
    if (!existingColumns.includes('plugin_version')) {
      console.log('Adding plugin_version column...');
      await client.query(`ALTER TABLE access_items ADD COLUMN IF NOT EXISTS plugin_version VARCHAR(20) DEFAULT '1.0.0'`);
    }
    if (!existingColumns.includes('migration_status')) {
      console.log('Adding migration_status column...');
      await client.query(`ALTER TABLE access_items ADD COLUMN IF NOT EXISTS migration_status VARCHAR(20) DEFAULT 'LEGACY'`);
    }
    
    // Get all access items with their platform info
    console.log('\nFetching access items...');
    const result = await client.query(`
      SELECT 
        ai.id,
        ai."itemType" as item_type,
        ai.role,
        ai."agencyData" as agency_data,
        ai."humanIdentityStrategy" as human_identity_strategy,
        ai."agencyGroupEmail" as agency_group_email,
        ai."identityPurpose" as identity_purpose,
        ai."integrationIdentityId" as integration_identity_id,
        ai."pamConfig" as pam_config,
        ai.agency_config_json,
        ai.platform_key,
        ai.migration_status,
        cp.name as platform_name
      FROM access_items ai
      LEFT JOIN agency_platforms ap ON ai."agencyPlatformId" = ap.id
      LEFT JOIN catalog_platforms cp ON ap."platformId" = cp.id
      WHERE ai.migration_status IS NULL OR ai.migration_status = 'LEGACY'
    `);
    
    console.log(`Found ${result.rows.length} items to migrate.\n`);
    
    if (result.rows.length === 0) {
      console.log('No items to migrate. All items are already migrated.\n');
      return;
    }
    
    let migrated = 0;
    let needsReview = 0;
    let errors = 0;
    
    for (const item of result.rows) {
      try {
        // Build the new agencyConfigJson
        const agencyConfigJson = buildAgencyConfigJson(item);
        
        // Get platform key
        const platformKey = getPlatformKey(item.platform_name);
        
        // Determine migration status
        const migrationStatus = getMigrationStatus(item, agencyConfigJson);
        
        // Update the record
        await client.query(`
          UPDATE access_items 
          SET 
            agency_config_json = $1,
            platform_key = $2,
            plugin_version = '1.0.0',
            migration_status = $3
          WHERE id = $4
        `, [JSON.stringify(agencyConfigJson), platformKey, migrationStatus, item.id]);
        
        if (migrationStatus === 'MIGRATED') {
          migrated++;
          console.log(`✓ Migrated: ${item.id} (${item.platform_name || 'Unknown'} - ${item.item_type})`);
        } else {
          needsReview++;
          console.log(`⚠ Needs Review: ${item.id} (${item.platform_name || 'Unknown'} - ${item.item_type})`);
        }
        
        // Log the converted config for debugging
        if (Object.keys(agencyConfigJson).length > 0) {
          console.log(`  Config: ${JSON.stringify(agencyConfigJson)}`);
        }
        
      } catch (err) {
        errors++;
        console.error(`✗ Error migrating ${item.id}:`, err.message);
      }
    }
    
    console.log('\n========================================');
    console.log('Migration Summary');
    console.log('========================================');
    console.log(`Total items processed: ${result.rows.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Needs review: ${needsReview}`);
    console.log(`Errors: ${errors}`);
    console.log('========================================\n');
    
    // Also migrate access_request_items if they exist
    console.log('Checking access_request_items...');
    const requestItemsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'access_request_items' 
      AND column_name = 'client_target_json'
    `);
    
    if (requestItemsCheck.rows.length === 0) {
      console.log('Adding client_target_json column to access_request_items...');
      await client.query(`ALTER TABLE access_request_items ADD COLUMN IF NOT EXISTS client_target_json JSONB DEFAULT '{}'`);
    }
    
    // Migrate client_provided_target to client_target_json
    const requestItems = await client.query(`
      SELECT id, "clientProvidedTarget" as client_provided_target 
      FROM access_request_items 
      WHERE "clientProvidedTarget" IS NOT NULL 
      AND (client_target_json IS NULL OR client_target_json = '{}')
    `);
    
    if (requestItems.rows.length > 0) {
      console.log(`\nMigrating ${requestItems.rows.length} access request items...`);
      
      for (const ri of requestItems.rows) {
        try {
          const clientTarget = typeof ri.client_provided_target === 'string'
            ? JSON.parse(ri.client_provided_target)
            : ri.client_provided_target;
          
          await client.query(`
            UPDATE access_request_items 
            SET client_target_json = $1
            WHERE id = $2
          `, [JSON.stringify(clientTarget), ri.id]);
          
          console.log(`✓ Migrated request item: ${ri.id}`);
        } catch (err) {
          console.error(`✗ Error migrating request item ${ri.id}:`, err.message);
        }
      }
    }
    
    console.log('\nMigration complete!');
    
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration script failed:', err);
    process.exit(1);
  });
