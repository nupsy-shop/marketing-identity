/**
 * Modular Advertising Platform Plugin System
 * Generic Mapping Utilities
 */

import type { Account, ReportResult, ReportHeader, ReportRow } from '../types';

/**
 * Generic mapper function type
 */
export type MapperFn<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Map an array using a mapper function
 */
export function mapArray<TInput, TOutput>(
  items: TInput[],
  mapper: MapperFn<TInput, TOutput>
): TOutput[] {
  return items.map(mapper);
}

/**
 * Create a generic account from platform-specific data
 */
export function createAccount(
  id: string,
  name: string,
  options?: Partial<Account>
): Account {
  return {
    id,
    name,
    type: options?.type || 'account',
    parentId: options?.parentId,
    metadata: options?.metadata || {},
    isAccessible: options?.isAccessible ?? true,
    status: options?.status || 'active',
  };
}

/**
 * Create a report result from platform-specific data
 */
export function createReportResult(
  headers: ReportHeader[],
  rows: ReportRow[],
  options?: {
    totalRows?: number;
    summary?: Record<string, unknown>;
    currency?: string;
    timezone?: string;
  }
): ReportResult {
  return {
    headers,
    rows,
    totalRows: options?.totalRows || rows.length,
    summary: options?.summary,
    metadata: {
      generatedAt: new Date().toISOString(),
      currency: options?.currency,
      timezone: options?.timezone,
    },
  };
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Transform object keys from snake_case to camelCase
 */
export function transformKeysToCamel<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = transformKeysToCamel(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformKeysToCamel(item as Record<string, unknown>)
          : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

/**
 * Transform object keys from camelCase to snake_case
 */
export function transformKeysToSnake<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = transformKeysToSnake(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item =>
        typeof item === 'object' && item !== null
          ? transformKeysToSnake(item as Record<string, unknown>)
          : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  return result;
}

/**
 * Safely extract a nested value from an object
 */
export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return (current as T) ?? defaultValue;
}

/**
 * Parse numeric string values to numbers in report data
 */
export function parseNumericValues(row: Record<string, string>): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(row)) {
    const num = parseFloat(value);
    result[key] = isNaN(num) ? value : num;
  }
  return result;
}
