// Prisma Seed Script - Populates the platform catalog
// Run with: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Create connection
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Platform catalog data
const CATALOG_PLATFORMS = [
  {
    id: '5b9278e4-5b92-45b9-85b9-5b9278e40000',
    name: 'Google Ads',
    slug: 'google-ads',
    domain: 'Paid Media',
    description: 'Google Ads Manager and MCC access',
    icon: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Standard', 'Read-only'], description: 'Link via Manager Account (MCC)' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Standard', 'Read-only'], description: 'Invite user to account' }
    ]
  },
  {
    id: '7c3d89f5-7c3d-47c3-97c3-7c3d89f50000',
    name: 'Meta Business Manager / Facebook Ads',
    slug: 'meta-business-manager',
    domain: 'Paid Media',
    description: 'Meta Business Manager, Facebook Ads, Instagram',
    icon: 'fab fa-meta',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Analyst'], description: 'Add as Business Manager partner' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Analyst', 'Advertiser'], description: 'Invite user to assets' }
    ]
  },
  {
    id: '8d4e9a06-8d4e-48d4-a8d4-8d4e9a060000',
    name: 'TikTok Ads',
    slug: 'tiktok-ads',
    domain: 'Paid Media',
    description: 'TikTok Business Center and Ads Manager',
    icon: 'fab fa-tiktok',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Operator'], description: 'Add as Business Center partner' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Operator', 'Analyst'], description: 'Invite user to ad account' }
    ]
  },
  {
    id: '0f75633f-0f75-40f7-80f7-0f75633f0000',
    name: 'Google Analytics / GA4',
    slug: 'google-analytics',
    domain: 'Analytics',
    description: 'Google Analytics 4 property access',
    icon: 'fas fa-chart-line',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT_PAM'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'], description: 'Invite user to property' },
      { pattern: 'GROUP_ACCESS', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'], description: 'Service account access' }
    ]
  },
  {
    id: '1a86744a-1a86-41a8-91a8-1a86744a0000',
    name: 'Google Search Console',
    slug: 'google-search-console',
    domain: 'SEO',
    description: 'Search Console property access',
    icon: 'fas fa-search',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE', 'PROXY_TOKEN'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Owner', 'Full', 'Restricted'], description: 'Invite user to property' },
      { pattern: 'PROXY_TOKEN', roles: ['Owner'], description: 'Site verification API' }
    ]
  },
  {
    id: '2b97855b-2b97-42b9-a2b9-2b97855b0000',
    name: 'Google Tag Manager',
    slug: 'google-tag-manager',
    domain: 'Analytics',
    description: 'GTM container access',
    icon: 'fas fa-tags',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Publish', 'Approve', 'Edit', 'Read'], description: 'Invite user to container' }
    ]
  },
  {
    id: '3c08966c-3c08-43c0-b3c0-3c08966c0000',
    name: 'Google Merchant Center',
    slug: 'google-merchant-center',
    domain: 'E-commerce',
    description: 'Merchant Center account access',
    icon: 'fas fa-shopping-cart',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Standard'], description: 'Invite user to account' }
    ]
  },
  {
    id: '4d19077d-4d19-44d1-c4d1-4d19077d0000',
    name: 'DV360 (Display & Video 360)',
    slug: 'dv360',
    domain: 'Paid Media',
    description: 'Display & Video 360 programmatic',
    icon: 'fas fa-tv',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium-High',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Standard', 'Read-only'], description: 'Link advertiser to seat' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Standard', 'Read-only'], description: 'Invite user to advertiser' }
    ]
  },
  {
    id: '5e2a188e-5e2a-45e2-d5e2-5e2a188e0000',
    name: 'LinkedIn Ads',
    slug: 'linkedin-ads',
    domain: 'Paid Media',
    description: 'LinkedIn Campaign Manager',
    icon: 'fab fa-linkedin',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Campaign Manager', 'Viewer'], description: 'Business Manager partner' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Campaign Manager', 'Viewer'], description: 'Invite user to account' }
    ]
  },
  {
    id: '6f3b299f-6f3b-46f3-e6f3-6f3b299f0000',
    name: 'Pinterest Ads',
    slug: 'pinterest-ads',
    domain: 'Paid Media',
    description: 'Pinterest Business and Ads Manager',
    icon: 'fab fa-pinterest',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Analyst'], description: 'Business Manager partner' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Analyst'], description: 'Invite user to account' }
    ]
  },
  {
    id: '7a4c3aa0-7a4c-47a4-f7a4-7a4c3aa00000',
    name: 'Snapchat Ads',
    slug: 'snapchat-ads',
    domain: 'Paid Media',
    description: 'Snapchat Business Center',
    icon: 'fab fa-snapchat',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Standard'], description: 'Business Center partner' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Standard', 'Read-only'], description: 'Invite user to account' }
    ]
  },
  {
    id: '8b5d4bb1-8b5d-48b5-08b5-8b5d4bb10000',
    name: 'Microsoft Advertising (Bing Ads)',
    slug: 'microsoft-advertising',
    domain: 'Paid Media',
    description: 'Microsoft Advertising / Bing Ads',
    icon: 'fab fa-microsoft',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Super Admin', 'Standard', 'Viewer'], description: 'Manager account link' },
      { pattern: 'NAMED_INVITE', roles: ['Super Admin', 'Standard', 'Viewer'], description: 'Invite user to account' }
    ]
  },
  {
    id: '9c6e5cc2-9c6e-49c6-19c6-9c6e5cc20000',
    name: 'Reddit Ads',
    slug: 'reddit-ads',
    domain: 'Paid Media',
    description: 'Reddit Ads Manager',
    icon: 'fab fa-reddit',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Member'], description: 'Invite user to ad account' }
    ]
  },
  {
    id: 'ad7f6dd3-ad7f-4ad7-2ad7-ad7f6dd30000',
    name: 'Snowflake',
    slug: 'snowflake',
    domain: 'Data Warehouse',
    description: 'Snowflake data warehouse',
    icon: 'fas fa-snowflake',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['GROUP_ACCESS', 'PROXY_TOKEN'],
    accessPatterns: [
      { pattern: 'GROUP_ACCESS', roles: ['ACCOUNTADMIN', 'SYSADMIN', 'Custom'], description: 'SSO/SCIM role assignment' },
      { pattern: 'PROXY_TOKEN', roles: ['Service Account'], description: 'Service account access' }
    ]
  },
  {
    id: 'be8a7ee4-be8a-4be8-3be8-be8a7ee40000',
    name: 'Fivetran',
    slug: 'fivetran',
    domain: 'Data Integration',
    description: 'Fivetran data pipelines',
    icon: 'fas fa-database',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium-High',
    supportedItemTypes: ['GROUP_ACCESS', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'GROUP_ACCESS', roles: ['Admin', 'User'], description: 'Service account access' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'User', 'Read-only'], description: 'Invite user to workspace' }
    ]
  },
  {
    id: 'cf9b8ff5-cf9b-4cf9-4cf9-cf9b8ff50000',
    name: 'HubSpot',
    slug: 'hubspot',
    domain: 'CRM',
    description: 'HubSpot CRM and Marketing Hub',
    icon: 'fab fa-hubspot',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Super Admin', 'Marketing', 'Sales', 'Service'], description: 'Invite user to portal' },
      { pattern: 'GROUP_ACCESS', roles: ['Team Access'], description: 'SCIM group assignment' }
    ]
  },
  {
    id: 'd0ac9006-d0ac-4d0a-5d0a-d0ac90060000',
    name: 'Salesforce',
    slug: 'salesforce',
    domain: 'CRM',
    description: 'Salesforce CRM',
    icon: 'fab fa-salesforce',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium-High',
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['System Admin', 'Standard User', 'Custom'], description: 'Invite user to org' },
      { pattern: 'GROUP_ACCESS', roles: ['SSO/SCIM Role'], description: 'SSO group assignment' }
    ]
  },
  {
    id: 'e1bd0117-e1bd-4e1b-6e1b-e1bd01170000',
    name: 'Shopify',
    slug: 'shopify',
    domain: 'E-commerce',
    description: 'Shopify store access',
    icon: 'fab fa-shopify',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE', 'PROXY_TOKEN'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Collaborator', 'Staff'], description: 'Invite collaborator to store' },
      { pattern: 'PROXY_TOKEN', roles: ['App Access'], description: 'Custom app / service account' }
    ]
  },
  {
    id: 'f2ce1228-f2ce-4f2c-7f2c-f2ce12280000',
    name: 'The Trade Desk',
    slug: 'the-trade-desk',
    domain: 'Paid Media',
    description: 'The Trade Desk DSP',
    icon: 'fas fa-ad',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium-High',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'User'], description: 'Seat/partner link' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'User', 'Viewer'], description: 'Invite user to advertiser' }
    ]
  },
  {
    id: '03df2339-03df-403d-803d-03df23390000',
    name: 'StackAdapt',
    slug: 'stackadapt',
    domain: 'Paid Media',
    description: 'StackAdapt programmatic',
    icon: 'fas fa-layer-group',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'User'], description: 'Seat/partner link' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'User'], description: 'Invite user to advertiser' }
    ]
  },
  {
    id: '14e0344a-14e0-414e-914e-14e0344a0000',
    name: 'YouTube Ads',
    slug: 'youtube-ads',
    domain: 'Paid Media',
    description: 'YouTube advertising (via Google Ads)',
    icon: 'fab fa-youtube',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PARTNER_DELEGATION', roles: ['Admin', 'Standard'], description: 'Via Google Ads MCC' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Standard'], description: 'Invite to linked account' }
    ]
  },
  {
    id: '25f1455b-25f1-425f-a25f-25f1455b0000',
    name: 'Looker Studio (Data Studio)',
    slug: 'looker-studio',
    domain: 'Analytics',
    description: 'Looker Studio / Google Data Studio',
    icon: 'fas fa-chart-bar',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'High',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Editor', 'Viewer'], description: 'Share report/data source' }
    ]
  },
  {
    id: '36a2566c-36a2-436a-b36a-36a2566c0000',
    name: 'Power BI',
    slug: 'power-bi',
    domain: 'Analytics',
    description: 'Microsoft Power BI',
    icon: 'fas fa-chart-pie',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Member', 'Viewer'], description: 'Invite to workspace' },
      { pattern: 'GROUP_ACCESS', roles: ['Workspace Role'], description: 'Azure AD group' }
    ]
  },
  {
    id: '47b3677d-47b3-447b-c47b-47b3677d0000',
    name: 'Triple Whale',
    slug: 'triple-whale',
    domain: 'Analytics',
    description: 'E-commerce analytics',
    icon: 'fas fa-whale',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Member'], description: 'Invite user to store' }
    ]
  },
  {
    id: '58c4788e-58c4-458c-d58c-58c4788e0000',
    name: 'CallRail',
    slug: 'callrail',
    domain: 'Analytics',
    description: 'Call tracking and analytics',
    icon: 'fas fa-phone',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'Manager', 'Read-only'], description: 'Invite user to company' }
    ]
  },
  {
    id: '69d5899f-69d5-469d-e69d-69d5899f0000',
    name: 'Funnel.io',
    slug: 'funnel-io',
    domain: 'Data Integration',
    description: 'Marketing data hub',
    icon: 'fas fa-funnel-dollar',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    supportedItemTypes: ['PROXY_TOKEN', 'NAMED_INVITE'],
    accessPatterns: [
      { pattern: 'PROXY_TOKEN', roles: ['Integration'], description: 'OAuth/API integration' },
      { pattern: 'NAMED_INVITE', roles: ['Admin', 'User'], description: 'Invite to workspace' }
    ]
  }
];

async function main() {
  console.log('🌱 Seeding platform catalog...');
  
  // Upsert all platforms
  for (const platform of CATALOG_PLATFORMS) {
    await prisma.catalogPlatform.upsert({
      where: { id: platform.id },
      update: {
        name: platform.name,
        slug: platform.slug,
        domain: platform.domain,
        description: platform.description,
        icon: platform.icon,
        tier: platform.tier,
        clientFacing: platform.clientFacing,
        automationFeasibility: platform.automationFeasibility,
        supportedItemTypes: platform.supportedItemTypes,
        accessPatterns: platform.accessPatterns,
      },
      create: platform,
    });
    console.log(`  ✓ ${platform.name}`);
  }
  
  console.log(`\n✅ Seeded ${CATALOG_PLATFORMS.length} platforms`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
