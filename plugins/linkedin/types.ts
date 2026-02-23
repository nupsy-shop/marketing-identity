export interface LinkedInAdAccount { id: string; name: string; status: string; currency: string; }
export type LinkedInRole = 'ACCOUNT_BILLING_ADMIN' | 'ACCOUNT_MANAGER' | 'CAMPAIGN_MANAGER' | 'VIEWER';
export const ROLE_MAPPING: Record<string, LinkedInRole> = { admin: 'ACCOUNT_BILLING_ADMIN', 'campaign-manager': 'CAMPAIGN_MANAGER', viewer: 'VIEWER' };
