'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const INTEGRATION_TYPES = [
  { value: 'SERVICE_ACCOUNT', label: 'Service Account', icon: 'fas fa-robot', desc: 'GCP/AWS service account for API access' },
  { value: 'OAUTH_APP', label: 'OAuth App', icon: 'fas fa-key', desc: 'OAuth 2.0 client credentials' },
  { value: 'API_KEY', label: 'API Key', icon: 'fas fa-code', desc: 'Static API key or token' },
  { value: 'SYSTEM_USER', label: 'System User', icon: 'fas fa-user-cog', desc: 'Platform system user account' }
];

const ROTATION_POLICIES = [
  { value: 'NONE', label: 'No Rotation' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ON_OFFBOARD', label: 'On Client Offboarding' }
];

export default function IntegrationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  function defaultForm() {
    return {
      type: 'SERVICE_ACCOUNT',
      name: '',
      description: '',
      email: '',
      clientId: '',
      clientSecret: '',
      apiKey: '',
      rotationPolicy: 'NONE',
      scopes: ''
    };
  }

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/integration-identities');
      const data = await res.json();
      if (data.success) {
        setIdentities(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load identities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/integration-identities/${editingId}`
        : '/api/integration-identities';
      const method = editingId ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        scopes: formData.scopes ? formData.scopes.split(',').map(s => s.trim()) : []
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: editingId ? 'Updated' : 'Created', description: `"${formData.name}" saved` });
        setShowAddForm(false);
        setEditingId(null);
        setFormData(defaultForm());
        loadIdentities();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/integration-identities/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deleted', description: `"${name}" removed` });
        loadIdentities();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`/api/integration-identities/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        loadIdentities();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle status', variant: 'destructive' });
    }
  };

  const openEditForm = (identity) => {
    setFormData({
      type: identity.type || 'SERVICE_ACCOUNT',
      name: identity.name || '',
      description: identity.description || '',
      email: identity.email || '',
      clientId: identity.clientId || '',
      clientSecret: '',
      apiKey: '',
      rotationPolicy: identity.rotationPolicy || 'NONE',
      scopes: (identity.scopes || []).join(', ')
    });
    setEditingId(identity.id);
    setShowAddForm(true);
  };

  const typeConfig = INTEGRATION_TYPES.find(t => t.value === formData.type);

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
                <h1 className="text-xl font-bold">Integration Identities</h1>
                <p className="text-sm text-muted-foreground">Manage service accounts, OAuth apps, and API credentials</p>
              </div>
            </div>
            {!showAddForm && (
              <Button onClick={() => { setShowAddForm(true); setEditingId(null); setFormData(defaultForm()); }}>
                <i className="fas fa-plus mr-2"></i>Add Integration
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Info Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Non-Human Integration Identities</p>
                <p>These are service accounts, API keys, and OAuth credentials used for automated/integration access. They are referenced by Access Items with purpose "Integration (Non-Interactive)" and do not support PAM checkout.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-6 border-primary/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{editingId ? 'Edit Integration Identity' : 'New Integration Identity'}</CardTitle>
              <CardDescription>Configure a service account, OAuth app, or API credential</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Type <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {INTEGRATION_TYPES.map(t => (
                    <div
                      key={t.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.type === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm">Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., GA4 Export Service Account"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Description</Label>
                  <Input
                    placeholder="What this integration is used for..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Type-specific fields */}
              {(formData.type === 'SERVICE_ACCOUNT' || formData.type === 'SYSTEM_USER') && (
                <div>
                  <Label className="text-sm">Service Account Email</Label>
                  <Input
                    type="email"
                    placeholder="e.g., sa-name@project.iam.gserviceaccount.com"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}

              {formData.type === 'OAUTH_APP' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Client ID</Label>
                    <Input
                      placeholder="OAuth client ID"
                      value={formData.clientId}
                      onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Client Secret</Label>
                    <Input
                      type="password"
                      placeholder={editingId ? '(unchanged)' : 'OAuth client secret'}
                      value={formData.clientSecret}
                      onChange={e => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'API_KEY' && (
                <div>
                  <Label className="text-sm">API Key</Label>
                  <Input
                    type="password"
                    placeholder={editingId ? '(unchanged)' : 'Enter API key or token'}
                    value={formData.apiKey}
                    onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Scopes */}
              <div>
                <Label className="text-sm">Scopes (comma-separated)</Label>
                <Input
                  placeholder="e.g., analytics.readonly, tagmanager.readonly"
                  value={formData.scopes}
                  onChange={e => setFormData(prev => ({ ...prev, scopes: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Rotation Policy */}
              <div>
                <Label className="text-sm">Rotation Policy</Label>
                <select
                  className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                  value={formData.rotationPolicy}
                  onChange={e => setFormData(prev => ({ ...prev, rotationPolicy: e.target.value }))}
                >
                  {ROTATION_POLICIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" onClick={() => { setShowAddForm(false); setEditingId(null); setFormData(defaultForm()); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</> : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Identities List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : identities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <i className="fas fa-plug text-4xl text-muted-foreground mb-4 block"></i>
              <h3 className="font-semibold mb-2">No integration identities yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Add service accounts, OAuth apps, or API keys for automated access.</p>
              {!showAddForm && (
                <Button variant="outline" onClick={() => setShowAddForm(true)}>
                  <i className="fas fa-plus mr-2"></i>Add First Integration
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {identities.map(identity => {
              const typeInfo = INTEGRATION_TYPES.find(t => t.value === identity.type);
              return (
                <Card key={identity.id} className={identity.isActive ? '' : 'opacity-60'}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                          <i className={`${typeInfo?.icon || 'fas fa-plug'} text-primary`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{identity.name}</p>
                            <Badge variant="secondary" className="text-xs">{typeInfo?.label}</Badge>
                            {!identity.isActive && <Badge variant="outline" className="text-xs text-amber-600">Disabled</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{identity.description || 'No description'}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {identity.email && <span><i className="fas fa-envelope mr-1"></i>{identity.email}</span>}
                            {identity.rotationPolicy !== 'NONE' && <span><i className="fas fa-sync mr-1"></i>{identity.rotationPolicy}</span>}
                            {identity.scopes?.length > 0 && <span><i className="fas fa-lock mr-1"></i>{identity.scopes.length} scopes</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(identity.id)}>
                          <i className={`fas ${identity.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEditForm(identity)}>
                          <i className="fas fa-pen"></i>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(identity.id, identity.name)}>
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
      </div>
    </div>
  );
}
