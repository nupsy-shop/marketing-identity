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
  const [agencyPlatforms, setAgencyPlatforms] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]); // "agencyPlatformId|itemId"
  const [loading, setLoading] = useState(false);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);

  useEffect(() => {
    if (open) {
      loadAgencyPlatforms();
      setStep(1);
      setSelectedKeys([]);
    }
  }, [open]);

  const loadAgencyPlatforms = async () => {
    setLoadingPlatforms(true);
    try {
      const res = await fetch('/api/agency/platforms');
      const data = await res.json();
      if (data.success) {
        // Only show enabled platforms that have at least one access item
        setAgencyPlatforms(data.data.filter(ap => ap.isEnabled && ap.accessItems?.length > 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const makeKey = (apId, itemId) => `${apId}|${itemId}`;

  const toggleKey = (apId, itemId) => {
    const key = makeKey(apId, itemId);
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    if (selectedKeys.length > 0) {
      setSelectedKeys([]);
    } else {
      const all = agencyPlatforms.flatMap(ap =>
        ap.accessItems.map(item => makeKey(ap.id, item.id))
      );
      setSelectedKeys(all);
    }
  };

  const getSelectedData = () => {
    return selectedKeys.map(key => {
      const sep = key.indexOf('|');
      const apId = key.substring(0, sep);
      const itemId = key.substring(sep + 1);
      const ap = agencyPlatforms.find(a => a.id === apId);
      const item = ap?.accessItems.find(i => i.id === itemId);
      return { ap, item };
    }).filter(x => x.ap && x.item);
  };

  const handleCreateRequest = async () => {
    setLoading(true);
    try {
      const selectedData = getSelectedData();
      const items = selectedData.map(({ ap, item }) => ({
        platformId: ap.platformId,
        accessPattern: item.accessPattern,
        role: item.role,
        assetName: item.label,
        // Pass item type and PAM fields so they're stored in the AccessRequestItem
        itemType: item.itemType || 'NAMED_INVITE',
        pamOwnership: item.pamConfig?.ownership || undefined,
        pamGrantMethod: item.pamConfig?.grantMethod || undefined,
        pamUsername: item.pamConfig?.username || undefined,
        pamAgencyIdentityEmail: item.pamConfig?.agencyIdentityEmail || undefined,
        pamRoleTemplate: item.pamConfig?.roleTemplate || undefined,
        // NEW: Pass agency data and client instructions from Excel
        agencyData: item.agencyData || undefined,
        clientInstructions: item.clientInstructions || undefined
      }));

      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, items })
      });
      const data = await res.json();

      if (data.success) {
        toast({ title: 'Access request created', description: 'Onboarding link is ready to share' });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create request', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create request', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectedData = getSelectedData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Access Request</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select the access items to include in this client\'s request'
              : 'Review your selection before generating the onboarding link'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 py-2">
          {[
            { n: 1, label: 'Select Items' },
            { n: 2, label: 'Review' }
          ].map(({ n, label }, idx) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${step >= n ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > n ? <i className="fas fa-check text-xs"></i> : n}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{label}</span>
              </div>
              {idx === 0 && <div className="flex-1 h-px bg-border mx-2"></div>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingPlatforms ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                  <p className="text-muted-foreground text-sm">Loading agency platforms...</p>
                </div>
              ) : agencyPlatforms.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <i className="fas fa-layer-group text-4xl text-muted-foreground mb-4 block"></i>
                    <h3 className="font-semibold mb-2">No configured platforms yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add platforms from the catalog and configure access items before creating requests.
                    </p>
                    <Button variant="outline" onClick={() => { onOpenChange(false); router.push('/admin/catalog'); }}>
                      <i className="fas fa-plus mr-2"></i>Browse Platform Catalog
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{selectedKeys.length}</span> item{selectedKeys.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedKeys.length > 0 ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>

                  {agencyPlatforms.map(ap => (
                    <Card key={ap.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {ap.platform?.iconName && (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                              <i className={`${ap.platform.iconName} text-primary`}></i>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{ap.platform?.name}</CardTitle>
                            <CardDescription className="text-xs">{ap.platform?.domain}</CardDescription>
                          </div>
                          <Badge variant={ap.platform?.tier === 1 ? 'default' : 'secondary'}>
                            Tier {ap.platform?.tier}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {ap.accessItems.map(item => {
                          const key = makeKey(ap.id, item.id);
                          const isSelected = selectedKeys.includes(key);
                          const isPam = item.itemType === 'SHARED_ACCOUNT_PAM';
                          const pamOwnership = item.pamConfig?.ownership;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : isPam ? 'border-amber-200 hover:border-amber-400' : 'border-border hover:border-primary/50'}`}
                              onClick={() => toggleKey(ap.id, item.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleKey(ap.id, item.id)}
                                onClick={e => e.stopPropagation()}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <p className="font-medium text-sm">{item.label}</p>
                                  {isPam && (
                                    <Badge className={`text-xs ${pamOwnership === 'CLIENT_OWNED' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                      <i className="fas fa-shield-halved mr-1"></i>
                                      {pamOwnership === 'CLIENT_OWNED' ? 'Shared Account (Client-owned)' : 'Shared Account (Agency-owned)'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {item.patternLabel || item.accessPattern} &bull; {item.role}
                                </p>
                                {isPam && pamOwnership === 'AGENCY_OWNED' && item.pamConfig?.agencyIdentityEmail && (
                                  <p className="text-xs text-blue-600 mt-0.5">
                                    <i className="fas fa-envelope mr-1"></i>Invite: {item.pamConfig.agencyIdentityEmail}
                                  </p>
                                )}
                                {item.assetType && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.assetType}{item.assetId && ` #${item.assetId}`}
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

          {/* Step 2 — Review */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <i className="fas fa-info-circle text-blue-600 text-xl mt-0.5"></i>
                    <div>
                      <h4 className="font-semibold mb-1">Ready to generate onboarding link</h4>
                      <p className="text-sm text-muted-foreground">
                        Review the selections below. Once created, you'll get a unique link to share with your client.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {selectedData.map(({ ap, item }, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        {ap.platform?.iconName && (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                            <i className={`${ap.platform.iconName} text-primary`}></i>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm">{ap.platform?.name}</p>
                            <Badge variant={ap.platform?.tier === 1 ? 'default' : 'secondary'} className="text-xs">
                              Tier {ap.platform?.tier}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Pattern: <strong className="text-foreground">{item.patternLabel || item.accessPattern}</strong></span>
                            <span>Role: <strong className="text-foreground">{item.role}</strong></span>
                          </div>
                          {item.assetType && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.assetType}{item.assetId && ` #${item.assetId}`}
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <i className="fas fa-arrow-left mr-2"></i>Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            {step === 1 && (
              <Button onClick={() => setStep(2)} disabled={selectedKeys.length === 0}>
                Next: Review <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleCreateRequest} disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-2"></i>Creating...</>
                  : <><i className="fas fa-check mr-2"></i>Create Request</>
                }
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
