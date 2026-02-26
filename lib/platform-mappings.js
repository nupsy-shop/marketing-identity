/**
 * Single Source of Truth for Platform Name/Key/Slug Mappings
 *
 * All platform identity resolution goes through this module.
 * No other file should define its own name→key or key→slug maps.
 */

const PLATFORM_DEFINITIONS = [
  { key: 'google-ads', names: ['google ads'], legacySlug: 'google-ads' },
  { key: 'meta', names: ['meta', 'facebook', 'meta business manager / facebook ads', 'facebook ads'], legacySlug: 'meta' },
  { key: 'ga4', names: ['ga4', 'google analytics / ga4', 'google analytics'], legacySlug: 'ga4' },
  { key: 'google-search-console', names: ['google search console', 'search console'], legacySlug: 'google-search-console' },
  { key: 'snowflake', names: ['snowflake'], legacySlug: 'snowflake' },
  { key: 'dv360', names: ['dv360', 'display & video 360', 'dv360 (display & video 360)'], legacySlug: 'dv360' },
  { key: 'trade-desk', names: ['the trade desk', 'trade desk'], legacySlug: 'trade-desk' },
  { key: 'tiktok', names: ['tiktok', 'tiktok ads'], legacySlug: 'tiktok' },
  { key: 'snapchat', names: ['snapchat', 'snapchat ads'], legacySlug: 'snapchat' },
  { key: 'linkedin', names: ['linkedin', 'linkedin ads'], legacySlug: 'linkedin' },
  { key: 'pinterest', names: ['pinterest', 'pinterest ads'], legacySlug: 'pinterest' },
  { key: 'hubspot', names: ['hubspot'], legacySlug: 'hubspot' },
  { key: 'salesforce', names: ['salesforce'], legacySlug: 'salesforce' },
  { key: 'gtm', names: ['google tag manager', 'gtm'], legacySlug: 'gtm' },
  { key: 'ga-ua', names: ['google analytics ua', 'universal analytics', 'google analytics (universal)', 'google analytics ua (legacy)'], legacySlug: 'ga-ua' },
  { key: 'amazon-ads', names: ['amazon ads'], legacySlug: 'amazon-ads' },
  { key: 'reddit-ads', names: ['reddit ads'], legacySlug: 'reddit-ads' },
  { key: 'microsoft-ads', names: ['microsoft ads', 'bing ads', 'microsoft ads (bing ads)'], legacySlug: 'microsoft-ads' },
  { key: 'spotify-ads', names: ['spotify ads'], legacySlug: 'spotify-ads' },
  { key: 'google-merchant-center', names: ['google merchant center'], legacySlug: 'google-merchant-center' },
  { key: 'shopify', names: ['shopify'], legacySlug: 'shopify' },
];

// Build name→key lookup (lowercase)
const NAME_TO_KEY = {};
for (const def of PLATFORM_DEFINITIONS) {
  for (const name of def.names) {
    NAME_TO_KEY[name.toLowerCase()] = def.key;
  }
}

// Build key→legacySlug lookup
const KEY_TO_SLUG = {};
for (const def of PLATFORM_DEFINITIONS) {
  KEY_TO_SLUG[def.key] = def.legacySlug;
}

/**
 * Resolve a display name to a platform key.
 * Tries exact match first, then substring match.
 * Falls back to kebab-casing the name.
 */
export function getPlatformKeyFromName(name) {
  if (!name) return null;
  const normalized = name.toLowerCase();

  // Exact match
  if (NAME_TO_KEY[normalized]) return NAME_TO_KEY[normalized];

  // Substring match (longest match wins to avoid false positives)
  let bestMatch = null;
  let bestLen = 0;
  for (const [nameLower, key] of Object.entries(NAME_TO_KEY)) {
    if (normalized.includes(nameLower) && nameLower.length > bestLen) {
      bestMatch = key;
      bestLen = nameLower.length;
    }
  }
  if (bestMatch) return bestMatch;

  return normalized.replace(/[^a-z0-9]+/g, '-');
}

/**
 * Get the DB catalog slug for a platform key.
 * Handles legacy slugs that differ from the plugin key.
 */
export function getSlugForPlatformKey(platformKey) {
  return KEY_TO_SLUG[platformKey] || platformKey;
}

export { PLATFORM_DEFINITIONS, NAME_TO_KEY, KEY_TO_SLUG };
