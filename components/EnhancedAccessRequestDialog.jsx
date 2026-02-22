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

export default function EnhancedAccessRequestDialog({ open, onOpenChange, clientId, onSuccess }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [configuredApps, setConfiguredApps] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]); // Changed from selectedPlatforms
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      loadConfiguredApps();
      // Reset state when dialog opens
      setStep(1);
      setSelectedItems([]);
    }
  }, [open, clientId]);

  const loadConfiguredApps = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/configured-apps`);
      const result = await response.json();
      if (result.success) {
        setConfiguredApps(result.data.filter(app => app.isActive)); // Only show active apps
      }
    } catch (error) {
      console.error('Failed to load configured apps:', error);
    }
  };

  const toggleItem = (appId, itemId) => {
    const key = `${appId}-${itemId}`;
    setSelectedItems(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleCreateRequest = async () => {
    setLoading(true);
    try {
      // Build items from selected configured items
      const itemsToCreate = selectedItems.map(key => {
        const [appId, itemId] = key.split('-');
        const app = configuredApps.find(a => a.id === appId);
        const item = app?.items.find(i => i.id === itemId);
        
        return {
          platformId: app.platformId,
          accessPattern: item.accessPattern,
          role: item.role,
          assetType: item.assetType,
          assetId: item.assetId,
          assetName: item.label // Use label as assetName
        };
      });

      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          items: itemsToCreate
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Access request created successfully'
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create access request',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create access request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create access request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlatforms = platforms.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Access Request</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Step 1: Select configured items'}
            {step === 2 && 'Step 2: Review and create'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator - 2 Steps */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 1 ? <i className="fas fa-check"></i> : '1'}
            </div>
            <span className="text-sm font-medium">Select Items</span>
          </div>
          <div className="flex-1 h-px bg-border"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">Review</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Platform Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Search platforms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {filteredPlatforms.map(platform => (
                  <Card
                    key={platform.id}
                    className={`cursor-pointer transition-all ${
                      selectedPlatforms.find(p => p.id === platform.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handlePlatformToggle(platform)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!selectedPlatforms.find(p => p.id === platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {platform.iconName && (
                              <i className={`${platform.iconName} text-primary`}></i>
                            )}
                            <h4 className="font-semibold text-sm truncate">{platform.name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {platform.description}
                          </p>
                          <div className="flex gap-1 mt-2">
                            <Badge variant={platform.tier === 1 ? 'default' : 'secondary'} className="text-xs">
                              Tier {platform.tier}
                            </Badge>
                            {platform.oauthSupported && (
                              <Badge variant="outline" className="text-xs">OAuth</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure access patterns, roles, and assets for each platform
              </p>

              {configuredItems.map((item, index) => (
                <PlatformConfigCard
                  key={item.platformId}
                  item={item}
                  index={index}
                  onUpdate={updateItemConfig}
                />
              ))}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-600 text-xl"></i>
                    <div>
                      <h4 className="font-semibold mb-1">Ready to generate onboarding link</h4>
                      <p className="text-sm text-muted-foreground">
                        Review your selections below. Once created, you'll receive a unique link to share with your client.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {configuredItems.map((item, index) => (
                  <Card key={item.platformId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          {item.platform.iconName ? (
                            <i className={`${item.platform.iconName} text-primary`}></i>
                          ) : (
                            <i className="fas fa-cube text-primary"></i>
                          )}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{item.platform.name}</CardTitle>
                          <CardDescription className="text-xs">{item.platform.domain}</CardDescription>
                        </div>
                        <Badge variant={item.platform.tier === 1 ? 'default' : 'secondary'}>
                          Tier {item.platform.tier}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Access Pattern:</span>
                          <p className="font-medium">{item.accessPattern}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Role:</span>
                          <p className="font-medium">{item.role}</p>
                        </div>
                        {item.assetType && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Asset Type:</span>
                              <p className="font-medium">{item.assetType}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Asset Name:</span>
                              <p className="font-medium">{item.assetName || 'Not specified'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <i className="fas fa-arrow-left mr-2"></i>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 1 && (
              <Button
                onClick={handleNextToConfiguration}
                disabled={selectedPlatforms.length === 0}
              >
                Next: Configure
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                Next: Review
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleCreateRequest} disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check mr-2"></i>
                    Create Request
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlatformConfigCard({ item, index, onUpdate }) {
  const platform = item.platform;
  const availablePatterns = platform.accessPatterns || [];
  const selectedPattern = availablePatterns.find(p => p.pattern === item.accessPattern) || availablePatterns[0];
  const availableRoles = selectedPattern?.roles || ['Standard'];

  // Tier 1 asset types based on platform
  const getAssetTypes = () => {
    if (platform.tier !== 1) return [];
    
    const name = platform.name.toLowerCase();
    if (name.includes('meta') || name.includes('facebook')) {
      return ['Ad Account', 'Business Manager', 'Page', 'Pixel', 'Catalog'];
    }
    if (name.includes('google ads')) {
      return ['MCC Account', 'Ad Account'];
    }
    if (name.includes('analytics') || name.includes('ga4')) {
      return ['Property', 'Data Stream'];
    }
    if (name.includes('tag manager')) {
      return ['Container'];
    }
    if (name.includes('search console')) {
      return ['Property'];
    }
    if (name.includes('merchant')) {
      return ['Merchant Account'];
    }
    return ['Account'];
  };

  const assetTypes = getAssetTypes();
  const isTier1 = platform.tier === 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            {platform.iconName ? (
              <i className={`${platform.iconName} text-primary`}></i>
            ) : (
              <i className="fas fa-cube text-primary"></i>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">{platform.name}</CardTitle>
            <CardDescription className="text-xs">{platform.domain}</CardDescription>
          </div>
          <Badge variant={isTier1 ? 'default' : 'secondary'}>
            Tier {platform.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Access Pattern Selection */}
          <div>
            <Label className="text-xs">Access Pattern</Label>
            <select
              className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
              value={item.accessPattern}
              onChange={(e) => {
                onUpdate(item.platformId, 'accessPattern', e.target.value);
                // Reset role when pattern changes
                const newPattern = availablePatterns.find(p => p.pattern === e.target.value);
                if (newPattern && newPattern.roles[0]) {
                  onUpdate(item.platformId, 'role', newPattern.roles[0]);
                }
              }}
            >
              {availablePatterns.map(pattern => (
                <option key={pattern.pattern} value={pattern.pattern}>
                  {pattern.label || pattern.pattern}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPattern?.pattern}
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <Label className="text-xs">Role</Label>
            <select
              className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background text-sm"
              value={item.role}
              onChange={(e) => onUpdate(item.platformId, 'role', e.target.value)}
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Asset Configuration (Tier 1 only) */}
        {isTier1 && assetTypes.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-star text-purple-500 text-sm"></i>
              <span className="text-sm font-medium">Asset Configuration (Tier 1)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Asset Type</Label>
                <select
                  className="w-full mt-1 border border-input rounded-md px-2 py-1.5 bg-background text-sm"
                  value={item.assetType}
                  onChange={(e) => onUpdate(item.platformId, 'assetType', e.target.value)}
                >
                  <option value="">Not specified</option>
                  {assetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Asset ID (optional)</Label>
                <Input
                  placeholder="e.g., 123456789"
                  className="mt-1 text-sm"
                  value={item.assetId}
                  onChange={(e) => onUpdate(item.platformId, 'assetId', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Asset Name (optional)</Label>
                <Input
                  placeholder="e.g., Main Ad Account"
                  className="mt-1 text-sm"
                  value={item.assetName}
                  onChange={(e) => onUpdate(item.platformId, 'assetName', e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <i className="fas fa-info-circle mr-1"></i>
              For Tier 1 platforms, you can specify individual assets. Client will confirm details during onboarding.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
