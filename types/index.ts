// Core type definitions for the Marketing Identity Platform

export type AccessPattern = '1' | '2' | '3' | '4' | '5' | '1 or 2' | '2 or 3' | '4 (Proxy)' | '1 (Partner Hub)' | '2 (Named Invites)' | '1 (Partner Hub) or 2' | '2 (Named Invites) or 4 (Proxy)' | '2 (Named Invites) or 5 (PAM)' | 'Varies';

export type AutomationFeasibility = 'High' | 'Medium' | 'Low' | 'Medium-High' | 'Low-Medium';

export type PlatformDomain = 'Paid Media' | 'Analytics' | 'CRM / RevOps / marketing automation' | 'Ecommerce' | 'SEO / search performance' | 'Email/SMS' | 'Data pipeline / warehouse' | 'Reporting / data connectors' | 'Web / content / creative' | 'Affiliate' | 'Retail Media' | 'DSP' | 'Influencer/Affiliate' | 'Ad ops / measurement tool' | 'Advertising platform' | 'SMS/MarTech' | 'MarTech' | 'Tagging' | 'Analytics / experimentation' | 'Email' | 'Retention/Reviews/Email' | 'SMS' | 'Data/Reporting' | 'Marketing tool';

export interface Platform {
  id: string;
  name: string;
  domain: PlatformDomain;
  accessPattern: AccessPattern;
  automationFeasibility: AutomationFeasibility;
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  oktaId?: string; // For future Okta integration
  createdAt: Date;
}

export interface PlatformAccount {
  id: string;
  platformId: string;
  clientId: string;
  accountIdentifier: string; // e.g., Google Ads MCC ID, email, etc.
  status: 'active' | 'pending' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

export interface Grant {
  id: string;
  userId: string;
  platformAccountId: string;
  role: string; // Platform-specific role (e.g., 'Admin', 'Standard', 'Viewer')
  grantedAt: Date;
  revokedAt?: Date;
}

export type PlatformStatus = 'pending' | 'validated' | 'failed';

export interface PlatformAccessStatus {
  platformId: string;
  status: PlatformStatus;
  validatedAt?: Date;
  notes?: string;
}

export interface AccessRequest {
  id: string;
  clientId: string;
  token: string; // Unique token for onboarding URL
  platformStatuses: PlatformAccessStatus[];
  createdBy: string; // User ID of admin who created this
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// API request/response types
export interface CreateClientRequest {
  name: string;
  email: string;
}

export interface CreateAccessRequestRequest {
  clientId: string;
  platformIds: string[];
}

export interface ValidatePlatformRequest {
  platformId: string;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
