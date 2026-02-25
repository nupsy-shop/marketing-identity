import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function reset() {
  try {
    console.log('=== RESETTING ENVIRONMENT ===');
    
    const targets = await prisma.accessibleTarget.deleteMany({});
    console.log(`Deleted ${targets.count} accessible_targets`);
    
    const tokens = await prisma.oAuthToken.deleteMany({});
    console.log(`Deleted ${tokens.count} oauth_tokens`);
    
    const sessions = await prisma.pamSession.deleteMany({});
    console.log(`Deleted ${sessions.count} pam_sessions`);
    
    const logs = await prisma.auditLog.deleteMany({});
    console.log(`Deleted ${logs.count} audit_logs`);
    
    const reqItems = await prisma.accessRequestItem.deleteMany({});
    console.log(`Deleted ${reqItems.count} access_request_items`);
    
    const requests = await prisma.accessRequest.deleteMany({});
    console.log(`Deleted ${requests.count} access_requests`);
    
    const items = await prisma.accessItem.deleteMany({});
    console.log(`Deleted ${items.count} access_items`);
    
    const agencies = await prisma.agencyPlatform.deleteMany({});
    console.log(`Deleted ${agencies.count} agency_platforms`);
    
    const clients = await prisma.client.deleteMany({});
    console.log(`Deleted ${clients.count} clients`);
    
    console.log('\n=== PRESERVED (not deleted) ===');
    const catalogCount = await prisma.catalogPlatform.count();
    const identityCount = await prisma.integrationIdentity.count();
    console.log(`catalog_platforms: ${catalogCount} records`);
    console.log(`integration_identities: ${identityCount} records`);
    
    console.log('\n=== RESET COMPLETE ===');
  } catch (error) {
    console.error('Reset error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

reset();
