/**
 * Plugin Loader - Server-side plugin initialization
 * This file handles loading and registering all platform plugins
 */

import { PluginRegistry } from './registry';

// Import all plugins
import googleAdsPlugin from '@/plugins/google-ads';
import metaPlugin from '@/plugins/meta';
import ga4Plugin from '@/plugins/ga4';
import googleSearchConsolePlugin from '@/plugins/google-search-console';
import snowflakePlugin from '@/plugins/snowflake';
import dv360Plugin from '@/plugins/dv360';
import tradeDeskPlugin from '@/plugins/trade-desk';
import tiktokPlugin from '@/plugins/tiktok';
import snapchatPlugin from '@/plugins/snapchat';
import linkedinPlugin from '@/plugins/linkedin';
import pinterestPlugin from '@/plugins/pinterest';
import hubspotPlugin from '@/plugins/hubspot';
import salesforcePlugin from '@/plugins/salesforce';
import gtmPlugin from '@/plugins/gtm';
import gaUaPlugin from '@/plugins/ga-ua';
import amazonAdsPlugin from '@/plugins/amazon-ads';
import redditAdsPlugin from '@/plugins/reddit-ads';
import microsoftAdsPlugin from '@/plugins/microsoft-ads';
import spotifyAdsPlugin from '@/plugins/spotify-ads';
import googleMerchantCenterPlugin from '@/plugins/google-merchant-center';
import shopifyPlugin from '@/plugins/shopify';

// Register all plugins
const allPlugins = [
  googleAdsPlugin,
  metaPlugin,
  ga4Plugin,
  googleSearchConsolePlugin,
  snowflakePlugin,
  dv360Plugin,
  tradeDeskPlugin,
  tiktokPlugin,
  snapchatPlugin,
  linkedinPlugin,
  pinterestPlugin,
  hubspotPlugin,
  salesforcePlugin,
  gtmPlugin,
  gaUaPlugin,
  amazonAdsPlugin,
  redditAdsPlugin,
  microsoftAdsPlugin,
  spotifyAdsPlugin,
  googleMerchantCenterPlugin,
  shopifyPlugin,
];

let initialized = false;

export function initializePlugins() {
  if (initialized) return;
  
  for (const plugin of allPlugins) {
    PluginRegistry.register(plugin);
  }
  
  PluginRegistry.setInitialized();
  initialized = true;
  console.log(`Plugin system initialized with ${PluginRegistry.count()} plugins`);
}

// Export for convenience
export { PluginRegistry };
