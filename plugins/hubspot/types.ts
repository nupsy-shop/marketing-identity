export interface HubSpotPortal { portalId: number; name: string; }
export interface HubSpotUser { id: string; email: string; roleId: string; }
export type HubSpotRole = 'SUPER_ADMIN' | 'MARKETING' | 'SALES' | 'SERVICE';
export const ROLE_MAPPING: Record<string, HubSpotRole> = { 'super-admin': 'SUPER_ADMIN', marketing: 'MARKETING', sales: 'SALES', service: 'SERVICE' };
