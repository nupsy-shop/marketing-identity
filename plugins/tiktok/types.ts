export interface TikTokBusinessCenter { id: string; name: string; }
export interface TikTokAdAccount { advertiser_id: string; advertiser_name: string; status: string; }
export type TikTokRole = 'ADMIN' | 'OPERATOR' | 'ANALYST';
export const ROLE_MAPPING: Record<string, TikTokRole> = { admin: 'ADMIN', operator: 'OPERATOR', analyst: 'ANALYST' };
