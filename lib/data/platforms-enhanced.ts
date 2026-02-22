// Enhanced Platform registry with enterprise metadata
import { v4 as uuidv4 } from 'uuid';

// Valid item types that can be assigned to platforms
export type ItemType = 'NAMED_INVITE' | 'PARTNER_DELEGATION' | 'GROUP_ACCESS' | 'PROXY_TOKEN' | 'SHARED_ACCOUNT_PAM';

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
  supportedItemTypes: ItemType[]; // Which item types this platform supports
  accessPatterns?: Array<{
    pattern: string;
    label: string;
    description?: string;
    roles: string[];
  }>;
}

// Curated agency-client platform data
// These are platforms relevant to a marketing agency requesting access from clients
// supportedItemTypes derived from accessPattern field in Excel
const enhancedPlatformsData: Omit<EnhancedPlatform, 'id'>[] = [

  // ─────────────────────────────────────────────────────────
  // TIER 1 — Full asset-level support (can target sub-resources)
  // ─────────────────────────────────────────────────────────

  {
    name: 'Google Ads',
    slug: 'google-ads',
    domain: 'Paid Search',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium-High',
    notes: 'MCC linking centralises internal access; core reference pattern.',
    description: 'Grant your agency access to Google Ads accounts so they can create, manage and optimise paid search, display and YouTube campaigns on your behalf.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'MCC Manager Link',
        description: 'Agency links your ad account to their Manager (MCC) account. Preferred — agency controls access internally.',
        roles: ['Admin', 'Standard', 'Read-only', 'Email-only']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Named User Invite',
        description: 'Invite specific agency users directly to your Google Ads account.',
        roles: ['Admin', 'Standard', 'Read-only', 'Email-only']
      }
    ]
  },

  {
    name: 'Meta / Facebook Ads',
    slug: 'meta-facebook-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Partner/Business Manager delegation pattern (agency manages internally).',
    description: 'Grant your agency access to Facebook and Instagram ad campaigns via Business Manager, enabling them to create and manage ads across Meta platforms.',
    iconName: 'fab fa-facebook',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Business Manager Partner Access',
        description: 'Agency Business Manager is added as a partner to your Business Manager. Preferred for ongoing agency relationships.',
        roles: ['Admin', 'Advertiser', 'Analyst']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Direct User Invite',
        description: 'Invite individual agency users to specific ad accounts, pages, or pixels.',
        roles: ['Admin', 'Advertiser', 'Analyst']
      }
    ]
  },

  {
    name: 'Google Analytics / GA4',
    slug: 'google-analytics-ga4',
    domain: 'Analytics',
    accessPattern: '2 or 3',
    automationFeasibility: 'Medium',
    notes: 'Prefer group-based where supported; otherwise named users + recert.',
    description: 'Grant your agency access to GA4 properties so they can analyse website traffic, user behaviour, and campaign performance to optimise your marketing.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Named User Access',
        description: 'Invite specific agency users to individual GA4 properties.',
        roles: ['Administrator', 'Editor', 'Analyst', 'Viewer']
      },
      {
        pattern: '3 (Group Access)',
        label: 'Group / Service Account',
        description: 'Add the agency Google Group or service account for centralised access management.',
        roles: ['Administrator', 'Editor', 'Analyst', 'Viewer']
      }
    ]
  },

  {
    name: 'Google Tag Manager',
    slug: 'google-tag-manager',
    domain: 'Tagging & Tracking',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'User + container permissions; avoid single-admin lockout risk.',
    description: 'Grant your agency access to GTM containers so they can implement tracking tags, conversion pixels, and measurement scripts without code changes.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['NAMED_INVITE', 'GROUP_ACCESS'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Container User Access',
        description: 'Invite agency users to specific GTM containers. Assign Publish access only to trusted individuals.',
        roles: ['Administrator', 'Publish', 'Edit', 'Read']
      }
    ]
  },

  {
    name: 'Google Search Console',
    slug: 'google-search-console',
    domain: 'SEO & Analytics',
    accessPattern: '2 (Named Invites) or 4 (Proxy)',
    automationFeasibility: 'Low',
    notes: 'No group assignment; must manage per-user property access.',
    description: 'Grant your agency access to Search Console properties so they can monitor organic search performance, fix indexing issues, and improve SEO.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['NAMED_INVITE', 'PROXY_TOKEN'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Property User Access',
        description: 'Add individual agency users to specific Search Console properties (website or domain).',
        roles: ['Owner', 'Full User', 'Restricted User']
      },
      {
        pattern: '4 (Proxy)',
        label: 'Delegated Service Account',
        description: 'Use a dedicated service account for automated reporting and API access.',
        roles: ['Full User']
      }
    ]
  },

  {
    name: 'Google Merchant Center',
    slug: 'google-merchant-center',
    domain: 'Ecommerce & Retail',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Named users; couple with strict admin role governance.',
    description: 'Grant your agency access to Merchant Center so they can manage product feeds, Shopping campaigns, and free listings on Google.',
    iconName: 'fab fa-google',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Account User Access',
        description: 'Invite agency users to your Merchant Center account with the appropriate role.',
        roles: ['Admin', 'Standard', 'Reporting']
      }
    ]
  },

  {
    name: 'LinkedIn Ads',
    slug: 'linkedin-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Agency gets access via Campaign Manager invitation.',
    description: 'Grant your agency access to LinkedIn Campaign Manager to create and manage B2B advertising, sponsored content, and lead-gen forms.',
    iconName: 'fab fa-linkedin',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Campaign Manager Access',
        description: 'Add agency users to your LinkedIn ad account via Campaign Manager.',
        roles: ['Account Manager', 'Campaign Manager', 'Creative Manager', 'Viewer']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Page Admin Invite',
        description: 'Invite agency users to manage your LinkedIn Company Page.',
        roles: ['Super Admin', 'Content Admin', 'Curator', 'Analyst']
      }
    ]
  },

  {
    name: 'TikTok Ads',
    slug: 'tiktok-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Business Center partner asset permissions are designed for delegation.',
    description: 'Grant your agency access to TikTok Ads Manager so they can plan, create, and optimise short-form video ad campaigns.',
    iconName: 'fab fa-tiktok',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Business Center Partner',
        description: 'Grant agency access via TikTok Business Center partnership. Agency manages access internally.',
        roles: ['Admin', 'Operator', 'Analyst']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Ads Manager User Invite',
        description: 'Invite agency users directly to your TikTok Ads Manager account.',
        roles: ['Ad Account Admin', 'Ad Account Operator', 'Ad Account Analyst']
      }
    ]
  },

  {
    name: 'Microsoft Advertising',
    slug: 'microsoft-advertising',
    domain: 'Paid Search',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Prefer manager/delegation model when possible; otherwise invites.',
    description: 'Grant your agency access to Microsoft Advertising (Bing Ads) to manage search and display campaigns across Bing, Yahoo, and partner networks.',
    iconName: 'fab fa-microsoft',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Manager Account Link',
        description: 'Link your account to the agency Manager Account. Preferred for agencies managing multiple clients.',
        roles: ['Super Admin', 'Standard User', 'Viewer']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Direct User Invite',
        description: 'Invite agency users directly to your Microsoft Advertising account.',
        roles: ['Super Admin', 'Standard User', 'Viewer']
      }
    ]
  },

  {
    name: 'Shopify',
    slug: 'shopify',
    domain: 'Ecommerce',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Collaborator/staff access; treat store admin as privileged.',
    description: 'Grant your agency staff or collaborator access to your Shopify store to manage products, run promotions, and connect marketing apps.',
    iconName: 'fab fa-shopify',
    tier: 1,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Staff Account',
        description: 'Grant agency staff a Shopify login with specific permissions (e.g. Marketing, Products, Analytics).',
        roles: ['Staff', 'Limited Staff']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Collaborator Request',
        description: 'Collaborator access is ideal for agencies — scoped permissions, no store seat used.',
        roles: ['Collaborator']
      }
    ]
  },

  {
    name: 'YouTube Ads',
    slug: 'youtube-ads',
    domain: 'Video Advertising',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium-High',
    notes: 'Govern through Google Ads/MCC model (same backbone).',
    description: 'Grant your agency access to YouTube advertising through Google Ads so they can run skippable ads, bumper ads, and video discovery campaigns.',
    iconName: 'fab fa-youtube',
    tier: 1,
    clientFacing: true,
    oauthSupported: true,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Google Ads MCC Link',
        description: 'YouTube ads are managed via Google Ads. Link your account to the agency MCC for centralised access.',
        roles: ['Admin', 'Standard', 'Read-only']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'YouTube Channel Manager',
        description: 'Add agency users to your YouTube Brand Account or channel manager.',
        roles: ['Manager', 'Editor', 'Viewer']
      }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // TIER 2 — Platform-level access
  // ─────────────────────────────────────────────────────────

  {
    name: 'HubSpot',
    slug: 'hubspot',
    domain: 'CRM & Marketing Automation',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Low-Medium',
    notes: 'Role-based users; align to job function.',
    description: 'Grant your agency access to HubSpot to manage inbound marketing campaigns, email workflows, landing pages, and CRM data.',
    iconName: 'fab fa-hubspot',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'User Seat Invite',
        description: 'Add agency users to your HubSpot portal with a specific role and permissions set.',
        roles: ['Super Admin', 'Admin', 'Sales Access', 'Marketing Access', 'View Only']
      }
    ]
  },

  {
    name: 'Salesforce',
    slug: 'salesforce',
    domain: 'CRM & Revenue Operations',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Low-Medium',
    notes: 'Enforce profile + permission set governance.',
    description: 'Grant your agency access to Salesforce to support marketing cloud integrations, campaign management, and revenue attribution.',
    iconName: 'fab fa-salesforce',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Named User Licence',
        description: 'Assign a Salesforce user licence to agency staff with an appropriate profile and permission set.',
        roles: ['System Administrator', 'Marketing User', 'Standard User', 'Read Only']
      }
    ]
  },

  {
    name: 'Klaviyo',
    slug: 'klaviyo',
    domain: 'Email & SMS Marketing',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Role-based users; JIT access for high-risk permissions.',
    description: 'Grant your agency access to Klaviyo to build and manage email flows, SMS campaigns, and audience segments for ecommerce growth.',
    iconName: 'fas fa-envelope',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Team Member Invite',
        description: 'Invite agency users to your Klaviyo account with the appropriate role.',
        roles: ['Owner', 'Admin', 'Manager', 'Analyst', 'Campaign Manager']
      }
    ]
  },

  {
    name: 'Mailchimp',
    slug: 'mailchimp',
    domain: 'Email Marketing',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Named users; restrict admin roles; recert.',
    description: 'Grant your agency access to Mailchimp to design email campaigns, manage audiences, and set up automated marketing journeys.',
    iconName: 'fab fa-mailchimp',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'User Invite',
        description: 'Invite agency team members to your Mailchimp account with a specific role.',
        roles: ['Owner', 'Admin', 'Manager', 'Author', 'Viewer']
      }
    ]
  },

  {
    name: 'Snapchat Ads',
    slug: 'snapchat-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub) or 2',
    automationFeasibility: 'Medium',
    notes: 'Business/asset permissions; try partner delegation first.',
    description: 'Grant your agency access to Snapchat Ads Manager to create and manage full-screen mobile ads targeting Snapchat\'s Gen Z and Millennial audience.',
    iconName: 'fab fa-snapchat',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Business Manager Partner',
        description: 'Grant agency access through Snapchat Business Manager partner sharing.',
        roles: ['Admin', 'Member']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Ad Account User Invite',
        description: 'Invite agency users directly to your Snapchat ad account.',
        roles: ['Admin', 'Member', 'Analyst']
      }
    ]
  },

  {
    name: 'Pinterest Ads',
    slug: 'pinterest-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub) or 2',
    automationFeasibility: 'Medium',
    notes: 'Prefer partner/business access where available.',
    description: 'Grant your agency access to Pinterest Ads to reach users actively planning purchases, with visual ads on boards and search.',
    iconName: 'fab fa-pinterest',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Business Partner Access',
        description: 'Connect your Pinterest Business account to the agency partner account.',
        roles: ['Admin', 'Analyst', 'Audience Manager', 'Campaign Manager']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Ad Account User',
        description: 'Invite agency users to your Pinterest ad account.',
        roles: ['Admin', 'Analyst']
      }
    ]
  },

  {
    name: 'Reddit Ads',
    slug: 'reddit-ads',
    domain: 'Paid Social',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Named users; tightly control admin roles.',
    description: 'Grant your agency access to Reddit Ads to reach niche communities and interest-based audiences with targeted display and video ads.',
    iconName: 'fab fa-reddit',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Ad Account Access',
        description: 'Add agency users to your Reddit Ads account.',
        roles: ['Admin', 'Analyst']
      }
    ]
  },

  {
    name: 'Adobe Analytics',
    slug: 'adobe-analytics',
    domain: 'Analytics',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Govern via IGA approvals + periodic user export review.',
    description: 'Grant your agency access to Adobe Analytics for enterprise-grade web analytics, cross-channel journey analysis, and attribution modelling.',
    iconName: 'fas fa-chart-line',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Product Profile Access',
        description: 'Add agency users to an Adobe Analytics product profile via the Admin Console.',
        roles: ['Product Administrator', 'User']
      }
    ]
  },

  {
    name: 'Marketo',
    slug: 'marketo',
    domain: 'Marketing Automation',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Strong role model; SSO sometimes possible but client-dependent.',
    description: 'Grant your agency access to Marketo Engage for B2B marketing automation, lead nurturing, email programmes, and revenue attribution.',
    iconName: 'fas fa-bullhorn',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Named User Invite',
        description: 'Create named user accounts for agency staff in your Marketo Engage instance.',
        roles: ['Admin', 'Standard Marketing User', 'Read-only Marketing User']
      }
    ]
  },

  {
    name: 'Attentive',
    slug: 'attentive',
    domain: 'SMS & Email Marketing',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Medium',
    notes: 'Role-based users; align roles to job functions.',
    description: 'Grant your agency access to Attentive to manage SMS and email marketing campaigns, subscriber growth tools, and personalised messaging.',
    iconName: 'fas fa-sms',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'User Invite',
        description: 'Invite agency staff to your Attentive account with the appropriate role.',
        roles: ['Admin', 'Manager', 'Analyst', 'Campaign Creator']
      }
    ]
  },

  {
    name: 'BigCommerce',
    slug: 'bigcommerce',
    domain: 'Ecommerce',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Low-Medium',
    notes: 'Store-level staff/collaborator access; certify regularly.',
    description: 'Grant your agency access to your BigCommerce store to manage promotions, product feeds, analytics integrations, and marketing apps.',
    iconName: 'fas fa-shopping-cart',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Staff Account',
        description: 'Add agency staff to your BigCommerce store with scoped permissions.',
        roles: ['Store Owner', 'Admin', 'Staff', 'View Only']
      }
    ]
  },

  {
    name: 'DV360',
    slug: 'dv360',
    domain: 'Programmatic Advertising',
    accessPattern: '1 (Partner Hub)',
    automationFeasibility: 'Medium',
    notes: 'Use agency seat/partner delegation; internal RBAC lives in the seat.',
    description: 'Grant your agency access to Display & Video 360 (DV360) to run programmatic display and video campaigns across the Google Display Network and beyond.',
    iconName: 'fab fa-google',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Partner Seat Access',
        description: 'Grant the agency access to your DV360 advertiser via their partner seat.',
        roles: ['Admin', 'Standard', 'Read-only']
      }
    ]
  },

  {
    name: 'The Trade Desk',
    slug: 'the-trade-desk',
    domain: 'Programmatic Advertising',
    accessPattern: '1 (Partner Hub) or 2',
    automationFeasibility: 'Medium',
    notes: 'Prefer agency seat-based governance + strong admin controls.',
    description: 'Grant your agency access to The Trade Desk DSP so they can plan, activate, and optimise programmatic campaigns across display, CTV, audio and more.',
    iconName: 'fas fa-ad',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['PARTNER_DELEGATION', 'NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '1 (Partner Hub)',
        label: 'Agency Seat Access',
        description: 'Agency manages campaigns from their Trade Desk seat on your behalf.',
        roles: ['Admin', 'Planner', 'Trader', 'Reporter']
      },
      {
        pattern: '2 (Named Invites)',
        label: 'Advertiser User Invite',
        description: 'Invite agency users directly to your Trade Desk advertiser account.',
        roles: ['Admin', 'Campaign Manager', 'Analyst']
      }
    ]
  },

  {
    name: 'Apple Search Ads',
    slug: 'apple-search-ads',
    domain: 'Paid Search',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Low-Medium',
    notes: 'Named user access; time-box access for contractors.',
    description: 'Grant your agency access to Apple Search Ads to manage campaigns promoting your app at the top of App Store search results.',
    iconName: 'fab fa-apple',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Account User Access',
        description: 'Invite agency users to your Apple Search Ads account.',
        roles: ['Admin', 'Campaign Management', 'API Account Manager', 'Read Only']
      }
    ]
  },

  {
    name: 'Amazon Advertising',
    slug: 'amazon-advertising',
    domain: 'Retail Media',
    accessPattern: '2 (Named Invites)',
    automationFeasibility: 'Low-Medium',
    notes: 'Client-managed access; enforce approvals + evidence capture.',
    description: 'Grant your agency access to Amazon Advertising to manage Sponsored Products, Sponsored Brands, and DSP campaigns targeting Amazon shoppers.',
    iconName: 'fab fa-amazon',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['NAMED_INVITE'],
    accessPatterns: [
      {
        pattern: '2 (Named Invites)',
        label: 'Account User Access',
        description: 'Add agency users to your Amazon Advertising account.',
        roles: ['Administrator', 'Campaign Manager', 'Analyst', 'DSP Advertiser']
      }
    ]
  },

  {
    name: 'Snowflake',
    slug: 'snowflake',
    domain: 'Data & Analytics',
    accessPattern: '4 (Proxy)',
    automationFeasibility: 'Medium',
    notes: 'Service account with least-privilege roles.',
    description: 'Grant your agency access to Snowflake data for reporting, attribution modelling, and marketing analytics — using a scoped service account.',
    iconName: 'fas fa-snowflake',
    tier: 2,
    clientFacing: true,
    oauthSupported: false,
    supportedItemTypes: ['GROUP_ACCESS', 'PROXY_TOKEN'],
    accessPatterns: [
      {
        pattern: '4 (Proxy)',
        label: 'Service Account Access',
        description: 'Create a dedicated Snowflake service account for the agency with least-privilege roles.',
        roles: ['ACCOUNTADMIN', 'SYSADMIN', 'Custom Read Role']
      }
    ]
  }
];

// Transform to full Platform objects with stable IDs
// IMPORTANT: IDs are generated once and must be stable across restarts
// Using a simple hash of the slug for stable IDs
function stableId(slug: string): string {
  // Generate a deterministic UUID-like string from the slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    const char = slug.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex}-${hex.substring(0, 4)}-4${hex.substring(0, 3)}-8${hex.substring(0, 3)}-${hex.padEnd(12, '0')}`;
}

export const platforms: EnhancedPlatform[] = enhancedPlatformsData.map(p => ({
  ...p,
  id: p.slug ? stableId(p.slug) : uuidv4()
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
