// Agency Platforms store — agency-scoped, with full PAM (SharedAccount) support
import { v4 as uuidv4 } from 'uuid';

// ── PAM Configuration ─────────────────────────────────────────────────────────
export interface CheckoutPolicy {
  durationMinutes?: number;    // default 60
  requiresApproval?: boolean;  // default false
  reasonRequired?: boolean;    // default false
}

export interface RotationPolicy {
  trigger: 'onCheckin' | 'scheduled' | 'offboard' | 'manual';
  scheduleIntervalDays?: number;
}

export interface PamConfig {
  ownership: 'CLIENT_OWNED' | 'AGENCY_OWNED';
  grantMethod: 'CREDENTIAL_HANDOFF' | 'INVITE_AGENCY_IDENTITY';

  // Common
  username?: string;
  secretRef?: string;

  // CLIENT_OWNED specific
  requiresDedicatedAgencyLogin?: boolean;

  // AGENCY_OWNED specific
  agencyIdentityEmail?: string;
  roleTemplate?: string;
  provisioningSource?: 'INTERNAL_DIRECTORY' | 'OKTA' | 'MANUAL';

  // Shared policies
  checkoutPolicy?: CheckoutPolicy;
  rotationPolicy?: RotationPolicy;
  sessionMode?: 'REVEAL';
}

// ── Dynamic Agency Data Fields (from Excel "Data to collect") ────────────────
export interface AgencyDataFields {
  // Manager/MCC IDs
  managerAccountId?: string;        // Google Ads MCC, Microsoft Ads Manager
  businessManagerId?: string;       // Meta BM ID, Pinterest BM ID, LinkedIn BM ID
  businessCenterId?: string;        // TikTok BC ID, Snapchat BC ID
  seatId?: string;                  // DV360, TTD, StackAdapt seats
  
  // User/Group identities
  agencyEmail?: string;             // Named invite email
  serviceAccountEmail?: string;     // Service account for automated access
  ssoGroupName?: string;            // SSO/SCIM group name
  
  // API credentials
  apiKey?: string;
  apiSecret?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  
  // Platform-specific
  verificationToken?: string;       // Site verification
  shopifyPartnerId?: string;        // Shopify partner ID
  
  // Generic fallback
  agencyIdentity?: string;          // Catch-all for unmapped platforms
  
  // Shared Account (PAM) specific
  sharedAccountLabel?: string;
}

// ── AccessItem ────────────────────────────────────────────────────────────────
export type AccessItemType =
  | 'NAMED_INVITE'
  | 'PARTNER_DELEGATION'
  | 'GROUP_ACCESS'
  | 'PROXY_TOKEN'
  | 'SHARED_ACCOUNT_PAM';

export interface AccessItem {
  id: string;
  itemType: AccessItemType;
  accessPattern: string;
  patternLabel: string;
  label: string;
  role: string;
  notes?: string;
  pamConfig?: PamConfig;
  
  // Dynamic agency data fields (from Excel)
  agencyData?: AgencyDataFields;
  
  // Instructions from Excel (stored for reference)
  clientInstructions?: string;
  
  createdAt: Date;
}

// ── AgencyPlatform ────────────────────────────────────────────────────────────
export interface AgencyPlatform {
  id: string;
  platformId: string;
  isEnabled: boolean;
  accessItems: AccessItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ── In-memory store ───────────────────────────────────────────────────────────
const agencyPlatforms: AgencyPlatform[] = [];

export function getAllAgencyPlatforms(): AgencyPlatform[] {
  return agencyPlatforms;
}

export function getAgencyPlatformById(id: string): AgencyPlatform | undefined {
  return agencyPlatforms.find(p => p.id === id);
}

export function getAgencyPlatformByPlatformId(platformId: string): AgencyPlatform | undefined {
  return agencyPlatforms.find(p => p.platformId === platformId);
}

export function addAgencyPlatform(platform: AgencyPlatform): AgencyPlatform {
  agencyPlatforms.push(platform);
  return platform;
}

export function updateAgencyPlatform(id: string, updates: Partial<AgencyPlatform>): AgencyPlatform | undefined {
  const platform = agencyPlatforms.find(p => p.id === id);
  if (platform) {
    Object.assign(platform, { ...updates, updatedAt: new Date() });
  }
  return platform;
}

export function addAccessItem(platformId: string, item: AccessItem): AgencyPlatform | undefined {
  const platform = agencyPlatforms.find(p => p.id === platformId);
  if (platform) {
    platform.accessItems.push(item);
    platform.updatedAt = new Date();
  }
  return platform;
}

export function removeAccessItem(platformId: string, itemId: string): AgencyPlatform | undefined {
  const platform = agencyPlatforms.find(p => p.id === platformId);
  if (platform) {
    platform.accessItems = platform.accessItems.filter(i => i.id !== itemId);
    platform.updatedAt = new Date();
  }
  return platform;
}

export function updateAccessItem(
  platformId: string,
  itemId: string,
  updates: Partial<AccessItem>
): AgencyPlatform | undefined {
  const platform = agencyPlatforms.find(p => p.id === platformId);
  if (platform) {
    const item = platform.accessItems.find(i => i.id === itemId);
    if (item) Object.assign(item, updates);
    platform.updatedAt = new Date();
  }
  return platform;
}

export function removeAgencyPlatform(id: string): boolean {
  const index = agencyPlatforms.findIndex(p => p.id === id);
  if (index !== -1) {
    agencyPlatforms.splice(index, 1);
    return true;
  }
  return false;
}

export function toggleAgencyPlatformStatus(id: string): AgencyPlatform | undefined {
  const platform = agencyPlatforms.find(p => p.id === id);
  if (platform) {
    platform.isEnabled = !platform.isEnabled;
    platform.updatedAt = new Date();
  }
  return platform;
}
