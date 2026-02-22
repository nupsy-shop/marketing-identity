// Seed script for Marketing Identity Platform
import { PrismaClient } from '@prisma/client';

// Prisma v7 with Prisma Postgres works without explicit configuration
const prisma = new PrismaClient();

// Platform metadata with icons, descriptions, tiers, and detailed access patterns
const platformsData = [
  {
    name: 'Google Ads',
    slug: 'google-ads',
    domain: 'Paid Media',
    description: 'Reach customers searching for your products and services with targeted search, display, and video ads.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium-High',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'MCC Linking', roles: ['Admin', 'Standard', 'Read-only', 'Email-only'] }
    ],
    notes: 'MCC linking centralizes internal access; core reference pattern.'
  },
  {
    name: 'Meta/Facebook Ads',
    slug: 'meta-facebook-ads',
    domain: 'Paid Media',
    description: 'Create ads to reach your ideal customers on Facebook, Instagram, Messenger, and Audience Network.',
    iconName: 'fab fa-facebook',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Manager Access', roles: ['Admin', 'Advertiser', 'Analyst'] }
    ],
    notes: 'Partner/Business Manager delegation pattern (agency manages internally).'
  },
  {
    name: 'Google Analytics/GA4',
    slug: 'google-analytics-ga4',
    domain: 'Analytics',
    description: 'Understand how users interact with your website and apps with advanced analytics and reporting.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'] },
      { pattern: '3', label: 'Group Access', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'] }
    ],
    notes: 'Prefer group-based where supported; otherwise named users + recert.'
  },
  {
    name: 'Google Tag Manager',
    slug: 'google-tag-manager',
    domain: 'Tagging',
    description: 'Manage website tags and track conversions without editing code.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Container Access', roles: ['Administrator', 'Publish', 'Edit', 'Read'] }
    ],
    notes: 'User + container permissions; avoid single-admin lockout risk.'
  },
  {
    name: 'Google Search Console',
    slug: 'google-search-console',
    domain: 'SEO/Analytics',
    description: 'Monitor and maintain your site\'s presence in Google Search results.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Low',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Property Access', roles: ['Owner', 'Full User', 'Restricted User'] },
      { pattern: '4 (Proxy)', label: 'Delegated Access', roles: ['Full User'] }
    ],
    notes: 'No group assignment; must manage per-user property access.'
  },
  {
    name: 'Google Merchant Center',
    slug: 'google-merchant-center',
    domain: 'Retail / Ecommerce',
    description: 'Upload your product data to Google and make it available for Shopping ads.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Account Access', roles: ['Admin', 'Standard', 'Reporting'] }
    ],
    notes: 'Named users; couple with strict admin role governance.'
  },
  {
    name: 'LinkedIn Ads',
    slug: 'linkedin-ads',
    domain: 'Advertising platform',
    description: 'Reach professionals with targeted advertising on the world\'s largest professional network.',
    iconName: 'fab fa-linkedin',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Campaign Manager Access', roles: ['Account Manager', 'Campaign Manager', 'Creative Manager', 'Viewer'] }
    ],
    notes: ''
  },
  {
    name: 'TikTok Ads',
    slug: 'tiktok-ads',
    domain: 'Paid Media',
    description: 'Create engaging video ads and reach TikTok\'s highly engaged audience.',
    iconName: 'fab fa-tiktok',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Center Access', roles: ['Admin', 'Operator', 'Analyst'] }
    ],
    notes: 'Business Center partner asset permissions are designed for delegation.'
  },
  {
    name: 'Microsoft Advertising',
    slug: 'microsoft-advertising',
    domain: 'Advertising platform',
    description: 'Reach customers on Bing, Yahoo, and Microsoft partner sites.',
    iconName: 'fab fa-microsoft',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Manager Account', roles: ['Super Admin', 'Standard User', 'Viewer'] },
      { pattern: '2 (Named Invites)', label: 'Direct Access', roles: ['Super Admin', 'Standard User', 'Viewer'] }
    ],
    notes: 'Prefer manager/delegation model when possible; otherwise invites.'
  },
  {
    name: 'Shopify',
    slug: 'shopify',
    domain: 'Ecommerce',
    description: 'All-in-one ecommerce platform to start, run, and grow your business.',
    iconName: 'fab fa-shopify',
    tier: 1,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Staff Access', roles: ['Staff', 'Collaborator'] }
    ],
    notes: 'Collaborator/staff access; treat store admin as privileged.'
  },
  // Tier 2 platforms
  {
    name: 'Adobe Analytics',
    slug: 'adobe-analytics',
    domain: 'Analytics',
    description: 'Enterprise analytics for understanding customer journeys across channels.',
    iconName: 'fas fa-chart-line',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'User'] }
    ],
    notes: 'Govern via IGA approvals + periodic user export review.'
  },
  {
    name: 'HubSpot',
    slug: 'hubspot',
    domain: 'CRM / RevOps / marketing automation',
    description: 'Inbound marketing, sales, and service software that helps companies grow.',
    iconName: 'fab fa-hubspot',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Super Admin', 'Admin', 'Sales', 'Marketing', 'Service'] }
    ],
    notes: ''
  },
  {
    name: 'Salesforce',
    slug: 'salesforce',
    domain: 'CRM / RevOps / marketing automation',
    description: 'World\'s #1 CRM platform for sales, service, marketing, and commerce.',
    iconName: 'fab fa-salesforce',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['System Administrator', 'Standard User', 'Marketing User'] }
    ],
    notes: 'Requests Google Workspace OAuth scopes'
  },
  {
    name: 'Klaviyo',
    slug: 'klaviyo',
    domain: 'Email/SMS',
    description: 'Email and SMS marketing platform built for ecommerce.',
    iconName: 'fas fa-envelope',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Owner', 'Admin', 'Manager', 'Analyst'] }
    ],
    notes: 'Role-based users; JIT access for high-risk permissions.'
  },
  {
    name: 'Mailchimp',
    slug: 'mailchimp',
    domain: 'Email',
    description: 'Email marketing and automation platform for growing businesses.',
    iconName: 'fab fa-mailchimp',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Owner', 'Admin', 'Manager', 'Author', 'Viewer'] }
    ],
    notes: 'Named users; restrict admin roles; recert.'
  },
  {
    name: 'Snowflake',
    slug: 'snowflake',
    domain: 'Data pipeline / warehouse',
    description: 'Cloud data platform for data warehousing, data lakes, and data sharing.',
    iconName: 'fas fa-snowflake',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '4 (Proxy)', label: 'Service Account', roles: ['ACCOUNTADMIN', 'SYSADMIN', 'USERADMIN', 'SECURITYADMIN'] }
    ],
    notes: 'Requests Google Workspace OAuth scopes'
  },
  {
    name: 'Pinterest Ads',
    slug: 'pinterest-ads',
    domain: 'Paid Media',
    description: 'Reach people planning their next purchase on Pinterest.',
    iconName: 'fab fa-pinterest',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Access', roles: ['Admin', 'Analyst'] },
      { pattern: '2 (Named Invites)', label: 'Direct Access', roles: ['Admin', 'Analyst'] }
    ],
    notes: 'Prefer partner/business access where available.'
  },
  {
    name: 'Snapchat Ads',
    slug: 'snapchat-ads',
    domain: 'Paid Media',
    description: 'Reach Snapchat\'s engaged audience with full-screen mobile ads.',
    iconName: 'fab fa-snapchat',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Manager', roles: ['Admin', 'Member'] },
      { pattern: '2 (Named Invites)', label: 'Direct Access', roles: ['Admin', 'Member'] }
    ],
    notes: 'Business/asset permissions; try partner delegation first.'
  },
  {
    name: 'Reddit Ads',
    slug: 'reddit-ads',
    domain: 'Advertising platform',
    description: 'Reach highly engaged communities with Reddit\'s advertising platform.',
    iconName: 'fab fa-reddit',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Ad Account Access', roles: ['Admin', 'Analyst'] }
    ],
    notes: 'Requests Google Workspace OAuth scopes'
  },
  // Additional platforms from Excel
  {
    name: 'Adobe Creative Cloud',
    slug: 'adobe-creative-cloud',
    domain: 'Web / content / creative',
    description: 'Creative tools and services for designers, photographers, and video professionals.',
    iconName: 'fas fa-palette',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Team Access', roles: ['Admin', 'Member'] }
    ],
    notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes'
  },
  {
    name: 'Amazon (Retail Media)',
    slug: 'amazon-retail-media',
    domain: 'Retail Media / Ads',
    description: 'Advertise products to shoppers on Amazon and reach customers at key moments.',
    iconName: 'fab fa-amazon',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Account Access', roles: ['Account Administrator', 'Campaign Manager', 'Analyst'] }
    ],
    notes: 'Client-managed access; enforce approvals + evidence capture.'
  },
  {
    name: 'Apple Search Ads',
    slug: 'apple-search-ads',
    domain: 'Paid Media',
    description: 'Promote your apps at the top of App Store search results.',
    iconName: 'fab fa-apple',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Limited Access - Campaign Management', 'API Read Only'] }
    ],
    notes: 'Named user access; time-box access for contractors.'
  },
  {
    name: 'BigCommerce',
    slug: 'bigcommerce',
    domain: 'Ecommerce',
    description: 'Open SaaS ecommerce platform for fast-growing and established brands.',
    iconName: 'fas fa-shopping-cart',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Staff Access', roles: ['Store Owner', 'Admin', 'Staff'] }
    ],
    notes: 'Store-level staff/collaborator access; certify regularly.'
  },
  {
    name: 'DV360',
    slug: 'dv360',
    domain: 'Paid Media / DSP',
    description: 'Google\'s programmatic advertising platform for reaching audiences at scale.',
    iconName: 'fab fa-google',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Partner Seat', roles: ['Admin', 'Standard', 'Read-only'] }
    ],
    notes: 'Use agency seat/partner delegation; internal RBAC lives in the seat.'
  },
  {
    name: 'The Trade Desk',
    slug: 'the-trade-desk',
    domain: 'DSP',
    description: 'Leading independent demand-side platform for digital advertising.',
    iconName: 'fas fa-ad',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Seat Access', roles: ['Admin', 'Planner', 'Trader', 'Reporter'] },
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Planner', 'Trader', 'Reporter'] }
    ],
    notes: 'Prefer agency seat-based governance + strong admin controls.'
  },
  {
    name: 'Marketo',
    slug: 'marketo',
    domain: 'MarTech',
    description: 'Marketing automation platform for lead management and nurturing.',
    iconName: 'fas fa-bullhorn',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Marketing User', 'Web Designer'] }
    ],
    notes: 'Strong role model; SSO sometimes possible but client-dependent.'
  },
  {
    name: 'Attentive',
    slug: 'attentive',
    domain: 'SMS/MarTech',
    description: 'SMS and email marketing platform for personalized messaging at scale.',
    iconName: 'fas fa-sms',
    tier: 2,
    clientFacing: true,
    automationFeasibility: 'Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Manager', 'Analyst'] }
    ],
    notes: 'Role-based users; align roles to job functions.'
  },
  // Non-client-facing platforms (exclude from catalog)
  {
    name: 'Gong',
    slug: 'gong',
    domain: 'CRM / RevOps / marketing automation',
    description: 'Revenue intelligence platform for sales teams (Internal tool).',
    iconName: 'fas fa-microphone',
    tier: 2,
    clientFacing: false,
    automationFeasibility: 'Low-Medium',
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Manager', 'User'] }
    ],
    notes: 'Internal tool - not for client access'
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default agency settings
  console.log('📝 Creating agency settings...');
  const agencySettings = await prisma.agencySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      agencyName: 'Marketing Agency',
      primaryColor: '#2563eb',
      secondaryColor: '#7c3aed',
      supportEmail: 'support@agency.com'
    }
  });
  console.log(`✅ Agency settings created: ${agencySettings.agencyName}`);

  // Create default admin user
  console.log('👤 Creating default admin user...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@agency.com' },
    update: {},
    create: {
      email: 'admin@agency.com',
      name: 'Admin User',
      role: 'admin'
    }
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Seed platforms
  console.log(`🚀 Seeding ${platformsData.length} platforms...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (const platformData of platformsData) {
    const existing = await prisma.platform.findUnique({
      where: { slug: platformData.slug }
    });

    if (existing) {
      await prisma.platform.update({
        where: { slug: platformData.slug },
        data: platformData
      });
      updatedCount++;
    } else {
      await prisma.platform.create({
        data: platformData
      });
      createdCount++;
    }
  }

  console.log(`✅ Platforms seeded: ${createdCount} created, ${updatedCount} updated`);

  // Summary
  const totalPlatforms = await prisma.platform.count();
  const tier1Count = await prisma.platform.count({ where: { tier: 1 } });
  const tier2Count = await prisma.platform.count({ where: { tier: 2 } });
  const clientFacingCount = await prisma.platform.count({ where: { clientFacing: true } });

  console.log('\n📊 Database Summary:');
  console.log(`   Total Platforms: ${totalPlatforms}`);
  console.log(`   Tier 1 (Full Asset Support): ${tier1Count}`);
  console.log(`   Tier 2 (Platform-Level): ${tier2Count}`);
  console.log(`   Client-Facing: ${clientFacingCount}`);
  console.log(`   Internal Only: ${totalPlatforms - clientFacingCount}`);

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
