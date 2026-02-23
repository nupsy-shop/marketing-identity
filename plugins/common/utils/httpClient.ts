/**
 * Modular Advertising Platform Plugin System
 * Reusable HTTP Client with Retries & Logging
 */

import type { RequestOptions } from '../types';

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * HTTP Client with automatic retries, logging, and error handling
 */
export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders,
      },
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', url, data, options);
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const fullUrl = this.config.baseUrl + url;
    const headers = {
      ...this.config.defaultHeaders,
      ...options?.headers,
    };
    const timeout = options?.timeout || this.config.timeout;
    const maxRetries = options?.retries ?? this.config.maxRetries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (data !== undefined && method !== 'GET' && method !== 'HEAD') {
          fetchOptions.body = JSON.stringify(data);
        }

        const response = await fetch(fullUrl, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorBody
          );
        }

        // Handle empty responses
        const text = await response.text();
        if (!text) {
          return {} as T;
        }

        return JSON.parse(text) as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof HttpError && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Retry on network errors and server errors (5xx)
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.log(`[HttpClient] Retrying ${method} ${url} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * HTTP Error class
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Create a pre-configured HTTP client for a specific platform
 */
export function createPlatformClient(baseUrl: string, authToken?: string): HttpClient {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return new HttpClient({
    baseUrl,
    defaultHeaders: headers,
  });
}
