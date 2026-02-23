'use client';

/**
 * PlatformLogo Component
 * Displays platform logo from plugin manifest with fallback to icon
 * Reads logoPath from plugin metadata, with fallback to Font Awesome icon
 */

import { useState } from 'react';
import Image from 'next/image';

export default function PlatformLogo({ 
  platform, // Platform object with logoPath, brandColor, icon, etc.
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  showFallbackIcon = true,
}) {
  const [imageError, setImageError] = useState(false);
  
  // Size mappings
  const sizeMap = {
    xs: { container: 'w-6 h-6', icon: 'text-xs', image: 24 },
    sm: { container: 'w-8 h-8', icon: 'text-sm', image: 32 },
    md: { container: 'w-10 h-10', icon: 'text-lg', image: 40 },
    lg: { container: 'w-12 h-12', icon: 'text-xl', image: 48 },
    xl: { container: 'w-16 h-16', icon: 'text-2xl', image: 64 },
  };
  
  const { container, icon: iconSize, image: imageSize } = sizeMap[size] || sizeMap.md;
  
  // Get logo path from plugin manifest or platform object
  const logoPath = platform?.logoPath || platform?.manifest?.logoPath;
  const fallbackIcon = platform?.icon || platform?.manifest?.icon || 'fas fa-cube';
  const brandColor = platform?.brandColor || platform?.manifest?.brandColor || '#6366F1';
  const displayName = platform?.displayName || platform?.name || 'Platform';
  
  // If no logo path or image failed to load, show icon fallback
  if (!logoPath || imageError) {
    if (!showFallbackIcon) {
      return null;
    }
    
    return (
      <div 
        className={`${container} rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ 
          backgroundColor: `${brandColor}15`,
          color: brandColor
        }}
        title={displayName}
        role="img"
        aria-label={`${displayName} logo`}
      >
        <i className={`${fallbackIcon} ${iconSize}`} aria-hidden="true"></i>
      </div>
    );
  }
  
  return (
    <div 
      className={`${container} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
      title={displayName}
      role="img"
      aria-label={`${displayName} logo`}
    >
      <Image
        src={logoPath}
        alt={`${displayName} logo`}
        width={imageSize}
        height={imageSize}
        className="object-contain"
        onError={() => setImageError(true)}
        priority={false}
      />
    </div>
  );
}

// Variant for inline text usage
export function PlatformLogoInline({ 
  platform,
  className = '',
}) {
  const [imageError, setImageError] = useState(false);
  
  const logoPath = platform?.logoPath || platform?.manifest?.logoPath;
  const fallbackIcon = platform?.icon || platform?.manifest?.icon || 'fas fa-cube';
  const brandColor = platform?.brandColor || platform?.manifest?.brandColor || '#6366F1';
  const displayName = platform?.displayName || platform?.name || 'Platform';
  
  if (!logoPath || imageError) {
    return (
      <i 
        className={`${fallbackIcon} ${className}`} 
        style={{ color: brandColor }}
        title={displayName}
        aria-hidden="true"
      ></i>
    );
  }
  
  return (
    <Image
      src={logoPath}
      alt={`${displayName} logo`}
      width={20}
      height={20}
      className={`inline-block ${className}`}
      onError={() => setImageError(true)}
      priority={false}
    />
  );
}
