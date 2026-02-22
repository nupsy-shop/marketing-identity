'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function EnhancedAccessRequestDialog({ open, onOpenChange, clientId, onSuccess }) {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [configuredApps, setConfiguredApps] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]); // Keys in format "appId-itemId"
  const [loading, setLoading] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);

  useEffect(() => {
    if (open && clientId) {
      loadConfiguredApps();
      setStep(1);
      setSelectedKeys([]);
    }
  }, [open, clientId]);

  const loadConfiguredApps = async () => {
    setLoadingApps(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/configured-apps`);
      const result = await response.json();
      if (result.success) {
        setConfiguredApps(result.data.filter(app => app.isActive));
      }
    } catch (error) {
      console.error('Failed to load configured apps:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  // Use "|" as separator to avoid conflicts with UUID dashes
  const makeKey = (appId, itemId) => `${appId}|${itemId}`;

  const toggleKey = (appId, itemId) => {
    const key = makeKey(appId, itemId);
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAll = () => {
    if (selectedKeys.length > 0) {
      setSelectedKeys([]);
    } else {
      const allKeys = configuredApps.flatMap(app =>
        app.items.map(item => makeKey(app.id, item.id))
      );
      setSelectedKeys(allKeys);
    }
  };

  // Get resolved selected items data for review/submission
  const getSelectedItemsData = () => {
    return selectedKeys.map(key => {
      const sepIndex = key.indexOf('|');
      const appId = key.substring(0, sepIndex);
      const itemId = key.substring(sepIndex + 1);
      const app = configuredApps.find(a => a.id === appId);
      const item = app?.items.find(i => i.id === itemId);
      return { app, item };
    }).filter(x => x.app && x.item);
  };

  const handleCreateRequest = async () => {
    setLoading(true);
    try {
      const selectedData = getSelectedItemsData();
      const itemsToCreate = selectedData.map(({ app, item }) => ({
        platformId: app.platformId,
        accessPattern: item.accessPattern,
        role: item.role,
        assetType: item.assetType || undefined,
        assetId: item.assetId || undefined,
        assetName: item.label
      }));

      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, items: itemsToCreate })
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: 'Success', description: 'Access request created successfully' });
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

  const selectedData = getSelectedItemsData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Access Request</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select configured platform items to include in this request'
              : 'Review your selection before creating the request'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 py-2">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {step > 1 ? <i className="fas fa-check text-xs"></i> : '1'}
            </div>
            <span className="text-sm font-medium">Select Items</span>
          </div>
          <div className="flex-1 h-px bg-border"></div>
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              2
            </div>
            <span className="text-sm font-medium">Review</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* ── Step 1: Select Items ── */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingApps ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-muted-foreground text-sm">Loading configured platforms...</p>
                </div>
              ) : configuredApps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <i className="fas fa-cubes text-4xl text-muted-foreground mb-4 block"></i>
                    <h3 className="font-semibold mb-2">No platforms configured yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add platforms from the catalog first, then come back to create an access request.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        router.push('/admin/catalog');
                      }}
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Browse Platform Catalog
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedKeys.length}</span> item{selectedKeys.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedKeys.length > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  {configuredApps.map(app => (
                    <Card key={app.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {app.platform?.iconName && (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                              <i className={`${app.platform.iconName} text-primary`}></i>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{app.platform?.name || 'Unknown Platform'}</CardTitle>
                            <CardDescription className="text-xs">{app.platform?.domain}</CardDescription>
                          </div>
                          <Badge variant={app.platform?.tier === 1 ? 'default' : 'secondary'}>
                            Tier {app.platform?.tier}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {app.items.map(item => {
                          const key = makeKey(app.id, item.id);
                          const isSelected = selectedKeys.includes(key);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => toggleKey(app.id, item.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleKey(app.id, item.id)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{item.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.accessPattern} &bull; {item.role}
                                </p>
                                {item.assetType && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Asset: {item.assetType}
                                    {item.assetId && ` (#${item.assetId})`}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Step 2: Review ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-600 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="font-semibold mb-1">Ready to generate onboarding link</h4>
                      <p className="text-sm text-muted-foreground">
                        Review your selections below. Once created, you'll get a unique link to share with your client.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {selectedData.map(({ app, item }, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        {app.platform?.iconName && (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                            <i className={`${app.platform.iconName} text-primary`}></i>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm">{app.platform?.name}</p>
                            <Badge variant={app.platform?.tier === 1 ? 'default' : 'secondary'} className="text-xs">
                              Tier {app.platform?.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Pattern: <strong className="text-foreground">{item.accessPattern}</strong></span>
                            <span>Role: <strong className="text-foreground">{item.role}</strong></span>
                          </div>
                          {item.assetType && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Asset: {item.assetType}
                              {item.assetId && ` (#${item.assetId})`}
                            </p>
                          )}
                        </div>
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
                onClick={() => setStep(2)}
                disabled={selectedKeys.length === 0}
              >
                Next: Review
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleCreateRequest} disabled={loading}>
                {loading ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Creating...</>
                ) : (
                  <><i className="fas fa-check mr-2"></i>Create Request</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
