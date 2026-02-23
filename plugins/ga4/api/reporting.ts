/**
 * Google Analytics 4 Plugin - Reporting API
 * Handles GA4 Data API calls for reporting
 */

import type { AuthResult } from '../../common/types';
import type { ReportQuery, ReportResult, ReportHeader, ReportRow } from '../../common/types';
import { HttpClient } from '../../common/utils/httpClient';
import type { GA4RunReportRequest, GA4RunReportResponse, GA4DateRange, GA4Dimension, GA4Metric, GA4FilterExpression } from '../types';

const GA4_DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';

/**
 * Create an authenticated HTTP client for GA4 Data API
 */
function createClient(auth: AuthResult): HttpClient {
  return new HttpClient({
    baseUrl: GA4_DATA_API_BASE,
    defaultHeaders: {
      'Authorization': `${auth.tokenType || 'Bearer'} ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Convert generic report query to GA4 format
 */
function buildGA4Request(propertyId: string, query: ReportQuery): GA4RunReportRequest {
  const dateRanges: GA4DateRange[] = [
    {
      startDate: query.startDate,
      endDate: query.endDate,
    },
  ];

  const dimensions: GA4Dimension[] | undefined = query.dimensions?.map(d => ({ name: d }));
  const metrics: GA4Metric[] = query.metrics.map(m => ({ name: m }));

  const request: GA4RunReportRequest = {
    property: `properties/${propertyId}`,
    dateRanges,
    metrics,
  };

  if (dimensions && dimensions.length > 0) {
    request.dimensions = dimensions;
  }

  if (query.limit) {
    request.limit = query.limit;
  }

  if (query.offset) {
    request.offset = query.offset;
  }

  // Convert filters
  if (query.filters && query.filters.length > 0) {
    request.dimensionFilter = buildFilterExpression(query.filters);
  }

  // Convert order by
  if (query.orderBy && query.orderBy.length > 0) {
    request.orderBys = query.orderBy.map(o => {
      if (query.metrics.includes(o.field)) {
        return {
          desc: o.direction === 'desc',
          metric: { metricName: o.field },
        };
      }
      return {
        desc: o.direction === 'desc',
        dimension: { dimensionName: o.field },
      };
    });
  }

  return request;
}

/**
 * Build GA4 filter expression from generic filters
 */
function buildFilterExpression(filters: ReportQuery['filters']): GA4FilterExpression | undefined {
  if (!filters || filters.length === 0) return undefined;

  if (filters.length === 1) {
    return { filter: buildSingleFilter(filters[0]) };
  }

  return {
    andGroup: {
      expressions: filters.map(f => ({ filter: buildSingleFilter(f) })),
    },
  };
}

function buildSingleFilter(filter: NonNullable<ReportQuery['filters']>[0]) {
  const baseFilter = { fieldName: filter.field };

  switch (filter.operator) {
    case 'equals':
      return {
        ...baseFilter,
        stringFilter: { value: String(filter.value), matchType: 'EXACT' as const },
      };
    case 'contains':
      return {
        ...baseFilter,
        stringFilter: { value: String(filter.value), matchType: 'CONTAINS' as const },
      };
    case 'in':
      return {
        ...baseFilter,
        inListFilter: { values: (filter.value as string[]).map(String) },
      };
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return {
        ...baseFilter,
        numericFilter: {
          operation: filter.operator === 'gt' ? 'GREATER_THAN' as const :
                     filter.operator === 'gte' ? 'GREATER_THAN_OR_EQUAL' as const :
                     filter.operator === 'lt' ? 'LESS_THAN' as const :
                     'LESS_THAN_OR_EQUAL' as const,
          value: { doubleValue: Number(filter.value) },
        },
      };
    default:
      return {
        ...baseFilter,
        stringFilter: { value: String(filter.value), matchType: 'EXACT' as const },
      };
  }
}

/**
 * Convert GA4 response to generic report result
 */
function convertGA4Response(response: GA4RunReportResponse): ReportResult {
  const headers: ReportHeader[] = [
    ...(response.dimensionHeaders || []).map(h => ({
      name: h.name,
      type: 'dimension' as const,
      dataType: 'string' as const,
    })),
    ...(response.metricHeaders || []).map(h => ({
      name: h.name,
      type: 'metric' as const,
      dataType: 'number' as const,
    })),
  ];

  const dimensionNames = (response.dimensionHeaders || []).map(h => h.name);
  const metricNames = (response.metricHeaders || []).map(h => h.name);

  const rows: ReportRow[] = (response.rows || []).map(row => {
    const dimensions: Record<string, string> = {};
    const metrics: Record<string, number> = {};

    (row.dimensionValues || []).forEach((val, idx) => {
      dimensions[dimensionNames[idx]] = val.value;
    });

    (row.metricValues || []).forEach((val, idx) => {
      metrics[metricNames[idx]] = parseFloat(val.value) || 0;
    });

    return { dimensions, metrics };
  });

  return {
    headers,
    rows,
    totalRows: response.rowCount,
    metadata: {
      generatedAt: new Date().toISOString(),
      currency: response.metadata?.currencyCode,
      timezone: response.metadata?.timeZone,
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Run a GA4 report using the generic query format
 */
export async function runReport(
  auth: AuthResult,
  query: ReportQuery
): Promise<ReportResult> {
  const client = createClient(auth);
  const propertyId = query.accountId; // accountId is the property ID for GA4
  const request = buildGA4Request(propertyId, query);

  const response = await client.post<GA4RunReportResponse>(
    `/properties/${propertyId}:runReport`,
    request
  );

  return convertGA4Response(response);
}

/**
 * Run a raw GA4 report request
 */
export async function runRawReport(
  auth: AuthResult,
  propertyId: string,
  request: GA4RunReportRequest
): Promise<GA4RunReportResponse> {
  const client = createClient(auth);
  return client.post<GA4RunReportResponse>(
    `/properties/${propertyId}:runReport`,
    request
  );
}

/**
 * Run a realtime report
 */
export async function runRealtimeReport(
  auth: AuthResult,
  propertyId: string,
  dimensions?: string[],
  metrics?: string[]
): Promise<ReportResult> {
  const client = createClient(auth);
  
  const request = {
    dimensions: dimensions?.map(d => ({ name: d })) || [],
    metrics: metrics?.map(m => ({ name: m })) || [{ name: 'activeUsers' }],
  };

  const response = await client.post<GA4RunReportResponse>(
    `/properties/${propertyId}:runRealtimeReport`,
    request
  );

  return convertGA4Response(response);
}
