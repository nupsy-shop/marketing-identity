export interface GSCProperty { siteUrl: string; permissionLevel: string; }
export type GSCRole = 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
export const ROLE_MAPPING: Record<string, GSCRole> = { owner: 'siteOwner', full: 'siteFullUser', restricted: 'siteRestrictedUser' };
