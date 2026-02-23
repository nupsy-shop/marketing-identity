export interface PinterestBusiness { id: string; name: string; }
export interface PinterestAdAccount { id: string; name: string; currency: string; status: string; }
export type PinterestRole = 'ADMIN' | 'ANALYST' | 'CAMPAIGN_MANAGER';
export const ROLE_MAPPING: Record<string, PinterestRole> = { admin: 'ADMIN', analyst: 'ANALYST', 'campaign-manager': 'CAMPAIGN_MANAGER' };
