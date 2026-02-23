/**
 * Google Analytics 4 Plugin - Types
 * GA4-specific type definitions
 */

// ─── GA4 Account Structures ─────────────────────────────────────────────────

export interface GA4Account {
  name: string; // Format: accounts/{account_id}
  createTime: string;
  updateTime: string;
  displayName: string;
  regionCode?: string;
}

export interface GA4Property {
  name: string; // Format: properties/{property_id}
  parent?: string; // Format: accounts/{account_id}
  createTime: string;
  updateTime: string;
  displayName: string;
  industryCategory?: string;
  timeZone: string;
  currencyCode: string;
  serviceLevel?: 'GOOGLE_ANALYTICS_STANDARD' | 'GOOGLE_ANALYTICS_360';
  deleteTime?: string;
  expireTime?: string;
}

export interface GA4DataStream {
  name: string; // Format: properties/{property_id}/dataStreams/{stream_id}
  type: 'WEB_DATA_STREAM' | 'ANDROID_APP_DATA_STREAM' | 'IOS_APP_DATA_STREAM';
  displayName: string;
  createTime: string;
  updateTime: string;
  webStreamData?: {
    measurementId: string;
    firebaseAppId?: string;
    defaultUri: string;
  };
  androidAppStreamData?: {
    firebaseAppId: string;
    packageName: string;
  };
  iosAppStreamData?: {
    firebaseAppId: string;
    bundleId: string;
  };
}

// ─── GA4 User Management ────────────────────────────────────────────────────

export interface GA4AccessBinding {
  name?: string; // Format: properties/{property_id}/accessBindings/{binding_id}
  user?: string; // Email address
  roles: string[]; // e.g., ['roles/viewer', 'roles/analyst']
}

export type GA4Role = 
  | 'roles/viewer'
  | 'roles/analyst'
  | 'roles/editor'
  | 'roles/admin';

// Map from our role keys to GA4 roles
export const ROLE_MAPPING: Record<string, GA4Role> = {
  viewer: 'roles/viewer',
  analyst: 'roles/analyst',
  editor: 'roles/editor',
  administrator: 'roles/admin',
};

// ─── GA4 Reporting Types ───────────────────────────────────────────────────

export interface GA4RunReportRequest {
  property: string;
  dateRanges: GA4DateRange[];
  dimensions?: GA4Dimension[];
  metrics: GA4Metric[];
  dimensionFilter?: GA4FilterExpression;
  metricFilter?: GA4FilterExpression;
  offset?: number;
  limit?: number;
  orderBys?: GA4OrderBy[];
  currencyCode?: string;
  keepEmptyRows?: boolean;
}

export interface GA4DateRange {
  startDate: string;
  endDate: string;
  name?: string;
}

export interface GA4Dimension {
  name: string;
}

export interface GA4Metric {
  name: string;
}

export interface GA4FilterExpression {
  andGroup?: { expressions: GA4FilterExpression[] };
  orGroup?: { expressions: GA4FilterExpression[] };
  notExpression?: GA4FilterExpression;
  filter?: GA4Filter;
}

export interface GA4Filter {
  fieldName: string;
  stringFilter?: {
    value: string;
    matchType?: 'EXACT' | 'BEGINS_WITH' | 'ENDS_WITH' | 'CONTAINS' | 'FULL_REGEXP' | 'PARTIAL_REGEXP';
    caseSensitive?: boolean;
  };
  inListFilter?: {
    values: string[];
    caseSensitive?: boolean;
  };
  numericFilter?: {
    operation: 'EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';
    value: { int64Value?: string; doubleValue?: number };
  };
}

export interface GA4OrderBy {
  desc?: boolean;
  dimension?: { dimensionName: string; orderType?: 'ALPHANUMERIC' | 'CASE_INSENSITIVE_ALPHANUMERIC' | 'NUMERIC' };
  metric?: { metricName: string };
}

export interface GA4RunReportResponse {
  dimensionHeaders: { name: string }[];
  metricHeaders: { name: string; type: string }[];
  rows: GA4Row[];
  rowCount?: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
}

export interface GA4Row {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

// ─── API Response Wrappers ─────────────────────────────────────────────────

export interface GA4ListAccountsResponse {
  accounts: GA4Account[];
  nextPageToken?: string;
}

export interface GA4ListPropertiesResponse {
  properties: GA4Property[];
  nextPageToken?: string;
}

export interface GA4ListDataStreamsResponse {
  dataStreams: GA4DataStream[];
  nextPageToken?: string;
}
