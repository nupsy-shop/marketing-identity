export interface GTMAccount { accountId: string; name: string; }
export interface GTMContainer { containerId: string; name: string; publicId: string; accountId: string; }
export type GTMRole = 'admin' | 'publish' | 'approve' | 'edit' | 'read';
export const ROLE_MAPPING: Record<string, GTMRole> = { admin: 'admin', publish: 'publish', approve: 'approve', edit: 'edit', read: 'read' };
