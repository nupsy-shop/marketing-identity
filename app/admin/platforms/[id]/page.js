'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function PlatformConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [agencyPlatform, setAgencyPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state for a new item being added
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // item id being edited
  const [formData, setFormData] = useState({
    accessPattern: '',
    patternLabel: '',
    label: '',
    role: '',
    assetType: '',
    assetId: '',
    notes: ''
  });

  useEffect(() => {
    if (params.id) loadPlatform();
  }, [params.id]);

  const loadPlatform = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
      } else {
        toast({ title: 'Not found', description: 'Platform not found', variant: 'destructive' });
        router.push('/admin/platforms');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    const platform = agencyPlatform?.platform;
    const firstPattern = platform?.accessPatterns?.[0];
    setFormData({
      accessPattern: firstPattern?.pattern || '',
      patternLabel: firstPattern?.label || '',
      label: '',
      role: firstPattern?.roles?.[0] || '',
      assetType: '',
      assetId: '',
      notes: ''
    });
    setEditingItem(null);
    setShowAddForm(true);
  };

  const openEditForm = (item) => {
    setFormData({ ...item });
    setEditingItem(item.id);
    setShowAddForm(true);
  };

  const handlePatternChange = (patternValue) => {
    const platform = agencyPlatform?.platform;
    const selectedPattern = platform?.accessPatterns?.find(p => p.pattern === patternValue);
    setFormData(prev => ({
      ...prev,
      accessPattern: patternValue,
      patternLabel: selectedPattern?.label || patternValue,
      role: selectedPattern?.roles?.[0] || ''
    }));
  };

  const handleSaveItem = async () => {
    if (!formData.label || !formData.accessPattern || !formData.role) {
      toast({ title: 'Validation Error', description: 'Label, Access Pattern and Role are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let url, method;
      if (editingItem) {
        url = `/api/agency/platforms/${params.id}/items/${editingItem}`;
        method = 'PUT';
      } else {
        url = `/api/agency/platforms/${params.id}/items`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessPattern: formData.accessPattern,
          patternLabel: formData.patternLabel,
          label: formData.label,
          role: formData.role,
          assetType: formData.assetType || undefined,
          assetId: formData.assetId || undefined,
          notes: formData.notes || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        setShowAddForm(false);
        setEditingItem(null);
        toast({
          title: editingItem ? 'Item updated' : 'Item added',
          description: `"${formData.label}" has been ${editingItem ? 'updated' : 'added'}`
        });
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save item', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId, itemLabel) => {
    if (!confirm(`Delete "${itemLabel}"? This will remove it from any future access requests.`)) return;
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        toast({ title: 'Item deleted', description: `"${itemLabel}" has been removed` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agencyPlatform) return null;

  const platform = agencyPlatform.platform;
  const accessItems = agencyPlatform.accessItems || [];
  const availablePatterns = platform?.accessPatterns || [];
  const selectedPatternRoles = availablePatterns.find(p => p.pattern === formData.accessPattern)?.roles || [];

  // Group items by access pattern
  const itemsByPattern = accessItems.reduce((acc, item) => {
    const key = item.patternLabel || item.accessPattern;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/platforms')}>
                <i className="fas fa-arrow-left mr-2"></i>All Platforms
              </Button>
              <div className="flex items-center gap-3">
                {platform?.iconName && (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <i className={`${platform.iconName} text-xl text-primary`}></i>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold">{platform?.name}</h1>
                  <p className="text-sm text-muted-foreground">{platform?.domain} &bull; {accessItems.length} access item{accessItems.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={agencyPlatform.isEnabled ? 'default' : 'secondary'}>
                {agencyPlatform.isEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Platform description */}
        {platform?.description && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground">{platform.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Access Patterns overview */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Supported Access Patterns</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {availablePatterns.map(ap => (
              <Card key={ap.pattern} className="border">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                    <div>
                      <p className="font-medium text-sm">{ap.label}</p>
                      {ap.description && <p className="text-xs text-muted-foreground mt-0.5">{ap.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ap.roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Access Items */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Access Items</h2>
              <p className="text-sm text-muted-foreground">Define the specific access configurations available for client requests</p>
            </div>
            {!showAddForm && (
              <Button onClick={openAddForm}>
                <i className="fas fa-plus mr-2"></i>
                Add Access Item
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card className="mb-4 border-primary/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {editingItem ? 'Edit Access Item' : 'New Access Item'}
                </CardTitle>
                <CardDescription>
                  Define a specific access configuration that can be selected when creating client requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Label */}
                <div>
                  <Label className="text-sm">Label <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g., Google Ads \u2013 Main Account (Standard)"
                    value={formData.label}
                    onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a generic, reusable label — it applies across clients (e.g., “Standard Read-Only Access”)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Access Pattern */}
                  <div>
                    <Label className="text-sm">Access Pattern <span className="text-destructive">*</span></Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={formData.accessPattern}
                      onChange={(e) => handlePatternChange(e.target.value)}
                    >
                      {availablePatterns.map(p => (
                        <option key={p.pattern} value={p.pattern}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <Label className="text-sm">Role <span className="text-destructive">*</span></Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    >
                      {selectedPatternRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Asset info (Tier 1) */}
                {platform?.tier === 1 && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <Label className="text-sm">Asset Type</Label>
                      <Input
                        placeholder="e.g., Ad Account, GA4 Property"
                        value={formData.assetType}
                        onChange={(e) => setFormData(prev => ({ ...prev, assetType: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Asset ID</Label>
                      <Input
                        placeholder="e.g., 123-456-7890"
                        value={formData.assetId}
                        onChange={(e) => setFormData(prev => ({ ...prev, assetId: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    placeholder="Additional context..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => { setShowAddForm(false); setEditingItem(null); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveItem} disabled={saving}>
                    {saving ? (
                      <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                    ) : editingItem ? (
                      <><i className="fas fa-check mr-2"></i>Update Item</>
                    ) : (
                      <><i className="fas fa-plus mr-2"></i>Add Item</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items list */}
          {accessItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <i className="fas fa-list-check text-4xl text-muted-foreground mb-4 block"></i>
                <h3 className="font-semibold mb-2">No access items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add access items to define what clients will be asked to grant.
                  These items will be available to select when creating any client request.
                </p>
                {!showAddForm && (
                  <Button variant="outline" onClick={openAddForm}>
                    <i className="fas fa-plus mr-2"></i>Add First Item
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {Object.entries(itemsByPattern).map(([patternLabel, items]) => (
                <div key={patternLabel}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <i className="fas fa-key"></i>{patternLabel}
                  </p>
                  <div className="space-y-2">
                    {items.map(item => (
                      <Card key={item.id} className="border">
                        <CardContent className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{item.label}</p>
                                <Badge variant="secondary" className="text-xs">{item.role}</Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                {item.assetType && (
                                  <span><i className="fas fa-cube mr-1"></i>{item.assetType}{item.assetId && ` (#${item.assetId})`}</span>
                                )}
                                {item.notes && <span><i className="fas fa-note-sticky mr-1"></i>{item.notes}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button size="sm" variant="ghost" onClick={() => openEditForm(item)}>
                                <i className="fas fa-pen"></i>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id, item.label)}
                                className="text-destructive hover:text-destructive"
                              >
                                <i className="fas fa-trash"></i>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
