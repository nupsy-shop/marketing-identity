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
import { 
  getClientInstructions,
  requiresAssetSelection 
} from '@/lib/data/platform-access-instructions.js';
import {
  IDENTITY_PURPOSE,
  HUMAN_IDENTITY_STRATEGY,
  CLIENT_DEDICATED_IDENTITY_TYPE,
  ITEM_TYPE_CONFIG,
  getInstructionsPreview,
  generateClientDedicatedIdentity
} from '@/lib/data/field-policy.js';

// Item type cards for selection
const ITEM_TYPES = [
  { value: 'NAMED_INVITE', label: 'Named Invite', icon: 'fas fa-user-plus', desc: 'Human interactive access via user/group invite' },
  { value: 'PARTNER_DELEGATION', label: 'Partner Delegation', icon: 'fas fa-handshake', desc: 'Grant access via partner/agency seat or manager account' },
  { value: 'GROUP_ACCESS', label: 'Group / Service Account', icon: 'fas fa-users-cog', desc: 'Service account or group-based access' },
  { value: 'PROXY_TOKEN', label: 'API / Integration Token', icon: 'fas fa-key', desc: 'Non-interactive integration via API keys' },
  { value: 'SHARED_ACCOUNT_PAM', label: 'Shared Account (PAM)', icon: 'fas fa-shield-halved', desc: 'Privileged shared account with checkout policy', pam: true }
];

// Item Type → Internal Pattern mapping (pattern is derived automatically from item type)
const ITEM_TYPE_TO_PATTERN = {
  'NAMED_INVITE': 'NAMED_INVITE',
  'PARTNER_DELEGATION': 'PARTNER_DELEGATION',
  'GROUP_ACCESS': 'GROUP_BASED',
  'PROXY_TOKEN': 'PROXY',
  'SHARED_ACCOUNT_PAM': 'PAM'
};

export default function PlatformConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [agencyPlatform, setAgencyPlatform] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [integrationIdentities, setIntegrationIdentities] = useState([]);
  const [formData, setFormData] = useState(defaultForm());

  function defaultForm() {
    return {
      itemType: 'NAMED_INVITE',
      label: '',
      role: '',
      notes: '',
      // Pattern is now derived from itemType (no accessPattern field)
      // Identity taxonomy for Named Invite (CLIENT_DEDICATED moved to PAM only)
      identityPurpose: IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
      humanIdentityStrategy: HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP,
      agencyGroupEmail: '',
      // Integration reference
      integrationIdentityId: '',
      // Partner delegation agency identifiers
      managerAccountId: '',
      businessManagerId: '',
      businessCenterId: '',
      seatId: '',
      // Group-based service account
      serviceAccountEmail: '',
      ssoGroupName: '',
      // Validation
      validationMethod: 'ATTESTATION',
      // PAM fields
      pamOwnership: 'CLIENT_OWNED',
      pamIdentityStrategy: 'STATIC', // STATIC or CLIENT_DEDICATED
      pamIdentityType: 'GROUP', // GROUP or MAILBOX
      pamNamingTemplate: '{clientSlug}-{platformKey}@youragency.com',
      pamAgencyIdentityEmail: '',
      pamRoleTemplate: '',
      pamCheckoutDuration: 60,
      pamRotationTrigger: 'onCheckin'
    };
  }

  useEffect(() => {
    if (params.id) {
      loadPlatform();
      loadIntegrationIdentities();
    }
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

  const loadIntegrationIdentities = async () => {
    try {
      const res = await fetch('/api/integration-identities');
      const data = await res.json();
      if (data.success) {
        setIntegrationIdentities(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load integration identities:', err);
    }
  };

  const openAddForm = () => {
    const platform = agencyPlatform?.platform;
    const firstPattern = platform?.accessPatterns?.[0];
    // Get first supported item type for this platform
    const supportedTypes = platform?.supportedItemTypes || [];
    const firstSupportedType = supportedTypes.length > 0 ? supportedTypes[0] : 'NAMED_INVITE';
    
    setFormData({
      ...defaultForm(),
      itemType: firstSupportedType,
      identityPurpose: firstSupportedType === 'PROXY_TOKEN' ? IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE : IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
      // Set default role from first available pattern
      role: firstPattern?.roles?.[0] || ''
    });
    setEditingItem(null);
    setShowAddForm(true);
  };

  const openEditForm = (item) => {
    setFormData({
      itemType: item.itemType || 'NAMED_INVITE',
      label: item.label || '',
      role: item.role || '',
      notes: item.notes || '',
      identityPurpose: item.identityPurpose || IDENTITY_PURPOSE.HUMAN_INTERACTIVE,
      humanIdentityStrategy: item.humanIdentityStrategy || HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP,
      agencyGroupEmail: item.agencyGroupEmail || '',
      integrationIdentityId: item.integrationIdentityId || '',
      managerAccountId: item.agencyData?.managerAccountId || '',
      businessManagerId: item.agencyData?.businessManagerId || '',
      businessCenterId: item.agencyData?.businessCenterId || '',
      seatId: item.agencyData?.seatId || '',
      serviceAccountEmail: item.agencyData?.serviceAccountEmail || '',
      ssoGroupName: item.agencyData?.ssoGroupName || '',
      validationMethod: item.validationMethod || 'ATTESTATION',
      // PAM fields
      pamOwnership: item.pamConfig?.ownership || 'CLIENT_OWNED',
      pamIdentityStrategy: item.pamConfig?.identityStrategy || 'STATIC',
      pamIdentityType: item.pamConfig?.identityType || 'GROUP',
      pamNamingTemplate: item.pamConfig?.namingTemplate || '{clientSlug}-{platformKey}@youragency.com',
      pamAgencyIdentityEmail: item.pamConfig?.agencyIdentityEmail || '',
      pamRoleTemplate: item.pamConfig?.roleTemplate || '',
      pamCheckoutDuration: item.pamConfig?.checkoutPolicy?.durationMinutes || 60,
      pamRotationTrigger: item.pamConfig?.rotationPolicy?.trigger || 'onCheckin'
    });
    setEditingItem(item.id);
    setShowAddForm(true);
  };

  // Note: Pattern is now derived automatically from itemType - no handlePatternChange needed

  const buildPayload = () => {
    const platformName = agencyPlatform?.platform?.name;
    // Pattern is derived from itemType - NOT from user selection
    const derivedPattern = ITEM_TYPE_TO_PATTERN[formData.itemType] || formData.itemType;
    const itemTypeConfig = ITEM_TYPES.find(t => t.value === formData.itemType);
    const patternLabel = itemTypeConfig?.label || derivedPattern;
    const clientInstructions = getClientInstructions(platformName, patternLabel);

    const base = {
      itemType: formData.itemType,
      // Pattern is auto-derived from itemType - stored for reference only
      accessPattern: derivedPattern,
      patternLabel: patternLabel,
      label: formData.label,
      role: formData.role,
      notes: formData.notes || undefined,
      clientInstructions: clientInstructions,
      // Identity taxonomy
      identityPurpose: formData.identityPurpose,
      validationMethod: formData.validationMethod
    };

    // Human interactive settings - Named Invite (CLIENT_DEDICATED is now only in PAM)
    if (formData.identityPurpose === IDENTITY_PURPOSE.HUMAN_INTERACTIVE && formData.itemType === 'NAMED_INVITE') {
      base.humanIdentityStrategy = formData.humanIdentityStrategy;
      
      if (formData.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP) {
        base.agencyGroupEmail = formData.agencyGroupEmail;
      }
      // INDIVIDUAL_USERS - no email fields needed here (collected at request time)
    }

    // Integration identity reference
    if (formData.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE || formData.itemType === 'PROXY_TOKEN') {
      base.integrationIdentityId = formData.integrationIdentityId || undefined;
    }

    // Partner Delegation - agency identifiers
    if (formData.itemType === 'PARTNER_DELEGATION') {
      base.agencyData = {};
      if (formData.managerAccountId) base.agencyData.managerAccountId = formData.managerAccountId;
      if (formData.businessManagerId) base.agencyData.businessManagerId = formData.businessManagerId;
      if (formData.businessCenterId) base.agencyData.businessCenterId = formData.businessCenterId;
      if (formData.seatId) base.agencyData.seatId = formData.seatId;
      if (Object.keys(base.agencyData).length === 0) delete base.agencyData;
    }

    // Group Access - check purpose
    if (formData.itemType === 'GROUP_ACCESS') {
      if (formData.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE) {
        base.integrationIdentityId = formData.integrationIdentityId || undefined;
      }
    }

    // Shared Account PAM
    if (formData.itemType === 'SHARED_ACCOUNT_PAM') {
      base.pamConfig = {
        ownership: formData.pamOwnership,
        // Identity strategy for Agency-Owned
        identityStrategy: formData.pamOwnership === 'AGENCY_OWNED' ? formData.pamIdentityStrategy : undefined,
        // For STATIC strategy - single email
        agencyIdentityEmail: formData.pamOwnership === 'AGENCY_OWNED' && formData.pamIdentityStrategy === 'STATIC' ? formData.pamAgencyIdentityEmail : undefined,
        // For CLIENT_DEDICATED strategy - per-client identity
        identityType: formData.pamOwnership === 'AGENCY_OWNED' && formData.pamIdentityStrategy === 'CLIENT_DEDICATED' ? formData.pamIdentityType : undefined,
        namingTemplate: formData.pamOwnership === 'AGENCY_OWNED' && formData.pamIdentityStrategy === 'CLIENT_DEDICATED' ? formData.pamNamingTemplate : undefined,
        // Role template for both strategies
        roleTemplate: formData.pamOwnership === 'AGENCY_OWNED' ? formData.pamRoleTemplate : undefined,
        // Checkout policy - always present for PAM
        checkoutPolicy: { durationMinutes: Number(formData.pamCheckoutDuration) || 60 },
        rotationPolicy: { trigger: formData.pamRotationTrigger }
      };
    }

    return base;
  };

  const validateForm = () => {
    // Pattern is derived from itemType, so we only need label and role
    if (!formData.label || !formData.role) {
      toast({ title: 'Validation Error', description: 'Label and Role Template are required', variant: 'destructive' });
      return false;
    }

    // Validate based on identity strategy - Named Invite
    if (formData.itemType === 'NAMED_INVITE' && formData.identityPurpose === IDENTITY_PURPOSE.HUMAN_INTERACTIVE) {
      if (formData.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP && !formData.agencyGroupEmail) {
        toast({ title: 'Validation Error', description: 'Agency User Email is required for Agency Group strategy', variant: 'destructive' });
        return false;
      }
    }

    // PAM validation
    if (formData.itemType === 'SHARED_ACCOUNT_PAM' && formData.pamOwnership === 'AGENCY_OWNED') {
      if (formData.pamIdentityStrategy === 'STATIC') {
        if (!formData.pamAgencyIdentityEmail || !formData.pamRoleTemplate) {
          toast({ title: 'Validation Error', description: 'Agency Identity Email and Role Template are required for Static Agency Identity', variant: 'destructive' });
          return false;
        }
      } else if (formData.pamIdentityStrategy === 'CLIENT_DEDICATED') {
        if (!formData.pamNamingTemplate || !formData.pamRoleTemplate) {
          toast({ title: 'Validation Error', description: 'Naming Template and Role Template are required for Client-Dedicated Identity', variant: 'destructive' });
          return false;
        }
      }
    }

    return true;
  };

  const handleSaveItem = async () => {
    if (!validateForm()) return;

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
  // Get available roles from platform's accessPatterns for the Role Template dropdown
  const availableRoles = [...new Set((platform?.accessPatterns || []).flatMap(p => p.roles || []))];
  
  // Filter item types based on platform's supportedItemTypes
  const supportedItemTypes = platform?.supportedItemTypes || [];
  const filteredItemTypes = ITEM_TYPES.filter(it => 
    supportedItemTypes.length === 0 || supportedItemTypes.includes(it.value)
  );

  // Separate items by type
  const humanItems = accessItems.filter(i => i.identityPurpose !== IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE && i.itemType !== 'SHARED_ACCOUNT_PAM');
  const integrationItems = accessItems.filter(i => i.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE || i.itemType === 'PROXY_TOKEN');
  const pamItems = accessItems.filter(i => i.itemType === 'SHARED_ACCOUNT_PAM');

  // Instructions preview using the derived pattern label
  const derivedPatternLabel = ITEM_TYPES.find(t => t.value === formData.itemType)?.label || formData.itemType;
  const instructionsPreview = getInstructionsPreview({ ...formData, patternLabel: derivedPatternLabel }, platform);

  // Check what agency identifiers are needed for Partner Delegation
  const platformName = platform?.name?.toLowerCase() || '';
  const needsMccId = platformName.includes('google ads') || platformName.includes('youtube');
  const needsBmId = platformName.includes('meta') || platformName.includes('facebook') || platformName.includes('pinterest') || platformName.includes('linkedin');
  const needsBcId = platformName.includes('tiktok') || platformName.includes('snapchat');
  const needsSeatId = platformName.includes('dv360') || platformName.includes('trade desk') || platformName.includes('stackadapt');
  
  // Check if platform needs service account/SSO fields for Group Access
  const needsServiceAccount = platformName.includes('analytics') || platformName.includes('ga4') || platformName.includes('fivetran');
  const needsSsoGroup = platformName.includes('snowflake') || platformName.includes('hubspot') || platformName.includes('salesforce');

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
                  <p className="text-sm text-muted-foreground">{platform?.domain} • {accessItems.length} access item{accessItems.length !== 1 ? 's' : ''}</p>
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

        {/* Supported Role Templates (from platform's access patterns) */}
        {platform?.accessPatterns?.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Supported Role Templates</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {platform.accessPatterns.map(ap => (
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
        )}

        {/* Access Items */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Access Items</h2>
              <p className="text-sm text-muted-foreground">Define reusable access templates for client requests</p>
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
                <CardDescription>Define a reusable access configuration template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item Type - filtered by platform's supportedItemTypes */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Item Type <span className="text-destructive">*</span></Label>
                  {filteredItemTypes.length === 0 ? (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                      <i className="fas fa-exclamation-triangle text-amber-500 text-xl mb-2 block"></i>
                      <p className="text-sm text-amber-800">No item types configured for this platform.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredItemTypes.map(t => (
                        <div
                          key={t.value}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.itemType === t.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            itemType: t.value,
                            identityPurpose: t.value === 'PROXY_TOKEN' ? IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE : IDENTITY_PURPOSE.HUMAN_INTERACTIVE
                          }))}
                        >
                          <div className="flex items-center gap-2">
                            <i className={`${t.icon} text-primary text-sm`}></i>
                            <span className="font-medium text-sm">{t.label}</span>
                            {t.pam && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs ml-auto">PAM</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {supportedItemTypes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <i className="fas fa-info-circle mr-1"></i>
                      {platform?.name} supports: {filteredItemTypes.map(t => t.label).join(', ')}
                    </p>
                  )}
                </div>

                {/* Identity Purpose for GROUP_ACCESS */}
                {formData.itemType === 'GROUP_ACCESS' && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <Label className="text-sm font-medium mb-2 block">Identity Purpose <span className="text-destructive">*</span></Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: IDENTITY_PURPOSE.HUMAN_INTERACTIVE, label: 'Human Interactive', icon: 'fas fa-user', desc: 'User group that logs in' },
                        { value: IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE, label: 'Integration (Non-Human)', icon: 'fas fa-robot', desc: 'Service account or API' }
                      ].map(o => (
                        <div
                          key={o.value}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.identityPurpose === o.value ? 'border-purple-500 bg-white' : 'border-purple-200 hover:border-purple-400'}`}
                          onClick={() => setFormData(prev => ({ ...prev, identityPurpose: o.value }))}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`${o.icon} text-purple-600 text-sm`}></i>
                            <span className="font-medium text-sm">{o.label}</span>
                          </div>
                          <p className="text-xs text-purple-800">{o.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Identity Strategy for NAMED_INVITE */}
                {formData.itemType === 'NAMED_INVITE' && formData.identityPurpose === IDENTITY_PURPOSE.HUMAN_INTERACTIVE && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Label className="text-sm font-medium mb-2 block">Identity Strategy <span className="text-destructive">*</span></Label>
                    <div className="space-y-2">
                      {[
                        { value: HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP, label: 'Agency Group', icon: 'fas fa-users', desc: 'Use a single agency-wide group email for all clients', recommended: true },
                        { value: HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS, label: 'Individual Users', icon: 'fas fa-user-friends', desc: 'Select specific users when creating request' }
                      ].map(o => (
                        <div
                          key={o.value}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.humanIdentityStrategy === o.value ? 'border-blue-500 bg-white' : 'border-blue-200 hover:border-blue-400'}`}
                          onClick={() => setFormData(prev => ({ ...prev, humanIdentityStrategy: o.value }))}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <i className={`${o.icon} text-blue-600 text-sm`}></i>
                            <span className="font-medium text-sm">{o.label}</span>
                            {o.recommended && <Badge className="bg-green-100 text-green-700 text-xs ml-2">Recommended</Badge>}
                            {formData.humanIdentityStrategy === o.value && <i className="fas fa-check-circle text-blue-600 ml-auto"></i>}
                          </div>
                          <p className="text-xs text-blue-800">{o.desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* AGENCY_GROUP specific fields */}
                    {formData.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <Label className="text-sm">Agency User Email <span className="text-destructive">*</span></Label>
                        <Input
                          type="email"
                          placeholder="agency-user@youragency.com"
                          value={formData.agencyGroupEmail}
                          onChange={e => setFormData(prev => ({ ...prev, agencyGroupEmail: e.target.value }))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">This email will be invited to all client accounts</p>
                      </div>
                    )}

                    {/* INDIVIDUAL_USERS info */}
                    {formData.humanIdentityStrategy === HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="p-3 rounded bg-amber-50 border border-amber-200">
                          <p className="text-sm text-amber-800"><i className="fas fa-info-circle mr-2"></i>Invitees will be selected when generating each client access request.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Integration Identity Reference */}
                {(formData.identityPurpose === IDENTITY_PURPOSE.INTEGRATION_NON_INTERACTIVE || formData.itemType === 'PROXY_TOKEN') && (
                  <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <Label className="text-sm font-medium mb-2 block">Integration Identity</Label>
                    <select
                      className="w-full border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={formData.integrationIdentityId}
                      onChange={e => setFormData(prev => ({ ...prev, integrationIdentityId: e.target.value }))}
                    >
                      <option value="">Select an integration identity...</option>
                      {integrationIdentities.filter(i => i.isActive).map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-2">
                      <i className="fas fa-external-link-alt mr-1"></i>
                      <a href="/admin/integrations" className="text-primary hover:underline" target="_blank">Manage Integration Identities</a>
                    </p>
                  </div>
                )}

                {/* Partner Delegation - Agency Identifiers */}
                {formData.itemType === 'PARTNER_DELEGATION' && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <Label className="text-sm font-medium mb-2 block"><i className="fas fa-id-card mr-2"></i>Agency Identifiers</Label>
                    <p className="text-xs text-green-700 mb-3">These are your agency's account IDs that clients will link to.</p>
                    <div className="space-y-3">
                      {needsMccId && (
                        <div>
                          <Label className="text-sm">Google Ads Manager (MCC) ID</Label>
                          <Input
                            placeholder="e.g., 123-456-7890"
                            value={formData.managerAccountId}
                            onChange={e => setFormData(prev => ({ ...prev, managerAccountId: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      )}
                      {needsBmId && (
                        <div>
                          <Label className="text-sm">Business Manager ID</Label>
                          <Input
                            placeholder="e.g., 1234567890"
                            value={formData.businessManagerId}
                            onChange={e => setFormData(prev => ({ ...prev, businessManagerId: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      )}
                      {needsBcId && (
                        <div>
                          <Label className="text-sm">Business Center ID</Label>
                          <Input
                            placeholder="e.g., 7123456789012345"
                            value={formData.businessCenterId}
                            onChange={e => setFormData(prev => ({ ...prev, businessCenterId: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      )}
                      {needsSeatId && (
                        <div>
                          <Label className="text-sm">Seat / Partner ID</Label>
                          <Input
                            placeholder="Your agency seat ID"
                            value={formData.seatId}
                            onChange={e => setFormData(prev => ({ ...prev, seatId: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      )}
                      {!needsMccId && !needsBmId && !needsBcId && !needsSeatId && (
                        <div>
                          <Label className="text-sm">Agency Identifier</Label>
                          <Input
                            placeholder="Your agency's partner/manager ID"
                            value={formData.managerAccountId}
                            onChange={e => setFormData(prev => ({ ...prev, managerAccountId: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PAM Configuration */}
                {formData.itemType === 'SHARED_ACCOUNT_PAM' && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-shield-halved text-amber-600"></i>
                      <p className="font-semibold text-sm text-amber-900">PAM Configuration</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Ownership Model <span className="text-destructive">*</span></Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'CLIENT_OWNED', label: 'Client-Owned', desc: 'Client provides credentials during onboarding' },
                          { value: 'AGENCY_OWNED', label: 'Agency-Owned', desc: 'Client invites agency identity' }
                        ].map(o => (
                          <div
                            key={o.value}
                            className={`border rounded-lg p-3 cursor-pointer ${formData.pamOwnership === o.value ? 'border-amber-500 bg-white' : 'border-amber-200'}`}
                            onClick={() => setFormData(prev => ({ ...prev, pamOwnership: o.value, pamIdentityStrategy: o.value === 'AGENCY_OWNED' ? 'STATIC' : undefined }))}
                          >
                            <p className="font-medium text-sm">{o.label}</p>
                            <p className="text-xs text-amber-800">{o.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Agency-Owned Identity Strategy */}
                    {formData.pamOwnership === 'AGENCY_OWNED' && (
                      <div className="space-y-4 border-t border-amber-200 pt-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Identity Strategy <span className="text-destructive">*</span></Label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: 'STATIC', label: 'Static Agency Identity', desc: 'Use a single agency email for all clients', icon: 'fas fa-envelope' },
                              { value: 'CLIENT_DEDICATED', label: 'Client-Dedicated Identity', desc: 'Generate unique identity per client', icon: 'fas fa-user-tag' }
                            ].map(o => (
                              <div
                                key={o.value}
                                className={`border rounded-lg p-3 cursor-pointer transition-colors ${formData.pamIdentityStrategy === o.value ? 'border-amber-500 bg-white' : 'border-amber-200 hover:border-amber-400'}`}
                                onClick={() => setFormData(prev => ({ ...prev, pamIdentityStrategy: o.value }))}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <i className={`${o.icon} text-amber-600 text-sm`}></i>
                                  <span className="font-medium text-sm">{o.label}</span>
                                  {formData.pamIdentityStrategy === o.value && <i className="fas fa-check-circle text-amber-600 ml-auto"></i>}
                                </div>
                                <p className="text-xs text-amber-800">{o.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* STATIC identity - single email */}
                        {formData.pamIdentityStrategy === 'STATIC' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Agency Identity Email <span className="text-destructive">*</span></Label>
                              <Input
                                type="email"
                                placeholder="shared-account@youragency.com"
                                value={formData.pamAgencyIdentityEmail}
                                onChange={e => setFormData(prev => ({ ...prev, pamAgencyIdentityEmail: e.target.value }))}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">This single email will be invited to all client accounts</p>
                            </div>
                            <div>
                              <Label className="text-sm">Role Template <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="e.g., Admin, Editor"
                                value={formData.pamRoleTemplate}
                                onChange={e => setFormData(prev => ({ ...prev, pamRoleTemplate: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}

                        {/* CLIENT_DEDICATED identity - per-client email */}
                        {formData.pamIdentityStrategy === 'CLIENT_DEDICATED' && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm">Identity Type</Label>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                {[
                                  { value: 'GROUP', label: 'Group', desc: 'Google Group / Distribution List' },
                                  { value: 'MAILBOX', label: 'Mailbox', desc: 'Loginable account (uses PAM checkout)' }
                                ].map(t => (
                                  <div
                                    key={t.value}
                                    className={`border rounded p-2 cursor-pointer text-sm ${formData.pamIdentityType === t.value ? 'border-amber-500 bg-white' : 'border-amber-200'}`}
                                    onClick={() => setFormData(prev => ({ ...prev, pamIdentityType: t.value }))}
                                  >
                                    <p className="font-medium">{t.label}</p>
                                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm">Naming Template <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="{clientSlug}-{platformKey}@youragency.com"
                                value={formData.pamNamingTemplate}
                                onChange={e => setFormData(prev => ({ ...prev, pamNamingTemplate: e.target.value }))}
                                className="mt-1 font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground mt-1">Variables: {'{clientSlug}'}, {'{platformKey}'}</p>
                            </div>
                            {/* Preview */}
                            {formData.pamNamingTemplate && (
                              <div className="p-3 rounded bg-white border border-amber-200">
                                <p className="text-xs text-muted-foreground">Sample identity for "Acme Corp":</p>
                                <p className="font-mono text-sm text-amber-700">
                                  {formData.pamNamingTemplate
                                    .replace('{clientSlug}', 'acme-corp')
                                    .replace('{platformKey}', platform?.slug || 'platform')}
                                </p>
                              </div>
                            )}
                            <div>
                              <Label className="text-sm">Role Template <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="e.g., Admin, Editor"
                                value={formData.pamRoleTemplate}
                                onChange={e => setFormData(prev => ({ ...prev, pamRoleTemplate: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            
                            {/* PAM Checkout Policy - only for MAILBOX */}
                            {formData.pamIdentityType === 'MAILBOX' && (
                              <div className="p-3 rounded bg-amber-100 border border-amber-300 space-y-3">
                                <p className="text-xs font-semibold text-amber-900"><i className="fas fa-key mr-1"></i>PAM Checkout Policy (Mailbox only)</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Checkout Duration (min)</Label>
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
                                    <Label className="text-xs">Rotation Trigger</Label>
                                    <select
                                      className="w-full mt-1 border border-input rounded-md px-2 py-1.5 bg-background text-sm"
                                      value={formData.pamRotationTrigger}
                                      onChange={e => setFormData(prev => ({ ...prev, pamRotationTrigger: e.target.value }))}
                                    >
                                      <option value="onCheckin">On Check-in</option>
                                      <option value="scheduled">Scheduled</option>
                                      <option value="offboard">On Offboarding</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Client-Owned PAM - Checkout settings */}
                    {formData.pamOwnership === 'CLIENT_OWNED' && (
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
                    )}
                  </div>
                )}

                {/* Common fields */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-sm">Label <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g., GA4 Standard Access"
                      value={formData.label}
                      onChange={e => setFormData(prev => ({ ...prev, label: e.target.value }))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">A descriptive name for this access configuration</p>
                  </div>

                  {/* Derived Pattern Display (read-only info) */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-info-circle text-slate-500"></i>
                      <span className="text-sm text-slate-600">
                        Access Pattern: <strong className="text-slate-800">{ITEM_TYPES.find(t => t.value === formData.itemType)?.label || formData.itemType}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Pattern is automatically determined by the Item Type selected above</p>
                  </div>

                  <div>
                    <Label className="text-sm">Role Template <span className="text-destructive">*</span></Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={formData.role}
                      onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="">Select a role...</option>
                      {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">The permission level to request from the client</p>
                  </div>

                  <div>
                    <Label className="text-sm">Validation Method</Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={formData.validationMethod}
                      onChange={e => setFormData(prev => ({ ...prev, validationMethod: e.target.value }))}
                    >
                      <option value="ATTESTATION">Client Attestation</option>
                      <option value="API_VERIFICATION">API Verification</option>
                      <option value="EVIDENCE_UPLOAD">Evidence Upload</option>
                      <option value="OAUTH_CALLBACK">OAuth Callback</option>
                    </select>
                  </div>

                  {/* Instructions Preview */}
                  {instructionsPreview && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <i className="fas fa-eye text-emerald-600"></i>
                        <p className="font-semibold text-sm text-emerald-900">Client Onboarding Preview</p>
                      </div>
                      <p className="text-xs text-emerald-800">{instructionsPreview}</p>
                      <p className="text-xs text-emerald-600 mt-2 italic">
                        <i className="fas fa-info-circle mr-1"></i>
                        Asset selection (property ID, ad accounts, etc.) will be collected during client onboarding.
                      </p>
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

          {/* Items grouped by type */}
          {accessItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <i className="fas fa-list-check text-4xl text-muted-foreground mb-4 block"></i>
                <h3 className="font-semibold mb-2">No access items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add access items to define reusable templates for client requests.</p>
                {!showAddForm && <Button variant="outline" onClick={openAddForm}><i className="fas fa-plus mr-2"></i>Add First Item</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Human Interactive Items */}
              {humanItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <i className="fas fa-user text-blue-600"></i>Human Interactive ({humanItems.length})
                  </p>
                  <div className="space-y-2">
                    {humanItems.map(item => (
                      <ItemRow key={item.id} item={item} onEdit={openEditForm} onDelete={handleDeleteItem} />
                    ))}
                  </div>
                </div>
              )}
              {/* Integration Items */}
              {integrationItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <i className="fas fa-robot text-purple-600"></i>Integration (Non-Human) ({integrationItems.length})
                  </p>
                  <div className="space-y-2">
                    {integrationItems.map(item => (
                      <ItemRow key={item.id} item={item} onEdit={openEditForm} onDelete={handleDeleteItem} isIntegration />
                    ))}
                  </div>
                </div>
              )}
              {/* PAM Items */}
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

function ItemRow({ item, onEdit, onDelete, isPam = false, isIntegration = false }) {
  const strategy = item.humanIdentityStrategy;
  const strategyLabel = strategy === HUMAN_IDENTITY_STRATEGY.CLIENT_DEDICATED ? 'Client-Dedicated'
    : strategy === HUMAN_IDENTITY_STRATEGY.AGENCY_GROUP ? 'Agency Group'
    : strategy === HUMAN_IDENTITY_STRATEGY.INDIVIDUAL_USERS ? 'Individual Users'
    : null;

  return (
    <Card className={`border ${isPam ? 'border-amber-200 bg-amber-50/30' : isIntegration ? 'border-purple-200 bg-purple-50/30' : ''}`}>
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-sm">{item.label}</p>
              <Badge variant="secondary" className="text-xs">{item.role}</Badge>
              {strategyLabel && <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">{strategyLabel}</Badge>}
              {isIntegration && <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">Integration</Badge>}
              {isPam && (
                <Badge className={`text-xs ${item.pamConfig?.ownership === 'CLIENT_OWNED' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                  {item.pamConfig?.ownership === 'CLIENT_OWNED' ? 'Client-Owned' : 'Agency-Owned'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{item.patternLabel || item.accessPattern}</span>
              {item.agencyGroupEmail && <span><i className="fas fa-envelope mr-1"></i>{item.agencyGroupEmail}</span>}
              {item.namingTemplate && <span><i className="fas fa-tag mr-1"></i>{item.namingTemplate}</span>}
              {item.agencyData?.managerAccountId && <span><i className="fas fa-id-badge mr-1"></i>{item.agencyData.managerAccountId}</span>}
              {isPam && item.pamConfig?.checkoutPolicy?.durationMinutes && (
                <span><i className="fas fa-clock mr-1"></i>{item.pamConfig.checkoutPolicy.durationMinutes}min checkout</span>
              )}
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
