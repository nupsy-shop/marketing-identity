'use client';

/**
 * Agency Platforms Page - Redesigned
 * Features:
 * - Platform logos from plugin manifests
 * - Search and filtering
 * - Improved visual hierarchy
 * - Confirmation dialogs for destructive actions
 * - Accessibility improvements
 * - Responsive design
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import PlatformLogo from '@/components/PlatformLogo';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function AgencyPlatformsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agencyPlatforms, setAgencyPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    platform: null,
    action: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agency/platforms');
      const data = await res.json();
      if (data.success) setAgencyPlatforms(data.data);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load platforms', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(agencyPlatforms.map(ap => ap.platform?.domain || ap.platform?.category || 'Other'));
    return ['all', ...Array.from(cats).sort()];
  }, [agencyPlatforms]);

  // Filtered and sorted platforms
  const filteredPlatforms = useMemo(() => {
    let result = [...agencyPlatforms];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ap => 
        ap.platform?.name?.toLowerCase().includes(query) ||
        ap.platform?.displayName?.toLowerCase().includes(query) ||
        ap.platform?.description?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(ap => 
        (ap.platform?.domain || ap.platform?.category) === categoryFilter
      );
    }
    
    // Status filter
    if (statusFilter === 'enabled') {
      result = result.filter(ap => ap.isEnabled);
    } else if (statusFilter === 'disabled') {
      result = result.filter(ap => !ap.isEnabled);
    } else if (statusFilter === 'unconfigured') {
      result = result.filter(ap => !ap.accessItems?.length);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.platform?.name || '').localeCompare(b.platform?.name || '');
        case 'category':
          return (a.platform?.domain || '').localeCompare(b.platform?.domain || '');
        case 'items':
          return (b.accessItems?.length || 0) - (a.accessItems?.length || 0);
        case 'status':
          return (b.isEnabled ? 1 : 0) - (a.isEnabled ? 1 : 0);
        default:
          return 0;
      }
    });
    
    return result;
  }, [agencyPlatforms, searchQuery, categoryFilter, statusFilter, sortBy]);

  const handleToggle = async (ap) => {
    try {
      const res = await fetch(`/api/agency/platforms/${ap.id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatforms(prev => prev.map(p => p.id === ap.id ? { ...p, isEnabled: data.data.isEnabled } : p));
        toast({
          title: data.data.isEnabled ? 'Platform Enabled' : 'Platform Disabled',
          description: `${ap.platform?.name} is now ${data.data.isEnabled ? 'enabled and available' : 'disabled'} for access requests.`,
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to toggle platform', variant: 'destructive' });
    }
  };

  const openRemoveDialog = (ap) => {
    setConfirmDialog({
      open: true,
      platform: ap,
      action: 'remove',
    });
  };

  const handleConfirmRemove = async () => {
    const ap = confirmDialog.platform;
    if (!ap) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agency/platforms/${ap.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatforms(prev => prev.filter(p => p.id !== ap.id));
        toast({ 
          title: 'Platform Removed', 
          description: `${ap.platform?.name} has been removed from your agency.` 
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove platform', variant: 'destructive' });
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, platform: null, action: null });
    }
  };

  const enabledCount = agencyPlatforms.filter(p => p.isEnabled).length;
  const unconfiguredCount = agencyPlatforms.filter(p => !p.accessItems?.length).length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/admin')}
                  aria-label="Go back to dashboard"
                >
                  <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i>
                  Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Agency Platforms</h1>
                  <p className="text-sm text-muted-foreground">
                    Configure platforms for client access requests
                  </p>
                </div>
              </div>
              <Button onClick={() => router.push('/admin/catalog')}>
                <i className="fas fa-plus mr-2" aria-hidden="true"></i>
                Add Platform
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          {loading ? (
            <div className="text-center py-16" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading platforms...</p>
            </div>
          ) : agencyPlatforms.length === 0 ? (
            <EmptyState onAddPlatform={() => router.push('/admin/catalog')} />
          ) : (
            <>
              {/* Stats Bar */}
              <div className="flex flex-wrap gap-4 mb-6">
                <StatsCard 
                  label="Total Platforms" 
                  value={agencyPlatforms.length} 
                  icon="fas fa-layer-group"
                />
                <StatsCard 
                  label="Enabled" 
                  value={enabledCount} 
                  icon="fas fa-check-circle"
                  color="text-green-600"
                />
                <StatsCard 
                  label="Needs Configuration" 
                  value={unconfiguredCount} 
                  icon="fas fa-exclamation-triangle"
                  color="text-amber-600"
                  hidden={unconfiguredCount === 0}
                />
              </div>

              {/* Search and Filters */}
              <Card className="mb-6">
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                      <Label htmlFor="search" className="sr-only">Search platforms</Label>
                      <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true"></i>
                        <Input
                          id="search"
                          placeholder="Search platforms..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                          aria-label="Search platforms by name or description"
                        />
                      </div>
                    </div>
                    
                    {/* Category Filter */}
                    <div className="w-full md:w-48">
                      <Label htmlFor="category-filter" className="sr-only">Filter by category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="category-filter" aria-label="Filter by category">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                              {cat === 'all' ? 'All Categories' : cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="w-full md:w-40">
                      <Label htmlFor="status-filter" className="sr-only">Filter by status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="status-filter" aria-label="Filter by status">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                          <SelectItem value="unconfigured">Unconfigured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Sort */}
                    <div className="w-full md:w-40">
                      <Label htmlFor="sort-by" className="sr-only">Sort by</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger id="sort-by" aria-label="Sort platforms">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                          <SelectItem value="items">Access Items</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Results Info */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  Showing {filteredPlatforms.length} of {agencyPlatforms.length} platform{agencyPlatforms.length !== 1 ? 's' : ''}
                </p>
                {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('all');
                      setStatusFilter('all');
                    }}
                    aria-label="Clear all filters"
                  >
                    <i className="fas fa-times mr-2" aria-hidden="true"></i>
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Platform List */}
              {filteredPlatforms.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <i className="fas fa-search text-4xl text-muted-foreground mb-4 block" aria-hidden="true"></i>
                    <h3 className="text-lg font-semibold mb-2">No platforms found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3" role="list" aria-label="Platform list">
                  {filteredPlatforms.map(ap => (
                    <PlatformRow
                      key={ap.id}
                      ap={ap}
                      onToggle={handleToggle}
                      onRemove={openRemoveDialog}
                      onConfigure={() => router.push(`/admin/platforms/${ap.id}`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog({ open: false, platform: null, action: null })}
          title={`Remove ${confirmDialog.platform?.platform?.name}?`}
          description={`This will remove ${confirmDialog.platform?.platform?.name} from your agency and delete all ${confirmDialog.platform?.accessItems?.length || 0} configured access items. This action cannot be undone.`}
          confirmLabel="Remove Platform"
          variant="destructive"
          icon="fas fa-trash"
          onConfirm={handleConfirmRemove}
          loading={actionLoading}
        />
      </div>
    </TooltipProvider>
  );
}

function StatsCard({ label, value, icon, color = 'text-primary', hidden = false }) {
  if (hidden) return null;
  
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border px-4 py-3">
      <i className={`${icon} ${color}`} aria-hidden="true"></i>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ onAddPlatform }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-layer-group text-2xl text-primary" aria-hidden="true"></i>
        </div>
        <h3 className="text-lg font-semibold mb-2">No platforms configured</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Add platforms from the catalog to start managing access for your clients.
          Once configured, you can create access requests using these platforms.
        </p>
        <Button onClick={onAddPlatform}>
          <i className="fas fa-plus mr-2" aria-hidden="true"></i>
          Browse Platform Catalog
        </Button>
      </CardContent>
    </Card>
  );
}

function PlatformRow({ ap, onToggle, onRemove, onConfigure }) {
  const itemCount = ap.accessItems?.length ?? 0;
  const hasItems = itemCount > 0;
  
  // Build platform object for logo component - use enriched data from API
  const platformForLogo = {
    ...ap.platform,
    logoPath: ap.platform?.logoPath || `/logos/${ap.platform?.platformKey || 'default'}.svg`,
  };

  return (
    <Card 
      className={`transition-all hover:shadow-md ${!ap.isEnabled ? 'opacity-70' : ''}`}
      role="listitem"
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <PlatformLogo platform={platformForLogo} size="lg" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold truncate">
                {ap.platform?.displayName || ap.platform?.name}
              </h3>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {ap.platform?.domain || ap.platform?.category}
              </Badge>
              {ap.platform?.tier === 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                      Tier 1
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>High-priority platform with full support</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
              {ap.platform?.description}
            </p>
            
            <div className="flex items-center gap-3 text-sm">
              {!hasItems ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
                  No access items configured
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <i className="fas fa-list-check" aria-hidden="true"></i>
                  {itemCount} access item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Toggle with integrated label */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Label htmlFor={`toggle-${ap.id}`} className="sr-only">
                    {ap.isEnabled ? 'Disable' : 'Enable'} {ap.platform?.name}
                  </Label>
                  <Switch 
                    id={`toggle-${ap.id}`}
                    checked={ap.isEnabled} 
                    onCheckedChange={() => onToggle(ap)}
                    aria-label={`${ap.isEnabled ? 'Disable' : 'Enable'} ${ap.platform?.name}`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{ap.isEnabled ? 'Click to disable' : 'Click to enable'}</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Configure Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onConfigure}
                  aria-label={`Configure ${ap.platform?.name}`}
                >
                  <i className="fas fa-cog mr-2" aria-hidden="true"></i>
                  Configure
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure access items and settings</p>
              </TooltipContent>
            </Tooltip>
            
            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost"
                  aria-label={`More actions for ${ap.platform?.name}`}
                >
                  <i className="fas fa-ellipsis-v" aria-hidden="true"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onConfigure}>
                  <i className="fas fa-cog mr-2 w-4" aria-hidden="true"></i>
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggle(ap)}>
                  <i className={`fas ${ap.isEnabled ? 'fa-toggle-off' : 'fa-toggle-on'} mr-2 w-4`} aria-hidden="true"></i>
                  {ap.isEnabled ? 'Disable' : 'Enable'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemove(ap)}
                  className="text-destructive focus:text-destructive"
                >
                  <i className="fas fa-trash mr-2 w-4" aria-hidden="true"></i>
                  Remove Platform
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
