'use client';

/**
 * Platform Configuration Page - Plugin-Based Architecture
 * Uses schema-driven forms from plugins for all platform-specific configuration
 * 
 * Improvements:
 * - Platform logos from plugin manifests
 * - Search and filter for access items
 * - Confirmation dialogs for destructive actions
 * - Better accessibility and visual hierarchy
 * - Naming validation
 * - Custom role management
 * - Enhanced toast notifications
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import SchemaForm from '@/components/SchemaForm';
import PlatformLogo from '@/components/PlatformLogo';
import ConfirmDialog from '@/components/ConfirmDialog';
import CustomRoleDialog from '@/components/CustomRoleDialog';
import { validateAccessItemLabel, formatConfigKey } from '@/lib/validation';

// Access Item Type display configuration - derived from plugin metadata
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
  GROUP_ACCESS: { 
    label: 'Group / Service Account', 
    icon: 'fas fa-users-cog', 
    desc: 'Service account or SSO/SCIM group-based access',
    color: 'purple'
  },
  PROXY_TOKEN: { 
    label: 'API / Integration Token', 
    icon: 'fas fa-robot', 
    desc: 'Non-interactive integration via API keys or service accounts',
    color: 'orange'
  },
  SHARED_ACCOUNT: { 
    label: 'Shared Account (PAM)', 
    icon: 'fas fa-key', 
    desc: 'Privileged shared account with credential vault and checkout policy',
    color: 'red'
  }
};

// Map legacy item types to current types
const ITEM_TYPE_MAP = {
  'GROUP_SERVICE': 'GROUP_ACCESS',
  'PAM_SHARED_ACCOUNT': 'SHARED_ACCOUNT',
  'SHARED_ACCOUNT_PAM': 'SHARED_ACCOUNT'
};

// Normalize item type to current format
function normalizeItemType(itemType) {
  return ITEM_TYPE_MAP[itemType] || itemType;
}

// PAM Recommendation display configuration
const PAM_RECOMMENDATION_CONFIG = {
  recommended: {
    badge: '✓ Recommended',
    badgeClass: 'bg-green-100 text-green-700',
    description: 'PAM is the recommended access method for this platform.',
    requiresConfirmation: false,
    requiresJustification: false
  },
  not_recommended: {
    badge: '⚠️ Not Recommended',
    badgeClass: 'bg-amber-100 text-amber-700',
    description: 'Native delegation/RBAC options are preferred. Use PAM only for legacy constraints or client-mandated requirements.',
    requiresConfirmation: true,
    requiresJustification: false
  },
  break_glass_only: {
    badge: '🚨 Break-Glass Only',
    badgeClass: 'bg-red-100 text-red-700',
    description: 'PAM should only be used in emergency break-glass scenarios. Full justification required.',
    requiresConfirmation: true,
    requiresJustification: true
  }
};

export default function PlatformConfigPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  // State
  const [agencyPlatform, setAgencyPlatform] = useState(null);
  const [pluginManifest, setPluginManifest] = useState(null);
  const [securityCapabilities, setSecurityCapabilities] = useState(null);
  const [accessItemTypeMetadata, setAccessItemTypeMetadata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [integrationIdentities, setIntegrationIdentities] = useState([]);
  
  // Form state
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [agencyConfigSchema, setAgencyConfigSchema] = useState(null);
  const [agencyConfig, setAgencyConfig] = useState({});
  const [formLabel, setFormLabel] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // PAM-specific form state
  const [pamConfirmation, setPamConfirmation] = useState(false);
  const [pamJustification, setPamJustification] = useState('');
  const [pamReasonCode, setPamReasonCode] = useState('');
  
  // Search and filter state for access items
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [itemSortBy, setItemSortBy] = useState('label');
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null,
  });
  
  // Custom role dialog state
  const [customRoleDialog, setCustomRoleDialog] = useState({
    open: false,
    editingRole: null,
  });
  const [customRoles, setCustomRoles] = useState([]);
  
  // Label validation state
  const [labelError, setLabelError] = useState('');

  // Get platform key from name
  const getPlatformKey = useCallback((name) => {
    if (!name) return null;
    const normalized = name.toLowerCase();
    
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
      'display': 'dv360',
      'video 360': 'dv360',
      'the trade desk': 'trade-desk',
      'trade desk': 'trade-desk',
      'tiktok': 'tiktok',
      'snapchat': 'snapchat',
      'linkedin': 'linkedin',
      'pinterest': 'pinterest',
      'hubspot': 'hubspot',
      'salesforce': 'salesforce',
      'google tag manager': 'gtm',
      'tag manager': 'gtm',
      'gtm': 'gtm',
      'universal analytics': 'ga-ua',
      'looker': 'ga4', // Looker Studio uses similar config to GA4
      'data studio': 'ga4',
    };
    
    for (const [key, value] of Object.entries(keyMap)) {
      if (normalized.includes(key)) return value;
    }
    return null;
  }, []);

  // Fetch agency platform data
  const fetchData = useCallback(async () => {
    try {
      const [platformRes, identitiesRes] = await Promise.all([
        fetch(`/api/agency/platforms/${params.id}`),
        fetch('/api/integration-identities')
      ]);
      
      const platformData = await platformRes.json();
      const identitiesData = await identitiesRes.json();
      
      if (platformData.success) {
        setAgencyPlatform(platformData.data);
        
        // Use manifest from API response (single source of truth)
        // The API enriches agency platform with the full plugin manifest
        const manifest = platformData.data.manifest;
        if (manifest) {
          console.log('Using manifest from API:', manifest.platformKey, 'types:', manifest.supportedAccessItemTypes?.length);
          setPluginManifest(manifest);
          
          // Extract security capabilities from manifest
          if (manifest.securityCapabilities) {
            setSecurityCapabilities(manifest.securityCapabilities);
          }
          
          // Extract access item type metadata (new format with type objects)
          if (manifest.supportedAccessItemTypes?.length > 0) {
            const metadata = manifest.supportedAccessItemTypes;
            // Check if it's the new format with type objects
            if (typeof metadata[0] === 'object' && metadata[0].type) {
              setAccessItemTypeMetadata(metadata);
            }
          }
        } else {
          // Fallback: Fetch plugin manifest separately if not in API response
          const platformKey = getPlatformKey(platformData.data.platform?.name);
          if (platformKey) {
            try {
              const pluginRes = await fetch(`/api/plugins/${platformKey}`);
              const pluginData = await pluginRes.json();
              if (pluginData.success && pluginData.data?.manifest) {
                const fallbackManifest = pluginData.data.manifest;
                console.log('Using fallback manifest from plugin API:', fallbackManifest.platformKey);
                setPluginManifest(fallbackManifest);
                
                if (fallbackManifest.securityCapabilities) {
                  setSecurityCapabilities(fallbackManifest.securityCapabilities);
                }
                
                if (fallbackManifest.supportedAccessItemTypes?.length > 0) {
                  const metadata = fallbackManifest.supportedAccessItemTypes;
                  if (typeof metadata[0] === 'object' && metadata[0].type) {
                    setAccessItemTypeMetadata(metadata);
                  }
                }
              }
            } catch (e) {
              console.log('Plugin not found for platform, using legacy mode');
            }
          }
        }
      }
      
      if (identitiesData.success) {
        setIntegrationIdentities(identitiesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching platform:', error);
      toast({ title: 'Error', description: 'Failed to load platform', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [params.id, toast, getPlatformKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch schema when item type changes
  useEffect(() => {
    const fetchSchema = async () => {
      if (!selectedItemType || !agencyPlatform) return;
      
      const platformKey = getPlatformKey(agencyPlatform.platform?.name);
      if (!platformKey) {
        setAgencyConfigSchema(null);
        return;
      }
      
      // Map old item types to new plugin types
      const pluginItemType = ITEM_TYPE_MAP[selectedItemType] || selectedItemType;
      
      try {
        const res = await fetch(`/api/plugins/${platformKey}/schema/agency-config?accessItemType=${pluginItemType}`);
        const data = await res.json();
        if (data.success && data.data) {
          setAgencyConfigSchema(data.data);
        } else {
          setAgencyConfigSchema(null);
        }
      } catch (error) {
        console.error('Error fetching schema:', error);
        setAgencyConfigSchema(null);
      }
    };
    
    fetchSchema();
  }, [selectedItemType, agencyPlatform, getPlatformKey]);

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

  // Flatten config for backward compatibility with existing API
  const flattenConfigForApi = (config, itemType) => {
    const result = {
      agencyData: {}
    };
    
    // Map schema fields to legacy API fields
    if (config.managerAccountId) {
      result.agencyData.managerAccountId = config.managerAccountId;
    }
    if (config.businessManagerId) {
      result.agencyData.businessManagerId = config.businessManagerId;
    }
    if (config.businessCenterId) {
      result.agencyData.businessCenterId = config.businessCenterId;
    }
    if (config.seatId) {
      result.agencyData.seatId = config.seatId;
    }
    if (config.serviceAccountEmail) {
      result.agencyData.serviceAccountEmail = config.serviceAccountEmail;
    }
    if (config.ssoGroupName) {
      result.agencyData.ssoGroupName = config.ssoGroupName;
    }
    
    // Identity strategy fields
    if (config.humanIdentityStrategy) {
      result.humanIdentityStrategy = config.humanIdentityStrategy;
    }
    if (config.agencyGroupEmail) {
      result.agencyGroupEmail = config.agencyGroupEmail;
    }
    if (config.namingTemplate) {
      result.namingTemplate = config.namingTemplate;
    }
    if (config.identityPurpose) {
      result.identityPurpose = config.identityPurpose;
    }
    if (config.integrationIdentityId) {
      result.integrationIdentityId = config.integrationIdentityId;
    }
    
    // PAM config
    if (itemType === 'SHARED_ACCOUNT_PAM' || itemType === 'PAM_SHARED_ACCOUNT') {
      result.pamConfig = {
        ownership: config.pamOwnership || 'CLIENT_OWNED',
        identityStrategy: config.pamIdentityStrategy,
        agencyIdentityEmail: config.pamAgencyIdentityEmail,
        identityType: config.pamIdentityType,
        namingTemplate: config.pamNamingTemplate,
        roleTemplate: selectedRole,
        checkoutPolicy: {
          durationMinutes: config.pamCheckoutDurationMinutes || 60,
          approvalRequired: config.pamApprovalRequired || false,
          rotationTrigger: config.pamRotationTrigger || 'onCheckin'
        }
      };
    }
    
    return result;
  };

  // Validate and save
  const handleSave = async () => {
    // Validate label with naming conventions
    const labelValidation = validateAccessItemLabel(formLabel);
    if (!labelValidation.valid) {
      setLabelError(labelValidation.errors[0]);
      toast({ 
        title: 'Validation Error', 
        description: labelValidation.errors[0], 
        variant: 'destructive' 
      });
      return;
    }
    setLabelError('');
    
    // Use formatted label
    const formattedLabel = labelValidation.formatted;
    
    if (!selectedRole) {
      toast({ title: 'Validation Error', description: 'Please select a role for this access item', variant: 'destructive' });
      return;
    }
    
    const platformKey = getPlatformKey(agencyPlatform.platform?.name);
    const pluginItemType = ITEM_TYPE_MAP[selectedItemType] || selectedItemType;
    
    // Validate PAM requirements if SHARED_ACCOUNT
    if (normalizeItemType(selectedItemType) === 'SHARED_ACCOUNT' && securityCapabilities) {
      const pamConfig = getPamConfig();
      
      // Check confirmation requirement
      if (pamConfig?.requiresConfirmation && !pamConfirmation) {
        toast({ 
          title: 'PAM Confirmation Required', 
          description: 'Please confirm you understand the security implications of PAM access.',
          variant: 'destructive' 
        });
        return;
      }
      
      // Check justification requirement for break-glass
      if (pamConfig?.requiresJustification) {
        if (!pamReasonCode) {
          toast({ 
            title: 'Reason Code Required', 
            description: 'Please select a reason code for break-glass PAM access.',
            variant: 'destructive' 
          });
          return;
        }
        if (!pamJustification.trim() || pamJustification.trim().length < 20) {
          toast({ 
            title: 'Justification Required', 
            description: 'Please provide a detailed justification (at least 20 characters) for break-glass PAM access.',
            variant: 'destructive' 
          });
          return;
        }
      }
    }
    
    // Validate with plugin if available
    if (platformKey && agencyConfigSchema) {
      try {
        const validateRes = await fetch(`/api/plugins/${platformKey}/validate/agency-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessItemType: pluginItemType,
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
            title: 'Configuration Error', 
            description: validateData.data?.errors?.join(', ') || 'Please check your configuration', 
            variant: 'destructive' 
          });
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
      }
    }
    
    setSaving(true);
    try {
      // Build payload with both new JSON config and legacy fields for backward compatibility
      const legacyFields = flattenConfigForApi(agencyConfig, selectedItemType);
      
      // Include PAM metadata if applicable
      const pamMetadata = normalizeItemType(selectedItemType) === 'SHARED_ACCOUNT' ? {
        pamConfirmation,
        pamReasonCode: pamReasonCode || null,
        pamJustification: pamJustification || null,
        pamRecommendation: securityCapabilities?.pamRecommendation
      } : {};
      
      const payload = {
        itemType: normalizeItemType(selectedItemType),
        label: formattedLabel,
        role: selectedRole,
        notes: formNotes,
        agencyConfigJson: { ...agencyConfig, ...pamMetadata },
        ...legacyFields
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
        toast({ 
          title: editingItem ? '✓ Access Item Updated' : '✓ Access Item Created',
          description: `"${formattedLabel}" has been ${editingItem ? 'updated' : 'added'} successfully.`
        });
        setShowAddForm(false);
        setEditingItem(null);
        resetForm();
        fetchData();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to save. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save item. Please check your connection.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedItemType(null);
    setAgencyConfigSchema(null);
    setAgencyConfig({});
    setFormLabel('');
    setFormNotes('');
    setSelectedRole('');
    setValidationErrors({});
    setLabelError('');
  };

  // Handle edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setSelectedItemType(item.itemType);
    setFormLabel(item.label || '');
    setFormNotes(item.notes || '');
    setSelectedRole(item.role || '');
    setLabelError('');
    
    // Reconstruct agency config from stored data
    const config = item.agencyConfigJson ? { ...item.agencyConfigJson } : {};
    
    // Merge legacy fields
    if (item.agencyData) {
      Object.assign(config, item.agencyData);
    }
    if (item.humanIdentityStrategy) config.humanIdentityStrategy = item.humanIdentityStrategy;
    if (item.agencyGroupEmail) config.agencyGroupEmail = item.agencyGroupEmail;
    if (item.identityPurpose) config.identityPurpose = item.identityPurpose;
    if (item.namingTemplate) config.namingTemplate = item.namingTemplate;
    if (item.integrationIdentityId) config.integrationIdentityId = item.integrationIdentityId;
    
    // PAM config
    if (item.pamConfig) {
      config.pamOwnership = item.pamConfig.ownership;
      config.pamIdentityStrategy = item.pamConfig.identityStrategy;
      config.pamAgencyIdentityEmail = item.pamConfig.agencyIdentityEmail;
      config.pamIdentityType = item.pamConfig.identityType;
      config.pamNamingTemplate = item.pamConfig.namingTemplate;
      if (item.pamConfig.checkoutPolicy) {
        config.pamCheckoutDurationMinutes = item.pamConfig.checkoutPolicy.durationMinutes;
        config.pamApprovalRequired = item.pamConfig.checkoutPolicy.approvalRequired;
        config.pamRotationTrigger = item.pamConfig.checkoutPolicy.rotationTrigger;
      }
    }
    
    setAgencyConfig(config);
    setShowAddForm(true);
  };

  // Handle delete with confirmation
  const openDeleteDialog = (item) => {
    setConfirmDialog({
      open: true,
      item: item,
    });
  };
  
  const handleConfirmDelete = async () => {
    const item = confirmDialog.item;
    if (!item) return;
    
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}/items/${item.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Access Item Deleted', description: `"${item.label}" has been removed.` });
        fetchData();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setConfirmDialog({ open: false, item: null });
    }
  };

  // Handle toggle platform enabled
  const handleToggleEnabled = async () => {
    try {
      const res = await fetch(`/api/agency/platforms/${params.id}/toggle`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        setAgencyPlatform(data.data);
        toast({ 
          title: data.data.isEnabled ? 'Platform Enabled' : 'Platform Disabled',
          description: `${agencyPlatform.platform?.name} is now ${data.data.isEnabled ? 'enabled' : 'disabled'}`
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to toggle platform', variant: 'destructive' });
    }
  };

  // Get supported item types - from plugin or legacy platform data
  const getSupportedItemTypes = () => {
    // First try plugin manifest
    if (pluginManifest?.supportedAccessItemTypes?.length > 0) {
      // Map plugin types back to legacy types used in DB
      // Handle new format - array of AccessItemTypeMetadata objects
      if (typeof pluginManifest.supportedAccessItemTypes[0] === 'object' && pluginManifest.supportedAccessItemTypes[0].type) {
        return pluginManifest.supportedAccessItemTypes.map(meta => normalizeItemType(meta.type));
      }
      
      // Legacy format - array of strings
      return pluginManifest.supportedAccessItemTypes.map(type => normalizeItemType(type));
    }
    
    // Fall back to platform's supportedItemTypes
    if (agencyPlatform?.platform?.supportedItemTypes?.length > 0) {
      return agencyPlatform.platform.supportedItemTypes.map(t => normalizeItemType(t));
    }
    
    // Default all types
    return ['NAMED_INVITE', 'PARTNER_DELEGATION', 'GROUP_ACCESS', 'PROXY_TOKEN', 'SHARED_ACCOUNT'];
  };

  // Get role templates for a specific item type (from plugin metadata)
  const getRoleTemplatesForType = (itemType) => {
    // First, check if we have new-format metadata with per-type roles
    if (accessItemTypeMetadata.length > 0) {
      const metadata = accessItemTypeMetadata.find(m => normalizeItemType(m.type) === normalizeItemType(itemType));
      if (metadata?.roleTemplates?.length > 0) {
        return metadata.roleTemplates;
      }
    }
    
    // Fall back to global plugin role templates
    if (pluginManifest?.supportedRoleTemplates?.length > 0) {
      return pluginManifest.supportedRoleTemplates;
    }
    
    // Fall back to platform's default roles
    const platformRoles = agencyPlatform?.platform?.defaultRoles;
    if (platformRoles?.length > 0) {
      return platformRoles.map(r => ({ key: r, label: r }));
    }
    
    return [
      { key: 'admin', label: 'Admin' },
      { key: 'standard', label: 'Standard' },
      { key: 'read-only', label: 'Read-only' }
    ];
  };

  // Get role templates - legacy function for backward compatibility  
  const getRoleTemplates = () => {
    // If an item type is selected, get roles for that type
    if (selectedItemType) {
      return getRoleTemplatesForType(selectedItemType);
    }
    
    // Fall back to global plugin role templates
    if (pluginManifest?.supportedRoleTemplates?.length > 0) {
      return pluginManifest.supportedRoleTemplates;
    }
    
    // Fall back to platform's default roles
    const platformRoles = agencyPlatform?.platform?.defaultRoles;
    if (platformRoles?.length > 0) {
      return platformRoles.map(r => ({ key: r, label: r }));
    }
    
    return [
      { key: 'admin', label: 'Admin' },
      { key: 'standard', label: 'Standard' },
      { key: 'read-only', label: 'Read-only' }
    ];
  };
  
  // Check if SHARED_ACCOUNT (PAM) is available for this platform
  const isPamAvailable = () => {
    const types = getSupportedItemTypes();
    return types.includes('SHARED_ACCOUNT');
  };
  
  // Get PAM recommendation config
  const getPamConfig = () => {
    if (!securityCapabilities) return null;
    
    const rec = securityCapabilities.pamRecommendation || 'not_recommended';
    return {
      ...PAM_RECOMMENDATION_CONFIG[rec],
      recommendation: rec,
      rationale: securityCapabilities.pamRationale || '',
      supportsCredentialLogin: securityCapabilities.supportsCredentialLogin ?? false
    };
  };
  
  // Check if item type should show PAM warning
  const shouldShowPamWarning = (itemType) => {
    return normalizeItemType(itemType) === 'SHARED_ACCOUNT' && 
           securityCapabilities?.pamRecommendation !== 'recommended';
  };

  const supportedItemTypes = getSupportedItemTypes();
  const roleTemplates = getRoleTemplates();
  
  // Filter and sort access items
  const filteredAccessItems = useMemo(() => {
    if (!agencyPlatform?.accessItems) return [];
    
    let items = [...agencyPlatform.accessItems];
    
    // Normalize item types
    items = items.map(item => ({
      ...item,
      itemType: normalizeItemType(item.itemType)
    }));
    
    // Search filter
    if (itemSearchQuery.trim()) {
      const query = itemSearchQuery.toLowerCase();
      items = items.filter(item => 
        item.label?.toLowerCase().includes(query) ||
        item.role?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (itemTypeFilter !== 'all') {
      items = items.filter(item => normalizeItemType(item.itemType) === normalizeItemType(itemTypeFilter));
    }
    
    // Sort
    items.sort((a, b) => {
      switch (itemSortBy) {
        case 'label':
          return (a.label || '').localeCompare(b.label || '');
        case 'type':
          return (a.itemType || '').localeCompare(b.itemType || '');
        case 'role':
          return (a.role || '').localeCompare(b.role || '');
        case 'date':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });
    
    return items;
  }, [agencyPlatform?.accessItems, itemSearchQuery, itemTypeFilter, itemSortBy]);
  
  // Get unique item types for filter dropdown
  const availableItemTypes = useMemo(() => {
    if (!agencyPlatform?.accessItems) return [];
    const types = new Set(agencyPlatform.accessItems.map(item => item.itemType));
    return Array.from(types);
  }, [agencyPlatform?.accessItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!agencyPlatform) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto text-center py-16">
          <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Platform not found</h1>
          <p className="text-muted-foreground mb-4">This platform may have been removed or doesn't exist.</p>
          <Button onClick={() => router.push('/admin/platforms')}>
            <i className="fas fa-arrow-left mr-2"></i> Back to Platforms
          </Button>
        </div>
      </div>
    );
  }

  const platform = agencyPlatform.platform;
  
  // Build platform object for logo component
  const platformForLogo = {
    ...platform,
    logoPath: platform?.logoPath || `/logos/${platform?.platformKey || 'default'}.svg`,
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin/platforms')}>
              <i className="fas fa-arrow-left mr-2" aria-hidden="true"></i> All Platforms
            </Button>
          </div>
        </div>

        {/* Platform Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <PlatformLogo platform={platformForLogo} size="xl" />
              <div>
                <CardTitle className="text-2xl">{platform?.displayName || platform?.name}</CardTitle>
                <CardDescription className="flex items-center gap-3 mt-2">
                  <Badge variant="outline" className="text-sm">{platform?.category || platform?.domain}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {agencyPlatform.accessItems?.length || 0} access item{agencyPlatform.accessItems?.length !== 1 ? 's' : ''} configured
                  </span>
                  {pluginManifest && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs">
                          <i className="fas fa-plug mr-1" aria-hidden="true"></i>
                          Plugin v{pluginManifest.pluginVersion}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Platform managed by plugin system</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${agencyPlatform.isEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {agencyPlatform.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch 
                      checked={agencyPlatform.isEnabled} 
                      onCheckedChange={handleToggleEnabled}
                      aria-label={`${agencyPlatform.isEnabled ? 'Disable' : 'Enable'} ${platform?.name}`}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{agencyPlatform.isEnabled ? 'Platform available for access requests' : 'Platform disabled for requests'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
        </Card>

        {/* Role Templates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <i className="fas fa-user-tag text-primary" aria-hidden="true"></i>
                  Supported Role Templates
                </CardTitle>
                <CardDescription>
                  {pluginManifest ? 'Roles defined by platform plugin' : 'Available roles for this platform'}
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCustomRoleDialog({ open: true, editingRole: null })}
                  >
                    <i className="fas fa-plus mr-2" aria-hidden="true"></i>
                    Custom Role
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a custom role with specific permissions</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {roleTemplates.map(role => (
                <Tooltip key={role.key}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="px-3 py-1.5 cursor-help">
                      <i className="fas fa-shield-halved mr-2 text-xs" aria-hidden="true"></i>
                      {role.label}
                      {role.description && (
                        <span className="ml-2 text-xs opacity-70">- {role.description}</span>
                      )}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{role.description || `${role.label} access level`}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {customRoles.map(role => (
                <Badge 
                  key={role.key} 
                  className="px-3 py-1.5 bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20"
                  onClick={() => setCustomRoleDialog({ open: true, editingRole: role })}
                >
                  <i className="fas fa-user-shield mr-2 text-xs" aria-hidden="true"></i>
                  {role.label}
                  <span className="ml-2 text-xs opacity-70">(Custom)</span>
                </Badge>
              ))}
            </div>
            {(roleTemplates.length === 0 && customRoles.length === 0) && (
              <p className="text-sm text-muted-foreground">No roles defined. Create a custom role to get started.</p>
            )}
          </CardContent>
        </Card>

        {/* Access Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-layer-group text-primary" aria-hidden="true"></i>
                Access Items
              </CardTitle>
              <CardDescription>Define reusable access templates for client requests</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowAddForm(true); }}>
              <i className="fas fa-plus mr-2" aria-hidden="true"></i> Add Access Item
            </Button>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Bar - only show if items exist */}
            {agencyPlatform.accessItems?.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-4 border-b">
                <div className="flex-1">
                  <Label htmlFor="item-search" className="sr-only">Search access items</Label>
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true"></i>
                    <Input
                      id="item-search"
                      placeholder="Search items..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="pl-10"
                      aria-label="Search access items"
                    />
                  </div>
                </div>
                {availableItemTypes.length > 1 && (
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-[180px]" aria-label="Filter by type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableItemTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {ACCESS_ITEM_TYPE_CONFIG[type]?.label || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={itemSortBy} onValueChange={setItemSortBy}>
                  <SelectTrigger className="w-[150px]" aria-label="Sort by">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label">By Name</SelectItem>
                    <SelectItem value="type">By Type</SelectItem>
                    <SelectItem value="role">By Role</SelectItem>
                    <SelectItem value="date">By Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Items list */}
            {agencyPlatform.accessItems?.length > 0 ? (
              <>
                {/* Results info */}
                {(itemSearchQuery || itemTypeFilter !== 'all') && (
                  <p className="text-sm text-muted-foreground mb-3" role="status">
                    Showing {filteredAccessItems.length} of {agencyPlatform.accessItems.length} items
                  </p>
                )}
                
                {filteredAccessItems.length > 0 ? (
                  <div className="space-y-3" role="list" aria-label="Access items list">
                    {filteredAccessItems.map(item => {
                      const typeConfig = ACCESS_ITEM_TYPE_CONFIG[item.itemType] || {};
                      const typeColorClasses = {
                        blue: 'bg-blue-100 text-blue-600',
                        green: 'bg-green-100 text-green-600',
                        purple: 'bg-purple-100 text-purple-600',
                        orange: 'bg-orange-100 text-orange-600',
                        red: 'bg-red-100 text-red-600',
                        gray: 'bg-gray-100 text-gray-600',
                      };
                      const colorClass = typeColorClasses[typeConfig.color] || typeColorClasses.gray;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                          role="listitem"
                        >
                          <div className="flex items-center gap-4">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass.split(' ')[0]}`}>
                                  <i className={`${typeConfig.icon || 'fas fa-cog'} text-lg ${colorClass.split(' ')[1]}`} aria-hidden="true"></i>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{typeConfig.desc || item.itemType}</p>
                              </TooltipContent>
                            </Tooltip>
                            <div>
                              <p className="font-semibold text-base">{item.label}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {typeConfig.label || item.itemType}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <i className="fas fa-shield-halved mr-1" aria-hidden="true"></i>
                                  {item.role}
                                </Badge>
                              </div>
                              {/* Show key agency config details */}
                              {item.agencyData && Object.keys(item.agencyData).length > 0 && (
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {Object.entries(item.agencyData).slice(0, 3).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs font-mono bg-slate-50">
                                      {key}: {String(value).substring(0, 25)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {item.agencyGroupEmail && (
                                <Badge variant="outline" className="text-xs font-mono mt-2 bg-slate-50">
                                  <i className="fas fa-envelope mr-1" aria-hidden="true"></i>
                                  {item.agencyGroupEmail}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={`Actions for ${item.label}`}>
                                <i className="fas fa-ellipsis-v" aria-hidden="true"></i>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <i className="fas fa-pen mr-2 w-4" aria-hidden="true"></i>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(item.id);
                                toast({ title: 'Copied', description: 'Item ID copied to clipboard' });
                              }}>
                                <i className="fas fa-copy mr-2 w-4" aria-hidden="true"></i>
                                Copy ID
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <i className="fas fa-trash mr-2 w-4" aria-hidden="true"></i>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <i className="fas fa-search text-3xl mb-3 opacity-50" aria-hidden="true"></i>
                    <p className="font-medium">No items match your search</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        setItemSearchQuery('');
                        setItemTypeFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <i className="fas fa-inbox text-5xl mb-4 opacity-50" aria-hidden="true"></i>
                <p className="font-medium">No access items configured yet</p>
                <p className="text-sm mt-1">Add items to enable this platform for client requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <i className={`fas ${editingItem ? 'fa-pen' : 'fa-plus-circle'} text-primary`}></i>
                {editingItem ? 'Edit Access Item' : 'Add Access Item'}
              </CardTitle>
              <CardDescription>
                {selectedItemType 
                  ? 'Configure the access item using plugin-defined schema'
                  : 'Select an access type to begin configuration'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Step 1: Select Item Type */}
              {!selectedItemType && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Select Access Type</Label>
                  <p className="text-sm text-muted-foreground">
                    Only types supported by {platform?.displayName || platform?.name} are shown (defined by plugin)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {supportedItemTypes.map(type => {
                      const normalizedType = normalizeItemType(type);
                      const config = ACCESS_ITEM_TYPE_CONFIG[normalizedType];
                      if (!config) return null;
                      
                      // Check if this is PAM and get the recommendation
                      const isPam = normalizedType === 'SHARED_ACCOUNT';
                      const pamConfig = isPam ? getPamConfig() : null;
                      const pamDisabled = isPam && !securityCapabilities?.supportsCredentialLogin;
                      
                      return (
                        <Tooltip key={type}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => !pamDisabled && handleSelectItemType(normalizedType)}
                              disabled={pamDisabled}
                              className={`p-4 border-2 rounded-xl text-left transition-all group relative
                                ${pamDisabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:border-primary hover:bg-primary/5'}
                              `}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}
                                  style={{ backgroundColor: pamDisabled ? '#f3f4f6' : `var(--${config.color}-100, #e0e7ff)` }}>
                                  <i className={`${config.icon} text-lg`} style={{ color: pamDisabled ? '#9ca3af' : `var(--${config.color}-600, #4f46e5)` }} aria-hidden="true"></i>
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold flex items-center gap-2">
                                    {config.label}
                                    {isPam && pamConfig && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${pamConfig.badgeClass}`}>
                                        {pamConfig.badge}
                                      </span>
                                    )}
                                    {pamDisabled && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                        Unavailable
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">{config.desc}</p>
                                  {isPam && pamConfig && !pamDisabled && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      {pamConfig.rationale ? pamConfig.rationale.substring(0, 100) + '...' : pamConfig.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </button>
                          </TooltipTrigger>
                          {pamDisabled && (
                            <TooltipContent>
                              <p>This platform does not support credential-based login.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}
                  </div>
                  {supportedItemTypes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-exclamation-circle text-2xl mb-2" aria-hidden="true"></i>
                      <p>No access types available for this platform.</p>
                    </div>
                  )}
                  
                  {/* Cancel button */}
                  <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Configure Item */}
              {selectedItemType && (
                <div className="space-y-6">
                  {/* Type Badge & Change - Access Pattern is READ-ONLY, derived from itemType */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center`}
                        style={{ backgroundColor: `var(--${ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.color}-100, #e0e7ff)` }}>
                        <i className={`${ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.icon}`} aria-hidden="true"></i>
                      </div>
                      <div>
                        <p className="font-medium">{ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Access Pattern: <strong>{ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.label}</strong> (derived from type)
                        </p>
                      </div>
                    </div>
                    {!editingItem && (
                      <Button variant="ghost" size="sm" onClick={() => setSelectedItemType(null)}>
                        <i className="fas fa-exchange-alt mr-2" aria-hidden="true"></i> Change Type
                      </Button>
                    )}
                  </div>
                  
                  {/* PAM Warning Banner */}
                  {shouldShowPamWarning(selectedItemType) && (
                    <div className={`p-4 rounded-lg border-2 ${
                      securityCapabilities?.pamRecommendation === 'break_glass_only' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <i className={`fas ${
                          securityCapabilities?.pamRecommendation === 'break_glass_only' 
                            ? 'fa-exclamation-triangle text-red-600' 
                            : 'fa-info-circle text-amber-600'
                        } text-xl mt-0.5`} aria-hidden="true"></i>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {securityCapabilities?.pamRecommendation === 'break_glass_only' 
                              ? '🚨 Break-Glass Only Access' 
                              : '⚠️ Shared Account Access Not Recommended'}
                          </p>
                          <p className="text-xs mt-1">
                            {securityCapabilities?.pamRationale || PAM_RECOMMENDATION_CONFIG[securityCapabilities?.pamRecommendation]?.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Basic Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="item-label" className="text-sm font-medium">
                        Label <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="item-label"
                        value={formLabel}
                        onChange={(e) => {
                          setFormLabel(e.target.value);
                          if (labelError) setLabelError('');
                        }}
                        placeholder="e.g., Standard Analytics Access"
                        className={`mt-1 ${labelError ? 'border-destructive' : ''}`}
                        aria-invalid={!!labelError}
                        aria-describedby={labelError ? 'label-error' : 'label-hint'}
                      />
                      {labelError ? (
                        <p id="label-error" className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                          {labelError}
                        </p>
                      ) : (
                        <p id="label-hint" className="text-xs text-muted-foreground mt-1">A friendly name for this access template (3-100 chars)</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="role-select" className="text-sm font-medium">
                        Role Template <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="role-select"
                        className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        aria-describedby="role-hint"
                      >
                        <option value="">Select role...</option>
                        {/* Role templates specific to the selected item type from plugin */}
                        {getRoleTemplatesForType(selectedItemType).map(role => (
                          <option key={role.key} value={role.key}>
                            {role.label}
                            {role.description ? ` - ${role.description}` : ''}
                          </option>
                        ))}
                        {/* Custom roles (if allowed by plugin) */}
                        {customRoles.length > 0 && (
                          <optgroup label="Custom Roles">
                            {customRoles.map(role => (
                              <option key={role.key} value={role.key}>{role.label} (Custom)</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p id="role-hint" className="text-xs text-muted-foreground mt-1">
                        Role templates defined by plugin for {ACCESS_ITEM_TYPE_CONFIG[selectedItemType]?.label || 'this access type'}
                      </p>
                    </div>
                  </div>
                  
                  {/* PAM Configuration Section (for SHARED_ACCOUNT type) */}
                  {/* Global gating rules - derived from itemType + ownership + identityPurpose + identityStrategy */}
                  {/* No platformKey checks - applies to ALL plugins supporting SHARED_ACCOUNT */}
                  {normalizeItemType(selectedItemType) === 'SHARED_ACCOUNT' && (
                    <div className="space-y-4 p-4 border-2 border-amber-200 rounded-lg bg-amber-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-key text-amber-600" aria-hidden="true"></i>
                        <h4 className="font-semibold text-amber-800">PAM Configuration</h4>
                      </div>
                      
                      {/* PAM Ownership - Always shown for SHARED_ACCOUNT */}
                      <div>
                        <Label htmlFor="pam-ownership" className="text-sm font-medium">
                          Credential Ownership <span className="text-destructive">*</span>
                        </Label>
                        <select
                          id="pam-ownership"
                          className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                          value={agencyConfig.pamOwnership || ''}
                          onChange={(e) => {
                            // Clear dependent fields when ownership changes
                            setAgencyConfig(prev => ({ 
                              pamOwnership: e.target.value,
                              // Clear all identity generation fields when switching
                              identityPurpose: undefined,
                              pamIdentityStrategy: undefined,
                              pamIdentityType: undefined,
                              pamNamingTemplate: undefined,
                              pamCheckoutDurationMinutes: undefined,
                              pamApprovalRequired: undefined,
                              agencyIdentityId: undefined,
                              integrationIdentityId: undefined
                            }));
                          }}
                        >
                          <option value="">Select ownership...</option>
                          <option value="CLIENT_OWNED">Client-Owned (client provides credentials)</option>
                          <option value="AGENCY_OWNED">Agency-Owned (agency manages identity)</option>
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Determines who owns and controls the shared account credentials
                        </p>
                      </div>
                      
                      {/* ═══ RULE A: CLIENT_OWNED ═══ */}
                      {/* Hide ALL PAM identity generation fields - credentials collected in client request flow */}
                      {agencyConfig.pamOwnership === 'CLIENT_OWNED' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <i className="fas fa-info-circle text-blue-600 mt-0.5" aria-hidden="true"></i>
                            <div className="text-sm text-blue-800">
                              <p className="font-medium">Client-Owned Credentials</p>
                              <p className="text-xs mt-1">
                                The client will provide their own account credentials during the access request flow. 
                                No identity generation or checkout policy configuration is needed here.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ═══ RULE B: AGENCY_OWNED ═══ */}
                      {agencyConfig.pamOwnership === 'AGENCY_OWNED' && (
                        <>
                          {/* Identity Purpose - Required for AGENCY_OWNED */}
                          <div>
                            <Label htmlFor="identity-purpose" className="text-sm font-medium">
                              Identity Purpose <span className="text-destructive">*</span>
                            </Label>
                            <select
                              id="identity-purpose"
                              className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                              value={agencyConfig.identityPurpose || ''}
                              onChange={(e) => {
                                // Clear dependent fields when purpose changes
                                setAgencyConfig(prev => ({ 
                                  ...prev,
                                  identityPurpose: e.target.value,
                                  pamIdentityStrategy: undefined,
                                  pamIdentityType: undefined,
                                  pamNamingTemplate: undefined,
                                  pamCheckoutDurationMinutes: undefined,
                                  pamApprovalRequired: undefined,
                                  agencyIdentityId: undefined,
                                  integrationIdentityId: undefined
                                }));
                              }}
                            >
                              <option value="">Select purpose...</option>
                              <option value="HUMAN_INTERACTIVE">Human Interactive (users log in)</option>
                              <option value="INTEGRATION_NON_HUMAN">Integration / Non-Human (service accounts, APIs)</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                              Is this identity for human users or automated systems?
                            </p>
                          </div>
                          
                          {/* ═══ RULE B1: INTEGRATION_NON_HUMAN ═══ */}
                          {/* Hide checkout fields + naming generation, require integrationIdentityId */}
                          {agencyConfig.identityPurpose === 'INTEGRATION_NON_HUMAN' && (
                            <div>
                              <Label htmlFor="integration-identity" className="text-sm font-medium">
                                Integration Identity <span className="text-destructive">*</span>
                              </Label>
                              <select
                                id="integration-identity"
                                className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                                value={agencyConfig.integrationIdentityId || ''}
                                onChange={(e) => setAgencyConfig(prev => ({ ...prev, integrationIdentityId: e.target.value }))}
                              >
                                <option value="">Select integration identity...</option>
                                {integrationIdentities.map(identity => (
                                  <option key={identity.id} value={identity.id}>
                                    {identity.name} ({identity.type})
                                  </option>
                                ))}
                                <option value="__create_new__">+ Create New Integration Identity</option>
                              </select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Service account or integration identity for automated/non-human access. No checkout policy applies.
                              </p>
                            </div>
                          )}
                          
                          {/* ═══ RULE B2: HUMAN_INTERACTIVE ═══ */}
                          {agencyConfig.identityPurpose === 'HUMAN_INTERACTIVE' && (
                            <>
                              {/* Identity Strategy - Required for HUMAN_INTERACTIVE */}
                              <div>
                                <Label htmlFor="identity-strategy" className="text-sm font-medium">
                                  Identity Strategy <span className="text-destructive">*</span>
                                </Label>
                                <select
                                  id="identity-strategy"
                                  className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                                  value={agencyConfig.pamIdentityStrategy || ''}
                                  onChange={(e) => {
                                    // Clear dependent fields when strategy changes
                                    setAgencyConfig(prev => ({ 
                                      ...prev,
                                      pamIdentityStrategy: e.target.value,
                                      pamIdentityType: undefined,
                                      pamNamingTemplate: undefined,
                                      pamCheckoutDurationMinutes: undefined,
                                      pamApprovalRequired: undefined,
                                      agencyIdentityId: undefined
                                    }));
                                  }}
                                >
                                  <option value="">Select strategy...</option>
                                  <option value="STATIC_AGENCY_IDENTITY">Static Agency Identity (pre-configured shared identity)</option>
                                  <option value="CLIENT_DEDICATED_IDENTITY">Client-Dedicated Identity (unique per client)</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  How will the agency identity be managed?
                                </p>
                              </div>
                              
                              {/* ═══ RULE B2a: STATIC_AGENCY_IDENTITY ═══ */}
                              {/* Show agencyIdentityId dropdown, HIDE: identityType, namingTemplate, checkout policy */}
                              {agencyConfig.pamIdentityStrategy === 'STATIC_AGENCY_IDENTITY' && (
                                <div>
                                  <Label htmlFor="agency-identity" className="text-sm font-medium">
                                    Agency Identity <span className="text-destructive">*</span>
                                  </Label>
                                  <select
                                    id="agency-identity"
                                    className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                                    value={agencyConfig.agencyIdentityId || ''}
                                    onChange={(e) => setAgencyConfig(prev => ({ ...prev, agencyIdentityId: e.target.value }))}
                                  >
                                    <option value="">Select agency identity...</option>
                                    {agencyIdentities.map(identity => (
                                      <option key={identity.id} value={identity.id}>
                                        {identity.name} ({identity.email})
                                      </option>
                                    ))}
                                    <option value="__create_new__">+ Configure New Agency Identity</option>
                                  </select>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Select a pre-configured agency identity. This is a shared identity managed at the agency level.
                                  </p>
                                </div>
                              )}
                              
                              {/* ═══ RULE B2b: CLIENT_DEDICATED_IDENTITY ═══ */}
                              {/* Require identityType, show naming template + checkout policy (MAILBOX only for checkout) */}
                              {agencyConfig.pamIdentityStrategy === 'CLIENT_DEDICATED_IDENTITY' && (
                                <>
                                  {/* Identity Type - Required */}
                                  <div>
                                    <Label htmlFor="pam-identity-type" className="text-sm font-medium">
                                      Identity Type <span className="text-destructive">*</span>
                                    </Label>
                                    <select
                                      id="pam-identity-type"
                                      className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                                      value={agencyConfig.pamIdentityType || ''}
                                      onChange={(e) => setAgencyConfig(prev => ({ ...prev, pamIdentityType: e.target.value }))}
                                    >
                                      <option value="">Select type...</option>
                                      <option value="MAILBOX">Mailbox (dedicated email account)</option>
                                      <option value="GROUP">Group (Google/M365 group alias)</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Type of dedicated identity to generate for each client.
                                    </p>
                                  </div>
                                  
                                  {/* Naming Template - Only for CLIENT_DEDICATED_IDENTITY */}
                                  <div>
                                    <Label htmlFor="pam-naming-template" className="text-sm font-medium">
                                      Naming Template <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                      id="pam-naming-template"
                                      value={agencyConfig.pamNamingTemplate || ''}
                                      onChange={(e) => setAgencyConfig(prev => ({ ...prev, pamNamingTemplate: e.target.value }))}
                                      placeholder="e.g., {client}-ads@agency.com"
                                      className="mt-1 font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Template for generating dedicated identity names. Use {'{client}'} as placeholder.
                                    </p>
                                    {agencyConfig.pamNamingTemplate && (
                                      <p className="text-xs text-blue-600 mt-1">
                                        Preview: {agencyConfig.pamNamingTemplate.replace('{client}', 'acme-corp')}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Checkout Policy - Only for MAILBOX type */}
                                  {agencyConfig.pamIdentityType === 'MAILBOX' && (
                                    <div className="pt-3 border-t space-y-3">
                                      <p className="text-sm font-medium text-slate-700">Checkout Policy (Mailbox Only)</p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <Label htmlFor="checkout-duration" className="text-sm font-medium">
                                            Max Checkout Duration (minutes)
                                          </Label>
                                          <Input
                                            id="checkout-duration"
                                            type="number"
                                            min="5"
                                            max="480"
                                            value={agencyConfig.pamCheckoutDurationMinutes || 60}
                                            onChange={(e) => setAgencyConfig(prev => ({ ...prev, pamCheckoutDurationMinutes: parseInt(e.target.value) || 60 }))}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="flex items-center gap-3 pt-6">
                                          <input
                                            type="checkbox"
                                            id="approval-required"
                                            checked={agencyConfig.pamApprovalRequired || false}
                                            onChange={(e) => setAgencyConfig(prev => ({ ...prev, pamApprovalRequired: e.target.checked }))}
                                            className="w-4 h-4"
                                          />
                                          <Label htmlFor="approval-required" className="text-sm">
                                            Require approval for checkout
                                          </Label>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}
                      
                      {/* PAM Confirmation & Justification */}
                      {shouldShowPamWarning(selectedItemType) && (
                        <div className="pt-4 border-t space-y-4">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id="pam-confirmation"
                              checked={pamConfirmation}
                              onChange={(e) => setPamConfirmation(e.target.checked)}
                              className="mt-1 w-4 h-4"
                            />
                            <div className="flex-1">
                              <Label htmlFor="pam-confirmation" className="font-medium">
                                I understand the security implications
                              </Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                By checking this box, I acknowledge that shared account (PAM) access is {securityCapabilities?.pamRecommendation === 'break_glass_only' ? 'only for emergency break-glass use' : 'not the recommended method for this platform'} and I have valid reasons for using it.
                              </p>
                            </div>
                          </div>
                          
                          {/* Justification field for break-glass only */}
                          {securityCapabilities?.pamRecommendation === 'break_glass_only' && (
                            <>
                              <div>
                                <Label htmlFor="pam-reason" className="text-sm font-medium">
                                  Reason Code <span className="text-destructive">*</span>
                                </Label>
                                <select
                                  id="pam-reason"
                                  className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm"
                                  value={pamReasonCode}
                                  onChange={(e) => setPamReasonCode(e.target.value)}
                                >
                                  <option value="">Select reason...</option>
                                  <option value="legacy_system">Legacy System Requirement</option>
                                  <option value="client_mandate">Client Mandate</option>
                                  <option value="emergency_access">Emergency Break-Glass</option>
                                  <option value="no_alternative">No Alternative Available</option>
                                  <option value="audit_requirement">Audit/Compliance Requirement</option>
                                </select>
                              </div>
                              <div>
                                <Label htmlFor="pam-justification" className="text-sm font-medium">
                                  Justification <span className="text-destructive">*</span>
                                </Label>
                                <textarea
                                  id="pam-justification"
                                  className="w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm min-h-[80px]"
                                  value={pamJustification}
                                  onChange={(e) => setPamJustification(e.target.value)}
                                  placeholder="Explain why PAM access is required..."
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Minimum 20 characters required
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label htmlFor="item-notes" className="text-sm font-medium">Notes (Optional)</Label>
                    <Input
                      id="item-notes"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Internal notes about this access template"
                      className="mt-1"
                    />
                  </div>

                  {/* Plugin Schema-Driven Form */}
                  {agencyConfigSchema ? (
                    <SchemaForm
                      schema={agencyConfigSchema}
                      value={agencyConfig}
                      onChange={setAgencyConfig}
                      title="Agency Configuration"
                      description="Platform-specific fields defined by plugin schema (no client asset IDs)"
                      errors={validationErrors}
                    />
                  ) : (
                    <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                      <i className="fas fa-info-circle mr-2" aria-hidden="true"></i>
                      No additional configuration required for this access type
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setShowAddForm(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <><i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Saving...</>
                      ) : (
                        <><i className="fas fa-check mr-2" aria-hidden="true"></i>{editingItem ? 'Update Item' : 'Add Item'}</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, item: null })}
        title={`Delete "${confirmDialog.item?.label}"?`}
        description={`This will permanently delete this access item. Any existing access requests using this item will still work, but no new requests can be created with it.`}
        confirmLabel="Delete Item"
        variant="destructive"
        icon="fas fa-trash"
        onConfirm={handleConfirmDelete}
      />
      
      {/* Custom Role Dialog */}
      <CustomRoleDialog
        open={customRoleDialog.open}
        onOpenChange={(open) => setCustomRoleDialog({ open, editingRole: open ? customRoleDialog.editingRole : null })}
        platformName={platform?.displayName || platform?.name}
        existingRoles={[...roleTemplates, ...customRoles]}
        editingRole={customRoleDialog.editingRole}
        onSaveRole={(roleData, isEdit) => {
          if (isEdit) {
            setCustomRoles(prev => prev.map(r => r.key === roleData.key ? roleData : r));
          } else {
            setCustomRoles(prev => [...prev, roleData]);
          }
        }}
      />
    </div>
    </TooltipProvider>
  );
}
