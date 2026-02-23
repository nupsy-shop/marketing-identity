export interface SalesforceOrg { id: string; name: string; instanceUrl: string; }
export interface SalesforceUser { id: string; username: string; email: string; profileId: string; isActive: boolean; }
export type SalesforceProfile = 'System Administrator' | 'Marketing User' | 'Standard User' | 'Read Only';
export const ROLE_MAPPING: Record<string, SalesforceProfile> = { 'system-admin': 'System Administrator', 'marketing-user': 'Marketing User', 'standard-user': 'Standard User', 'read-only': 'Read Only' };
