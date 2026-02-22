// Agency Platforms store
// Tracks which platforms the agency has added and configured at the agency level.
// AccessItems live here and can be selected for any client's access request.
import { v4 as uuidv4 } from 'uuid';

export interface AccessItem {
  id: string;
  accessPattern: string;
  patternLabel: string;
  label: string;
  role: string;
  assetType?: string;
  assetId?: string;
  notes?: string;
  createdAt: Date;
}

export interface AgencyPlatform {
  id: string;
  platformId: string;
  isEnabled: boolean;
  accessItems: AccessItem[];
  createdAt: Date;
  updatedAt: Date;
}

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

export function updateAccessItem(platformId: string, itemId: string, updates: Partial<AccessItem>): AgencyPlatform | undefined {
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
