'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function AgencyPlatformsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agencyPlatforms, setAgencyPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ap) => {
    try {
      const res = await fetch(`/api/agency/platforms/${ap.id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatforms(prev => prev.map(p => p.id === ap.id ? { ...p, isEnabled: data.data.isEnabled } : p));
        toast({
          title: data.data.isEnabled ? 'Platform enabled' : 'Platform disabled',
          description: `${ap.platform?.name} is now ${data.data.isEnabled ? 'enabled' : 'disabled'}`
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to toggle platform', variant: 'destructive' });
    }
  };

  const handleRemove = async (ap) => {
    if (!confirm(`Remove ${ap.platform?.name} from the agency? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/agency/platforms/${ap.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatforms(prev => prev.filter(p => p.id !== ap.id));
        toast({ title: 'Removed', description: `${ap.platform?.name} removed from agency` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove platform', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <i className="fas fa-arrow-left mr-2"></i>Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Agency Platforms</h1>
                <p className="text-sm text-muted-foreground">Platforms configured for use across all client requests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/admin/catalog')}>
                <i className="fas fa-plus mr-2"></i>Add from Catalog
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading platforms...</p>
          </div>
        ) : agencyPlatforms.length === 0 ? (
          <div className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <i className="fas fa-layer-group text-5xl text-muted-foreground mb-4 block"></i>
                <h3 className="text-lg font-semibold mb-2">No platforms added yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Browse the Platform Catalog to add the platforms your agency needs.
                  Once added, configure the access items here — then use them in any client request.
                </p>
                <Button onClick={() => router.push('/admin/catalog')}>
                  <i className="fas fa-plus mr-2"></i>
                  Browse Platform Catalog
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {agencyPlatforms.filter(p => p.isEnabled).length} of {agencyPlatforms.length} platform{agencyPlatforms.length !== 1 ? 's' : ''} enabled
              </p>
            </div>
            {agencyPlatforms.map(ap => (
              <AgencyPlatformRow
                key={ap.id}
                ap={ap}
                onToggle={handleToggle}
                onRemove={handleRemove}
                onConfigure={() => router.push(`/admin/platforms/${ap.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AgencyPlatformRow({ ap, onToggle, onRemove, onConfigure }) {
  const enabledItems = ap.accessItems?.length ?? 0;

  return (
    <Card className={`transition-all ${!ap.isEnabled ? 'opacity-70' : ''}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            {ap.platform?.iconName ? (
              <i className={`${ap.platform.iconName} text-xl text-primary`}></i>
            ) : (
              <i className="fas fa-cube text-xl text-primary"></i>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{ap.platform?.name}</h3>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {ap.platform?.domain}
              </Badge>
              {ap.platform?.tier === 1 && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                  Tier 1
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {enabledItems === 0 ? (
                <span className="text-amber-600 font-medium">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  No access items configured
                </span>
              ) : (
                <span>
                  <i className="fas fa-list-check mr-1"></i>
                  {enabledItems} access item{enabledItems !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{ap.isEnabled ? 'Enabled' : 'Disabled'}</span>
              <Switch checked={ap.isEnabled} onCheckedChange={() => onToggle(ap)} />
            </div>
            <Button size="sm" variant="outline" onClick={onConfigure}>
              <i className="fas fa-cog mr-2"></i>Configure
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(ap)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <i className="fas fa-trash"></i>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
