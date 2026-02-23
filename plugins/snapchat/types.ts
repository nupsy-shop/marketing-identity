export interface SnapchatOrganization { id: string; name: string; }
export interface SnapchatAdAccount { id: string; name: string; status: string; currency: string; }
export type SnapchatRole = 'ADMIN' | 'CAMPAIGN_MANAGER' | 'ANALYST';
export const ROLE_MAPPING: Record<string, SnapchatRole> = { admin: 'ADMIN', 'campaign-manager': 'CAMPAIGN_MANAGER', analyst: 'ANALYST' };
