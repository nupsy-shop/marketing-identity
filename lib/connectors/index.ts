// Connector registry and factory

import { Platform } from '@/types';
import { BasePlatformConnector } from './base';
import { GoogleAdsConnector } from './google-ads';
import { ManualConnector } from './manual';

/**
 * Get the appropriate connector for a platform
 * This factory method returns the correct connector implementation
 * based on the platform's automation feasibility and access pattern
 */
export function getConnectorForPlatform(platform: Platform): BasePlatformConnector {
  // High automation platforms with API support
  if (platform.name === 'Google Ads' || platform.name === 'YouTube Ads') {
    return new GoogleAdsConnector(platform);
  }

  // TODO: Add more specific connectors for other high-automation platforms:
  // - Meta/Facebook Ads
  // - LinkedIn Ads
  // - TikTok Ads
  // - Snowflake
  // - HubSpot
  // etc.

  // Default to manual connector for all other platforms
  return new ManualConnector(platform);
}

export { BasePlatformConnector } from './base';
export { GoogleAdsConnector } from './google-ads';
export { ManualConnector } from './manual';
