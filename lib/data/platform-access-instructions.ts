// Platform Access Instructions from Excel file
// Authoritative source for which fields to collect and what instructions to show

export interface PlatformAccessInstruction {
  platform: string;
  accessPattern: string;
  dataToCollect: string;
  instructions: string;
}

// All data from platform_access_instructions.xlsx
export const platformAccessInstructions: PlatformAccessInstruction[] = [
  {
    platform: 'Google Ads',
    accessPattern: 'Partner Delegation (Manager Account)',
    dataToCollect: 'Agency Google Ads Manager (MCC) ID',
    instructions: 'Provide the Manager account ID (e.g., 123-456-7890) of your Google Ads Manager account. Clients will link their Ad account to this MCC.'
  },
  {
    platform: 'Meta Business Manager / Facebook Ads',
    accessPattern: 'Partner Delegation (Business Manager)',
    dataToCollect: 'Agency Business Manager ID',
    instructions: 'Provide the numeric ID of your Business Manager. Clients will add your BM as a partner and select assets (Ad Accounts, Pages, Pixels) during onboarding.'
  },
  {
    platform: 'Meta Business Manager / Facebook Ads',
    accessPattern: 'Named Invite (User)',
    dataToCollect: 'Agency user email address (Facebook/Meta login)',
    instructions: 'Provide the email of the user to be invited to Ad account or Page. Clients will choose the asset to share when they invite the user.'
  },
  {
    platform: 'TikTok Ads',
    accessPattern: 'Partner Delegation (Business Center)',
    dataToCollect: 'Agency Business Center ID',
    instructions: 'Provide the TikTok Business Center ID of your agency account. Clients will add this ID as a partner and select assets (Ad accounts, Pixels).'
  },
  {
    platform: 'Google Analytics 4 (GA4)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email or Google Group email',
    instructions: 'Provide the email address or Google Group that should be invited to the GA4 property. Clients will select the specific property ID during onboarding and choose the role (Administrator, Editor, Analyst, Viewer).'
  },
  {
    platform: 'Google Analytics 4 (GA4)',
    accessPattern: 'Group-based (Service Account)',
    dataToCollect: 'Service account email and optional client library credentials',
    instructions: 'Provide a service account email (e.g., my-service@project.iam.gserviceaccount.com) for data export or integration. Clients will grant this service account access to their property.'
  },
  {
    platform: 'Google Search Console',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email address of the user who will be granted access. Clients will select the property in Search Console and choose the permission (Full or Restricted).'
  },
  {
    platform: 'Google Search Console',
    accessPattern: 'Proxy (Site Verification API)',
    dataToCollect: 'Site Verification token or domain verification details',
    instructions: 'Provide verification details (e.g., DNS TXT record) if requesting owner-level access. Clients will add the token to verify ownership.'
  },
  {
    platform: 'Google Tag Manager',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email or Google Group email',
    instructions: 'Provide the email or group to be invited. Clients will choose the container and role (Publish, Edit, Approve, Read) during onboarding.'
  },
  {
    platform: 'Google Merchant Center',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user to invite as an Admin or Standard user. Clients will select the Merchant Center account during onboarding.'
  },
  {
    platform: 'DV360 (Display & Video 360)',
    accessPattern: 'Partner Delegation (Seat)',
    dataToCollect: 'Agency seat ID or Partner ID',
    instructions: 'Provide your DV360 seat ID or partner ID. Clients will link their advertiser to your seat and specify advertiser-level access during onboarding.'
  },
  {
    platform: 'Snowflake',
    accessPattern: 'Group-based (SSO/SCIM)',
    dataToCollect: 'Agency SSO group name or role; optional network policy; service account',
    instructions: 'Provide the Snowflake role or Okta group to assign to the agency users. Clients will grant this role to their account or assign service accounts accordingly.'
  },
  {
    platform: 'Fivetran',
    accessPattern: 'Group-based (Service Account)',
    dataToCollect: 'Connector service account or API key',
    instructions: 'Provide the service account credentials or API key used for Fivetran connectors. Clients will assign the account to specific sources/destinations during onboarding.'
  },
  {
    platform: 'Funnel.io',
    accessPattern: 'Proxy (Integration Token)',
    dataToCollect: 'Funnel integration API credentials or OAuth client ID/secret',
    instructions: 'Provide integration credentials used to authenticate Funnel on behalf of the client. The client will authorise your token for their workspace during onboarding.'
  },
  {
    platform: 'HubSpot',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user to invite. Clients will choose the HubSpot portal and assign roles (Marketing, Sales, Admin) when inviting.'
  },
  {
    platform: 'HubSpot',
    accessPattern: 'Group-based (SCIM)',
    dataToCollect: 'Agency group or team name',
    instructions: 'Provide the group or team used in SCIM/SSO. Clients will assign this team to appropriate permissions within their HubSpot portal.'
  },
  {
    platform: 'Salesforce',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the Salesforce username/email to invite. Clients will assign permission sets or profiles to the user during onboarding.'
  },
  {
    platform: 'Salesforce',
    accessPattern: 'Group-based (SSO/SCIM)',
    dataToCollect: 'Agency SSO group or profile name',
    instructions: 'Provide the Okta/Azure group mapped to the Salesforce profile. Clients will assign the group to the appropriate role in Salesforce.'
  },
  {
    platform: 'Shopify',
    accessPattern: 'Named Invite (Collaborator)',
    dataToCollect: 'Agency collaborator email or Shopify partner ID',
    instructions: 'Provide the email or Shopify partner ID used to send a collaborator request. Clients will accept the request and set permissions (Themes, Products, Orders).'
  },
  {
    platform: 'Shopify',
    accessPattern: 'Proxy (Service Account)',
    dataToCollect: 'API key, secret and access scope',
    instructions: 'Provide the private app API key and secret (if using a custom app). Clients will grant the key required scopes (read_orders, write_products, etc.).'
  },
  {
    platform: 'Slack (Sales Engagement)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the Slack workspace user email. Clients will invite this user to their workspace or channels.'
  },
  {
    platform: 'Microsoft Advertising (Bing Ads)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email or Microsoft Advertising Manager ID',
    instructions: 'Provide the user email or manager account ID. Clients will add the user/manager to their ad account during onboarding.'
  },
  {
    platform: 'Microsoft Advertising (Bing Ads)',
    accessPattern: 'Partner Delegation (Manager Account)',
    dataToCollect: 'Agency Bing Ads Manager ID',
    instructions: 'Provide your Bing Ads Manager Account ID. Clients will link their ad account to your manager account.'
  },
  {
    platform: 'Adobe Analytics',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency Adobe ID (email)',
    instructions: 'Provide the user\'s Adobe ID/email. Clients will add this user to their Adobe organization and assign product profiles.'
  },
  {
    platform: 'Adobe Creative Cloud',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency Adobe ID (email)',
    instructions: 'Provide the user\'s Adobe ID/email. Clients will invite this user and assign product licenses (Photoshop, Illustrator, etc.).'
  },
  {
    platform: 'Amazon Ads (Retail Media)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency Amazon Ads account email',
    instructions: 'Provide the email associated with your Amazon Advertising account. Clients will add this user to their Amazon Ads manager and assign roles.'
  },
  {
    platform: 'Apple Search Ads',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency Apple ID email',
    instructions: 'Provide the Apple ID used for Apple Search Ads. Clients will invite this Apple ID to their account and assign roles (Admin, Read-only).'
  },
  {
    platform: 'Attentive',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite as a user. Clients will add this user to their Attentive account and assign permissions (Admin, Manager, Analyst).'
  },
  {
    platform: 'BigCommerce',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency collaborator email',
    instructions: 'Provide the collaborator email. Clients will send an invitation to this email with appropriate roles (Store Owner, Order Manager, etc.).'
  },
  {
    platform: 'Klaviyo',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user to their Klaviyo account and assign Admin or Analyst role.'
  },
  {
    platform: 'Mailchimp',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user. Clients will add this user to their Mailchimp account and assign roles (Admin, Manager, Viewer).'
  },
  {
    platform: 'Marketo',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user. Clients will add this user to their Marketo instance and assign roles (Admin, Marketing).'
  },
  {
    platform: 'Criteo',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user and assign roles in Criteo (Admin, Standard).'
  },
  {
    platform: 'Commission Junction / Pepperjam / Rakuten (Affiliate)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user. Clients will add this user to their affiliate account and assign roles.'
  },
  {
    platform: 'Commission Junction / Pepperjam / Rakuten (Affiliate)',
    accessPattern: 'Shared Account (Client-owned)',
    dataToCollect: 'Label of shared login; rotation policy',
    instructions: 'Use this pattern when the client prefers to share a single login. Clients will supply credentials during onboarding; the system will manage check-in/check-out and rotation.'
  },
  {
    platform: 'Data Exports / ETL',
    accessPattern: 'Proxy (Integration Token)',
    dataToCollect: 'API access token or service account credentials',
    instructions: 'Provide the credentials used to connect to the client\'s data warehouses. Clients will grant scopes during onboarding.'
  },
  {
    platform: 'Pinterest Ads',
    accessPattern: 'Partner Delegation (Business Manager)',
    dataToCollect: 'Agency Pinterest Business ID',
    instructions: 'Provide your Pinterest Business ID. Clients will add this ID as a partner and select ad accounts to share.'
  },
  {
    platform: 'Pinterest Ads',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite to the client\'s ad account. Clients will assign roles and select ad accounts during onboarding.'
  },
  {
    platform: 'LinkedIn Ads',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the LinkedIn email to invite to the Campaign Manager account. Clients will assign roles (Account Manager, Viewer).'
  },
  {
    platform: 'LinkedIn Ads',
    accessPattern: 'Partner Delegation (Business Manager)',
    dataToCollect: 'Agency LinkedIn Business ID',
    instructions: 'Provide your company\'s Business ID. Clients will add this ID to their LinkedIn Business Manager and select ad accounts.'
  },
  {
    platform: 'Snapchat Ads',
    accessPattern: 'Partner Delegation (Business Center)',
    dataToCollect: 'Agency Snap Business ID',
    instructions: 'Provide your Snapchat Business ID. Clients will add it as a partner in their Ads Manager and assign ad accounts and roles.'
  },
  {
    platform: 'Snapchat Ads',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite to the client\'s Snapchat Ad account. Clients will assign roles (Admin, Standard).'
  },
  {
    platform: 'StackAdapt',
    accessPattern: 'Partner Delegation (Seat)',
    dataToCollect: 'Agency StackAdapt seat ID',
    instructions: 'Provide your seat ID. Clients will link their advertiser to this seat and share the necessary assets.'
  },
  {
    platform: 'The Trade Desk',
    accessPattern: 'Partner Delegation (Seat)',
    dataToCollect: 'Agency Trade Desk seat ID',
    instructions: 'Provide your seat ID. Clients will link their advertiser to this seat with appropriate permissions.'
  },
  {
    platform: 'Triple Whale',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will assign roles and select stores or accounts during onboarding.'
  },
  {
    platform: 'YouTube Ads',
    accessPattern: 'Partner Delegation (Manager Account)',
    dataToCollect: 'Agency Google Ads Manager account ID (same as Google Ads)',
    instructions: 'Provide the manager ID. Clients will link their YouTube channel\'s ad account to this MCC ID during onboarding.'
  },
  {
    platform: 'Yotpo',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user to their Yotpo account and assign roles (Admin, Moderator).'
  },
  {
    platform: 'CallRail',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user to their CallRail account and assign roles (Admin, Manager, Analyst).'
  },
  {
    platform: 'BrightLocal',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the collaborator email. Clients will invite this user and assign local SEO project access.'
  },
  {
    platform: 'Heap',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user and assign roles (Admin, Analyst).'
  },
  {
    platform: 'GrowthBook',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user and assign experiment permissions.'
  },
  {
    platform: 'Keen.io',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email; optional API key for ingestion',
    instructions: 'Provide the email to invite. Clients may also provide an API key for read-only access.'
  },
  {
    platform: 'LinkedIn Sales Navigator / Outreach (Sales Engagement)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user to their Sales Engagement tool.'
  },
  {
    platform: 'Looker Studio (Google Data Studio)',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email or group',
    instructions: 'Provide the email or Google Group that should be granted access to reports and data sources. Clients will select which report to share during onboarding.'
  },
  {
    platform: 'Microsoft Clarity',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will add this user to their Clarity project.'
  },
  {
    platform: 'Optmyzr',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email of the user. Clients will add this user to their Optmyzr account and assign roles.'
  },
  {
    platform: 'Power BI',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email or Azure AD group',
    instructions: 'Provide the email or Azure AD group used to share dashboards. Clients will share the workspace with this identity and assign roles (Admin, Member, Viewer).'
  },
  {
    platform: 'Reddit Ads',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite to the advertiser account. Clients will add this user and assign roles.'
  },
  {
    platform: 'Rollstack',
    accessPattern: 'Proxy (Integration Account)',
    dataToCollect: 'API key or service account credentials',
    instructions: 'Provide the API key used for generating reports. Clients will authorize this token during onboarding.'
  },
  {
    platform: 'Sanity CMS',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email',
    instructions: 'Provide the email to invite. Clients will assign dataset/project access to this user.'
  },
  {
    platform: 'Webflow',
    accessPattern: 'Named Invite',
    dataToCollect: 'Agency user email; workspace',
    instructions: 'Provide the email to invite. Clients will add this user to their Webflow workspace and assign roles (Editor, Designer).'
  }
];

// Normalized lookup key
function normalizeKey(platform: string, pattern: string): string {
  return `${platform.toLowerCase().trim()}|${pattern.toLowerCase().trim()}`;
}

// Build a lookup map for fast access
const instructionMap = new Map<string, PlatformAccessInstruction>();
platformAccessInstructions.forEach(inst => {
  const key = normalizeKey(inst.platform, inst.accessPattern);
  instructionMap.set(key, inst);
});

// ── Field Definitions based on "Data to collect" ────────────────────────────
export interface DynamicFieldConfig {
  name: string;
  label: string;
  placeholder: string;
  helpText?: string;
  type: 'text' | 'email' | 'number' | 'textarea';
  required: boolean;
  validation?: 'email' | 'numeric' | 'alphanumeric';
}

// Parse "Data to collect" column to generate field configs
export function parseDataToCollect(dataToCollect: string): DynamicFieldConfig[] {
  const fields: DynamicFieldConfig[] = [];
  const text = dataToCollect.toLowerCase();

  // Manager/MCC ID patterns
  if (text.includes('manager') && text.includes('id') || text.includes('mcc')) {
    fields.push({
      name: 'managerAccountId',
      label: text.includes('google') ? 'Google Ads Manager (MCC) ID' : 
             text.includes('bing') || text.includes('microsoft') ? 'Microsoft Ads Manager ID' : 'Manager Account ID',
      placeholder: 'e.g., 123-456-7890',
      helpText: 'Your agency\'s manager account ID',
      type: 'text',
      required: true,
      validation: 'alphanumeric'
    });
  }

  // Business Manager ID
  if (text.includes('business manager id') || text.includes('business id') || text.includes('bm id')) {
    fields.push({
      name: 'businessManagerId',
      label: text.includes('meta') || text.includes('facebook') ? 'Meta Business Manager ID' :
             text.includes('pinterest') ? 'Pinterest Business ID' :
             text.includes('linkedin') ? 'LinkedIn Business ID' :
             text.includes('snap') ? 'Snapchat Business ID' : 'Business Manager ID',
      placeholder: 'e.g., 1234567890',
      helpText: 'Numeric Business Manager ID',
      type: 'text',
      required: true,
      validation: 'numeric'
    });
  }

  // Business Center ID (TikTok, etc.)
  if (text.includes('business center id')) {
    fields.push({
      name: 'businessCenterId',
      label: text.includes('tiktok') ? 'TikTok Business Center ID' : 
             text.includes('snap') ? 'Snapchat Business Center ID' : 'Business Center ID',
      placeholder: 'e.g., 7123456789012345',
      helpText: 'Your agency\'s Business Center ID',
      type: 'text',
      required: true
    });
  }

  // Seat ID (DV360, TTD, StackAdapt)
  if (text.includes('seat id') || text.includes('partner id')) {
    fields.push({
      name: 'seatId',
      label: text.includes('dv360') || text.includes('display') ? 'DV360 Seat/Partner ID' :
             text.includes('trade desk') ? 'The Trade Desk Seat ID' :
             text.includes('stackadapt') ? 'StackAdapt Seat ID' : 'Agency Seat ID',
      placeholder: 'e.g., 12345',
      helpText: 'Your agency\'s programmatic seat or partner ID',
      type: 'text',
      required: true
    });
  }

  // User email patterns
  if (text.includes('email') && !text.includes('service account')) {
    fields.push({
      name: 'agencyEmail',
      label: text.includes('group') ? 'User or Group Email' : 'Agency User Email',
      placeholder: text.includes('group') ? 'user@agency.com or group@agency.com' : 'user@agency.com',
      helpText: text.includes('group') ? 'Email address or Google Group to invite' : 'Email address of the user to be invited',
      type: 'email',
      required: true,
      validation: 'email'
    });
  }

  // Service account email
  if (text.includes('service account')) {
    fields.push({
      name: 'serviceAccountEmail',
      label: 'Service Account Email',
      placeholder: 'e.g., my-service@project.iam.gserviceaccount.com',
      helpText: 'Service account email for automated access',
      type: 'email',
      required: true,
      validation: 'email'
    });
  }

  // API key / secret
  if (text.includes('api key') || text.includes('api credentials') || text.includes('api access token')) {
    fields.push({
      name: 'apiKey',
      label: 'API Key',
      placeholder: 'Enter API key',
      helpText: 'API key for programmatic access',
      type: 'text',
      required: true
    });
  }

  // API secret
  if (text.includes('secret')) {
    fields.push({
      name: 'apiSecret',
      label: 'API Secret',
      placeholder: 'Enter API secret',
      helpText: 'API secret (will be stored securely)',
      type: 'text',
      required: true
    });
  }

  // OAuth client credentials
  if (text.includes('oauth') || text.includes('client id')) {
    fields.push({
      name: 'oauthClientId',
      label: 'OAuth Client ID',
      placeholder: 'Enter OAuth client ID',
      type: 'text',
      required: true
    });
  }

  // SSO/SCIM group
  if (text.includes('sso group') || text.includes('scim') || text.includes('okta') || text.includes('azure') && text.includes('group')) {
    fields.push({
      name: 'ssoGroupName',
      label: 'SSO Group / Role Name',
      placeholder: 'e.g., agency-marketing-team',
      helpText: 'The SSO group or Snowflake role to assign',
      type: 'text',
      required: true
    });
  }

  // Verification token
  if (text.includes('verification') || text.includes('token') && text.includes('site')) {
    fields.push({
      name: 'verificationToken',
      label: 'Site Verification Token',
      placeholder: 'Enter verification token or DNS record',
      helpText: 'Token for domain/site ownership verification',
      type: 'text',
      required: true
    });
  }

  // Shopify Partner ID
  if (text.includes('shopify partner id')) {
    fields.push({
      name: 'shopifyPartnerId',
      label: 'Shopify Partner ID',
      placeholder: 'e.g., 12345678',
      helpText: 'Your Shopify Partners account ID',
      type: 'text',
      required: false
    });
  }

  // Shared Account label/rotation (PAM)
  if (text.includes('label of shared login') || text.includes('rotation policy')) {
    fields.push({
      name: 'sharedAccountLabel',
      label: 'Shared Account Label',
      placeholder: 'e.g., Agency Affiliate Login',
      helpText: 'A descriptive label for this shared account',
      type: 'text',
      required: true
    });
  }

  // If no specific fields matched, add a generic agency identity field
  if (fields.length === 0) {
    fields.push({
      name: 'agencyIdentity',
      label: 'Agency Identity',
      placeholder: 'Enter the required agency identity/credential',
      helpText: 'The identifier or credential to provide',
      type: 'text',
      required: true
    });
  }

  return fields;
}

// ── Lookup Functions ─────────────────────────────────────────────────────────

// Platform name aliases for matching
const platformAliases: Record<string, string[]> = {
  'Google Ads': ['google ads', 'google-ads', 'adwords'],
  'Meta Business Manager / Facebook Ads': ['meta', 'facebook', 'facebook ads', 'meta ads', 'meta-facebook-ads', 'meta / facebook ads'],
  'Google Analytics 4 (GA4)': ['ga4', 'google analytics', 'google-analytics-ga4', 'google analytics / ga4'],
  'Google Tag Manager': ['gtm', 'tag manager', 'google-tag-manager'],
  'Google Search Console': ['search console', 'gsc', 'google-search-console'],
  'Google Merchant Center': ['merchant center', 'google-merchant-center'],
  'TikTok Ads': ['tiktok', 'tiktok-ads'],
  'Microsoft Advertising (Bing Ads)': ['microsoft advertising', 'bing ads', 'bing', 'microsoft-advertising'],
  'LinkedIn Ads': ['linkedin', 'linkedin-ads'],
  'DV360 (Display & Video 360)': ['dv360', 'display & video 360', 'display and video'],
  'Snapchat Ads': ['snapchat', 'snapchat-ads', 'snap'],
  'Pinterest Ads': ['pinterest', 'pinterest-ads'],
  'YouTube Ads': ['youtube', 'youtube-ads'],
  'The Trade Desk': ['trade desk', 'ttd', 'the-trade-desk'],
  'Shopify': ['shopify'],
  'HubSpot': ['hubspot'],
  'Salesforce': ['salesforce'],
  'Klaviyo': ['klaviyo'],
  'Mailchimp': ['mailchimp'],
  'Snowflake': ['snowflake'],
  'Fivetran': ['fivetran'],
  'Funnel.io': ['funnel', 'funnel.io'],
  'Adobe Analytics': ['adobe analytics', 'adobe-analytics'],
  'Amazon Ads (Retail Media)': ['amazon ads', 'amazon advertising', 'amazon-advertising'],
  'Apple Search Ads': ['apple search ads', 'apple-search-ads'],
  'Attentive': ['attentive'],
  'BigCommerce': ['bigcommerce'],
  'Marketo': ['marketo'],
  'Reddit Ads': ['reddit', 'reddit-ads'],
  'Criteo': ['criteo']
};

function matchPlatformName(searchName: string): string | undefined {
  const normalized = searchName.toLowerCase().trim();
  
  // Direct match first
  for (const inst of platformAccessInstructions) {
    if (inst.platform.toLowerCase() === normalized) {
      return inst.platform;
    }
  }
  
  // Alias match
  for (const [canonical, aliases] of Object.entries(platformAliases)) {
    if (aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
      return canonical;
    }
  }
  
  // Partial match
  for (const inst of platformAccessInstructions) {
    if (inst.platform.toLowerCase().includes(normalized) || 
        normalized.includes(inst.platform.toLowerCase().split(' ')[0])) {
      return inst.platform;
    }
  }
  
  return undefined;
}

// Access pattern aliases
const patternAliases: Record<string, string[]> = {
  'Partner Delegation (Manager Account)': ['partner delegation', 'manager account', 'mcc', '1 (partner hub)', 'mcc manager', 'partner hub'],
  'Partner Delegation (Business Manager)': ['business manager', 'partner delegation (business', 'bm partner'],
  'Partner Delegation (Business Center)': ['business center', 'partner delegation (business center'],
  'Partner Delegation (Seat)': ['seat', 'partner seat', 'agency seat'],
  'Named Invite': ['named invite', 'user invite', '2 (named invites)', 'named user', 'direct user invite'],
  'Named Invite (User)': ['named invite (user)', 'user invite'],
  'Named Invite (Collaborator)': ['collaborator', 'named invite (collaborator)'],
  'Group-based (Service Account)': ['service account', 'group-based (service', '3 (group access)', 'group / service account'],
  'Group-based (SSO/SCIM)': ['sso', 'scim', 'group-based (sso'],
  'Group-based (SCIM)': ['scim'],
  'Proxy (Integration Token)': ['integration token', 'proxy (integration', '4 (proxy)', 'proxy token'],
  'Proxy (Site Verification API)': ['site verification', 'verification api'],
  'Proxy (Service Account)': ['proxy (service', 'api key, secret'],
  'Proxy (Integration Account)': ['integration account'],
  'Shared Account (Client-owned)': ['shared account', 'client-owned', 'pattern 5', 'shared login']
};

function matchAccessPattern(searchPattern: string, platform: string): string | undefined {
  const normalized = searchPattern.toLowerCase().trim();
  
  // Get all patterns for this platform
  const platformInstructions = platformAccessInstructions.filter(
    i => i.platform.toLowerCase() === platform.toLowerCase()
  );
  
  // Direct match
  for (const inst of platformInstructions) {
    if (inst.accessPattern.toLowerCase() === normalized) {
      return inst.accessPattern;
    }
  }
  
  // Alias match
  for (const [canonical, aliases] of Object.entries(patternAliases)) {
    if (aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
      const match = platformInstructions.find(i => 
        i.accessPattern.toLowerCase().includes(canonical.toLowerCase()) ||
        canonical.toLowerCase().includes(i.accessPattern.toLowerCase().split(' ')[0])
      );
      if (match) return match.accessPattern;
    }
  }
  
  // Partial match
  for (const inst of platformInstructions) {
    const words = inst.accessPattern.toLowerCase().split(/[\s()]+/).filter(w => w.length > 3);
    if (words.some(w => normalized.includes(w))) {
      return inst.accessPattern;
    }
  }
  
  return platformInstructions[0]?.accessPattern;
}

// Main lookup function
export function getAccessInstruction(
  platformName: string,
  accessPattern: string
): PlatformAccessInstruction | undefined {
  // Try to match platform name
  const matchedPlatform = matchPlatformName(platformName);
  if (!matchedPlatform) {
    console.warn(`[platform-access-instructions] No match found for platform: "${platformName}"`);
    return undefined;
  }

  // Try to match access pattern
  const matchedPattern = matchAccessPattern(accessPattern, matchedPlatform);
  if (!matchedPattern) {
    console.warn(`[platform-access-instructions] No pattern match for: "${accessPattern}" on "${matchedPlatform}"`);
    // Return first instruction for this platform as fallback
    return platformAccessInstructions.find(i => i.platform === matchedPlatform);
  }

  // Lookup exact match
  const key = normalizeKey(matchedPlatform, matchedPattern);
  const result = instructionMap.get(key);
  
  if (!result) {
    // Try fuzzy lookup
    return platformAccessInstructions.find(i => 
      i.platform === matchedPlatform && 
      (i.accessPattern.toLowerCase().includes(matchedPattern.toLowerCase().split(' ')[0]) ||
       matchedPattern.toLowerCase().includes(i.accessPattern.toLowerCase().split(' ')[0]))
    ) || platformAccessInstructions.find(i => i.platform === matchedPlatform);
  }
  
  return result;
}

// Get all instructions for a platform
export function getInstructionsForPlatform(platformName: string): PlatformAccessInstruction[] {
  const matchedPlatform = matchPlatformName(platformName);
  if (!matchedPlatform) return [];
  return platformAccessInstructions.filter(i => i.platform === matchedPlatform);
}

// Get dynamic fields for admin form
export function getFieldsForAccessItem(
  platformName: string,
  accessPattern: string
): DynamicFieldConfig[] {
  const instruction = getAccessInstruction(platformName, accessPattern);
  if (!instruction) {
    console.warn(`[platform-access-instructions] Using fallback fields for "${platformName}" + "${accessPattern}"`);
    return [{
      name: 'agencyIdentity',
      label: 'Agency Identity',
      placeholder: 'Enter agency identity or credential',
      type: 'text',
      required: true
    }];
  }
  return parseDataToCollect(instruction.dataToCollect);
}

// Get client instructions for onboarding
export function getClientInstructions(
  platformName: string,
  accessPattern: string
): string {
  const instruction = getAccessInstruction(platformName, accessPattern);
  if (!instruction) {
    return `Please follow your agency's instructions to grant access to ${platformName}.`;
  }
  return instruction.instructions;
}

// Check if pattern requires asset selection during onboarding
export function requiresAssetSelection(
  platformName: string,
  accessPattern: string
): { required: boolean; assetTypes: string[] } {
  const instruction = getAccessInstruction(platformName, accessPattern);
  if (!instruction) return { required: false, assetTypes: [] };
  
  const text = instruction.instructions.toLowerCase();
  const assetTypes: string[] = [];
  
  if (text.includes('select assets') || text.includes('choose assets')) {
    if (text.includes('ad account')) assetTypes.push('Ad Account');
    if (text.includes('page')) assetTypes.push('Page');
    if (text.includes('pixel')) assetTypes.push('Pixel');
  }
  if (text.includes('select the property') || text.includes('property id')) {
    assetTypes.push('Property');
  }
  if (text.includes('select the container') || text.includes('choose the container')) {
    assetTypes.push('Container');
  }
  if (text.includes('select the advertiser') || text.includes('link their advertiser')) {
    assetTypes.push('Advertiser');
  }
  if (text.includes('select which report') || text.includes('share the workspace')) {
    assetTypes.push('Report/Dashboard');
  }
  if (text.includes('select stores') || text.includes('select ad accounts')) {
    assetTypes.push('Account/Store');
  }
  
  return { required: assetTypes.length > 0, assetTypes };
}
