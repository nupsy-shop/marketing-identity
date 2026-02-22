// Configured Apps store - tracks which platforms are configured for each client
import { v4 as uuidv4 } from 'uuid';

export interface ConfiguredAppItem {
  id: string;
  accessPattern: string;
  label: string; // e.g., "Ad Account #123", "Property A"
  role: string;
  assetType?: string;
  assetId?: string;
  credentials?: any; // Encrypted/secured credentials
  notes?: string;
}

export interface ConfiguredApp {
  id: string;
  clientId: string;
  platformId: string;
  isActive: boolean;
  items: ConfiguredAppItem[]; // Multiple items per platform (e.g., multiple ad accounts)
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage
export const configuredApps: ConfiguredApp[] = [];

// CRUD operations
export function addConfiguredApp(app: ConfiguredApp): ConfiguredApp {
  configuredApps.push(app);
  return app;
}

export function getConfiguredAppById(id: string): ConfiguredApp | undefined {
  return configuredApps.find(a => a.id === id);
}

export function getConfiguredAppsByClientId(clientId: string): ConfiguredApp[] {
  return configuredApps.filter(a => a.clientId === clientId);
}

export function getConfiguredApp(clientId: string, platformId: string): ConfiguredApp | undefined {
  return configuredApps.find(a => a.clientId === clientId && a.platformId === platformId);
}

export function updateConfiguredApp(id: string, updates: Partial<ConfiguredApp>): ConfiguredApp | undefined {
  const app = getConfiguredAppById(id);
  if (app) {
    Object.assign(app, updates, { updatedAt: new Date() });
  }
  return app;
}

export function removeConfiguredApp(id: string): boolean {
  const index = configuredApps.findIndex(a => a.id === id);
  if (index !== -1) {
    configuredApps.splice(index, 1);
    return true;
  }
  return false;
}

export function toggleConfiguredAppStatus(id: string): ConfiguredApp | undefined {
  const app = getConfiguredAppById(id);
  if (app) {
    app.isActive = !app.isActive;
    app.updatedAt = new Date();
  }
  return app;
}
