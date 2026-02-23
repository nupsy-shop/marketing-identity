'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import PlatformLogo from '@/components/PlatformLogo';

// Helper to get platform key from name
function getPlatformKeyFromName(name) {
  if (!name) return null;
  const normalized = name.toLowerCase();
  
  const keyMap = {
    'google ads': 'google-ads',
    'meta business manager / facebook ads': 'meta',
    'meta': 'meta',
    'facebook ads': 'meta',
    'google analytics / ga4': 'ga4',
    'google analytics': 'ga4',
    'ga4': 'ga4',
    'google search console': 'google-search-console',
    'snowflake': 'snowflake',
    'dv360': 'dv360',
    'dv360 (display & video 360)': 'dv360',
    'display & video 360': 'dv360',
    'the trade desk': 'trade-desk',
    'trade desk': 'trade-desk',
    'tiktok ads': 'tiktok',
    'tiktok': 'tiktok',
    'snapchat ads': 'snapchat',
    'snapchat': 'snapchat',
    'linkedin ads': 'linkedin',
    'linkedin': 'linkedin',
    'pinterest ads': 'pinterest',
    'pinterest': 'pinterest',
    'hubspot': 'hubspot',
    'salesforce': 'salesforce',
    'google tag manager': 'gtm',
    'gtm': 'gtm',
    'google analytics (universal)': 'ga-ua',
    'universal analytics': 'ga-ua',
  };
  
  return keyMap[normalized] || normalized.replace(/[^a-z0-9]+/g, '-');
}

function AppCatalogContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [agencyPlatforms, setAgencyPlatforms] = useState([]); // platforms already added to agency
  const [pluginManifests, setPluginManifests] = useState({}); // plugin manifests by key
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // platformId being added
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedTier, setSelectedTier] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [platformsRes, agencyRes, pluginsRes] = await Promise.all([
        fetch('/api/platforms?clientFacing=true'),
        fetch('/api/agency/platforms'),
        fetch('/api/plugins')
      ]);
      const platformsData = await platformsRes.json();
      const agencyData = await agencyRes.json();
      const pluginsData = await pluginsRes.json();
      
      if (platformsData.success) setPlatforms(platformsData.data);
      if (agencyData.success) setAgencyPlatforms(agencyData.data);
      
      // Build a map of plugin manifests by key
      if (pluginsData.success && pluginsData.data) {
        const manifestMap = {};
        pluginsData.data.forEach(plugin => {
          if (plugin.manifest) {
            manifestMap[plugin.manifest.platformKey] = plugin.manifest;
          }
        });
        setPluginManifests(manifestMap);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToAgency = async (platform) => {
    setAdding(platform.id);
    try {
      const res = await fetch('/api/agency/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: platform.id })
      });
      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Added to Agency!',
          description: `${platform.name} is ready to configure. Setting up access items now...`
        });
        // Navigate to the configuration page
        router.push(`/admin/platforms/${data.data.id}`);
      } else if (res.status === 409) {
        // Already added — navigate to existing config
        const existingId = data.data?.id;
        toast({
          title: 'Already added',
          description: `${platform.name} is already in your agency. Opening configuration...`
        });
        if (existingId) router.push(`/admin/platforms/${existingId}`);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add platform', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add platform', variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  };

  // Build a Set of added platformIds for quick lookup
  const addedPlatformIds = new Set(agencyPlatforms.map(ap => ap.platformId));

  // Filter
  const filteredPlatforms = platforms.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedDomain && p.domain !== selectedDomain) return false;
    if (selectedTier && p.tier !== parseInt(selectedTier)) return false;
    return true;
  });

  // Group by domain
  const groupedPlatforms = filteredPlatforms.reduce((acc, p) => {
    const domain = p.domain || 'Other';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(p);
    return acc;
  }, {});

  const domains = Array.from(new Set(platforms.map(p => p.domain))).sort();
  const tier1Count = platforms.filter(p => p.tier === 1).length;
  const tier2Count = platforms.filter(p => p.tier === 2).length;
  const oauthCount = platforms.filter(p => p.oauthSupported).length;

  const getDomainIcon = (domain) => {
    const icons = {
      'Paid Search': 'fas fa-search',
      'Paid Social': 'fas fa-share-nodes',
      'Analytics': 'fas fa-chart-bar',
      'SEO & Analytics': 'fas fa-chart-line',
      'Tagging & Tracking': 'fas fa-tag',
      'Video Advertising': 'fab fa-youtube',
      'Ecommerce': 'fas fa-shopping-bag',
      'Ecommerce & Retail': 'fas fa-shopping-cart',
      'CRM & Marketing Automation': 'fas fa-users-gear',
      'CRM & Revenue Operations': 'fas fa-handshake',
      'Email Marketing': 'fas fa-envelope',
      'Email & SMS Marketing': 'fas fa-comment-dots',
      'SMS & Email Marketing': 'fas fa-sms',
      'Marketing Automation': 'fas fa-robot',
      'Programmatic Advertising': 'fas fa-ad',
      'Retail Media': 'fab fa-amazon',
      'Data & Analytics': 'fas fa-database'
    };
    return icons[domain] || 'fas fa-cube';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <i className="fas fa-arrow-left mr-2"></i>Back to Dashboard
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-2xl font-bold">Platform Catalog</h1>
                <p className="text-sm text-muted-foreground">Browse and add platforms to your agency</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/admin/platforms')}>
                <i className="fas fa-layer-group mr-2"></i>
                My Platforms ({agencyPlatforms.length})
              </Button>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {platforms.length} Platforms
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Platforms', value: platforms.length, icon: 'fas fa-layer-group', color: 'blue' },
            { label: 'Tier 1 (Full Asset)', value: tier1Count, icon: 'fas fa-star', color: 'purple' },
            { label: 'Tier 2 (Platform)', value: tier2Count, icon: 'fas fa-cubes', color: 'green' },
            { label: 'Added to Agency', value: agencyPlatforms.length, icon: 'fas fa-check-circle', color: 'orange' }
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full bg-${stat.color}-100 flex items-center justify-center`}>
                    <i className={`${stat.icon} text-2xl text-${stat.color}-600`}></i>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Platforms</CardTitle>
            <CardDescription>Narrow down by category or tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search platforms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Domain</label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 bg-background text-sm"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                >
                  <option value="">All Domains</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tier</label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 bg-background text-sm"
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                >
                  <option value="">All Tiers</option>
                  <option value="1">Tier 1 — Full Asset</option>
                  <option value="2">Tier 2 — Platform</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <strong>{filteredPlatforms.length}</strong> of <strong>{platforms.length}</strong> platforms
          </p>
          {(searchTerm || selectedDomain || selectedTier) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setSelectedDomain(''); setSelectedTier(''); }}>
              <i className="fas fa-times mr-1"></i>Clear filters
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading platforms...</p>
          </div>
        ) : filteredPlatforms.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <i className="fas fa-search text-4xl text-muted-foreground mb-4 block"></i>
              <h3 className="font-semibold mb-2">No platforms found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedPlatforms).sort(([a], [b]) => a.localeCompare(b)).map(([domain, domainPlatforms]) => (
              <div key={domain}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <i className={`${getDomainIcon(domain)} text-primary text-sm`}></i>
                  </div>
                  <h2 className="text-lg font-semibold">{domain}</h2>
                  <span className="text-sm text-muted-foreground">{domainPlatforms.length} platform{domainPlatforms.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {domainPlatforms.map(platform => (
                    <PlatformCard
                      key={platform.id}
                      platform={platform}
                      isAdded={addedPlatformIds.has(platform.id)}
                      isAdding={adding === platform.id}
                      onAddToAgency={handleAddToAgency}
                      onConfigure={() => {
                        const ap = agencyPlatforms.find(a => a.platformId === platform.id);
                        if (ap) router.push(`/admin/platforms/${ap.id}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformCard({ platform, isAdded, isAdding, onAddToAgency, onConfigure }) {
  return (
    <Card className={`hover:shadow-lg transition-all duration-200 border-2 group ${isAdded ? 'border-green-300 bg-green-50/30' : 'hover:border-primary/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            {platform.iconName ? (
              <i className={`${platform.iconName} text-2xl text-primary`}></i>
            ) : (
              <i className="fas fa-cube text-2xl text-primary"></i>
            )}
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {isAdded && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <i className="fas fa-check mr-1"></i>Added
              </Badge>
            )}
            {platform.oauthSupported && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <i className="fas fa-key mr-1"></i>OAuth
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg leading-tight">{platform.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-3">
          {platform.description || platform.notes || 'Marketing platform integration'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className={platform.tier === 1 ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
            {platform.tier === 1 ? <><i className="fas fa-star mr-1"></i>Tier 1 — Asset Level</> : <><i className="fas fa-layer-group mr-1"></i>Tier 2 — Platform Level</>}
          </Badge>
        </div>

        {platform.accessPatterns && platform.accessPatterns.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {platform.accessPatterns.length} Access Pattern{platform.accessPatterns.length !== 1 ? 's' : ''}:
            </p>
            <div className="space-y-1">
              {platform.accessPatterns.map((ap, idx) => (
                <div key={idx} className="text-xs flex items-start gap-2">
                  <i className="fas fa-check-circle text-green-500 mt-0.5 flex-shrink-0"></i>
                  <div>
                    <span className="font-medium">{ap.label}</span>
                    {ap.description && (
                      <p className="text-muted-foreground line-clamp-2 mt-0.5">{ap.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isAdded ? (
          <Button
            variant="outline"
            className="w-full border-green-300 text-green-700 hover:bg-green-50"
            onClick={onConfigure}
          >
            <i className="fas fa-cog mr-2"></i>Configure Access Items
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            onClick={() => onAddToAgency(platform)}
            disabled={isAdding}
          >
            {isAdding ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Adding...</>
            ) : (
              <><i className="fas fa-plus mr-2"></i>Add to Agency</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AppCatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <AppCatalogContent />
    </Suspense>
  );
}
