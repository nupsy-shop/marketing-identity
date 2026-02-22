// Enhanced Platform registry with enterprise metadata
import { Platform } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Enhanced platform data with icons, descriptions, tiers, and detailed access patterns
const rawPlatforms = [
  // TIER 1 PLATFORMS - Full asset-level support
  { 
    name: 'Google Ads', 
    domain: 'Paid Media', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium-High', 
    notes: 'MCC linking centralizes internal access; core reference pattern.',
    description: 'Reach customers searching for your products and services with targeted search, display, and video ads.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'MCC Linking', roles: ['Admin', 'Standard', 'Read-only', 'Email-only'] }
    ]
  },
  { 
    name: 'Meta/Facebook Ads', 
    domain: 'Paid Media', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: 'Partner/Business Manager delegation pattern (agency manages internally).',
    description: 'Create ads to reach your ideal customers on Facebook, Instagram, Messenger, and Audience Network.',
    iconName: 'fab fa-facebook',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Manager Access', roles: ['Admin', 'Advertiser', 'Analyst'] }
    ]
  },
  { 
    name: 'Google Analytics/GA4', 
    domain: 'Analytics', 
    accessPattern: '2 or 3', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer group-based where supported; otherwise named users + recert.',
    description: 'Understand how users interact with your website and apps with advanced analytics and reporting.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'] },
      { pattern: '3', label: 'Group Access', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'] }
    ]
  },
  { 
    name: 'Google Tag Manager', 
    domain: 'Tagging', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'User + container permissions; avoid single-admin lockout risk.',
    description: 'Manage website tags and track conversions without editing code.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Container Access', roles: ['Administrator', 'Publish', 'Edit', 'Read'] }
    ]
  },
  { 
    name: 'Google Search Console', 
    domain: 'SEO/Analytics', 
    accessPattern: '2 (Named Invites) or 4 (Proxy)', 
    automationFeasibility: 'Low', 
    notes: 'No group assignment; must manage per-user property access.',
    description: 'Monitor and maintain your site\'s presence in Google Search results.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Property Access', roles: ['Owner', 'Full User', 'Restricted User'] },
      { pattern: '4 (Proxy)', label: 'Delegated Access', roles: ['Full User'] }
    ]
  },
  { 
    name: 'Google Merchant Center', 
    domain: 'Retail / Ecommerce', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Named users; couple with strict admin role governance.',
    description: 'Upload your product data to Google and make it available for Shopping ads.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Account Access', roles: ['Admin', 'Standard', 'Reporting'] }
    ]
  },
  { 
    name: 'LinkedIn Ads', 
    domain: 'Advertising platform', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: '',
    description: 'Reach professionals with targeted advertising on the world\'s largest professional network.',
    iconName: 'fab fa-linkedin',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Campaign Manager Access', roles: ['Account Manager', 'Campaign Manager', 'Creative Manager', 'Viewer'] }
    ]
  },
  { 
    name: 'TikTok Ads', 
    domain: 'Paid Media', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: 'Business Center partner asset permissions are designed for delegation.',
    description: 'Create engaging video ads and reach TikTok\'s highly engaged audience.',
    iconName: 'fab fa-tiktok',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Center Access', roles: ['Admin', 'Operator', 'Analyst'] }
    ]
  },
  { 
    name: 'Microsoft Advertising', 
    domain: 'Advertising platform', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer manager/delegation model when possible; otherwise invites.',
    description: 'Reach customers on Bing, Yahoo, and Microsoft partner sites.',
    iconName: 'fab fa-microsoft',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Manager Account', roles: ['Super Admin', 'Standard User', 'Viewer'] },
      { pattern: '2 (Named Invites)', label: 'Direct Access', roles: ['Super Admin', 'Standard User', 'Viewer'] }
    ]
  },
  { 
    name: 'Shopify', 
    domain: 'Ecommerce', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Collaborator/staff access; treat store admin as privileged.',
    description: 'All-in-one ecommerce platform to start, run, and grow your business.',
    iconName: 'fab fa-shopify',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Staff Access', roles: ['Staff', 'Collaborator'] }
    ]
  },

  // TIER 2 PLATFORMS - Platform-level access
  { 
    name: 'Adobe Analytics', 
    domain: 'Analytics', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Govern via IGA approvals + periodic user export review.',
    description: 'Enterprise analytics for understanding customer journeys across channels.',
    iconName: 'fas fa-chart-line',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'User'] }
    ]
  },
  { name: 'Adobe Creative Cloud', domain: 'Web / content / creative', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes; Validate OAuth app provenance before allowlisting' },
  { name: 'Amazon (Retail Media)', domain: 'Retail Media / Ads', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Client-managed access; enforce approvals + evidence capture.' },
  { name: 'Apollo', domain: 'CRM / RevOps / marketing automation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Apple Search Ads', domain: 'Paid Media', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Named user access; time-box access for contractors.' },
  { name: 'Attentive', domain: 'SMS/MarTech', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Role-based users; align roles to job functions.' },
  { name: 'BigCommerce', domain: 'Ecommerce', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Store-level staff/collaborator access; certify regularly.' },
  { name: 'Bing Webmaster Tools', domain: 'SEO / search performance', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes; Validate OAuth app provenance before allowlisting' },
  { name: 'Bing/Microsoft Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub) or 2', automationFeasibility: 'Medium', notes: 'Prefer manager/delegation model when possible; otherwise invites.' },
  { name: 'BrightLocal', domain: 'SEO / search performance', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'CallRail', domain: 'Marketing tool', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Seen as blocked for at least one OU' },
  { name: 'Commission Junction (CJ)', domain: 'Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Many affiliate portals trend credential-based; use PAM if needed.' },
  { name: 'Criteo', domain: 'Paid Media', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Named users; tightly control admin roles.' },
  { name: 'DV360', domain: 'Paid Media / DSP', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: 'Use agency seat/partner delegation; internal RBAC lives in the seat.' },
  { name: 'Data Exports (Program)', domain: 'Data/Reporting', accessPattern: 'Varies', automationFeasibility: 'Medium', notes: 'Treat as "integration identity" program + least-privilege exports.' },
  { name: 'Fivetran', domain: 'Data pipeline / warehouse', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Funnel.io', domain: 'Reporting / data connectors', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Gong', domain: 'CRM / RevOps / marketing automation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Google Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium-High', notes: 'MCC linking centralizes internal access; core reference pattern.' },
  { name: 'Google Analytics/GA4', domain: 'Analytics', accessPattern: '2 or 3', automationFeasibility: 'Medium', notes: 'Prefer group-based where supported; otherwise named users + recert.' },
  { name: 'Google Merchant Center', domain: 'Retail / Ecommerce', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Named users; couple with strict admin role governance.' },
  { name: 'Google Search Console', domain: 'SEO/Analytics', accessPattern: '2 (Named Invites) or 4 (Proxy)', automationFeasibility: 'Low', notes: 'No group assignment; must manage per-user property access.' },
  { name: 'Google Tag Manager', domain: 'Tagging', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'User + container permissions; avoid single-admin lockout risk.' },
  { name: 'GrowthBook', domain: 'Analytics / experimentation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: '' },
  { name: 'Heap Analytics', domain: 'Analytics / experimentation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'HubSpot', domain: 'CRM / RevOps / marketing automation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: '' },
  { name: 'Impact', domain: 'Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Use named users if supported; otherwise PAM with approvals.' },
  { name: 'Keen.io', domain: 'Analytics / experimentation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Klaviyo', domain: 'Email/SMS', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Role-based users; JIT access for high-risk permissions.' },
  { name: 'LinkedIn Ads', domain: 'Advertising platform', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: '' },
  { name: 'Looker Studio', domain: 'Reporting / data connectors', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Mailchimp', domain: 'Email', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Named users; restrict admin roles; recert.' },
  { name: 'Marketo', domain: 'MarTech', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Strong role model; SSO sometimes possible but client-dependent.' },
  { name: 'Meta/Facebook Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: 'Partner/Business Manager delegation pattern (agency manages internally).' },
  { name: 'Microsoft Advertising', domain: 'Advertising platform', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Microsoft Clarity', domain: 'Analytics / experimentation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Optmyzr', domain: 'Ad ops / measurement tool', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Pepperjam/Partnerize', domain: 'Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Often manual; PAM if credentials are shared in practice.' },
  { name: 'Pinterest Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub) or 2', automationFeasibility: 'Medium', notes: 'Prefer partner/business access where available.' },
  { name: 'Postscript', domain: 'SMS', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Named users and roles; certify frequently.' },
  { name: 'Power BI', domain: 'Reporting / data connectors', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Rakuten', domain: 'Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Govern with approvals, PAM where needed.' },
  { name: 'Reddit Ads', domain: 'Advertising platform', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Rollstack', domain: 'Reporting / data connectors', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Salesforce', domain: 'CRM / RevOps / marketing automation', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Salesforce Marketing Cloud', domain: 'MarTech', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Robust RBAC; client tenant controls; enforce certifications.' },
  { name: 'Sanity', domain: 'Web / content / creative', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes; Validate OAuth app provenance before allowlisting' },
  { name: 'Screaming Frog', domain: 'SEO / search performance', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes; Validate OAuth app provenance before allowlisting' },
  { name: 'ShareASale', domain: 'Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Often manual; use PAM to avoid credential sprawl.' },
  { name: 'ShopMy', domain: 'Influencer/Affiliate', accessPattern: '2 (Named Invites) or 5 (PAM)', automationFeasibility: 'Low', notes: 'Often manual; governance via approvals + periodic validation.' },
  { name: 'Shopify', domain: 'Ecommerce', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Collaborator/staff access; treat store admin as privileged.' },
  { name: 'Snapchat Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub) or 2', automationFeasibility: 'Medium', notes: 'Business/asset permissions; try partner delegation first.' },
  { name: 'Snowflake', domain: 'Data pipeline / warehouse', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'StackAdapt', domain: 'DSP', accessPattern: '1 (Partner Hub) or 2', automationFeasibility: 'Medium', notes: 'Seat-based RBAC often works well for agency operating model.' },
  { name: 'The Trade Desk', domain: 'DSP', accessPattern: '1 (Partner Hub) or 2', automationFeasibility: 'Medium', notes: 'Prefer agency seat-based governance + strong admin controls.' },
  { name: 'TikTok Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium', notes: 'Business Center partner asset permissions are designed for delegation.' },
  { name: 'Triple Whale', domain: 'Ad ops / measurement tool', accessPattern: '4 (Proxy)', automationFeasibility: 'Medium', notes: 'Requests Google Workspace OAuth scopes' },
  { name: 'Walmart (Retail Media)', domain: 'Retail Media', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'Client-managed; support with portal + evidence capture.' },
  { name: 'Webflow', domain: 'Web / content / creative', accessPattern: '2 (Named Invites)', automationFeasibility: 'Low-Medium', notes: 'OAuth app not verified in some entries; Requests Google Workspace OAuth scopes; Validate OAuth app provenance before allowlisting' },
  { name: 'Yotpo', domain: 'Retention/Reviews/Email', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Role-based users; certify quarterly.' },
  { name: 'YouTube Ads', domain: 'Paid Media', accessPattern: '1 (Partner Hub)', automationFeasibility: 'Medium-High', notes: 'Govern through Google Ads/MCC model (same backbone).' }
];

// Transform raw data into Platform entities
export const platforms: Platform[] = rawPlatforms.map(p => ({
  id: uuidv4(),
  name: p.name,
  domain: p.domain as any,
  accessPattern: p.accessPattern as any,
  automationFeasibility: p.automationFeasibility as any,
  notes: p.notes
}));

// Helper functions
export function getPlatformById(id: string): Platform | undefined {
  return platforms.find(p => p.id === id);
}

export function getPlatformsByDomain(domain: string): Platform[] {
  return platforms.filter(p => p.domain === domain);
}

export function getPlatformsByAutomation(level: string): Platform[] {
  return platforms.filter(p => p.automationFeasibility === level);
}

export function getAllDomains(): string[] {
  return Array.from(new Set(platforms.map(p => p.domain)));
}
