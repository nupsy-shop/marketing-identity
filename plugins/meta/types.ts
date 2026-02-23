/**
 * Meta Plugin - Types
 */

export interface MetaBusinessManager {
  id: string;
  name: string;
  primary_page?: { id: string; name: string };
  created_time: string;
}

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
  business?: { id: string; name: string };
}

export interface MetaPage {
  id: string;
  name: string;
  category: string;
  access_token?: string;
}

export interface MetaPixel {
  id: string;
  name: string;
  code: string;
}

export type MetaRole = 'ADMIN' | 'ADVERTISER' | 'ANALYST' | 'EMPLOYEE';

export const ROLE_MAPPING: Record<string, MetaRole> = {
  admin: 'ADMIN',
  advertiser: 'ADVERTISER',
  analyst: 'ANALYST',
  employee: 'EMPLOYEE',
};
