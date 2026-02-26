import { resolveNativeRole } from '@/lib/plugins/types';

const GA4_ROLE_MAP = {
  administrator: 'predefinedRoles/administrator',
  editor: 'predefinedRoles/editor',
  analyst: 'predefinedRoles/analyst',
  viewer: 'predefinedRoles/viewer',
};

describe('resolveNativeRole', () => {
  it('resolves a known role key to the native string', () => {
    expect(resolveNativeRole('editor', GA4_ROLE_MAP)).toBe('predefinedRoles/editor');
  });

  it('is case-insensitive', () => {
    expect(resolveNativeRole('EDITOR', GA4_ROLE_MAP)).toBe('predefinedRoles/editor');
    expect(resolveNativeRole('Editor', GA4_ROLE_MAP)).toBe('predefinedRoles/editor');
  });

  it('trims whitespace', () => {
    expect(resolveNativeRole('  editor  ', GA4_ROLE_MAP)).toBe('predefinedRoles/editor');
  });

  it('returns null for an unknown role key', () => {
    expect(resolveNativeRole('superadmin', GA4_ROLE_MAP)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(resolveNativeRole('', GA4_ROLE_MAP)).toBeNull();
  });
});
