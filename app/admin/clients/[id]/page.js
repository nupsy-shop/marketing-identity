'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [client, setClient] = useState(null);
  const [accessRequests, setAccessRequests] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('');

  useEffect(() => {
    if (params.id) {
      loadData();
    }
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
      toast({
        title: 'Error',
        description: 'Failed to load client data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccessRequest = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one platform',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: params.id,
          platformIds: selectedPlatforms
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Access request created successfully'
        });
        setCreateDialogOpen(false);
        setSelectedPlatforms([]);
        loadData();
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
      setCreating(false);
    }
  };

  const copyOnboardingLink = (token) => {
    const link = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Success',
      description: 'Onboarding link copied to clipboard'
    });
  };

  const refreshAccessRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/access-requests/${requestId}/refresh`, {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Access validation refreshed'
        });
        loadData();
      }
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh validation',
        variant: 'destructive'
      });
    }
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const filteredPlatforms = platforms.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterDomain && p.domain !== filterDomain) return false;
    return true;
  });

  const domains = Array.from(new Set(platforms.map(p => p.domain)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">Client not found</p>
            <Button className="mt-4 w-full" onClick={() => router.push('/admin')}>Go Back</Button>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Access Request
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Access Requests</h2>
          <p className="text-muted-foreground">Manage platform access for this client</p>
        </div>

        {accessRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <h3 className="text-lg font-semibold mb-2">No access requests yet</h3>
                <p className="text-muted-foreground mb-4">Create an access request to start the onboarding process</p>
                <Button onClick={() => setCreateDialogOpen(true)}>Create Access Request</Button>
              </div>
            </CardContent>
          </Card>
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

      {/* Create Access Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Access Request</DialogTitle>
            <DialogDescription>
              Select the platforms the client needs to grant access to
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="Search platforms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="border border-input rounded-md px-3 py-2 bg-background"
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
              >
                <option value="">All Domains</option>
                {domains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="text-sm text-muted-foreground">
              {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
            </div>

            <div className="space-y-2">
              {filteredPlatforms.map((platform) => (
                <div key={platform.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent">
                  <Checkbox 
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={() => togglePlatform(platform.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={platform.id} className="font-medium cursor-pointer">
                      {platform.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{platform.domain}</p>
                  </div>
                  <Badge variant={platform.automationFeasibility.includes('High') ? 'default' : 'secondary'}>
                    {platform.automationFeasibility}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={createAccessRequest} disabled={creating || selectedPlatforms.length === 0} className="flex-1">
              {creating ? 'Creating...' : `Create Request (${selectedPlatforms.length} platforms)`}
            </Button>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccessRequestCard({ request, platforms, onCopyLink, onRefresh }) {
  const getStatusColor = (status) => {
    if (status === 'validated') return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const validatedCount = request.platformStatuses.filter(ps => ps.status === 'validated').length;
  const totalCount = request.platformStatuses.length;
  const progress = (validatedCount / totalCount) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Access Request</CardTitle>
            <CardDescription>
              Created {new Date(request.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onRefresh(request.id)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M3 22v-6h6"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </Button>
            <Button size="sm" onClick={() => onCopyLink(request.token)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
              Copy Link
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{validatedCount} / {totalCount} validated</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {request.platformStatuses.map((ps) => {
            const platform = platforms.find(p => p.id === ps.platformId);
            return (
              <div key={ps.platformId} className="flex items-center gap-3 p-2 border rounded">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(ps.status)}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{platform?.name || 'Unknown'}</p>
                  {ps.validatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Validated {new Date(ps.validatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge variant={ps.status === 'validated' ? 'default' : 'secondary'}>
                  {ps.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
