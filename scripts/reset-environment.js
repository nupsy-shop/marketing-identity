const { PrismaClient } = require('@prisma/client');

async function reset() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== RESETTING ENVIRONMENT ===');
    
    // Delete in FK-safe order (children first)
    
    // 1. accessible_targets (depends on oauth_tokens)
    const targets = await prisma.accessibleTarget.deleteMany({});
    console.log(`Deleted ${targets.count} accessible_targets`);
    
    // 2. oauth_tokens
    const tokens = await prisma.oAuthToken.deleteMany({});
    console.log(`Deleted ${tokens.count} oauth_tokens`);
    
    // 3. pam_sessions (no FK to access_request_items but references requestId/itemId)
    const sessions = await prisma.pamSession.deleteMany({});
    console.log(`Deleted ${sessions.count} pam_sessions`);
    
    // 4. audit_logs
    const logs = await prisma.auditLog.deleteMany({});
    console.log(`Deleted ${logs.count} audit_logs`);
    
    // 5. access_request_items (depends on access_requests and catalog_platforms)
    const reqItems = await prisma.accessRequestItem.deleteMany({});
    console.log(`Deleted ${reqItems.count} access_request_items`);
    
    // 6. access_requests (depends on clients)
    const requests = await prisma.accessRequest.deleteMany({});
    console.log(`Deleted ${requests.count} access_requests`);
    
    // 7. access_items (depends on agency_platforms)
    const items = await prisma.accessItem.deleteMany({});
    console.log(`Deleted ${items.count} access_items`);
    
    // 8. agency_platforms (depends on catalog_platforms)
    const agencies = await prisma.agencyPlatform.deleteMany({});
    console.log(`Deleted ${agencies.count} agency_platforms`);
    
    // 9. clients
    const clients = await prisma.client.deleteMany({});
    console.log(`Deleted ${clients.count} clients`);
    
    console.log('\n=== PRESERVED (not deleted) ===');
    const catalogCount = await prisma.catalogPlatform.count();
    const identityCount = await prisma.integrationIdentity.count();
    console.log(`catalog_platforms: ${catalogCount} records`);
    console.log(`integration_identities: ${identityCount} records`);
    
    console.log('\n=== RESET COMPLETE ===');
  } catch (error) {
    console.error('Reset error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
