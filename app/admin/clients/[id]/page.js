'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import EnhancedAccessRequestDialog from '@/components/EnhancedAccessRequestDialog';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (params.id) loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [clientRes, requestsRes, platformsRes] = await Promise.all([
        fetch(`/api/clients/${params.id}`),
        fetch(`/api/clients/${params.id}/access-requests`),
        fetch('/api/platforms')
      ]);

      const clientData = await clientRes.json();
      const requestsData = await requestsRes.json();
      const platformsData = await platformsRes.json();

      if (clientData.success) setClient(clientData.data);
      if (requestsData.success) setAccessRequests(requestsData.data);
      if (platformsData.success) setPlatforms(platformsData.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({ title: 'Error', description: 'Failed to load client data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyOnboardingLink = (token) => {
    const link = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Copied!', description: 'Onboarding link copied to clipboard' });
  };

  const refreshAccessRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/access-requests/${requestId}/refresh`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Refreshed', description: 'Access validation refreshed' });
        loadData();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to refresh validation', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Client not found</p>
            <Button onClick={() => router.push('/admin')}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/admin')}>
              <i className="fas fa-arrow-left mr-2"></i>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <i className="fas fa-plus mr-2"></i>New Access Request
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">Access Requests</h2>
          <p className="text-muted-foreground">Manage platform access requests for {client.name}</p>
        </div>

        {accessRequests.length === 0 ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-12 text-center">
                <i className="fas fa-lock text-5xl text-muted-foreground mb-4 block"></i>
                <h3 className="text-lg font-semibold mb-2">No access requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create an access request to generate an onboarding link for this client.
                  The client will follow step-by-step instructions to grant access.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <i className="fas fa-plus mr-2"></i>Create Access Request
                </Button>
              </CardContent>
            </Card>

            <Card className="border-dashed bg-muted/30">
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <i className="fas fa-lightbulb text-amber-500 text-lg mt-0.5"></i>
                  <div>
                    <p className="font-medium text-sm mb-1">Tip: Configure platforms first</p>
                    <p className="text-xs text-muted-foreground">
                      Access requests are built from your agency's configured platforms and access items.
                      Make sure your agency has platforms added and items configured before creating a request.
                    </p>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs mt-1"
                      onClick={() => router.push('/admin/platforms')}
                    >
                      Go to Agency Platforms <i className="fas fa-arrow-right ml-1"></i>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4">
            {accessRequests.map((request) => (
              <AccessRequestCard
                key={request.id}
                request={request}
                platforms={platforms}
                onCopyLink={copyOnboardingLink}
                onRefresh={refreshAccessRequest}
              />
            ))}
          </div>
        )}
      </div>

      <EnhancedAccessRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        clientId={params.id}
        onSuccess={loadData}
      />
    </div>
  );
}

// ── Access Request Card ──────────────────────────────────────────────────────

function AccessRequestCard({ request, platforms, onCopyLink, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const validatedCount = request.items?.filter(i => i.status === 'validated').length ?? 0;
  const totalCount = request.items?.length ?? 0;
  const allDone = validatedCount === totalCount && totalCount > 0;

  const getPlatformName = (platformId) => {
    const p = platforms.find(p => p.id === platformId);
    return p?.name || 'Unknown Platform';
  };

  const getPlatformIcon = (platformId) => {
    const p = platforms.find(p => p.id === platformId);
    return p?.iconName || 'fas fa-cube';
  };

  return (
    <Card className={`border-2 ${allDone ? 'border-green-200 bg-green-50/30' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge variant={allDone ? 'default' : 'secondary'}>
                {allDone ? (
                  <><i className="fas fa-check-circle mr-1"></i>Complete</>
                ) : validatedCount > 0 ? (
                  <><i className="fas fa-spinner mr-1"></i>In Progress</>
                ) : (
                  <><i className="fas fa-clock mr-1"></i>Pending</>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {validatedCount}/{totalCount} items validated
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              <i className="fas fa-calendar mr-1"></i>
              Created {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRefresh(request.id)}
            >
              <i className="fas fa-rotate-right mr-1"></i>Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => onCopyLink(request.token)}
            >
              <i className="fas fa-link mr-1"></i>Copy Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-2 border-t pt-4">
            {request.items?.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                  <i className={`${getPlatformIcon(item.platformId)} text-sm text-primary`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.assetName || getPlatformName(item.platformId)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getPlatformName(item.platformId)} &bull; {item.accessPattern} &bull; {item.role}
                  </p>
                </div>
                <Badge
                  variant={item.status === 'validated' ? 'default' : 'secondary'}
                  className={item.status === 'validated' ? 'bg-green-100 text-green-700' : ''}
                >
                  {item.status === 'validated' ? (
                    <><i className="fas fa-check mr-1"></i>Validated</>
                  ) : (
                    <><i className="fas fa-clock mr-1"></i>Pending</>
                  )}
                </Badge>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">Onboarding Link</p>
            <p className="text-xs font-mono break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/onboarding/${request.token}` : `/onboarding/${request.token}`}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
