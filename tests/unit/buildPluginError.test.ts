import { buildPluginError } from '@/lib/plugins/types';

describe('buildPluginError', () => {
  it('extracts message from a standard Error', () => {
    const err = new Error('something broke');
    const result = buildPluginError(err, 'ga4', 'grant');
    expect(result.message).toBe('something broke');
  });

  it('handles non-Error objects gracefully', () => {
    const result = buildPluginError('raw string', 'meta', 'verify');
    expect(result.message).toBe('Unknown error');
  });

  it('detects 403 as permission denied', () => {
    const err = new Error('Request failed with status 403');
    const result = buildPluginError(err, 'ga4', 'verify');
    expect(result.isPermissionDenied).toBe(true);
    expect(result.isNotFound).toBe(false);
  });

  it('detects 404 as not found', () => {
    const err = new Error('Request failed with status 404');
    const result = buildPluginError(err, 'gtm', 'revoke');
    expect(result.isNotFound).toBe(true);
    expect(result.isPermissionDenied).toBe(false);
  });

  it('detects 409 as conflict', () => {
    const err = new Error('Request failed with status 409');
    const result = buildPluginError(err, 'ga4', 'grant');
    expect(result.isConflict).toBe(true);
  });

  it('detects 400 as bad request', () => {
    const err = new Error('Request failed with status 400');
    const result = buildPluginError(err, 'ga4', 'grant');
    expect(result.isBadRequest).toBe(true);
  });

  it('parses JSON body.error.message when available', () => {
    const err = Object.assign(new Error('API Error'), {
      body: JSON.stringify({ error: { message: 'Detailed API error from Google' } }),
    });
    const result = buildPluginError(err, 'ga4', 'grant');
    expect(result.message).toBe('Detailed API error from Google');
  });

  it('falls back to error.message when body is not JSON', () => {
    const err = Object.assign(new Error('timeout'), { body: 'not json' });
    const result = buildPluginError(err, 'ga4', 'verify');
    expect(result.message).toBe('timeout');
    expect(result.body).toBe('not json');
  });

  it('detects "permission denied" in API detail (case insensitive)', () => {
    const err = Object.assign(new Error('oops'), {
      body: JSON.stringify({ error: { message: 'Permission Denied for resource' } }),
    });
    const result = buildPluginError(err, 'ga4', 'verify');
    expect(result.isPermissionDenied).toBe(true);
  });

  it('detects "not found" in API detail (case insensitive)', () => {
    const err = Object.assign(new Error('oops'), {
      body: JSON.stringify({ message: 'Resource Not Found' }),
    });
    const result = buildPluginError(err, 'ga4', 'verify');
    expect(result.isNotFound).toBe(true);
  });

  it('detects "already exists" in API detail as conflict', () => {
    const err = Object.assign(new Error('fail'), {
      body: JSON.stringify({ error: { message: 'Binding already exists' } }),
    });
    const result = buildPluginError(err, 'ga4', 'grant');
    expect(result.isConflict).toBe(true);
  });

  it('returns all false flags for generic errors', () => {
    const result = buildPluginError(new Error('something'), 'meta', 'grant');
    expect(result.isPermissionDenied).toBe(false);
    expect(result.isNotFound).toBe(false);
    expect(result.isConflict).toBe(false);
    expect(result.isBadRequest).toBe(false);
  });
});
