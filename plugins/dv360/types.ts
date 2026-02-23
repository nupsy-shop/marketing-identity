export interface DV360Partner { partnerId: string; displayName: string; entityStatus: string; }
export interface DV360Advertiser { advertiserId: string; displayName: string; partnerId: string; entityStatus: string; }
export type DV360Role = 'ADMIN' | 'STANDARD' | 'READ_ONLY';
export const ROLE_MAPPING: Record<string, DV360Role> = { admin: 'ADMIN', standard: 'STANDARD', 'read-only': 'READ_ONLY' };
