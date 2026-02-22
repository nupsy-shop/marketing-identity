// Platform registry seeded from the merged platform coverage Excel file
import { Platform } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Raw platform data from Excel
const rawPlatforms = [
  { name: 'Adobe Analytics', domain: 'Analytics', accessPattern: '2 (Named Invites)', automationFeasibility: 'Medium', notes: 'Govern via IGA approvals + periodic user export review.' },
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
