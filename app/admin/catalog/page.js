'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AppCatalogPage() {
  const router = useRouter();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedAutomation, setSelectedAutomation] = useState('');

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms?clientFacing=true');
      const result = await response.json();
      if (result.success) {
        setPlatforms(result.data);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter platforms
  const filteredPlatforms = platforms.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (selectedDomain && p.domain !== selectedDomain) return false;
    if (selectedTier && p.tier !== parseInt(selectedTier)) return false;
    if (selectedAutomation && p.automationFeasibility !== selectedAutomation) return false;
    return true;
  });

  // Group platforms by domain
  const groupedPlatforms = filteredPlatforms.reduce((acc, platform) => {
    const domain = platform.domain || 'Other';
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(platform);
    return acc;
  }, {});

  // Get unique values for filters
  const domains = Array.from(new Set(platforms.map(p => p.domain))).sort();
  const automationLevels = Array.from(new Set(platforms.map(p => p.automationFeasibility))).sort();

  // Statistics
  const tier1Count = platforms.filter(p => p.tier === 1).length;
  const tier2Count = platforms.filter(p => p.tier === 2).length;
  const oauthCount = platforms.filter(p => p.oauthSupported).length;

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50\">
      {/* Header */}
      <header className=\"border-b bg-white shadow-sm\">
        <div className=\"container mx-auto px-4 py-4\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-4\">
              <Button variant=\"ghost\" size=\"sm\" onClick={() => router.push('/admin')}>
                <i className=\"fas fa-arrow-left mr-2\"></i>
                Back to Dashboard
              </Button>
              <div className=\"h-8 w-px bg-border\" />
              <div>
                <h1 className=\"text-2xl font-bold\">Platform Catalog</h1>
                <p className=\"text-sm text-muted-foreground\">Browse and configure marketing platforms</p>
              </div>
            </div>
            <Badge variant=\"secondary\" className=\"text-lg px-4 py-2\">
              {platforms.length} Platforms
            </Badge>
          </div>
        </div>
      </header>

      <div className=\"container mx-auto px-4 py-8\">
        {/* Stats Cards */}
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4 mb-8\">
          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-muted-foreground\">Total Platforms</p>
                  <p className=\"text-3xl font-bold\">{platforms.length}</p>
                </div>
                <div className=\"w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center\">
                  <i className=\"fas fa-layer-group text-2xl text-blue-600\"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-muted-foreground\">Tier 1 (Full Asset)</p>
                  <p className=\"text-3xl font-bold\">{tier1Count}</p>
                </div>
                <div className=\"w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center\">
                  <i className=\"fas fa-star text-2xl text-purple-600\"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-muted-foreground\">Tier 2 (Platform)</p>
                  <p className=\"text-3xl font-bold\">{tier2Count}</p>
                </div>
                <div className=\"w-12 h-12 rounded-full bg-green-100 flex items-center justify-center\">
                  <i className=\"fas fa-cubes text-2xl text-green-600\"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center justify-between\">
                <div>
                  <p className=\"text-sm text-muted-foreground\">OAuth Supported</p>
                  <p className=\"text-3xl font-bold\">{oauthCount}</p>
                </div>
                <div className=\"w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center\">
                  <i className=\"fas fa-key text-2xl text-orange-600\"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className=\"mb-6\">
          <CardHeader>
            <CardTitle>Filter Platforms</CardTitle>
            <CardDescription>Narrow down by category, tier, or automation level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
              <div>
                <label className=\"text-sm font-medium mb-2 block\">Search</label>
                <div className=\"relative\">
                  <Input
                    placeholder=\"Search platforms...\"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className=\"pl-10\"
                  />
                  <i className=\"fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground\"></i>
                </div>
              </div>

              <div>
                <label className=\"text-sm font-medium mb-2 block\">Domain</label>
                <select
                  className=\"w-full border border-input rounded-md px-3 py-2 bg-background\"
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                >
                  <option value=\"\">All Domains</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className=\"text-sm font-medium mb-2 block\">Tier</label>
                <select
                  className=\"w-full border border-input rounded-md px-3 py-2 bg-background\"
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                >
                  <option value=\"\">All Tiers</option>
                  <option value=\"1\">Tier 1 (Full Asset Support)</option>
                  <option value=\"2\">Tier 2 (Platform Level)</option>
                </select>
              </div>

              <div>
                <label className=\"text-sm font-medium mb-2 block\">Automation</label>
                <select
                  className=\"w-full border border-input rounded-md px-3 py-2 bg-background\"
                  value={selectedAutomation}
                  onChange={(e) => setSelectedAutomation(e.target.value)}
                >
                  <option value=\"\">All Levels</option>
                  {automationLevels.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {(searchTerm || selectedDomain || selectedTier || selectedAutomation) && (
              <div className=\"mt-4 flex items-center gap-2\">
                <span className=\"text-sm text-muted-foreground\">Active filters:</span>
                <Button
                  variant=\"outline\"
                  size=\"sm\"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDomain('');
                    setSelectedTier('');
                    setSelectedAutomation('');
                  }}
                >
                  <i className=\"fas fa-times mr-2\"></i>
                  Clear All
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className=\"mb-4\">
          <p className=\"text-sm text-muted-foreground\">
            Showing <span className=\"font-semibold text-foreground\">{filteredPlatforms.length}</span> of{' '}
            <span className=\"font-semibold text-foreground\">{platforms.length}</span> platforms
          </p>
        </div>

        {/* Grouped Platform Cards */}
        {loading ? (
          <div className=\"text-center py-12\">
            <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4\"></div>
            <p className=\"text-muted-foreground\">Loading platforms...</p>
          </div>
        ) : Object.keys(groupedPlatforms).length === 0 ? (
          <Card>
            <CardContent className=\"py-12\">
              <div className=\"text-center\">
                <i className=\"fas fa-search text-4xl text-muted-foreground mb-4\"></i>
                <h3 className=\"text-lg font-semibold mb-2\">No platforms found</h3>
                <p className=\"text-muted-foreground mb-4\">Try adjusting your filters</p>
                <Button onClick={() => {
                  setSearchTerm('');
                  setSelectedDomain('');
                  setSelectedTier('');
                  setSelectedAutomation('');
                }}>
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className=\"space-y-8\">
            {Object.entries(groupedPlatforms).sort().map(([domain, domainPlatforms]) => (
              <div key={domain}>
                <div className=\"flex items-center gap-3 mb-4\">
                  <div className=\"w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center\">
                    <i className=\"fas fa-folder text-white\"></i>
                  </div>
                  <div>
                    <h2 className=\"text-2xl font-bold\">{domain}</h2>
                    <p className=\"text-sm text-muted-foreground\">{domainPlatforms.length} platform{domainPlatforms.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                
                <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4\">
                  {domainPlatforms.map(platform => (
                    <PlatformCard key={platform.id} platform={platform} />
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

function PlatformCard({ platform }) {
  const getTierBadgeColor = (tier) => {
    if (tier === 1) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const getAutomationBadgeColor = (automation) => {
    if (automation?.includes('High')) return 'bg-green-100 text-green-700 border-green-200';
    if (automation?.includes('Medium')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Card className=\"hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50 group\">
      <CardHeader className=\"pb-3\">
        <div className=\"flex items-start justify-between mb-3\">
          <div className=\"w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform\">
            {platform.iconName ? (
              <i className={`${platform.iconName} text-2xl text-primary`}></i>
            ) : (
              <i className=\"fas fa-cube text-2xl text-primary\"></i>
            )}
          </div>
          {platform.oauthSupported && (
            <Badge variant=\"outline\" className=\"bg-green-50 text-green-700 border-green-200\">
              <i className=\"fas fa-key mr-1\"></i>
              OAuth
            </Badge>
          )}
        </div>
        <CardTitle className=\"text-lg leading-tight\">{platform.name}</CardTitle>
        <CardDescription className=\"text-sm line-clamp-2\">
          {platform.description || platform.notes || 'Marketing platform integration'}
        </CardDescription>
      </CardHeader>
      <CardContent className=\"space-y-3\">
        <div className=\"flex flex-wrap gap-2\">
          <Badge className={getTierBadgeColor(platform.tier)}>
            {platform.tier === 1 ? (
              <><i className=\"fas fa-star mr-1\"></i>Tier 1</>
            ) : (
              <><i className=\"fas fa-layer-group mr-1\"></i>Tier 2</>
            )}
          </Badge>
          <Badge className={getAutomationBadgeColor(platform.automationFeasibility)}>
            {platform.automationFeasibility}
          </Badge>
        </div>

        {platform.accessPatterns && platform.accessPatterns.length > 0 && (
          <div className=\"pt-2 border-t\">
            <p className=\"text-xs font-medium text-muted-foreground mb-2\">Access Patterns:</p>
            <div className=\"space-y-1\">
              {platform.accessPatterns.slice(0, 2).map((ap, idx) => (
                <div key={idx} className=\"text-xs flex items-start gap-2\">
                  <i className=\"fas fa-check-circle text-green-500 mt-0.5\"></i>
                  <span className=\"flex-1\">{ap.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button variant=\"outline\" className=\"w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors\">
          <i className=\"fas fa-plus mr-2\"></i>
          Add to Client
        </Button>
      </CardContent>
    </Card>
  );
}
