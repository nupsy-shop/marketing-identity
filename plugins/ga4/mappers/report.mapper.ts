/**
 * Google Analytics 4 Plugin - Report Mapper
 * Maps GA4 report responses to generic ReportResult format
 */

import type { ReportResult, ReportHeader, ReportRow } from '../../common/types';
import type { GA4RunReportResponse } from '../types';

/**
 * Map GA4 report response to generic ReportResult format
 */
export function mapGA4Report(response: GA4RunReportResponse): ReportResult {
  // Build headers
  const headers: ReportHeader[] = [];
  
  // Add dimension headers
  if (response.dimensionHeaders) {
    for (const header of response.dimensionHeaders) {
      headers.push({
        name: header.name,
        type: 'dimension',
        dataType: 'string',
      });
    }
  }
  
  // Add metric headers
  if (response.metricHeaders) {
    for (const header of response.metricHeaders) {
      headers.push({
        name: header.name,
        type: 'metric',
        dataType: mapMetricType(header.type),
      });
    }
  }

  // Get dimension and metric names for row mapping
  const dimensionNames = (response.dimensionHeaders || []).map(h => h.name);
  const metricNames = (response.metricHeaders || []).map(h => h.name);

  // Build rows
  const rows: ReportRow[] = [];
  
  if (response.rows) {
    for (const row of response.rows) {
      const dimensions: Record<string, string> = {};
      const metrics: Record<string, number> = {};

      // Map dimension values
      if (row.dimensionValues) {
        row.dimensionValues.forEach((val, idx) => {
          if (idx < dimensionNames.length) {
            dimensions[dimensionNames[idx]] = val.value;
          }
        });
      }

      // Map metric values
      if (row.metricValues) {
        row.metricValues.forEach((val, idx) => {
          if (idx < metricNames.length) {
            const numValue = parseFloat(val.value);
            metrics[metricNames[idx]] = isNaN(numValue) ? 0 : numValue;
          }
        });
      }

      rows.push({ dimensions, metrics });
    }
  }

  // Build result
  return {
    headers,
    rows,
    totalRows: response.rowCount || rows.length,
    metadata: {
      generatedAt: new Date().toISOString(),
      currency: response.metadata?.currencyCode,
      timezone: response.metadata?.timeZone,
    },
  };
}

/**
 * Map GA4 metric type to generic data type
 */
function mapMetricType(ga4Type: string): 'string' | 'number' | 'date' | 'currency' | 'percentage' {
  switch (ga4Type) {
    case 'TYPE_INTEGER':
    case 'TYPE_FLOAT':
    case 'TYPE_SECONDS':
    case 'TYPE_MILLISECONDS':
    case 'TYPE_MINUTES':
    case 'TYPE_HOURS':
    case 'TYPE_STANDARD':
      return 'number';
    case 'TYPE_CURRENCY':
      return 'currency';
    case 'TYPE_PERCENT':
      return 'percentage';
    default:
      return 'number';
  }
}

/**
 * Calculate summary statistics from report rows
 */
export function calculateSummary(rows: ReportRow[]): Record<string, unknown> {
  if (rows.length === 0) return {};

  const summary: Record<string, unknown> = {
    rowCount: rows.length,
  };

  // Get all metric names from the first row
  const firstRow = rows[0];
  const metricNames = Object.keys(firstRow.metrics);

  // Calculate totals for each metric
  for (const metricName of metricNames) {
    const values = rows.map(r => r.metrics[metricName] || 0);
    summary[`${metricName}_total`] = values.reduce((a, b) => a + b, 0);
    summary[`${metricName}_avg`] = summary[`${metricName}_total`] as number / values.length;
    summary[`${metricName}_min`] = Math.min(...values);
    summary[`${metricName}_max`] = Math.max(...values);
  }

  return summary;
}

/**
 * Convert report result to CSV format
 */
export function reportToCsv(result: ReportResult): string {
  const lines: string[] = [];

  // Header row
  const headerNames = result.headers.map(h => h.name);
  lines.push(headerNames.join(','));

  // Data rows
  for (const row of result.rows) {
    const values: string[] = [];
    for (const header of result.headers) {
      if (header.type === 'dimension') {
        values.push(escapeCSV(row.dimensions[header.name] || ''));
      } else {
        values.push(String(row.metrics[header.name] || 0));
      }
    }
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a value for CSV output
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
