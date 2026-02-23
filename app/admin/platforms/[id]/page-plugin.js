'use client';

/**
 * Platform Configuration Page - Plugin-Based Architecture
 * Uses schema-driven forms from plugins for all platform-specific configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import SchemaForm from '@/components/SchemaForm';

// Access Item Type display configuration
const ACCESS_ITEM_TYPE_CONFIG = {
  NAMED_INVITE: { 
    label: 'Named Invite', 
    icon: 'fas fa-user-plus', 
    desc: 'Human interactive access via user/group invite',
    color: 'blue'
  },
  PARTNER_DELEGATION: { 
    label: 'Partner Delegation', 
    icon: 'fas fa-handshake', 
    desc: 'Grant access via partner/agency seat or manager account',
    color: 'green'
  },
  GROUP_SERVICE: { 
    label: 'Group / Service Account', 
    icon: 'fas fa-users-cog', 
    desc: 'Service account or group-based access',
    color: 'purple'
  },
  PROXY_TOKEN: { 
    label: 'API / Integration Token', 
    icon: 'fas fa-key', 
    desc: 'Non-interactive integration via API keys',
    color: 'orange'
  },
  PAM_SHARED_ACCOUNT: { 
    label: 'Shared Account (PAM)', 
    icon: 'fas fa-shield-halved', 
    desc: 'Privileged shared account with checkout policy',
    color: 'red',
    pam: true
  }
};

export default function PlatformConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  // State
  const [agencyPlatform, setAgencyPlatform] = useState(null);
  const [pluginManifest, setPluginManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Form state
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [agencyConfigSchema, setAgencyConfigSchema] = useState(null);
  const [agencyConfig, setAgencyConfig] = useState({});
  const [formLabel, setFormLabel] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch agency platform data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        
        // Fetch plugin manifest for this platform
        const platformKey = getPlatformKey(data.data.platform?.name);
        if (platformKey) {
          const pluginRes = await fetch(`/api/plugins/${platformKey}`);
          const pluginData = await pluginRes.json();
          if (pluginData.success) {
            setPluginManifest(pluginData.data.manifest);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching platform:', error);
      toast({ title: 'Error', description: 'Failed to load platform', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [params.id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get platform key from name (normalize for plugin lookup)
  const getPlatformKey = (name) => {
    if (!name) return null;
    const normalized = name.toLowerCase();
    
    // Map display names to plugin keys
    const keyMap = {
      'google ads': 'google-ads',
      'meta': 'meta',
      'facebook': 'meta',
      'google analytics': 'ga4',
      'ga4': 'ga4',
      'google search console': 'google-search-console',
      'search console': 'google-search-console',
      'snowflake': 'snowflake',
      'dv360': 'dv360',
      'display & video 360': 'dv360',
      'the trade desk': 'trade-desk',
      'trade desk': 'trade-desk',
      'tiktok': 'tiktok',
      'snapchat': 'snapchat',
      'linkedin': 'linkedin',
      'pinterest': 'pinterest',
      'hubspot': 'hubspot',
      'salesforce': 'salesforce',
      'google tag manager': 'gtm',
      'gtm': 'gtm',
      'universal analytics': 'ga-ua',
    };
    
    for (const [key, value] of Object.entries(keyMap)) {
      if (normalized.includes(key)) return value;
    }
    return normalized.replace(/[^a-z0-9]/g, '-');
  };

  // Fetch schema when item type changes
  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedItemType || !agencyPlatform) return;
      
      const platformKey = getPlatformKey(agencyPlatform.platform?.name);
      if (!platformKey) return;
      
      try {
        const res = await fetch(`/api/plugins/${platformKey}/schema/agency-config?accessItemType=${selectedItemType}`);
        const data = await res.json();
        if (data.success) {
          setAgencyConfigSchema(data.data);
          setAgencyConfig({});
        }
      } catch (error) {
        console.error('Error fetching schema:', error);
      }
    };
    
    fetchSchema();
  }, [selectedItemType, agencyPlatform]);

  // Handle item type selection
  const handleSelectItemType = (type) => {
    setSelectedItemType(type);
    setAgencyConfig({});
    setValidationErrors({});
    
    // Set default role
    if (pluginManifest?.supportedRoleTemplates?.length > 0) {
      setSelectedRole(pluginManifest.supportedRoleTemplates[0].key);
    }
  };

  // Validate and save
  const handleSave = async () => {
    if (!formLabel.trim()) {
      toast({ title: 'Validation Error', description: 'Label is required', variant: 'destructive' });
      return;
    }
    
    if (!selectedRole) {
      toast({ title: 'Validation Error', description: 'Role is required', variant: 'destructive' });
      return;
    }
    
    const platformKey = getPlatformKey(agencyPlatform.platform?.name);
    
    // Validate with plugin
    try {
      const validateRes = await fetch(`/api/plugins/${platformKey}/validate/agency-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessItemType: selectedItemType,
          config: agencyConfig
        })
      });
      const validateData = await validateRes.json();
      
      if (!validateData.data?.valid) {
        const errors = {};
        validateData.data?.errors?.forEach(err => {
          const [field] = err.split(':');
          errors[field.trim()] = err;
        });
        setValidationErrors(errors);
        toast({ 
          title: 'Validation Error', 
          description: validateData.data?.errors?.join(', ') || 'Invalid configuration', 
          variant: 'destructive' 
        });
        return;
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
    
    setSaving(true);
    try {
      const payload = {
        itemType: selectedItemType,
        label: formLabel,
        role: selectedRole,
        agencyConfigJson: agencyConfig,
        // For backward compatibility, also set individual fields
        ...flattenConfig(agencyConfig, selectedItemType)
      };
      
      const url = editingItem 
        ? `/api/agency/platforms/${params.id}/items/${editingItem.id}`
        : `/api/agency/platforms/${params.id}/items`;
      
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: editingItem ? 'Item updated' : 'Item added' });
        setShowAddForm(false);
        setEditingItem(null);
        resetForm();
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Flatten config for backward compatibility
  const flattenConfig = (config, itemType) => {
    const flat = {};
    
    // Map schema fields to legacy API fields
    if (config.managerAccountId) {
      flat.agencyData = { ...flat.agencyData, managerAccountId: config.managerAccountId };
    }
    if (config.businessManagerId) {
      flat.agencyData = { ...flat.agencyData, businessManagerId: config.businessManagerId };
    }
    if (config.businessCenterId) {
      flat.agencyData = { ...flat.agencyData, businessCenterId: config.businessCenterId };
    }
    if (config.seatId) {
      flat.agencyData = { ...flat.agencyData, seatId: config.seatId };
    }
    if (config.humanIdentityStrategy) {
      flat.humanIdentityStrategy = config.humanIdentityStrategy;
    }
    if (config.agencyGroupEmail) {
      flat.agencyGroupEmail = config.agencyGroupEmail;
    }
    if (config.identityPurpose) {
      flat.identityPurpose = config.identityPurpose;
    }
    if (config.integrationIdentityId) {
      flat.integrationIdentityId = config.integrationIdentityId;
    }
    
    // PAM config
    if (itemType === 'PAM_SHARED_ACCOUNT') {
      flat.pamConfig = {
        ownership: config.pamOwnership,
        identityStrategy: config.pamIdentityStrategy,
        agencyIdentityEmail: config.pamAgencyIdentityEmail,
        identityType: config.pamIdentityType,
        namingTemplate: config.pamNamingTemplate,
        roleTemplate: config.pamRoleTemplate || selectedRole,
        checkoutPolicy: {
          durationMinutes: config.pamCheckoutDurationMinutes || 60,
          approvalRequired: config.pamApprovalRequired || false,
          rotationTrigger: config.pamRotationTrigger || 'onCheckin'
        }
      };
    }
    
    return flat;
  };

  // Reset form
  const resetForm = () => {
    setSelectedItemType(null);
    setAgencyConfigSchema(null);
    setAgencyConfig({});
    setFormLabel('');
    setSelectedRole('');
    setValidationErrors({});
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setSelectedItemType(item.itemType);
    setFormLabel(item.label);
    setSelectedRole(item.role);
    
    // Reconstruct agency config from stored data
    const config = item.agencyConfigJson || {};
    if (item.agencyData) {
      Object.assign(config, item.agencyData);
    }
    if (item.humanIdentityStrategy) config.humanIdentityStrategy = item.humanIdentityStrategy;
    if (item.agencyGroupEmail) config.agencyGroupEmail = item.agencyGroupEmail;
    if (item.identityPurpose) config.identityPurpose = item.identityPurpose;
    if (item.pamConfig) {
      config.pamOwnership = item.pamConfig.ownership;
      config.pamIdentityStrategy = item.pamConfig.identityStrategy;
      config.pamAgencyIdentityEmail = item.pamConfig.agencyIdentityEmail;
      config.pamIdentityType = item.pamConfig.identityType;
      config.pamNamingTemplate = item.pamConfig.namingTemplate;
    }
    
    setAgencyConfig(config);
    setShowAddForm(true);
  };

  // Handle delete
  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}/items/${itemId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Deleted', description: 'Item removed' });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  // Get supported item types from plugin
  const supportedItemTypes = pluginManifest?.supportedAccessItemTypes || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!agencyPlatform) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Platform not found</h1>
          <Button onClick={() => router.push('/admin/platforms')} className="mt-4">
            Back to Platforms
          </Button>
        </div>
      </div>
    );
  }

  const platform = agencyPlatform.platform;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin/platforms')}>
              <i className="fas fa-arrow-left mr-2"></i> All Platforms
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <i className={`${platform?.icon || 'fas fa-cube'} text-primary`}></i>
                {platform?.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {platform?.category} • {agencyPlatform.accessItems?.length || 0} access items
              </p>
            </div>
          </div>
          <Badge variant={agencyPlatform.isEnabled ? 'default' : 'secondary'}>
            {agencyPlatform.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {/* Role Templates from Plugin */}
        {pluginManifest && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Supported Role Templates</CardTitle>
              <CardDescription>Roles defined by the platform plugin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pluginManifest.supportedRoleTemplates?.map(role => (
                  <Badge key={role.key} variant="outline" className="px-3 py-1">
                    {role.label}
                    {role.description && (
                      <span className="ml-2 text-xs text-muted-foreground">- {role.description}</span>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Access Items</CardTitle>
              <CardDescription>Define reusable access templates for client requests</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowAddForm(true); }}>
              <i className="fas fa-plus mr-2"></i> Add Access Item
            </Button>
          </CardHeader>
          <CardContent>
            {/* Existing items */}
            {agencyPlatform.accessItems?.length > 0 ? (
              <div className="space-y-3">
                {agencyPlatform.accessItems.map(item => {
                  const typeConfig = ACCESS_ITEM_TYPE_CONFIG[item.itemType] || {};
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-${typeConfig.color || 'gray'}-100 flex items-center justify-center`}>
                          <i className={`${typeConfig.icon || 'fas fa-cog'} text-${typeConfig.color || 'gray'}-600`}></i>
                        </div>
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {typeConfig.label || item.itemType} • {item.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                          <i className="fas fa-pen"></i>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                          <i className="fas fa-trash text-destructive"></i>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <i className="fas fa-inbox text-4xl mb-3"></i>
                <p>No access items configured yet</p>
                <p className="text-sm">Add items to enable this platform for client requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>{editingItem ? 'Edit Access Item' : 'Add Access Item'}</CardTitle>
              <CardDescription>
                Configure a reusable access template using plugin-defined schema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Select Item Type */}
              {!selectedItemType && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Select Access Type</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Only types supported by this platform are shown
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {supportedItemTypes.map(type => {
                      const config = ACCESS_ITEM_TYPE_CONFIG[type];
                      if (!config) return null;
                      return (
                        <button
                          key={type}
                          onClick={() => handleSelectItemType(type)}
                          className={`p-4 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full bg-${config.color}-100 flex items-center justify-center`}>
                              <i className={`${config.icon} text-${config.color}-600`}></i>
                            </div>
                            <div>
                              <p className="font-medium">{config.label}</p>
                              <p className="text-xs text-muted-foreground">{config.desc}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {supportedItemTypes.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No access types available. Plugin may not be properly configured.
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Configure Item */}
              {selectedItemType && (
                <div className="space-y-6">
                  {/* Type Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <i className={`${ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.icon} mr-2`}></i>
                        {ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.label || selectedItemType}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedItemType(null)}>
                      Change Type
                    </Button>
                  </div>

                  {/* Basic Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Label <span className="text-destructive">*</span></Label>
                      <Input
                        value={formLabel}
                        onChange={(e) => setFormLabel(e.target.value)}
                        placeholder="e.g., Standard Analytics Access"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Role Template <span className="text-destructive">*</span></Label>
                      <select
                        className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                      >
                        <option value="">Select role...</option>
                        {pluginManifest?.supportedRoleTemplates?.map(role => (
                          <option key={role.key} value={role.key}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Plugin Schema-Driven Form */}
                  {agencyConfigSchema && (
                    <SchemaForm
                      schema={agencyConfigSchema}
                      value={agencyConfig}
                      onChange={setAgencyConfig}
                      title="Agency Configuration"
                      description="Platform-specific configuration fields (defined by plugin)"
                      errors={validationErrors}
                    />
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</> : 'Save Item'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
