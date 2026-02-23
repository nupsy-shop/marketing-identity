export interface GAUAAccount { id: string; name: string; }
export interface GAUAProperty { id: string; name: string; websiteUrl: string; accountId: string; }
export interface GAUAView { id: string; name: string; propertyId: string; }
export type GAUARole = 'MANAGE_USERS' | 'EDIT' | 'COLLABORATE' | 'READ_AND_ANALYZE';
export const ROLE_MAPPING: Record<string, GAUARole> = { administrator: 'MANAGE_USERS', editor: 'EDIT', analyst: 'COLLABORATE', viewer: 'READ_AND_ANALYZE' };
