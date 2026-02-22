// Field Policy Engine - Single source of truth for form fields
// Enforces: Admin config defines templates, Client onboarding collects assets

// ─── Identity Taxonomy ───────────────────────────────────────────────────────

export const IDENTITY_PURPOSE = {
  HUMAN_INTERACTIVE: 'HUMAN_INTERACTIVE',
  INTEGRATION_NON_INTERACTIVE: 'INTEGRATION_NON_INTERACTIVE'
};

export const HUMAN_IDENTITY_STRATEGY = {
  CLIENT_DEDICATED: 'CLIENT_DEDICATED',    // Recommended - unique identity per client
  AGENCY_GROUP: 'AGENCY_GROUP',             // Static group email
  INDIVIDUAL_USERS: 'INDIVIDUAL_USERS'      // Select users at request time
};

export const CLIENT_DEDICATED_IDENTITY_TYPE = {
  GROUP: 'GROUP',      // Preferred if platform supports group invites
  MAILBOX: 'MAILBOX'   // Loginable; can be PAM-managed
};

export const OWNERSHIP = {
  CLIENT_OWNED: 'CLIENT_OWNED',
  AGENCY_OWNED: 'AGENCY_OWNED'
};

// ─── Item Type Definitions ───────────────────────────────────────────────────

export const ITEM_TYPE_CONFIG = {
  NAMED_INVITE: {
    label: 'Named Invite',
    icon: 'fas fa-user-plus',
    description: 'Human interactive access via user/group invite',
    defaultPurpose: IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
    supportsHumanStrategies: true,
    supportsPAM: false
  },
  PARTNER_DELEGATION: {
    label: 'Partner Delegation',
    icon: 'fas fa-handshake',
    description: 'Grant access via partner/agency seat or manager account',
    defaultPurpose: IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
    supportsHumanStrategies: false,
    requiresAgencyIdentifier: true,  // MCC ID, BM ID, etc.
    supportsPAM: false
  },
  GROUP_ACCESS: {
    label: 'Group / Service Account',
    icon: 'fas fa-users-cog',
    description: 'Service account or group-based access',
    defaultPurpose: IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE,
    canBeHuman: true,
    supportsPAM: false
  },
  PROXY_TOKEN: {
    label: 'API / Integration Token',
    icon: 'fas fa-key',
    description: 'Non-interactive integration via API keys or tokens',
    defaultPurpose: IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE,
    requiresIntegrationIdentity: true,
    supportsPAM: false
  },
  SHARED_ACCOUNT_PAM: {
    label: 'Shared Account (PAM)',
    icon: 'fas fa-shield-halved',
    description: 'Privileged shared account with checkout policy',
    defaultPurpose: IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
    supportsHumanStrategies: false,
    supportsPAM: true,
    requiresOwnership: true
  }
};

// ─── Admin Config Fields ─────────────────────────────────────────────────────
// These fields should appear in the admin "Add Access Item" form

export function getAdminConfigFields(itemType, identityPurpose, humanStrategy) {
  const fields = [];
  const config = ITEM_TYPE_CONFIG[itemType];
  
  // Common fields for all types
  fields.push(
    { name: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., GA4 Standard Access' },
    { name: 'role', label: 'Role Template', type: 'select', required: true }
  );

  // Identity purpose selector (for types that support it)
  if (config?.canBeHuman || itemType === 'GROUP_ACCESS') {
    fields.push({
      name: 'identityPurpose',
      label: 'Identity Purpose',
      type: 'radio',
      required: true,
      options: [
        { value: IDENTITY_PURPOSE.HUMAN_INTERACTIVE, label: 'Human Interactive', desc: 'User or group that logs in' },
        { value: IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE, label: 'Integration (Non-Human)', desc: 'Service account or API' }
      ]
    });
  }

  // Human strategy selector (for Named Invite)
  if (itemType === 'NAMED_INVITE' || (config?.supportsHumanStrategies && identityPurpose === IDENTITY_PURPOSE.HUMAN_INTERACTIVE)) {
    fields.push({
      name: 'humanIdentityStrategy',
      label: 'Identity Strategy',
      type: 'radio',
      required: true,
      options: [
        { 
          value: HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED, 
          label: 'Client-Dedicated Identity', 
          desc: 'Generate unique identity per client (recommended)',
          recommended: true
        },
        { 
          value: HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP, 
          label: 'Agency Group', 
          desc: 'Use a single agency-wide group email' 
        },
        { 
          value: HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS, 
          label: 'Individual Users', 
          desc: 'Select specific users when creating request' 
        }
      ]
    });
  }

  // Client-Dedicated specific fields
  if (humanStrategy === HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED) {
    fields.push(
      {
        name: 'clientDedicatedIdentityType',
        label: 'Identity Type',
        type: 'radio',
        required: true,
        options: [
          { value: CLIENT_DEDICATED_IDENTITY_TYPE.GROUP, label: 'Group', desc: 'Preferred if platform supports groups' },
          { value: CLIENT_DEDICATED_IDENTITY_TYPE.MAILBOX, label: 'Mailbox', desc: 'Loginable email (can be PAM-managed)' }
        ]
      },
      {
        name: 'namingTemplate',
        label: 'Naming Template',
        type: 'text',
        required: true,
        placeholder: '{clientSlug}-{platformKey}@youragency.com',
        helpText: 'Auto-generated identity format. Variables: {clientSlug}, {platformKey}',
        defaultValue: '{clientSlug}-{platformKey}@youragency.com'
      }
    );
  }

  // Agency Group specific fields
  if (humanStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
    fields.push({
      name: 'agencyGroupEmail',
      label: 'Agency Group Email',
      type: 'email',
      required: true,
      placeholder: 'analytics-team@youragency.com',
      helpText: 'Static group email that will be invited to all client accounts'
    });
  }

  // Individual Users - no email fields needed here (selected at request time)
  if (humanStrategy === HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS) {
    fields.push({
      name: 'individualUsersNote',
      type: 'info',
      content: 'Invitees will be selected when generating each client request.'
    });
  }

  // Integration identity reference (for non-human types)
  if (identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE || itemType === 'PROXY_TOKEN') {
    fields.push({
      name: 'integrationIdentityId',
      label: 'Integration Identity',
      type: 'select-integration',
      required: true,
      helpText: 'Select a pre-configured service account or API credential'
    });
  }

  // Partner Delegation requires agency identifiers (MCC ID, BM ID, etc.)
  if (itemType === 'PARTNER_DELEGATION') {
    fields.push({
      name: 'agencyIdentifierNote',
      type: 'info',
      content: 'Agency identifiers (MCC ID, Business Manager ID, etc.) will be configured based on the platform.'
    });
  }

  // Shared Account PAM specific fields
  if (itemType === 'SHARED_ACCOUNT_PAM') {
    fields.push(
      {
        name: 'pamOwnership',
        label: 'Ownership Model',
        type: 'radio',
        required: true,
        options: [
          { value: OWNERSHIP.CLIENT_OWNED, label: 'Client-Owned', desc: 'Client provides credentials during onboarding' },
          { value: OWNERSHIP.AGENCY_OWNED, label: 'Agency-Owned', desc: 'Client invites agency identity' }
        ]
      },
      {
        name: 'checkoutDurationMinutes',
        label: 'Checkout Duration (minutes)',
        type: 'number',
        required: true,
        defaultValue: 60,
        min: 15,
        max: 480
      },
      {
        name: 'rotationTrigger',
        label: 'Credential Rotation',
        type: 'select',
        required: true,
        options: [
          { value: 'onCheckin', label: 'On Check-in' },
          { value: 'scheduled', label: 'Scheduled' },
          { value: 'offboard', label: 'On Offboarding' },
          { value: 'manual', label: 'Manual' }
        ]
      }
    );
  }

  // Validation method
  fields.push({
    name: 'validationMethod',
    label: 'Validation Method',
    type: 'select',
    required: true,
    options: [
      { value: 'ATTESTATION', label: 'Client Attestation' },
      { value: 'API_VERIFICATION', label: 'API Verification' },
      { value: 'EVIDENCE_UPLOAD', label: 'Evidence Upload' },
      { value: 'OAUTH_CALLBACK', label: 'OAuth Callback' }
    ]
  });

  fields.push({
    name: 'notes',
    label: 'Notes (optional)',
    type: 'textarea',
    required: false,
    placeholder: 'Additional context for this access item...'
  });

  return fields;
}

// ─── Request Wizard Fields ───────────────────────────────────────────────────
// Fields that appear when creating an access request for a specific client

export function getRequestWizardFields(accessItem, client) {
  const fields = [];
  const strategy = accessItem.humanIdentityStrategy;

  // For CLIENT_DEDICATED: Generate and preview identity
  if (strategy === HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED) {
    const template = accessItem.namingTemplate || '{clientSlug}-{platformKey}@youragency.com';
    const clientSlug = client?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'client';
    const platformKey = accessItem.platformKey || 'platform';
    const generatedEmail = template
      .replace('{clientSlug}', clientSlug)
      .replace('{platformKey}', platformKey);
    
    fields.push({
      name: 'generatedIdentityPreview',
      type: 'preview',
      label: 'Generated Identity',
      value: generatedEmail,
      helpText: 'This identity will be created/used for this client'
    });
  }

  // For INDIVIDUAL_USERS: Select invitees
  if (strategy === HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS) {
    fields.push({
      name: 'inviteeEmails',
      label: 'Invitee Email(s)',
      type: 'email-multi',
      required: true,
      placeholder: 'Enter email addresses to invite',
      helpText: 'Select which agency users should be invited to this client'
    });
  }

  // For AGENCY_GROUP: Just show the static email
  if (strategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
    fields.push({
      name: 'agencyGroupPreview',
      type: 'preview',
      label: 'Agency Group',
      value: accessItem.agencyGroupEmail,
      helpText: 'This group email will be invited'
    });
  }

  // For Integration: Show which integration identity is used
  if (accessItem.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE) {
    fields.push({
      name: 'integrationIdentityPreview',
      type: 'preview',
      label: 'Integration Identity',
      value: accessItem.integrationIdentityId,
      helpText: 'This service account/API will be used (no checkout required)'
    });
  }

  return fields;
}

// ─── Client Onboarding Fields ────────────────────────────────────────────────
// Fields that appear during client onboarding (asset selection)

export function getOnboardingFields(accessRequestItem, platform) {
  const fields = [];
  const platformName = platform?.name?.toLowerCase() || '';

  // Always show the identity they need to grant access to
  fields.push({
    name: 'identityToGrant',
    type: 'display',
    label: 'Identity to Grant Access',
    value: accessRequestItem.resolvedIdentity || accessRequestItem.agencyData?.agencyEmail
  });

  // Asset selection based on platform and instructions
  const assetFields = getAssetFieldsForPlatform(platformName, accessRequestItem.accessPattern);
  fields.push(...assetFields);

  return fields;
}

// Get asset selection fields based on platform type
export function getAssetFieldsForPlatform(platformName, accessPattern) {
  const fields = [];
  const name = platformName.toLowerCase();
  const pattern = (accessPattern || '').toLowerCase();

  // GA4 - Property selection
  if (name.includes('analytics') || name.includes('ga4')) {
    fields.push({
      name: 'propertyId',
      label: 'GA4 Property ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., properties/123456789 or 123456789',
      helpText: 'Find this in GA4 Admin → Property Settings'
    });
  }

  // Search Console - Property selection
  if (name.includes('search console')) {
    fields.push({
      name: 'propertyUrl',
      label: 'Search Console Property',
      type: 'text',
      required: true,
      placeholder: 'e.g., https://example.com or sc-domain:example.com',
      helpText: 'Enter the exact property URL as shown in Search Console'
    });
  }

  // GTM - Container selection
  if (name.includes('tag manager') || name.includes('gtm')) {
    fields.push({
      name: 'containerId',
      label: 'GTM Container ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., GTM-XXXXXX',
      helpText: 'Find this in GTM → Admin → Container Settings'
    });
  }

  // Meta/Facebook - Multiple asset types
  if (name.includes('meta') || name.includes('facebook')) {
    fields.push({
      name: 'metaAssets',
      label: 'Assets to Share',
      type: 'multi-select',
      required: true,
      options: [
        { value: 'ad_account', label: 'Ad Account' },
        { value: 'page', label: 'Facebook Page' },
        { value: 'pixel', label: 'Pixel' },
        { value: 'instagram', label: 'Instagram Account' }
      ],
      helpText: 'Select which assets to share with the agency'
    });
    fields.push({
      name: 'adAccountId',
      label: 'Ad Account ID (if sharing)',
      type: 'text',
      required: false,
      placeholder: 'e.g., act_123456789'
    });
  }

  // TikTok - Asset selection
  if (name.includes('tiktok')) {
    fields.push({
      name: 'tiktokAssets',
      label: 'Assets to Share',
      type: 'multi-select',
      required: true,
      options: [
        { value: 'ad_account', label: 'Ad Account' },
        { value: 'pixel', label: 'TikTok Pixel' }
      ]
    });
  }

  // DV360/Trade Desk - Advertiser selection
  if (name.includes('dv360') || name.includes('trade desk') || name.includes('stackadapt')) {
    fields.push({
      name: 'advertiserId',
      label: 'Advertiser ID',
      type: 'text',
      required: true,
      placeholder: 'Your advertiser ID',
      helpText: 'The advertiser account to link'
    });
  }

  // LinkedIn - Ad account selection
  if (name.includes('linkedin')) {
    fields.push({
      name: 'linkedinAdAccountId',
      label: 'LinkedIn Ad Account ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., 123456789'
    });
  }

  // Pinterest - Ad account selection
  if (name.includes('pinterest')) {
    fields.push({
      name: 'pinterestAdAccountId',
      label: 'Pinterest Ad Account ID',
      type: 'text',
      required: true,
      placeholder: 'Your Pinterest ad account ID'
    });
  }

  // Snapchat - Ad account selection
  if (name.includes('snapchat')) {
    fields.push({
      name: 'snapchatAdAccountId',
      label: 'Snapchat Ad Account ID',
      type: 'text',
      required: true
    });
  }

  // Merchant Center
  if (name.includes('merchant center')) {
    fields.push({
      name: 'merchantCenterId',
      label: 'Merchant Center ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., 123456789'
    });
  }

  // Looker Studio
  if (name.includes('looker') || name.includes('data studio')) {
    fields.push({
      name: 'reportUrl',
      label: 'Report URL to Share',
      type: 'text',
      required: true,
      placeholder: 'https://lookerstudio.google.com/reporting/...',
      helpText: 'The specific report or data source to share'
    });
  }

  // Power BI
  if (name.includes('power bi')) {
    fields.push({
      name: 'workspaceName',
      label: 'Workspace Name',
      type: 'text',
      required: true,
      placeholder: 'The Power BI workspace to share'
    });
  }

  // Generic asset field as fallback
  if (fields.length === 0) {
    fields.push({
      name: 'assetIdentifier',
      label: 'Asset to Share',
      type: 'text',
      required: false,
      placeholder: 'Account ID, property, or asset identifier',
      helpText: 'Enter the specific asset or account to grant access to'
    });
  }

  return fields;
}

// ─── Validation Rules ────────────────────────────────────────────────────────
// Server-side validation to prevent regressions

export function validateAccessItemPayload(payload, isUpdate = false) {
  const errors = [];

  // Rule 1: Admin AccessItems may not store client asset IDs/types
  const forbiddenAdminFields = ['assetType', 'assetId', 'propertyId', 'containerId', 'adAccountId'];
  for (const field of forbiddenAdminFields) {
    if (payload[field] || payload.agencyData?.[field]) {
      errors.push(`Admin config cannot include client asset field: ${field}. Assets are collected during client onboarding.`);
    }
  }

  // Rule 2: Human Named Invites may not store a static invite email unless strategy = AGENCY_GROUP
  if (payload.itemType === 'NAMED_INVITE') {
    const strategy = payload.humanIdentityStrategy;
    if (strategy !== HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
      if (payload.agencyData?.agencyEmail) {
        errors.push('Named Invite with CLIENT_DEDICATED or INDIVIDUAL_USERS strategy cannot have a static agencyEmail. Use namingTemplate or select users at request time.');
      }
    }
    if (strategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP && !payload.agencyGroupEmail) {
      errors.push('AGENCY_GROUP strategy requires agencyGroupEmail to be set.');
    }
  }

  // Rule 3: Integration identities must not be PAM checkout-based
  if (payload.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE) {
    if (payload.pamConfig || payload.itemType === 'SHARED_ACCOUNT_PAM') {
      errors.push('Integration (non-human) identities cannot be PAM checkout-based.');
    }
  }

  // Rule 4: SHARED_ACCOUNT_PAM requires ownership
  if (payload.itemType === 'SHARED_ACCOUNT_PAM') {
    if (!payload.pamConfig?.ownership) {
      errors.push('Shared Account PAM requires ownership (CLIENT_OWNED or AGENCY_OWNED).');
    }
  }

  // Rule 5: CLIENT_DEDICATED requires namingTemplate
  if (payload.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED) {
    if (!payload.namingTemplate) {
      errors.push('CLIENT_DEDICATED strategy requires a namingTemplate.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ─── Identity Generation ─────────────────────────────────────────────────────

export function generateClientDedicatedIdentity(template, client, platform) {
  const clientSlug = (client?.name || 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  
  const platformKey = (platform?.name || 'platform')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/google-/g, 'g')
    .replace(/analytics/g, 'analytics')
    .replace(/facebook/g, 'fb')
    .replace(/advertising/g, 'ads')
    .slice(0, 15);
  
  return (template || '{clientSlug}-{platformKey}@youragency.com')
    .replace('{clientSlug}', clientSlug)
    .replace('{platformKey}', platformKey);
}

// ─── Instructions Template ───────────────────────────────────────────────────

export function getInstructionsPreview(accessItem, platform) {
  const strategy = accessItem.humanIdentityStrategy;
  const itemType = accessItem.itemType;
  
  if (itemType === 'SHARED_ACCOUNT_PAM') {
    if (accessItem.pamConfig?.ownership === 'CLIENT_OWNED') {
      return 'Client will provide credentials during onboarding. Credentials will be encrypted and managed with checkout policy.';
    } else {
      return `Client will invite {agency identity} and assign the ${accessItem.role || 'specified'} role.`;
    }
  }
  
  if (itemType === 'PARTNER_DELEGATION') {
    return `Client will link their account to agency's partner/manager account. Agency identifiers configured separately.`;
  }
  
  if (itemType === 'PROXY_TOKEN' || accessItem.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE) {
    return `Integration identity will be granted access automatically or via API authorization.`;
  }
  
  switch (strategy) {
    case HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED:
      return `Client will invite {generated identity} and select assets to share during onboarding.`;
    case HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP:
      return `Client will invite ${accessItem.agencyGroupEmail || '{group email}'} and select assets to share during onboarding.`;
    case HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS:
      return `Invitees selected when generating request. Client will invite selected users and assign roles.`;
    default:
      return `Client will follow platform instructions to grant access.`;
  }
}
