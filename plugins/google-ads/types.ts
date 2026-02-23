/**
 * Google Ads Plugin - Types
 * Google Ads-specific type definitions
 */

// Customer/Account types
export interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
  testAccount: boolean;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  advertisingChannelType: string;
}

// Access types
export interface GoogleAdsAccessRole {
  customerId: string;
  emailAddress: string;
  accessRole: 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY';
}

export interface GoogleAdsManagerLink {
  resourceName: string;
  managerCustomer: string;
  clientCustomer: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REFUSED' | 'CANCELED';
}

// Role mapping
export type GoogleAdsRole = 'ADMIN' | 'STANDARD' | 'READ_ONLY' | 'EMAIL_ONLY';

export const ROLE_MAPPING: Record<string, GoogleAdsRole> = {
  admin: 'ADMIN',
  standard: 'STANDARD',
  'read-only': 'READ_ONLY',
  'email-only': 'EMAIL_ONLY',
};

// API Response types
export interface GoogleAdsListCustomersResponse {
  resourceNames: string[];
}

export interface GoogleAdsSearchResponse<T> {
  results: T[];
  nextPageToken?: string;
}
