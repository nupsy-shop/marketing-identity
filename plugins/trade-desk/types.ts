export interface TradeDeskPartner { partnerId: string; partnerName: string; }
export interface TradeDeskAdvertiser { advertiserId: string; advertiserName: string; partnerId: string; }
export type TradeDeskRole = 'ADMIN' | 'TRADER' | 'REPORTER';
export const ROLE_MAPPING: Record<string, TradeDeskRole> = { admin: 'ADMIN', trader: 'TRADER', reporter: 'REPORTER' };
