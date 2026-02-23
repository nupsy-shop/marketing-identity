'use client';

/**
 * Agency Identities Management Page
 * 
 * Manages integration_identities used for:
 * - STATIC_AGENCY_IDENTITY strategy (shared credentials for PAM)
 * - INTEGRATION_NON_HUMAN purpose (service accounts, API keys)
 * 
 * Supports platform assignment for filtering in dropdowns
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Identity types - differentiate between human (PAM) and non-human (integration)
const IDENTITY_TYPES = [
  { 
    value: 'SHARED_CREDENTIAL', 
    label: 'Shared Credential', 
    icon: 'fas fa-user-lock', 
    desc: 'Human-interactive account for PAM (Static Agency Identity)',
    category: 'pam'
  },
  { 
    value: 'SERVICE_ACCOUNT', 
    label: 'Service Account', 
    icon: 'fas fa-robot', 
    desc: 'GCP/AWS service account for automated access',
    category: 'integration'
  },
  { 
    value: 'API_KEY', 
    label: 'API Key', 
    icon: 'fas fa-code', 
    desc: 'Static API key or token',
    category: 'integration'
  },
  { 
    value: 'OAUTH_CLIENT', 
    label: 'OAuth App', 
    icon: 'fas fa-key', 
    desc: 'OAuth 2.0 client credentials',
    category: 'integration'
  }
];

export default function IdentitiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Data state
  const [identities, setIdentities] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [activeTab, setActiveTab] = useState('pam'); // 'pam' or 'integration'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState(defaultForm());

  function defaultForm() {
    return {
      type: 'SHARED_CREDENTIAL',
      name: '',
      identifier: '', // email/login for shared credentials, or service account email
      description: '',
      platformId: '',
      metadata: {}
    };
  }

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [identitiesRes, platformsRes] = await Promise.all([
        fetch('/api/integration-identities'),
        fetch('/api/platforms?clientFacing=true')
      ]);
      
      const identitiesData = await identitiesRes.json();
      const platformsData = await platformsRes.json();
      
      if (identitiesData.success) {
        setIdentities(identitiesData.data || []);
      }
      if (platformsData.success) {
        setPlatforms(platformsData.data || []);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      toast({ title: 'Error', description: 'Failed to load identities', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save identity
  const handleSave = async () => {
    if (!formData.name || !formData.identifier) {
      toast({ 
        title: 'Validation Error', 
        description: 'Name and identifier (email/login) are required', 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/integration-identities/${editingId}`
        : '/api/integration-identities';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        name: formData.name,
        type: formData.type,
        identifier: formData.identifier,
        description: formData.description,
        platformId: formData.platformId || null,
        metadata: formData.metadata
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ 
          title: editingId ? 'Identity Updated' : 'Identity Created', 
          description: `"${formData.name}" has been saved` 
        });
        setShowAddForm(false);
        setEditingId(null);
        setFormData(defaultForm());
        loadData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save identity', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Delete identity
  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/integration-identities/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deleted', description: `"${name}" has been removed` });
        loadData();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  // Toggle active status
  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`/api/integration-identities/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle status', variant: 'destructive' });
    }
  };

  // Open edit form
  const openEditForm = (identity) => {
    setFormData({
      type: identity.type || 'SHARED_CREDENTIAL',
      name: identity.name || '',
      identifier: identity.identifier || '',
      description: identity.description || '',
      platformId: identity.platformId || '',
      metadata: identity.metadata || {}
    });
    setEditingId(identity.id);
    setShowAddForm(true);
  };

  // Open add form with appropriate type based on active tab
  const openAddForm = () => {
    setFormData({
      ...defaultForm(),
      type: activeTab === 'pam' ? 'SHARED_CREDENTIAL' : 'SERVICE_ACCOUNT'
    });
    setEditingId(null);
    setShowAddForm(true);
  };

  // Filter identities based on active tab and search
  const filteredIdentities = identities.filter(identity => {
    // Filter by category (tab)
    const typeConfig = IDENTITY_TYPES.find(t => t.value === identity.type);
    const categoryMatch = activeTab === 'pam' 
      ? identity.type === 'SHARED_CREDENTIAL'
      : identity.type !== 'SHARED_CREDENTIAL';
    
    if (!categoryMatch) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        identity.name?.toLowerCase().includes(query) ||
        identity.identifier?.toLowerCase().includes(query) ||
        identity.description?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Get type config for display
  const getTypeConfig = (type) => IDENTITY_TYPES.find(t => t.value === type) || IDENTITY_TYPES[0];

  // Get platform name by ID
  const getPlatformName = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform?.name || platform?.displayName || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <i className="fas fa-arrow-left mr-2"></i>Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <i className="fas fa-id-badge text-primary"></i>
                  Agency Identities
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage shared credentials and integration accounts
                </p>
              </div>
            </div>
            {!showAddForm && (
              <Button onClick={openAddForm}>
                <i className="fas fa-plus mr-2"></i>
                Add Identity
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Tabs for PAM vs Integration */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="pam" className="flex items-center gap-2">
              <i className="fas fa-user-lock"></i>
              PAM Shared Credentials
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <i className="fas fa-robot"></i>
              Integration Accounts
            </TabsTrigger>
          </TabsList>

          {/* Info Cards */}
          <TabsContent value="pam" className="mt-4">
            <Card className="bg-amber-50 border-amber-200 mb-6">
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <i className="fas fa-info-circle text-amber-600 mt-0.5"></i>
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Shared Credentials for PAM</p>
                    <p>
                      These are pre-configured login credentials used with the <strong>Static Agency Identity</strong> strategy 
                      in Shared Account (PAM) access items. When selected, users check out access using this shared identity 
                      rather than generating a new client-dedicated account.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integration" className="mt-4">
            <Card className="bg-blue-50 border-blue-200 mb-6">
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Non-Human Integration Identities</p>
                    <p>
                      Service accounts, API keys, and OAuth credentials used for <strong>Integration (Non-Human)</strong> 
                      access items. These are referenced for automated/programmatic access and do not support PAM checkout.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-6 border-primary/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <i className={`${getTypeConfig(formData.type).icon} text-primary`}></i>
                {editingId ? 'Edit Identity' : 'New Identity'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'pam' 
                  ? 'Configure a shared credential for PAM access' 
                  : 'Configure a service account or API credential'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Selection (only show types for current tab) */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {IDENTITY_TYPES.filter(t => 
                    activeTab === 'pam' ? t.category === 'pam' : t.category === 'integration'
                  ).map(t => (
                    <div
                      key={t.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        formData.type === t.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                    >
                      <div className="flex items-center gap-2">
                        <i className={`${t.icon} text-primary text-sm`}></i>
                        <span className="font-medium text-sm">{t.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., Agency Google Ads Admin"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Display name for this identity</p>
                </div>
                <div>
                  <Label className="text-sm">
                    {formData.type === 'SHARED_CREDENTIAL' ? 'Login Email/Username' : 'Identifier'} 
                    <span className="text-destructive"> *</span>
                  </Label>
                  <Input
                    placeholder={
                      formData.type === 'SHARED_CREDENTIAL' 
                        ? 'e.g., admin@agency.com' 
                        : 'e.g., service-account@project.iam.gserviceaccount.com'
                    }
                    value={formData.identifier}
                    onChange={e => setFormData(prev => ({ ...prev, identifier: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.type === 'SHARED_CREDENTIAL' 
                      ? 'The email or username used to log in'
                      : 'Service account email or API key identifier'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm">Description</Label>
                <Input
                  placeholder="What this identity is used for..."
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Platform Assignment */}
              <div>
                <Label className="text-sm">Associated Platform (Optional)</Label>
                <select
                  className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                  value={formData.platformId}
                  onChange={e => setFormData(prev => ({ ...prev, platformId: e.target.value }))}
                >
                  <option value="">All Platforms (Agency-Wide)</option>
                  {platforms.map(platform => (
                    <option key={platform.id} value={platform.id}>
                      {platform.displayName || platform.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Optionally limit this identity to a specific platform
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowAddForm(false); setEditingId(null); setFormData(defaultForm()); }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                  ) : (
                    <><i className="fas fa-check mr-2"></i>{editingId ? 'Update' : 'Create'}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        {!showAddForm && identities.length > 0 && (
          <div className="mb-4">
            <div className="relative max-w-md">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></i>
              <Input
                placeholder="Search identities..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Identities List */}
        {loading ? (
          <div className="text-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-2"></i>
            <p className="text-muted-foreground">Loading identities...</p>
          </div>
        ) : filteredIdentities.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <i className={`fas ${activeTab === 'pam' ? 'fa-user-lock' : 'fa-robot'} text-4xl text-muted-foreground/50 mb-4`}></i>
              <p className="font-medium text-lg">
                {searchQuery 
                  ? 'No identities match your search' 
                  : activeTab === 'pam'
                    ? 'No Shared Credentials Configured'
                    : 'No Integration Accounts Configured'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {activeTab === 'pam'
                  ? 'Create shared credentials to use with Static Agency Identity strategy'
                  : 'Create service accounts or API keys for integration access'}
              </p>
              {!searchQuery && (
                <Button onClick={openAddForm}>
                  <i className="fas fa-plus mr-2"></i>
                  Add {activeTab === 'pam' ? 'Shared Credential' : 'Integration Account'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredIdentities.map(identity => {
              const typeConfig = getTypeConfig(identity.type);
              return (
                <Card key={identity.id} className={`transition-all ${!identity.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          activeTab === 'pam' ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          <i className={`${typeConfig.icon} text-lg ${
                            activeTab === 'pam' ? 'text-amber-600' : 'text-blue-600'
                          }`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{identity.name}</p>
                            {!identity.isActive && (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {identity.identifier}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            {identity.platformId && (
                              <Badge variant="outline" className="text-xs">
                                <i className="fas fa-cube mr-1"></i>
                                {identity.platform?.name || getPlatformName(identity.platformId)}
                              </Badge>
                            )}
                            {!identity.platformId && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                                <i className="fas fa-globe mr-1"></i>
                                Agency-Wide
                              </Badge>
                            )}
                          </div>
                          {identity.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {identity.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Active</span>
                          <Switch
                            checked={identity.isActive}
                            onCheckedChange={() => handleToggleStatus(identity.id)}
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(identity)}>
                          <i className="fas fa-pen"></i>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(identity.id, identity.name)}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stats Footer */}
        {!loading && identities.length > 0 && (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {filteredIdentities.length} {activeTab === 'pam' ? 'shared credential' : 'integration account'}
            {filteredIdentities.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        )}
      </div>
    </div>
  );
}
