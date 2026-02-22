'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();
      if (result.success) {
        setClients(result.data);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClientName,
          email: newClientEmail
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Client created successfully'
        });
        setNewClientOpen(false);
        setNewClientName('');
        setNewClientEmail('');
        loadClients();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create client',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create client:', error);
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Marketing Identity Platform</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push('/admin/catalog')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect width="7" height="7" x="3" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="14" rx="1"/>
                  <rect width="7" height="7" x="3" y="14" rx="1"/>
                </svg>
                App Catalog
              </Button>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold">Clients</h2>
                <p className="text-muted-foreground">Manage client accounts and access requests</p>
              </div>
              <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Client
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Client</DialogTitle>
                    <DialogDescription>
                      Add a new client to the platform. You'll be able to create access requests for them after creation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createClient} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Client Name</Label>
                      <Input
                        id="name"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Acme Corporation"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="contact@acme.com"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={creating} className="flex-1">
                        {creating ? 'Creating...' : 'Create Client'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setNewClientOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading clients...</p>
              </div>
            ) : clients.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-muted-foreground">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                    <p className="text-muted-foreground mb-4">Get started by creating your first client</p>
                    <Button onClick={() => setNewClientOpen(true)}>Create Client</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/admin/clients/${client.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{client.name}</CardTitle>
                          <CardDescription>{client.email}</CardDescription>
                        </div>
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/clients/${client.id}`);
                        }}>
                          Manage
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created {new Date(client.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="platforms">
            <PlatformsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PlatformsList() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ domain: '', automation: '' });

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms');
      const result = await response.json();
      if (result.success) {
        setPlatforms(result.data);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlatforms = platforms.filter(p => {
    if (filter.domain && p.domain !== filter.domain) return false;
    if (filter.automation && p.automationFeasibility !== filter.automation) return false;
    return true;
  });

  const domains = Array.from(new Set(platforms.map(p => p.domain)));
  const automationLevels = Array.from(new Set(platforms.map(p => p.automationFeasibility)));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Supported Platforms</h2>
        <p className="text-muted-foreground mb-4">{platforms.length} marketing platforms integrated</p>
        
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Filter by Domain</Label>
            <select 
              className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background"
              value={filter.domain}
              onChange={(e) => setFilter({ ...filter, domain: e.target.value })}
            >
              <option value="">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <Label>Filter by Automation</Label>
            <select 
              className="w-full mt-1 border border-input rounded-md px-3 py-2 bg-background"
              value={filter.automation}
              onChange={(e) => setFilter({ ...filter, automation: e.target.value })}
            >
              <option value="">All Levels</option>
              {automationLevels.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading platforms...</p>
      ) : (
        <div className="grid gap-3">
          {filteredPlatforms.map((platform) => (
            <Card key={platform.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.domain}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={platform.automationFeasibility.includes('High') ? 'default' : platform.automationFeasibility.includes('Medium') ? 'secondary' : 'outline'}>
                      {platform.automationFeasibility}
                    </Badge>
                    <Badge variant="outline">{platform.accessPattern}</Badge>
                  </div>
                </div>
              </CardHeader>
              {platform.notes && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">{platform.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
