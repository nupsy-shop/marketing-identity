/**
 * Google Analytics 4 Plugin - Account Mapper
 * Maps GA4 account/property data to generic Account type
 */

import type { Account } from '../../common/types';
import type { GA4Account, GA4Property, GA4DataStream } from '../types';

/**
 * Map a GA4 account to generic Account format
 */
export function mapGA4Account(account: GA4Account): Account {
  const accountId = account.name.replace('accounts/', '');
  
  return {
    id: accountId,
    name: account.displayName,
    type: 'account',
    metadata: {
      resourceName: account.name,
      regionCode: account.regionCode,
      createTime: account.createTime,
      updateTime: account.updateTime,
    },
    isAccessible: true,
    status: 'active',
  };
}

/**
 * Map a GA4 property to generic Account format
 */
export function mapGA4Property(property: GA4Property): Account {
  const propertyId = property.name.replace('properties/', '');
  const parentId = property.parent?.replace('accounts/', '');
  
  return {
    id: propertyId,
    name: property.displayName,
    type: 'property',
    parentId,
    metadata: {
      resourceName: property.name,
      timeZone: property.timeZone,
      currencyCode: property.currencyCode,
      serviceLevel: property.serviceLevel,
      industryCategory: property.industryCategory,
      createTime: property.createTime,
      updateTime: property.updateTime,
    },
    isAccessible: !property.deleteTime,
    status: property.deleteTime ? 'inactive' : 'active',
  };
}

/**
 * Map a GA4 data stream to generic Account format
 */
export function mapGA4DataStream(stream: GA4DataStream): Account {
  // Extract IDs from resource name: properties/{property_id}/dataStreams/{stream_id}
  const parts = stream.name.split('/');
  const streamId = parts[parts.length - 1];
  const propertyId = parts[1];
  
  // Get the measurement ID or app ID based on stream type
  let measurementId: string | undefined;
  if (stream.webStreamData) {
    measurementId = stream.webStreamData.measurementId;
  } else if (stream.androidAppStreamData) {
    measurementId = stream.androidAppStreamData.firebaseAppId;
  } else if (stream.iosAppStreamData) {
    measurementId = stream.iosAppStreamData.firebaseAppId;
  }
  
  return {
    id: streamId,
    name: stream.displayName,
    type: 'data_stream',
    parentId: propertyId,
    metadata: {
      resourceName: stream.name,
      streamType: stream.type,
      measurementId,
      webStreamData: stream.webStreamData,
      androidAppStreamData: stream.androidAppStreamData,
      iosAppStreamData: stream.iosAppStreamData,
      createTime: stream.createTime,
      updateTime: stream.updateTime,
    },
    isAccessible: true,
    status: 'active',
  };
}

/**
 * Map multiple GA4 accounts to generic format
 */
export function mapGA4Accounts(accounts: GA4Account[]): Account[] {
  return accounts.map(mapGA4Account);
}

/**
 * Map multiple GA4 properties to generic format
 */
export function mapGA4Properties(properties: GA4Property[]): Account[] {
  return properties.map(mapGA4Property);
}

/**
 * Map multiple GA4 data streams to generic format
 */
export function mapGA4DataStreams(streams: GA4DataStream[]): Account[] {
  return streams.map(mapGA4DataStream);
}
