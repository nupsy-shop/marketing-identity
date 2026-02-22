'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
                <i className="fas fa-layer-group mr-2"></i>
                Platform Catalog
              </Button>
              <Badge variant="secondary">Admin</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page header + Create Client */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold">Clients</h2>
            <p className="text-muted-foreground">Manage client accounts and access requests</p>
          </div>
          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
            <DialogTrigger asChild>
              <Button>
                <i className="fas fa-plus mr-2"></i>
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
                <DialogDescription>
                  Add a new client to the platform. After creation, configure which platforms they need access to before generating an onboarding link.
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="space-y-4">
            {/* Empty state */}
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <i className="fas fa-users text-5xl text-muted-foreground mb-4 block"></i>
                  <h3 className="text-lg font-semibold mb-2">No clients yet</h3>
                  <p className="text-muted-foreground mb-4">Get started by creating your first client</p>
                  <Button onClick={() => setNewClientOpen(true)}>Create Client</Button>
                </div>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
                <CardDescription>Three steps to generate a client onboarding link</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-medium text-sm">Create a client</p>
                      <p className="text-xs text-muted-foreground">Add the client name and email address</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-medium text-sm">Configure platforms</p>
                      <p className="text-xs text-muted-foreground">Browse the catalog and add the platforms this client needs to grant access to, with roles and asset details</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-medium text-sm">Send onboarding link</p>
                      <p className="text-xs text-muted-foreground">Create an access request and share the link — the client follows step-by-step instructions</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} router={router} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientCard({ client, router }) {
  const [configuredCount, setConfiguredCount] = useState(null);

  useEffect(() => {
    fetch(`/api/clients/${client.id}/configured-apps`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setConfiguredCount(d.data.filter(a => a.isActive).length);
      })
      .catch(() => {});
  }, [client.id]);

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(`/admin/clients/${client.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-xl">{client.name}</CardTitle>
              <CardDescription>{client.email}</CardDescription>
            </div>
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
          <span>
            <i className="fas fa-calendar-alt mr-1"></i>
            Created {new Date(client.createdAt).toLocaleDateString()}
          </span>
          {configuredCount !== null && (
            <span>
              <i className="fas fa-cubes mr-1"></i>
              {configuredCount === 0 ? (
                <span className="text-amber-600 font-medium">No platforms configured yet</span>
              ) : (
                <span>{configuredCount} platform{configuredCount !== 1 ? 's' : ''} configured</span>
              )}
            </span>
          )}
        </div>
        {configuredCount === 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-amber-800">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Add platforms from the catalog to enable access requests
            </p>
            <Button
              size="sm"
              variant="outline"
              className="ml-3 border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/catalog?clientId=${client.id}`);
              }}
            >
              <i className="fas fa-plus mr-1"></i>
              Add Platforms
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
