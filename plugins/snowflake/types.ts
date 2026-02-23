export interface SnowflakeAccount { accountName: string; region: string; cloudProvider: string; }
export interface SnowflakeUser { name: string; loginName: string; email: string; defaultRole: string; disabled: boolean; }
export interface SnowflakeRole { name: string; comment: string; }
export type SnowflakeSystemRole = 'ACCOUNTADMIN' | 'SYSADMIN' | 'SECURITYADMIN' | 'USERADMIN' | 'PUBLIC';
export const ROLE_MAPPING: Record<string, SnowflakeSystemRole | string> = { accountadmin: 'ACCOUNTADMIN', sysadmin: 'SYSADMIN', securityadmin: 'SECURITYADMIN', analyst: 'ANALYST_ROLE', service: 'SERVICE_ROLE' };
