'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function PlatformConfigurationDialog({ open, onOpenChange, platform, clientId, onSuccess }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && platform) {
      // Initialize with one empty item
      setItems([{
        id: Date.now(),
        accessPattern: platform.accessPatterns?.[0]?.pattern || '',
        label: '',
        role: platform.accessPatterns?.[0]?.roles?.[0] || '',
        assetType: '',
        assetId: '',
        notes: ''
      }]);
    }
  }, [open, platform]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      accessPattern: platform.accessPatterns?.[0]?.pattern || '',
      label: '',
      role: platform.accessPatterns?.[0]?.roles?.[0] || '',
      assetType: '',
      assetId: '',
      notes: ''
    }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // If pattern changes, reset role to first available for that pattern
        if (field === 'accessPattern') {
          const selectedPattern = platform.accessPatterns?.find(p => p.pattern === value);
          if (selectedPattern && selectedPattern.roles[0]) {
            updated.role = selectedPattern.roles[0];
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const handleSave = async () => {
    // Validate
    const invalidItems = items.filter(item => !item.label || !item.accessPattern || !item.role);
    if (invalidItems.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in Label, Access Pattern, and Role for all items',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/configured-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: platform.id,
          items: items.map(item => ({
            accessPattern: item.accessPattern,
            label: item.label,
            role: item.role,
            assetType: item.assetType || undefined,
            assetId: item.assetId || undefined,
            notes: item.notes || undefined
          }))
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: `${platform.name} configured successfully`
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to configure platform',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to configure platform:', error);
      toast({
        title: 'Error',
        description: 'Failed to configure platform',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!platform) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {platform.iconName && (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <i className={`${platform.iconName} text-2xl text-primary`}></i>
              </div>
            )}
            <div>
              <DialogTitle>Configure {platform.name}</DialogTitle>
              <DialogDescription>
                Add one or more access configurations for this platform
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-blue-600 text-lg mt-0.5"></i>
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">About Platform Items</p>
                  <p className="text-blue-800">
                    Each item represents a specific access configuration (e.g., "Main Ad Account", "Property A").
                    You can add multiple items per platform and select them individually when creating access requests.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {items.map((item, index) => (
            <Card key={item.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Item {index + 1}
                    {item.label && `: ${item.label}`}
                  </CardTitle>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Label - Required */}
                <div>
                  <Label className="text-sm">
                    Label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g., Main Ad Account, Property A, Business Manager"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A descriptive name to identify this configuration
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Access Pattern */}
                  <div>
                    <Label className="text-sm">
                      Access Pattern <span className="text-destructive">*</span>
                    </Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={item.accessPattern}
                      onChange={(e) => updateItem(item.id, 'accessPattern', e.target.value)}
                    >
                      {platform.accessPatterns?.map(pattern => (
                        <option key={pattern.pattern} value={pattern.pattern}>
                          {pattern.label || pattern.pattern}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <Label className="text-sm">
                      Role <span className="text-destructive">*</span>
                    </Label>
                    <select
                      className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
                      value={item.role}
                      onChange={(e) => updateItem(item.id, 'role', e.target.value)}
                    >
                      {platform.accessPatterns
                        ?.find(p => p.pattern === item.accessPattern)
                        ?.roles.map(role => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Asset Type and ID (for Tier 1) */}
                {platform.tier === 1 && (
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <Label className="text-sm">Asset Type</Label>
                      <Input
                        placeholder="e.g., Ad Account, Property"
                        value={item.assetType}
                        onChange={(e) => updateItem(item.id, 'assetType', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Asset ID</Label>
                      <Input
                        placeholder="e.g., 123-456-7890"
                        value={item.assetId}
                        onChange={(e) => updateItem(item.id, 'assetId', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    placeholder="Additional information..."
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addItem} className="w-full">
            <i className="fas fa-plus mr-2"></i>
            Add Another Item
          </Button>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''} configured
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || items.length === 0}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
