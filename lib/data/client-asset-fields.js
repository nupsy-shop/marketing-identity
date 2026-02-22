// Client Asset Fields - Defines what data to collect from clients during onboarding
// Source: client_asset_fields.xlsx
// This drives the dynamic form generation in the onboarding wizard

// Map access pattern names to our internal item types
const ACCESS_PATTERN_TO_ITEM_TYPE = {
  'Partner Delegation (Manager Account)': 'PARTNER_DELEGATION',
  'Partner Delegation (Business Manager)': 'PARTNER_DELEGATION',
  'Partner Delegation (Business Center)': 'PARTNER_DELEGATION',
  'Partner Delegation (Seat)': 'PARTNER_DELEGATION',
  'Named Invite': 'NAMED_INVITE',
  'Named Invite (User)': 'NAMED_INVITE',
  'Named Invite (Collaborator)': 'NAMED_INVITE',
  'Group-based (Service Account)': 'GROUP_ACCESS',
  'Group-based (SSO/SCIM)': 'GROUP_ACCESS',
  'Proxy (Integration Token)': 'PROXY_TOKEN',
  'Proxy (Site Verification API)': 'PROXY_TOKEN',
  'Proxy (Service Account)': 'PROXY_TOKEN',
  'Proxy (Integration Account)': 'PROXY_TOKEN'
};

// Raw data from client_asset_fields.xlsx
const RAW_ASSET_DEFINITIONS = [
  { platform: "Google Ads", accessPattern: "Partner Delegation (Manager Account)", clientFields: "Ad account ID" },
  { platform: "Meta Business Manager / Facebook Ads", accessPattern: "Partner Delegation (Business Manager)", clientFields: "Ad accounts, Pages, Pixels" },
  { platform: "Meta Business Manager / Facebook Ads", accessPattern: "Named Invite (User)", clientFields: "Ad account or Page ID" },
  { platform: "TikTok Ads", accessPattern: "Partner Delegation (Business Center)", clientFields: "Ad account ID, Pixel ID" },
  { platform: "Google Analytics 4 (GA4)", accessPattern: "Named Invite", clientFields: "GA4 Property ID, Role" },
  { platform: "Google Analytics 4 (GA4)", accessPattern: "Group-based (Service Account)", clientFields: "GA4 Property ID" },
  { platform: "Google Search Console", accessPattern: "Named Invite", clientFields: "Property (URL) and Permission" },
  { platform: "Google Search Console", accessPattern: "Proxy (Site Verification API)", clientFields: "Domain/URL for verification token" },
  { platform: "Google Tag Manager", accessPattern: "Named Invite", clientFields: "Container ID, Role" },
  { platform: "Google Merchant Center", accessPattern: "Named Invite", clientFields: "Merchant Center Account ID, Role" },
  { platform: "DV360 (Display & Video 360)", accessPattern: "Partner Delegation (Seat)", clientFields: "Advertiser ID" },
  { platform: "Snowflake", accessPattern: "Group-based (SSO/SCIM)", clientFields: "None" },
  { platform: "Fivetran", accessPattern: "Group-based (Service Account)", clientFields: "Source and Destination IDs" },
  { platform: "Funnel.io", accessPattern: "Proxy (Integration Token)", clientFields: null },
  { platform: "HubSpot", accessPattern: "Named Invite", clientFields: "HubSpot Portal (Account) and Role" },
  { platform: "HubSpot", accessPattern: "Group-based (SCIM)", clientFields: "HubSpot Portal (Account) and Role" },
  { platform: "Salesforce", accessPattern: "Named Invite", clientFields: "Salesforce Org (Account) and Permission Set" },
  { platform: "Salesforce", accessPattern: "Group-based (SSO/SCIM)", clientFields: "Salesforce Org (Account) and Role" },
  { platform: "Shopify", accessPattern: "Named Invite (Collaborator)", clientFields: "Store (Shopify) and Permissions" },
  { platform: "Shopify", accessPattern: "Proxy (Service Account)", clientFields: "Store (Shopify) and Scopes" },
  { platform: "Microsoft Advertising (Bing Ads)", accessPattern: "Named Invite", clientFields: "Ad account ID" },
  { platform: "Microsoft Advertising (Bing Ads)", accessPattern: "Partner Delegation (Manager Account)", clientFields: "Ad account ID" },
  { platform: "Pinterest Ads", accessPattern: "Partner Delegation (Business Manager)", clientFields: "Ad account ID" },
  { platform: "Pinterest Ads", accessPattern: "Named Invite", clientFields: "Ad account ID" },
  { platform: "LinkedIn Ads", accessPattern: "Named Invite", clientFields: "Ad account ID, Role" },
  { platform: "LinkedIn Ads", accessPattern: "Partner Delegation (Business Manager)", clientFields: "Ad account ID" },
  { platform: "Snapchat Ads", accessPattern: "Partner Delegation (Business Center)", clientFields: "Ad account ID, Role" },
  { platform: "Snapchat Ads", accessPattern: "Named Invite", clientFields: "Ad account ID, Role" },
  { platform: "StackAdapt", accessPattern: "Partner Delegation (Seat)", clientFields: "Advertiser ID" },
  { platform: "The Trade Desk", accessPattern: "Partner Delegation (Seat)", clientFields: "Advertiser ID" },
  { platform: "Triple Whale", accessPattern: "Named Invite", clientFields: "Account/Store ID, Role" },
  { platform: "YouTube Ads", accessPattern: "Partner Delegation (Manager Account)", clientFields: "Ad account ID" },
  { platform: "Yotpo", accessPattern: "Named Invite", clientFields: "Account ID, Role" },
  { platform: "CallRail", accessPattern: "Named Invite", clientFields: "CallRail Account ID, Role" },
  { platform: "BrightLocal", accessPattern: "Named Invite", clientFields: "Project/Location ID" },
  { platform: "Heap", accessPattern: "Named Invite", clientFields: "Project ID" },
  { platform: "GrowthBook", accessPattern: "Named Invite", clientFields: "Workspace ID, Role" },
  { platform: "Keen.io", accessPattern: "Named Invite", clientFields: "Project/Collection IDs" },
  { platform: "LinkedIn Sales Navigator / Outreach (Sales Engagement)", accessPattern: "Named Invite", clientFields: "Sales Navigator seat / Outreach org ID" },
  { platform: "Looker Studio (Google Data Studio)", accessPattern: "Named Invite", clientFields: "Report ID or Data Source" },
  { platform: "Microsoft Clarity", accessPattern: "Named Invite", clientFields: "Project ID" },
  { platform: "Optmyzr", accessPattern: "Named Invite", clientFields: "Account ID" },
  { platform: "Power BI", accessPattern: "Named Invite", clientFields: "Workspace ID" },
  { platform: "Reddit Ads", accessPattern: "Named Invite", clientFields: "Ad account ID" },
  { platform: "Rollstack", accessPattern: "Proxy (Integration Account)", clientFields: "Report template or Dashboard ID" },
  { platform: "Sanity CMS", accessPattern: "Named Invite", clientFields: "Dataset/Project ID" },
  { platform: "Webflow", accessPattern: "Named Invite", clientFields: "Workspace/Project ID" }
];

// Parse client fields into structured form field definitions
function parseClientFields(clientFieldsStr, platformName, accessPattern) {
  if (!clientFieldsStr || clientFieldsStr.toLowerCase() === 'none') {
    return [];
  }

  const fields = [];
  const lowerPlatform = platformName.toLowerCase();
  const lowerFields = clientFieldsStr.toLowerCase();

  // --- Google Ads ---
  if (lowerPlatform.includes('google ads') || lowerPlatform.includes('youtube ads')) {
    if (lowerFields.includes('ad account id')) {
      fields.push({
        name: 'adAccountId',
        label: 'Google Ads Customer ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 123-456-7890',
        helpText: 'Find this in Google Ads under Settings → Account settings',
        validation: { pattern: '^\\d{3}-\\d{3}-\\d{4}$|^\\d{10}$', message: 'Enter a valid Google Ads ID (XXX-XXX-XXXX or 10 digits)' }
      });
    }
  }

  // --- Meta / Facebook ---
  if (lowerPlatform.includes('meta') || lowerPlatform.includes('facebook')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountIds',
        label: 'Ad Account(s)',
        type: 'multi-text',
        required: true,
        placeholder: 'e.g., act_123456789',
        helpText: 'Enter one or more Ad Account IDs (starting with act_)',
        validation: { pattern: '^act_\\d+$', message: 'Ad Account IDs must start with "act_"' }
      });
    }
    if (lowerFields.includes('page')) {
      fields.push({
        name: 'pageIds',
        label: 'Facebook Page(s)',
        type: 'multi-text',
        required: false,
        placeholder: 'e.g., 123456789012345',
        helpText: 'Enter Page IDs to share (optional)'
      });
    }
    if (lowerFields.includes('pixel')) {
      fields.push({
        name: 'pixelIds',
        label: 'Pixel(s)',
        type: 'multi-text',
        required: false,
        placeholder: 'e.g., 123456789012345',
        helpText: 'Enter Pixel IDs to share (optional)'
      });
    }
  }

  // --- TikTok ---
  if (lowerPlatform.includes('tiktok')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'TikTok Ad Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 7123456789012345678',
        helpText: 'Find this in TikTok Ads Manager'
      });
    }
    if (lowerFields.includes('pixel')) {
      fields.push({
        name: 'pixelId',
        label: 'TikTok Pixel ID',
        type: 'text',
        required: false,
        placeholder: 'e.g., CXXXXXX'
      });
    }
  }

  // --- Google Analytics 4 ---
  if (lowerPlatform.includes('analytics') || lowerPlatform.includes('ga4')) {
    if (lowerFields.includes('property id')) {
      fields.push({
        name: 'propertyId',
        label: 'GA4 Property ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 123456789',
        helpText: 'Find this in GA4 Admin → Property Settings',
        validation: { pattern: '^\\d+$', message: 'Property ID must be numeric' }
      });
    }
    if (lowerFields.includes('role')) {
      fields.push({
        name: 'role',
        label: 'Access Level to Grant',
        type: 'select',
        required: true,
        options: [
          { value: 'Administrator', label: 'Administrator - Full access' },
          { value: 'Editor', label: 'Editor - Edit configurations' },
          { value: 'Analyst', label: 'Analyst - View reports and create explorations' },
          { value: 'Viewer', label: 'Viewer - View reports only' }
        ],
        defaultValue: 'Analyst'
      });
    }
  }

  // --- Google Search Console ---
  if (lowerPlatform.includes('search console')) {
    if (lowerFields.includes('property') || lowerFields.includes('url')) {
      fields.push({
        name: 'propertyUrl',
        label: 'Search Console Property URL',
        type: 'text',
        required: true,
        placeholder: 'e.g., https://example.com or sc-domain:example.com',
        helpText: 'The exact property URL as shown in Search Console',
        validation: { pattern: '^(https?://|sc-domain:).+', message: 'Enter a valid URL or domain property' }
      });
    }
    if (lowerFields.includes('permission')) {
      fields.push({
        name: 'permission',
        label: 'Permission Level',
        type: 'select',
        required: true,
        options: [
          { value: 'Owner', label: 'Owner - Full control' },
          { value: 'Full', label: 'Full - View all data, some settings' },
          { value: 'Restricted', label: 'Restricted - View most data' }
        ],
        defaultValue: 'Full'
      });
    }
  }

  // --- Google Tag Manager ---
  if (lowerPlatform.includes('tag manager') || lowerPlatform.includes('gtm')) {
    if (lowerFields.includes('container')) {
      fields.push({
        name: 'containerId',
        label: 'GTM Container ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., GTM-XXXXXX',
        helpText: 'Find this in GTM Admin → Container Settings',
        validation: { pattern: '^GTM-[A-Z0-9]+$', message: 'Container ID must be in format GTM-XXXXXX' }
      });
    }
  }

  // --- Google Merchant Center ---
  if (lowerPlatform.includes('merchant center')) {
    if (lowerFields.includes('account id')) {
      fields.push({
        name: 'merchantCenterId',
        label: 'Merchant Center Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 123456789',
        validation: { pattern: '^\\d+$', message: 'Account ID must be numeric' }
      });
    }
  }

  // --- DV360 / Trade Desk / StackAdapt ---
  if (lowerPlatform.includes('dv360') || lowerPlatform.includes('trade desk') || lowerPlatform.includes('stackadapt')) {
    if (lowerFields.includes('advertiser id')) {
      fields.push({
        name: 'advertiserId',
        label: 'Advertiser ID',
        type: 'text',
        required: true,
        placeholder: 'Your advertiser account ID',
        helpText: 'The advertiser account to link to the agency seat'
      });
    }
  }

  // --- Fivetran ---
  if (lowerPlatform.includes('fivetran')) {
    if (lowerFields.includes('source') || lowerFields.includes('destination')) {
      fields.push({
        name: 'sourceIds',
        label: 'Fivetran Source IDs',
        type: 'multi-text',
        required: false,
        placeholder: 'e.g., source_abc123',
        helpText: 'Enter the Fivetran source connector IDs to share'
      });
      fields.push({
        name: 'destinationIds',
        label: 'Fivetran Destination IDs',
        type: 'multi-text',
        required: false,
        placeholder: 'e.g., dest_xyz789',
        helpText: 'Enter the Fivetran destination IDs to share'
      });
    }
  }

  // --- HubSpot ---
  if (lowerPlatform.includes('hubspot')) {
    if (lowerFields.includes('portal') || lowerFields.includes('account')) {
      fields.push({
        name: 'portalId',
        label: 'HubSpot Portal ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 12345678',
        helpText: 'Find this in HubSpot Settings → Account defaults'
      });
    }
  }

  // --- Salesforce ---
  if (lowerPlatform.includes('salesforce')) {
    if (lowerFields.includes('org') || lowerFields.includes('account')) {
      fields.push({
        name: 'orgId',
        label: 'Salesforce Organization ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 00D1234567890AB',
        helpText: 'Find this in Setup → Company Information'
      });
    }
    if (lowerFields.includes('permission set')) {
      fields.push({
        name: 'permissionSet',
        label: 'Permission Set to Assign',
        type: 'text',
        required: true,
        placeholder: 'e.g., Marketing_User',
        helpText: 'Name of the permission set to assign to the agency user'
      });
    }
  }

  // --- Shopify ---
  if (lowerPlatform.includes('shopify')) {
    if (lowerFields.includes('store')) {
      fields.push({
        name: 'storeUrl',
        label: 'Shopify Store URL',
        type: 'text',
        required: true,
        placeholder: 'e.g., your-store.myshopify.com',
        helpText: 'Your Shopify store domain',
        validation: { pattern: '^[a-z0-9-]+\\.myshopify\\.com$', message: 'Enter your myshopify.com domain' }
      });
    }
    if (lowerFields.includes('permissions') || lowerFields.includes('scopes')) {
      fields.push({
        name: 'permissions',
        label: 'Permissions / Scopes',
        type: 'checkbox-group',
        required: true,
        options: [
          { value: 'products', label: 'Products - View and manage products' },
          { value: 'orders', label: 'Orders - View and manage orders' },
          { value: 'customers', label: 'Customers - View and manage customers' },
          { value: 'analytics', label: 'Analytics - View reports and analytics' },
          { value: 'marketing', label: 'Marketing - Manage marketing campaigns' }
        ]
      });
    }
  }

  // --- LinkedIn Ads ---
  if (lowerPlatform.includes('linkedin ads')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'LinkedIn Ad Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 123456789',
        helpText: 'Find this in Campaign Manager → Account Assets → Account ID'
      });
    }
  }

  // --- Microsoft Advertising / Bing ---
  if (lowerPlatform.includes('microsoft advertising') || lowerPlatform.includes('bing')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'Microsoft Advertising Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 123456',
        helpText: 'Find this in Microsoft Advertising under Settings'
      });
    }
  }

  // --- Pinterest ---
  if (lowerPlatform.includes('pinterest')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'Pinterest Ad Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 549755813888',
        helpText: 'Find this in Pinterest Ads Manager'
      });
    }
  }

  // --- Snapchat ---
  if (lowerPlatform.includes('snapchat')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'Snapchat Ad Account ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., 12a34567-89bc-0d12-ef34-567890abcdef'
      });
    }
  }

  // --- Reddit ---
  if (lowerPlatform.includes('reddit')) {
    if (lowerFields.includes('ad account')) {
      fields.push({
        name: 'adAccountId',
        label: 'Reddit Ads Account ID',
        type: 'text',
        required: true,
        placeholder: 'Your Reddit Ads account ID'
      });
    }
  }

  // --- Looker Studio ---
  if (lowerPlatform.includes('looker') || lowerPlatform.includes('data studio')) {
    if (lowerFields.includes('report') || lowerFields.includes('data source')) {
      fields.push({
        name: 'reportUrl',
        label: 'Report URL to Share',
        type: 'text',
        required: true,
        placeholder: 'https://lookerstudio.google.com/reporting/...',
        helpText: 'Paste the full URL of the report you want to share',
        validation: { pattern: '^https://lookerstudio\\.google\\.com/.+', message: 'Enter a valid Looker Studio URL' }
      });
    }
  }

  // --- Power BI ---
  if (lowerPlatform.includes('power bi')) {
    if (lowerFields.includes('workspace')) {
      fields.push({
        name: 'workspaceId',
        label: 'Power BI Workspace ID',
        type: 'text',
        required: true,
        placeholder: 'e.g., abc12345-6789-0abc-def0-123456789012',
        helpText: 'Find this in Power BI workspace settings'
      });
    }
  }

  // --- Generic fallback for other platforms ---
  if (fields.length === 0 && clientFieldsStr) {
    // Parse comma-separated fields
    const fieldNames = clientFieldsStr.split(',').map(f => f.trim());
    for (const fieldName of fieldNames) {
      if (fieldName.toLowerCase() === 'role') {
        fields.push({
          name: 'role',
          label: 'Role / Permission Level',
          type: 'text',
          required: false,
          placeholder: 'e.g., Admin, Editor, Viewer'
        });
      } else {
        const sanitizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        fields.push({
          name: sanitizedName || 'assetId',
          label: fieldName,
          type: 'text',
          required: true,
          placeholder: `Enter ${fieldName}`
        });
      }
    }
  }

  return fields;
}

// Build the lookup map: { platformName: { itemType: [fields] } }
const ASSET_FIELDS_BY_PLATFORM = {};

for (const def of RAW_ASSET_DEFINITIONS) {
  const platformKey = def.platform.toLowerCase();
  const itemType = ACCESS_PATTERN_TO_ITEM_TYPE[def.accessPattern] || 'NAMED_INVITE';
  const fields = parseClientFields(def.clientFields, def.platform, def.accessPattern);

  if (!ASSET_FIELDS_BY_PLATFORM[platformKey]) {
    ASSET_FIELDS_BY_PLATFORM[platformKey] = {};
  }
  
  // Store fields, merge if same itemType exists
  if (!ASSET_FIELDS_BY_PLATFORM[platformKey][itemType]) {
    ASSET_FIELDS_BY_PLATFORM[platformKey][itemType] = fields;
  } else {
    // Merge fields, avoid duplicates
    for (const field of fields) {
      if (!ASSET_FIELDS_BY_PLATFORM[platformKey][itemType].find(f => f.name === field.name)) {
        ASSET_FIELDS_BY_PLATFORM[platformKey][itemType].push(field);
      }
    }
  }
}

/**
 * Get the asset fields to collect from a client during onboarding
 * @param {string} platformName - The platform name (case-insensitive)
 * @param {string} itemType - The item type (NAMED_INVITE, PARTNER_DELEGATION, etc.)
 * @returns {Array} Array of field definitions
 */
export function getClientAssetFields(platformName, itemType = 'NAMED_INVITE') {
  if (!platformName) return [];
  
  const platformKey = platformName.toLowerCase();
  
  // Try exact match first
  for (const key of Object.keys(ASSET_FIELDS_BY_PLATFORM)) {
    if (platformKey.includes(key) || key.includes(platformKey)) {
      const platformFields = ASSET_FIELDS_BY_PLATFORM[key];
      if (platformFields[itemType]) {
        return platformFields[itemType];
      }
      // Fallback to any available item type for this platform
      const availableTypes = Object.keys(platformFields);
      if (availableTypes.length > 0) {
        return platformFields[availableTypes[0]];
      }
    }
  }
  
  // Try partial match
  for (const key of Object.keys(ASSET_FIELDS_BY_PLATFORM)) {
    const words = platformKey.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && key.includes(word)) {
        const platformFields = ASSET_FIELDS_BY_PLATFORM[key];
        if (platformFields[itemType]) {
          return platformFields[itemType];
        }
        const availableTypes = Object.keys(platformFields);
        if (availableTypes.length > 0) {
          return platformFields[availableTypes[0]];
        }
      }
    }
  }
  
  return [];
}

/**
 * Validate client-provided asset data
 * @param {Object} data - The clientProvidedTarget data
 * @param {Array} fieldDefs - The field definitions from getClientAssetFields
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateClientAssetData(data, fieldDefs) {
  const errors = [];
  
  for (const field of fieldDefs) {
    const value = data[field.name];
    
    // Check required
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      errors.push(`${field.label} is required`);
      continue;
    }
    
    // Check validation pattern
    if (value && field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (Array.isArray(value)) {
        for (const v of value) {
          if (!regex.test(v)) {
            errors.push(`${field.label}: ${field.validation.message || 'Invalid format'}`);
            break;
          }
        }
      } else if (!regex.test(value)) {
        errors.push(`${field.label}: ${field.validation.message || 'Invalid format'}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// Export raw data for reference
export const RAW_DEFINITIONS = RAW_ASSET_DEFINITIONS;
export const PLATFORM_MAP = ASSET_FIELDS_BY_PLATFORM;
