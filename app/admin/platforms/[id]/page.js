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

const ITEM_TYPES = [
  { value: 'NAMED_INVITE', label: 'Named Invite', icon: 'fas fa-envelope', desc: 'Invite a specific user by email' },
  { value: 'PARTNER_DELEGATION', label: 'Partner Delegation', icon: 'fas fa-handshake', desc: 'Grant access via partner/agency seat' },
  { value: 'GROUP_ACCESS', label: 'Group / Service Account', icon: 'fas fa-users', desc: 'Add a group or service account' },
  { value: 'PROXY_TOKEN', label: 'Proxy Token / API Key', icon: 'fas fa-key', desc: 'Generate a token for programmatic access' },
  { value: 'SHARED_ACCOUNT_PAM', label: 'Shared Account (PAM)', icon: 'fas fa-shield-halved', desc: 'Privileged shared account with checkout policy' }
];

export default function PlatformConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [agencyPlatform, setAgencyPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(defaultForm());

  function defaultForm() {
    return {
      itemType: 'NAMED_INVITE',
      accessPattern: '',
      patternLabel: '',
      label: '',
      role: '',
      assetType: '',
      assetId: '',
      notes: '',
      // PAM fields
      pamOwnership: 'CLIENT_OWNED',
      pamUsername: '',
      pamAgencyIdentityEmail: '',
      pamRoleTemplate: '',
      pamRequiresDedicatedLogin: true,
      pamCheckoutDuration: 60,
      pamRotationTrigger: 'onCheckin',
      pamProvisioningSource: 'MANUAL'
    };
  }

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
      ...defaultForm(),
      accessPattern: firstPattern?.pattern || '',
      patternLabel: firstPattern?.label || '',
      role: firstPattern?.roles?.[0] || ''
    });
    setEditingItem(null);
    setShowAddForm(true);
  };

  const openEditForm = (item) => {
    setFormData({
      itemType: item.itemType || 'NAMED_INVITE',
      accessPattern: item.accessPattern || '',
      patternLabel: item.patternLabel || '',
      label: item.label || '',
      role: item.role || '',
      assetType: item.assetType || '',
      assetId: item.assetId || '',
      notes: item.notes || '',
      pamOwnership: item.pamConfig?.ownership || 'CLIENT_OWNED',
      pamUsername: item.pamConfig?.username || '',
      pamAgencyIdentityEmail: item.pamConfig?.agencyIdentityEmail || '',
      pamRoleTemplate: item.pamConfig?.roleTemplate || '',
      pamRequiresDedicatedLogin: item.pamConfig?.requiresDedicatedAgencyLogin ?? true,
      pamCheckoutDuration: item.pamConfig?.checkoutPolicy?.durationMinutes || 60,
      pamRotationTrigger: item.pamConfig?.rotationPolicy?.trigger || 'onCheckin',
      pamProvisioningSource: item.pamConfig?.provisioningSource || 'MANUAL'
    });
    setEditingItem(item.id);
    setShowAddForm(true);
  };

  const handlePatternChange = (patternValue) => {
    const platform = agencyPlatform?.platform;
    const sel = platform?.accessPatterns?.find(p => p.pattern === patternValue);
    setFormData(prev => ({
      ...prev,
      accessPattern: patternValue,
      patternLabel: sel?.label || patternValue,
      role: sel?.roles?.[0] || ''
    }));
  };

  const buildPayload = () => {
    const base = {
      itemType: formData.itemType,
      accessPattern: formData.accessPattern,
      patternLabel: formData.patternLabel,
      label: formData.label,
      role: formData.role,
      assetType: formData.assetType || undefined,
      assetId: formData.assetId || undefined,
      notes: formData.notes || undefined
    };
    if (formData.itemType === 'SHARED_ACCOUNT_PAM') {
      base.pamConfig = {
        ownership: formData.pamOwnership,
        username: formData.pamOwnership === 'CLIENT_OWNED' ? formData.pamUsername || undefined : undefined,
        requiresDedicatedAgencyLogin: formData.pamOwnership === 'CLIENT_OWNED' ? formData.pamRequiresDedicatedLogin : undefined,
        agencyIdentityEmail: formData.pamOwnership === 'AGENCY_OWNED' ? formData.pamAgencyIdentityEmail || undefined : undefined,
        roleTemplate: formData.pamOwnership === 'AGENCY_OWNED' ? formData.pamRoleTemplate || undefined : undefined,
        provisioningSource: formData.pamOwnership === 'AGENCY_OWNED' ? formData.pamProvisioningSource : undefined,
        checkoutPolicy: { durationMinutes: Number(formData.pamCheckoutDuration) || 60 },
        rotationPolicy: { trigger: formData.pamRotationTrigger }
      };
    }
    return base;
  };

  const handleSaveItem = async () => {
    if (!formData.label || !formData.accessPattern || !formData.role) {
      toast({ title: 'Validation Error', description: 'Label, Access Pattern and Role are required', variant: 'destructive' });
      return;
    }
    if (formData.itemType === 'SHARED_ACCOUNT_PAM' && formData.pamOwnership === 'AGENCY_OWNED') {
      if (!formData.pamAgencyIdentityEmail) {
        toast({ title: 'Validation Error', description: 'Agency Identity Email is required for Agency-Owned accounts', variant: 'destructive' });
        return;
      }
      if (!formData.pamRoleTemplate) {
        toast({ title: 'Validation Error', description: 'Role Template is required for Agency-Owned accounts', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/agency/platforms/${params.id}/items/${editingItem}`
        : `/api/agency/platforms/${params.id}/items`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        setShowAddForm(false);
        setEditingItem(null);
        toast({ title: editingItem ? 'Item updated' : 'Item added', description: `"${formData.label}" saved` });
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
    if (!confirm(`Delete "${itemLabel}"?`)) return;
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}/items/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        toast({ title: 'Item deleted', description: `"${itemLabel}" removed` });
      }
    } catch {
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

  const namedItems = accessItems.filter(i => i.itemType !== 'SHARED_ACCOUNT_PAM');
  const pamItems = accessItems.filter(i => i.itemType === 'SHARED_ACCOUNT_PAM');

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
            <Badge variant={agencyPlatform.isEnabled ? 'default' : 'secondary'}>
              {agencyPlatform.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {platform?.description && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-muted-foreground">{platform.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Supported Access Patterns */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Supported Access Patterns</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {availablePatterns.map(ap => (
              <Card key={ap.pattern}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                    <div>
                      <p className="font-medium text-sm">{ap.label}</p>
                      {ap.description && <p className="text-xs text-muted-foreground mt-0.5">{ap.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ap.roles.map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
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
              <p className="text-sm text-muted-foreground">Define configurations available across all client requests</p>
            </div>
            {!showAddForm && (
              <Button onClick={openAddForm}>
                <i className="fas fa-plus mr-2"></i>Add Access Item
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <Card className="mb-4 border-primary/50 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{editingItem ? 'Edit Access Item' : 'New Access Item'}</CardTitle>
                <CardDescription>Define a specific access configuration for client requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item Type */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Item Type <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ITEM_TYPES.map(t => (
                      <div
                        key={t.value}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.itemType === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        onClick={() => setFormData(prev => ({ ...prev, itemType: t.value }))}
                      >
                        <div className="flex items-center gap-2">
                          <i className={`${t.icon} text-primary text-sm`}></i>
                          <span className="font-medium text-sm">{t.label}</span>
                          {t.value === 'SHARED_ACCOUNT_PAM' && <Badge className="bg-red-100 text-red-700 border-red-200 text-xs ml-auto">PAM</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PAM: Ownership */}
                {formData.itemType === 'SHARED_ACCOUNT_PAM' && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-shield-halved text-amber-600"></i>
                      <p className="font-semibold text-sm text-amber-900">PAM Configuration</p>
                    </div>

                    {/* Ownership radio */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Ownership Model <span className="text-destructive">*</span></Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'CLIENT_OWNED', label: 'Client-Owned', icon: 'fas fa-user', desc: 'Client provides credentials. Higher risk — encourage dedicated login.' },
                          { value: 'AGENCY_OWNED', label: 'Agency-Owned', icon: 'fas fa-building', desc: 'Agency identity — client must invite and assign a role.' }
                        ].map(o => (
                          <div
                            key={o.value}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.pamOwnership === o.value ? 'border-amber-500 bg-white' : 'border-amber-200 hover:border-amber-400'}`}
                            onClick={() => setFormData(prev => ({ ...prev, pamOwnership: o.value }))}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <i className={`${o.icon} text-amber-600 text-sm`}></i>
                              <span className="font-medium text-sm">{o.label}</span>
                              {formData.pamOwnership === o.value && <i className="fas fa-check-circle text-amber-600 ml-auto text-xs"></i>}
                            </div>
                            <p className="text-xs text-amber-800">{o.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CLIENT_OWNED fields */}
                    {formData.pamOwnership === 'CLIENT_OWNED' && (
                      <div className="space-y-3 border-t border-amber-200 pt-3">
                        <p className="text-xs text-amber-700 font-medium"><i className="fas fa-info-circle mr-1"></i>Client-owned: the client will provide credentials during onboarding</p>
                        <div>
                          <Label className="text-sm">Username hint (optional)</Label>
                          <Input
                            placeholder="e.g., agency-login@client.com"
                            value={formData.pamUsername}
                            onChange={e => setFormData(prev => ({ ...prev, pamUsername: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={formData.pamRequiresDedicatedLogin}
                            onCheckedChange={v => setFormData(prev => ({ ...prev, pamRequiresDedicatedLogin: v }))}
                          />
                          <div>
                            <p className="text-sm font-medium">Require dedicated agency login</p>
                            <p className="text-xs text-muted-foreground">Recommend client creates a dedicated credential for agency use</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AGENCY_OWNED fields */}
                    {formData.pamOwnership === 'AGENCY_OWNED' && (
                      <div className="space-y-3 border-t border-amber-200 pt-3">
                        <p className="text-xs text-amber-700 font-medium"><i className="fas fa-info-circle mr-1"></i>Agency-owned: client must invite this identity and assign the specified role</p>
                        <div>
                          <Label className="text-sm">Agency Identity Email <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="e.g., agency-bot@youragency.com"
                            value={formData.pamAgencyIdentityEmail}
                            onChange={e => setFormData(prev => ({ ...prev, pamAgencyIdentityEmail: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Role Template <span className="text-destructive">*</span></Label>
                          <Input
                            placeholder="e.g., Admin, Editor, Viewer"
                            value={formData.pamRoleTemplate}
                            onChange={e => setFormData(prev => ({ ...prev, pamRoleTemplate: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Provisioning Source</Label>
                          <select
                            className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                            value={formData.pamProvisioningSource}
                            onChange={e => setFormData(prev => ({ ...prev, pamProvisioningSource: e.target.value }))}
                          >
                            <option value="MANUAL">Manual</option>
                            <option value="OKTA">Okta</option>
                            <option value="INTERNAL_DIRECTORY">Internal Directory</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Shared PAM policies */}
                    <div className="grid grid-cols-2 gap-3 border-t border-amber-200 pt-3">
                      <div>
                        <Label className="text-sm">Checkout Duration (min)</Label>
                        <Input
                          type="number"
                          value={formData.pamCheckoutDuration}
                          onChange={e => setFormData(prev => ({ ...prev, pamCheckoutDuration: e.target.value }))}
                          className="mt-1"
                          min={15}
                          max={480}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Rotation Trigger</Label>
                        <select
                          className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                          value={formData.pamRotationTrigger}
                          onChange={e => setFormData(prev => ({ ...prev, pamRotationTrigger: e.target.value }))}
                        >
                          <option value="onCheckin">On Check-in</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="offboard">On Offboarding</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common fields */}
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label className="text-sm">Label <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder={formData.itemType === 'SHARED_ACCOUNT_PAM' ? 'e.g., Google Ads – Shared Agency Login' : 'e.g., Google Ads – Standard Access'}
                      value={formData.label}
                      onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Access Pattern <span className="text-destructive">*</span></Label>
                      <select
                        className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                        value={formData.accessPattern}
                        onChange={e => handlePatternChange(e.target.value)}
                      >
                        {availablePatterns.map(p => (
                          <option key={p.pattern} value={p.pattern}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Role <span className="text-destructive">*</span></Label>
                      <select
                        className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                        value={formData.role}
                        onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      >
                        {selectedPatternRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {platform?.tier === 1 && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Asset Type</Label>
                        <Input
                          placeholder="e.g., Ad Account"
                          value={formData.assetType}
                          onChange={e => setFormData(prev => ({ ...prev, assetType: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Asset ID</Label>
                        <Input
                          placeholder="e.g., 123-456"
                          value={formData.assetId}
                          onChange={e => setFormData(prev => ({ ...prev, assetId: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm">Notes (optional)</Label>
                    <Input
                      placeholder="Additional context..."
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => { setShowAddForm(false); setEditingItem(null); }}>Cancel</Button>
                  <Button onClick={handleSaveItem} disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                      : editingItem ? <><i className="fas fa-check mr-2"></i>Update</>
                      : <><i className="fas fa-plus mr-2"></i>Add Item</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items by category */}
          {accessItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <i className="fas fa-list-check text-4xl text-muted-foreground mb-4 block"></i>
                <h3 className="font-semibold mb-2">No access items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add access items to define what clients will be asked to grant.</p>
                {!showAddForm && <Button variant="outline" onClick={openAddForm}><i className="fas fa-plus mr-2"></i>Add First Item</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Standard access items */}
              {namedItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Standard Access Items ({namedItems.length})</p>
                  <div className="space-y-2">
                    {namedItems.map(item => (
                      <ItemRow key={item.id} item={item} onEdit={openEditForm} onDelete={handleDeleteItem} />
                    ))}
                  </div>
                </div>
              )}
              {/* PAM items */}
              {pamItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <i className="fas fa-shield-halved text-amber-600"></i>PAM Shared Accounts ({pamItems.length})
                  </p>
                  <div className="space-y-2">
                    {pamItems.map(item => (
                      <ItemRow key={item.id} item={item} onEdit={openEditForm} onDelete={handleDeleteItem} isPam />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemRow({ item, onEdit, onDelete, isPam = false }) {
  const pamConfig = item.pamConfig;
  return (
    <Card className={`border ${isPam ? 'border-amber-200 bg-amber-50/30' : ''}`}>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-sm">{item.label}</p>
              <Badge variant="secondary" className="text-xs">{item.role}</Badge>
              {isPam && (
                <Badge className={`text-xs ${pamConfig?.ownership === 'CLIENT_OWNED' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  <i className="fas fa-shield-halved mr-1"></i>
                  {pamConfig?.ownership === 'CLIENT_OWNED' ? 'Client-Owned' : 'Agency-Owned'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{item.patternLabel || item.accessPattern}</span>
              {isPam && pamConfig?.ownership === 'AGENCY_OWNED' && pamConfig?.agencyIdentityEmail && (
                <span><i className="fas fa-envelope mr-1"></i>{pamConfig.agencyIdentityEmail}</span>
              )}
              {isPam && pamConfig?.ownership === 'AGENCY_OWNED' && pamConfig?.roleTemplate && (
                <span><i className="fas fa-user-shield mr-1"></i>Role: {pamConfig.roleTemplate}</span>
              )}
              {isPam && pamConfig?.checkoutPolicy?.durationMinutes && (
                <span><i className="fas fa-clock mr-1"></i>{pamConfig.checkoutPolicy.durationMinutes}min checkout</span>
              )}
              {item.assetType && <span><i className="fas fa-cube mr-1"></i>{item.assetType}{item.assetId && ` #${item.assetId}`}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={() => onEdit(item)}><i className="fas fa-pen"></i></Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(item.id, item.label)} className="text-destructive hover:text-destructive"><i className="fas fa-trash"></i></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
