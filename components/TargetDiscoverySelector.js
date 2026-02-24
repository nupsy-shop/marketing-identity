'use client';

/**
 * Target Discovery & Selection Component
 * 
 * A rich UI for discovering and selecting targets (accounts, properties, containers)
 * from connected platforms after OAuth authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Target type icons and colors
const TARGET_TYPE_CONFIG = {
  PROPERTY: { icon: 'fa-chart-line', color: 'blue', label: 'Property' },
  ACCOUNT: { icon: 'fa-building', color: 'slate', label: 'Account' },
  CONTAINER: { icon: 'fa-box', color: 'purple', label: 'Container' },
  AD_ACCOUNT: { icon: 'fa-ad', color: 'green', label: 'Ad Account' },
  MCC: { icon: 'fa-sitemap', color: 'orange', label: 'Manager Account' },
  SITE: { icon: 'fa-globe', color: 'teal', label: 'Site' },
  DEFAULT: { icon: 'fa-cube', color: 'gray', label: 'Target' }
};

function getTargetConfig(targetType) {
  return TARGET_TYPE_CONFIG[targetType] || TARGET_TYPE_CONFIG.DEFAULT;
}

/**
 * Individual Target Card Component
 */
function TargetCard({ target, isSelected, onSelect, isChild = false }) {
  const config = getTargetConfig(target.targetType);
  
  return (
    <div
      onClick={() => onSelect(target)}
      className={`
        relative p-3 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-transparent bg-white hover:border-slate-200 hover:shadow-sm'
        }
        ${isChild ? 'ml-6' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${isSelected ? 'bg-primary/20' : `bg-${config.color}-100`}
        `}>
          <i className={`fas ${config.icon} ${isSelected ? 'text-primary' : `text-${config.color}-600`}`}></i>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge 
              variant="outline" 
              className={`text-xs ${isSelected ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
            >
              {config.label}
            </Badge>
            {target.metadata?.isManager && (
              <Badge variant="secondary" className="text-xs">MCC</Badge>
            )}
          </div>
          <p className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
            {target.displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            ID: {target.externalId}
          </p>
          {target.metadata?.publicId && (
            <p className="text-xs text-muted-foreground">
              {target.metadata.publicId}
            </p>
          )}
        </div>
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <i className="fas fa-check text-white text-xs"></i>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Target List with Grouping
 */
function TargetList({ targets, selectedTarget, onSelect, searchQuery }) {
  // Filter targets by search query
  const filteredTargets = targets.filter(target => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      target.displayName?.toLowerCase().includes(query) ||
      target.externalId?.toLowerCase().includes(query) ||
      target.metadata?.publicId?.toLowerCase().includes(query)
    );
  });

  // Group targets by parent (for hierarchical display)
  const parentTargets = filteredTargets.filter(t => !t.parentExternalId);
  const childTargetsByParent = filteredTargets
    .filter(t => t.parentExternalId)
    .reduce((acc, t) => {
      if (!acc[t.parentExternalId]) acc[t.parentExternalId] = [];
      acc[t.parentExternalId].push(t);
      return acc;
    }, {});

  // Check if we have a flat list (no hierarchy)
  const isFlatList = parentTargets.length === filteredTargets.length;

  if (filteredTargets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <i className="fas fa-search text-2xl mb-2 opacity-50"></i>
        <p>No targets found matching "{searchQuery}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isFlatList ? (
        // Flat list
        filteredTargets.map(target => (
          <TargetCard
            key={target.externalId}
            target={target}
            isSelected={selectedTarget?.externalId === target.externalId}
            onSelect={onSelect}
          />
        ))
      ) : (
        // Hierarchical list
        parentTargets.map(parent => (
          <div key={parent.externalId}>
            <TargetCard
              target={parent}
              isSelected={selectedTarget?.externalId === parent.externalId}
              onSelect={onSelect}
            />
            {/* Children */}
            {childTargetsByParent[parent.externalId]?.map(child => (
              <TargetCard
                key={child.externalId}
                target={child}
                isSelected={selectedTarget?.externalId === child.externalId}
                onSelect={onSelect}
                isChild
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Main Target Discovery & Selector Component
 */
export default function TargetDiscoverySelector({
  platformKey,
  platformName,
  accessToken,
  tokenType = 'Bearer',
  initialTargets = [],
  selectedTarget: externalSelectedTarget,
  onTargetSelected,
  onTargetsDiscovered,
  autoDiscover = true,
  showSearch = true,
  maxHeight = '400px'
}) {
  const { toast } = useToast();
  const [targets, setTargets] = useState(initialTargets);
  const [selectedTarget, setSelectedTarget] = useState(externalSelectedTarget || null);
  const [discovering, setDiscovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasDiscovered, setHasDiscovered] = useState(initialTargets.length > 0);

  // Discover targets
  const discoverTargets = useCallback(async () => {
    if (!accessToken || !platformKey) return;
    
    setDiscovering(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/discover-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken,
          tokenType 
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const discoveredTargets = data.data?.targets || [];
        setTargets(discoveredTargets);
        setHasDiscovered(true);
        onTargetsDiscovered?.(discoveredTargets);
        
        // Auto-select if only one target
        if (discoveredTargets.length === 1 && !selectedTarget) {
          setSelectedTarget(discoveredTargets[0]);
          onTargetSelected?.(discoveredTargets[0]);
        }
        
        toast({ 
          title: 'Discovery Complete', 
          description: `Found ${discoveredTargets.length} accessible target${discoveredTargets.length !== 1 ? 's' : ''}.` 
        });
      } else {
        toast({
          title: 'Discovery Failed',
          description: data.error || 'Could not discover targets. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Target discovery error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to discover targets',
        variant: 'destructive'
      });
    } finally {
      setDiscovering(false);
    }
  }, [accessToken, platformKey, tokenType, selectedTarget, onTargetsDiscovered, onTargetSelected, toast]);

  // Auto-discover on mount if enabled and no initial targets
  useEffect(() => {
    if (autoDiscover && accessToken && !hasDiscovered && targets.length === 0) {
      discoverTargets();
    }
  }, [autoDiscover, accessToken, hasDiscovered, targets.length, discoverTargets]);

  // Handle target selection
  const handleSelect = (target) => {
    setSelectedTarget(target);
    onTargetSelected?.(target);
  };

  // No token yet
  if (!accessToken) {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
        <i className="fas fa-plug text-2xl text-slate-400 mb-2"></i>
        <p className="text-sm text-muted-foreground">
          Connect your {platformName} account first to discover available targets.
        </p>
      </div>
    );
  }

  // Discovering state
  if (discovering) {
    return (
      <div className="p-6 rounded-lg bg-blue-50 border border-blue-200">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <i className="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
          </div>
          <div className="text-center">
            <p className="font-medium text-blue-900">Discovering Targets...</p>
            <p className="text-sm text-blue-700">
              Finding accounts and properties you have access to in {platformName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No targets found
  if (hasDiscovered && targets.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex flex-col items-center gap-3 text-center">
          <i className="fas fa-exclamation-triangle text-3xl text-amber-500"></i>
          <div>
            <p className="font-medium text-amber-900">No Targets Found</p>
            <p className="text-sm text-amber-700 mt-1">
              We couldn't find any accounts or properties in your {platformName} account.
              This could mean you don't have access to any, or the OAuth permissions were limited.
            </p>
          </div>
          <Button onClick={discoverTargets} variant="outline" size="sm" className="mt-2">
            <i className="fas fa-redo mr-2"></i>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Haven't discovered yet - show button
  if (!hasDiscovered) {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Discover Available Targets</p>
            <p className="text-sm text-muted-foreground">
              Find accounts, properties, or containers you can grant access to.
            </p>
          </div>
          <Button onClick={discoverTargets} variant="outline">
            <i className="fas fa-search mr-2"></i>
            Discover
          </Button>
        </div>
      </div>
    );
  }

  // Show target list
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">Select Target</p>
          <p className="text-sm text-muted-foreground">
            {targets.length} target{targets.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={discoverTargets} variant="ghost" size="sm">
          <i className="fas fa-redo mr-1"></i>
          Refresh
        </Button>
      </div>
      
      {/* Search (if many targets) */}
      {showSearch && targets.length > 5 && (
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
          <Input
            placeholder="Search targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
      
      {/* Target List */}
      <div 
        className="overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2"
        style={{ maxHeight }}
      >
        <TargetList
          targets={targets}
          selectedTarget={selectedTarget}
          onSelect={handleSelect}
          searchQuery={searchQuery}
        />
      </div>
      
      {/* Selected target summary */}
      {selectedTarget && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <i className={`fas ${getTargetConfig(selectedTarget.targetType).icon} text-primary`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  Selected: {selectedTarget.displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedTarget.targetType} • ID: {selectedTarget.externalId}
                </p>
              </div>
              <i className="fas fa-check-circle text-primary"></i>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { TargetCard, TargetList };
