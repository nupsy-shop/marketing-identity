// Enhanced Platform registry with enterprise metadata
import { v4 as uuidv4 } from 'uuid';

// Enhanced platform interface with new fields
export interface EnhancedPlatform {
  id: string;
  name: string;
  slug?: string;
  domain: string;
  accessPattern: string;
  automationFeasibility: string;
  notes: string;
  description?: string;
  iconName?: string;
  tier?: number; // 1 = Tier 1 (full asset support), 2 = Tier 2 (platform-level)
  clientFacing?: boolean;
  oauthSupported?: boolean;
  accessPatterns?: Array<{
    pattern: string;
    label: string;
    roles: string[];
  }>;
}

// Enhanced platform data
const enhancedPlatformsData: Omit<EnhancedPlatform, 'id'>[] = [
  // TIER 1 PLATFORMS - Full asset-level support
  { 
    name: 'Google Ads', 
    slug: 'google-ads',
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
    slug: 'meta-facebook-ads',
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
    slug: 'google-analytics-ga4',
    domain: 'Analytics', 
    accessPattern: '2 or 3', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer group-based where supported; otherwise named users + recert.',
    description: 'Understand how users interact with your website and apps with advanced analytics.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Administrator', 'Editor', 'Analyst', 'Viewer'] }
    ]
  },
  { 
    name: 'Google Tag Manager', 
    slug: 'google-tag-manager',
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
    slug: 'google-search-console',
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
      { pattern: '2 (Named Invites)', label: 'Property Access', roles: ['Owner', 'Full User', 'Restricted User'] }
    ]
  },
  { 
    name: 'Google Merchant Center', 
    slug: 'google-merchant-center',
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
    slug: 'linkedin-ads',
    domain: 'Advertising platform', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: '',
    description: 'Reach professionals with targeted advertising on LinkedIn.',
    iconName: 'fab fa-linkedin',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Campaign Manager', roles: ['Account Manager', 'Campaign Manager', 'Viewer'] }
    ]
  },
  { 
    name: 'TikTok Ads', 
    slug: 'tiktok-ads',
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
      { pattern: '1 (Partner Hub)', label: 'Business Center', roles: ['Admin', 'Operator', 'Analyst'] }
    ]
  },
  { 
    name: 'Microsoft Advertising', 
    slug: 'microsoft-advertising',
    domain: 'Advertising platform', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer manager/delegation model when possible.',
    description: 'Reach customers on Bing, Yahoo, and Microsoft partner sites.',
    iconName: 'fab fa-microsoft',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Manager Account', roles: ['Super Admin', 'Standard User', 'Viewer'] }
    ]
  },
  { 
    name: 'Shopify', 
    slug: 'shopify',
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

  // TIER 2 PLATFORMS
  { 
    name: 'HubSpot', 
    slug: 'hubspot',
    domain: 'CRM / RevOps / marketing automation', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Low-Medium', 
    notes: '',
    description: 'Inbound marketing, sales, and service software that helps companies grow.',
    iconName: 'fab fa-hubspot',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Super Admin', 'Admin', 'Sales', 'Marketing'] }
    ]
  },
  { 
    name: 'Salesforce', 
    slug: 'salesforce',
    domain: 'CRM / RevOps / marketing automation', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Low-Medium', 
    notes: '',
    description: 'World\'s #1 CRM platform for sales, service, marketing, and commerce.',
    iconName: 'fab fa-salesforce',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['System Administrator', 'Standard User'] }
    ]
  },
  { 
    name: 'Klaviyo', 
    slug: 'klaviyo',
    domain: 'Email/SMS', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Role-based users; JIT access for high-risk permissions.',
    description: 'Email and SMS marketing platform built for ecommerce.',
    iconName: 'fas fa-envelope',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Owner', 'Admin', 'Manager', 'Analyst'] }
    ]
  },
  { 
    name: 'Mailchimp', 
    slug: 'mailchimp',
    domain: 'Email', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Named users; restrict admin roles; recert.',
    description: 'Email marketing and automation platform for growing businesses.',
    iconName: 'fab fa-mailchimp',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Owner', 'Admin', 'Manager', 'Viewer'] }
    ]
  },
  { 
    name: 'Snapchat Ads', 
    slug: 'snapchat-ads',
    domain: 'Paid Media', 
    accessPattern: '1 (Partner Hub) or 2', 
    automationFeasibility: 'Medium', 
    notes: 'Business/asset permissions; try partner delegation first.',
    description: 'Reach Snapchat\'s engaged audience with full-screen mobile ads.',
    iconName: 'fab fa-snapchat',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Manager', roles: ['Admin', 'Member'] }
    ]
  },
  { 
    name: 'Pinterest Ads', 
    slug: 'pinterest-ads',
    domain: 'Paid Media', 
    accessPattern: '1 (Partner Hub) or 2', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer partner/business access where available.',
    description: 'Reach people planning their next purchase on Pinterest.',
    iconName: 'fab fa-pinterest',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Business Access', roles: ['Admin', 'Analyst'] }
    ]
  },
  { 
    name: 'Reddit Ads', 
    slug: 'reddit-ads',
    domain: 'Advertising platform', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: '',
    description: 'Reach highly engaged communities with Reddit\'s advertising platform.',
    iconName: 'fab fa-reddit',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Ad Account', roles: ['Admin', 'Analyst'] }
    ]
  },
  { 
    name: 'Adobe Analytics', 
    slug: 'adobe-analytics',
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
  { 
    name: 'Marketo', 
    slug: 'marketo',
    domain: 'MarTech', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Strong role model; SSO sometimes possible but client-dependent.',
    description: 'Marketing automation platform for lead management and nurturing.',
    iconName: 'fas fa-bullhorn',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Marketing User'] }
    ]
  },
  { 
    name: 'Attentive', 
    slug: 'attentive',
    domain: 'SMS/MarTech', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Medium', 
    notes: 'Role-based users; align roles to job functions.',
    description: 'SMS and email marketing platform for personalized messaging at scale.',
    iconName: 'fas fa-sms',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Manager', 'Analyst'] }
    ]
  },
  { 
    name: 'BigCommerce', 
    slug: 'bigcommerce',
    domain: 'Ecommerce', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Low-Medium', 
    notes: 'Store-level staff/collaborator access; certify regularly.',
    description: 'Open SaaS ecommerce platform for fast-growing and established brands.',
    iconName: 'fas fa-shopping-cart',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Staff Access', roles: ['Store Owner', 'Admin', 'Staff'] }
    ]
  },
  { 
    name: 'DV360', 
    slug: 'dv360',
    domain: 'Paid Media / DSP', 
    accessPattern: '1 (Partner Hub)', 
    automationFeasibility: 'Medium', 
    notes: 'Use agency seat/partner delegation; internal RBAC lives in the seat.',
    description: 'Google\'s programmatic advertising platform for reaching audiences at scale.',
    iconName: 'fab fa-google',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Partner Seat', roles: ['Admin', 'Standard', 'Read-only'] }
    ]
  },
  { 
    name: 'The Trade Desk', 
    slug: 'the-trade-desk',
    domain: 'DSP', 
    accessPattern: '1 (Partner Hub) or 2', 
    automationFeasibility: 'Medium', 
    notes: 'Prefer agency seat-based governance + strong admin controls.',
    description: 'Leading independent demand-side platform for digital advertising.',
    iconName: 'fas fa-ad',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '1 (Partner Hub)', label: 'Seat Access', roles: ['Admin', 'Planner', 'Trader', 'Reporter'] }
    ]
  },
  { 
    name: 'Snowflake', 
    slug: 'snowflake',
    domain: 'Data pipeline / warehouse', 
    accessPattern: '4 (Proxy)', 
    automationFeasibility: 'Medium', 
    notes: '',
    description: 'Cloud data platform for data warehousing, data lakes, and data sharing.',
    iconName: 'fas fa-snowflake',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '4 (Proxy)', label: 'Service Account', roles: ['ACCOUNTADMIN', 'SYSADMIN', 'USERADMIN'] }
    ]
  },
  { 
    name: 'Apple Search Ads', 
    slug: 'apple-search-ads',
    domain: 'Paid Media', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Low-Medium', 
    notes: 'Named user access; time-box access for contractors.',
    description: 'Promote your apps at the top of App Store search results.',
    iconName: 'fab fa-apple',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'User Access', roles: ['Admin', 'Campaign Management', 'Read Only'] }
    ]
  },
  { 
    name: 'Amazon (Retail Media)', 
    slug: 'amazon-retail-media',
    domain: 'Retail Media / Ads', 
    accessPattern: '2 (Named Invites)', 
    automationFeasibility: 'Low-Medium', 
    notes: 'Client-managed access; enforce approvals + evidence capture.',
    description: 'Advertise products to shoppers on Amazon at key purchase moments.',
    iconName: 'fab fa-amazon',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    accessPatterns: [
      { pattern: '2 (Named Invites)', label: 'Account Access', roles: ['Administrator', 'Campaign Manager', 'Analyst'] }
    ]
  }
];

// Transform to full Platform objects with generated IDs
export const platforms: EnhancedPlatform[] = enhancedPlatformsData.map(p => ({
  ...p,
  id: uuidv4()
}));

// Helper functions
export function getPlatformById(id: string): EnhancedPlatform | undefined {
  return platforms.find(p => p.id === id);
}

export function getPlatformsByDomain(domain: string): EnhancedPlatform[] {
  return platforms.filter(p => p.domain === domain);
}

export function getPlatformsByTier(tier: number): EnhancedPlatform[] {
  return platforms.filter(p => p.tier === tier);
}

export function getClientFacingPlatforms(): EnhancedPlatform[] {
  return platforms.filter(p => p.clientFacing !== false);
}

export function getAllDomains(): string[] {
  return Array.from(new Set(platforms.map(p => p.domain))).sort();
}

export function getPlatformsByAutomation(level: string): EnhancedPlatform[] {
  return platforms.filter(p => p.automationFeasibility === level);
}
