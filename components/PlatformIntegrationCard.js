'use client';

/**
 * Platform Integration (Agency) Card
 * Client-centric governance: one row per client, drill-down for item details.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ITEM_TYPE_LABELS = {
  NAMED_INVITE: 'Named Invite',
  GROUP_ACCESS: 'Group / Service Acct',
  SHARED_ACCOUNT: 'Shared Account (PAM)',
  PARTNER_DELEGATION: 'Partner Delegation',
  PROXY_TOKEN: 'Proxy Token',
};

const STATUS_BADGE = {
  validated: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed:    { label: 'Failed',   cls: 'bg-red-50 text-red-700 border-red-200' },
  needs_evidence: { label: 'Needs Review', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

function parseTarget(raw) {
  try {
    const t = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { name: t?.name || t?.displayName || '—', id: t?.id || t?.externalId || '—' };
  } catch { return { name: '—', id: '—' }; }
}

function deriveClientStatus(items) {
  if (!items.length) return 'pending';
  if (items.some(i => i.status === 'failed')) return 'failed';
  if (items.every(i => i.status === 'validated')) return 'validated';
  return 'pending';
}

function maxDate(items, field) {
  const dates = items.map(i => i[field]).filter(Boolean).map(d => new Date(d).getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
}

// ─── Summary Bar ───────────────────────────────────────────────
function ClientSummaryBar({ clients }) {
  const total = clients.length;
  const verified = clients.filter(c => c.status === 'validated').length;
  const failed = clients.filter(c => c.status === 'failed').length;
  const pending = total - verified - failed;

  const stats = [
    { label: 'Total Clients', value: total, icon: 'fa-users', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
    { label: 'Fully Verified', value: verified, icon: 'fa-check-circle', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Pending', value: pending, icon: 'fa-clock', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Failed', value: failed, icon: 'fa-times-circle', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4" data-testid="client-summary-bar">
      {stats.map(s => (
        <div key={s.label} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${s.bg}`}>
          <i className={`fas ${s.icon} ${s.color} text-sm`} aria-hidden="true" />
          <div className="min-w-0">
            <p className={`text-lg font-semibold leading-none ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Client Detail Sheet ───────────────────────────────────────
function ClientDetailSheet({ client, open, onClose, isConnected, onVerifyItem, verifyingItem, onVerifyClient, verifyingClient }) {
  if (!client) return null;
  const st = STATUS_BADGE[client.status] || { label: 'Unknown', cls: 'bg-gray-100 text-gray-600' };

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto" data-testid="client-detail-sheet">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <i className="fas fa-building text-primary" aria-hidden="true" />
            {client.name}
          </SheetTitle>
          <SheetDescription>{client.email || 'No email'}</SheetDescription>
        </SheetHeader>

        {/* Client-level summary */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <Badge variant="outline" className={`text-xs ${st.cls}`}>{st.label}</Badge>
          <span className="text-xs text-muted-foreground">{client.items.length} access item{client.items.length !== 1 ? 's' : ''}</span>
          {client.lastVerified && (
            <span className="text-xs text-muted-foreground ml-auto">
              Last verified {client.lastVerified.toLocaleDateString()}
            </span>
          )}
        </div>

        {isConnected && (
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={() => onVerifyClient(client)} disabled={verifyingClient} data-testid="verify-client-btn" className="h-7 text-xs">
              {verifyingClient
                ? <><i className="fas fa-spinner fa-spin mr-1" aria-hidden="true" />Verifying...</>
                : <><i className="fas fa-check-double mr-1" aria-hidden="true" />Re-verify All Items</>}
            </Button>
          </div>
        )}

        {/* Item-level table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Target</TableHead>
                <TableHead className="text-xs font-semibold">Type</TableHead>
                <TableHead className="text-xs font-semibold">Role</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Verified</TableHead>
                {isConnected && <TableHead className="text-xs font-semibold w-[72px]">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.items.map(item => {
                const tgt = parseTarget(item.clientProvidedTarget);
                const itemSt = STATUS_BADGE[item.status] || { label: item.status || 'Unknown', cls: 'bg-gray-100 text-gray-600' };
                return (
                  <TableRow key={item.id} data-testid={`detail-item-${item.id}`}>
                    <TableCell className="py-2">
                      <span className="text-sm font-medium block truncate max-w-[160px]">{tgt.name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate max-w-[160px]">{tgt.id}</span>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</TableCell>
                    <TableCell className="py-2"><Badge variant="outline" className="text-[10px] font-normal">{item.role}</Badge></TableCell>
                    <TableCell className="py-2"><Badge variant="outline" className={`text-[10px] ${itemSt.cls}`}>{itemSt.label}</Badge></TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{item.validatedAt ? new Date(item.validatedAt).toLocaleDateString() : '—'}</TableCell>
                    {isConnected && (
                      <TableCell className="py-2">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                          disabled={verifyingItem === item.id || verifyingClient}
                          onClick={() => onVerifyItem(item)}
                          data-testid={`verify-item-btn-${item.id}`}>
                          {verifyingItem === item.id
                            ? <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                            : <><i className="fas fa-redo mr-1" aria-hidden="true" />Verify</>}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ────────────────────────────────────────────
export default function PlatformIntegrationCard({ platformKey, manifest }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshingTargets, setRefreshingTargets] = useState(false);
  const [oauthStatus, setOauthStatus] = useState(null);
  const [agencyToken, setAgencyToken] = useState(null);
  const [targets, setTargets] = useState([]);
  const [onboardedAccounts, setOnboardedAccounts] = useState([]);
  const [loadingOnboarded, setLoadingOnboarded] = useState(true);
  const [verifyingItem, setVerifyingItem] = useState(null);
  const [verifyingClient, setVerifyingClient] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);

  const oauthSupported = manifest?.automationCapabilities?.oauthSupported === true;
  const discoverTargetsSupported = manifest?.automationCapabilities?.discoverTargetsSupported === true;

  // ─── Data fetching ─────────────────────────────────────────
  const fetchOAuthData = useCallback(async () => {
    if (!platformKey || !oauthSupported) { setLoading(false); return; }
    try {
      const statusRes = await fetch(`/api/oauth/${platformKey}/status`);
      const statusData = await statusRes.json();
      if (statusData.success) setOauthStatus(statusData.data);
      const tokensRes = await fetch(`/api/oauth/tokens?platformKey=${platformKey}&scope=AGENCY&limit=1`);
      const tokensData = await tokensRes.json();
      if (tokensData.success && tokensData.data?.length > 0) {
        const token = tokensData.data[0];
        setAgencyToken(token);
        if (token.id) {
          const targetsRes = await fetch(`/api/oauth/tokens/${token.id}/targets`);
          const targetsData = await targetsRes.json();
          if (targetsData.success) setTargets(targetsData.data || []);
        }
      }
    } catch (e) { console.error('OAuth fetch error:', e); }
    finally { setLoading(false); }
  }, [platformKey, oauthSupported]);

  const fetchOnboardedAccounts = useCallback(async () => {
    if (!platformKey) return;
    setLoadingOnboarded(true);
    try {
      const res = await fetch(`/api/admin/platforms/${platformKey}/onboarded-accounts`);
      const data = await res.json();
      if (data.success) setOnboardedAccounts(data.data || []);
    } catch (e) { console.error('Onboarded fetch error:', e); }
    finally { setLoadingOnboarded(false); }
  }, [platformKey]);

  useEffect(() => { fetchOAuthData(); }, [fetchOAuthData]);
  useEffect(() => { fetchOnboardedAccounts(); }, [fetchOnboardedAccounts]);

  // ─── Derived: group by client ──────────────────────────────
  const clientList = useMemo(() => {
    const map = {};
    for (const item of onboardedAccounts) {
      const key = item.clientEmail || item.clientName || 'unknown';
      if (!map[key]) map[key] = { key, name: item.clientName || '—', email: item.clientEmail || '', items: [] };
      map[key].items.push(item);
    }
    return Object.values(map).map(c => ({
      ...c,
      status: deriveClientStatus(c.items),
      lastVerified: maxDate(c.items, 'validatedAt'),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [onboardedAccounts]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clientList.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (q) {
        const haystack = `${c.name} ${c.email} ${c.items.map(i => { const t = parseTarget(i.clientProvidedTarget); return `${t.name} ${t.id}`; }).join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [clientList, statusFilter, searchQuery]);

  // Keep selected client in sync after refetch
  const activeClient = useMemo(() => {
    if (!selectedClient) return null;
    return clientList.find(c => c.key === selectedClient.key) || null;
  }, [clientList, selectedClient]);

  // ─── Verify helpers ────────────────────────────────────────
  const callVerify = async (item) => {
    const target = item.clientProvidedTarget;
    const targetId = typeof target === 'string' ? JSON.parse(target) : target;
    const externalId = targetId?.id || targetId?.externalId || '';
    const identity = item.resolvedIdentity || item.agencyGroupEmail || '';
    const res = await fetch(`/api/oauth/${platformKey}/verify-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: agencyToken.accessToken, tokenType: agencyToken.tokenType || 'Bearer',
        target: externalId, role: item.role, identity,
        accessItemType: item.itemType, accessRequestItemId: item.id, accessRequestId: item.accessRequestId,
      })
    });
    return res.json();
  };

  const handleVerifyItem = async (item) => {
    if (!agencyToken?.accessToken) { toast({ title: 'Not Connected', variant: 'destructive' }); return; }
    setVerifyingItem(item.id);
    try {
      const data = await callVerify(item);
      if (data.success && data.data?.verified) toast({ title: 'Verified', description: `Access confirmed.` });
      else if (data.success) toast({ title: 'Not Verified', description: 'Expected access not found.', variant: 'destructive' });
      else toast({ title: 'Failed', description: data.error || 'Could not verify', variant: 'destructive' });
      await fetchOnboardedAccounts();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setVerifyingItem(null); }
  };

  const handleVerifyClient = async (client) => {
    if (!agencyToken?.accessToken) { toast({ title: 'Not Connected', variant: 'destructive' }); return; }
    setVerifyingClient(true);
    let ok = 0, fail = 0;
    for (const item of client.items) {
      try { const d = await callVerify(item); if (d.success && d.data?.verified) ok++; else fail++; } catch { fail++; }
    }
    await fetchOnboardedAccounts();
    toast({ title: 'Client Verification Done', description: `${ok} verified, ${fail} failed/skipped.` });
    setVerifyingClient(false);
  };

  const handleReVerifyAll = async () => {
    if (!agencyToken?.accessToken) { toast({ title: 'Not Connected', variant: 'destructive' }); return; }
    setVerifyingAll(true);
    let ok = 0, fail = 0;
    for (const item of onboardedAccounts) {
      try { const d = await callVerify(item); if (d.success && d.data?.verified) ok++; else fail++; } catch { fail++; }
    }
    await fetchOnboardedAccounts();
    toast({ title: 'Re-verify Complete', description: `${ok} verified, ${fail} failed/skipped.` });
    setVerifyingAll(false);
  };

  // ─── OAuth actions ─────────────────────────────────────────
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri: `${window.location.origin}/api/oauth/callback`, scope: 'AGENCY' })
      });
      const data = await res.json();
      if (data.success && data.data?.authUrl) {
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_platform', platformKey);
        sessionStorage.setItem('oauth_scope', 'AGENCY');
        sessionStorage.setItem('oauth_return_url', window.location.href);
        window.location.href = data.data.authUrl;
      } else toast({ title: 'OAuth Error', description: data.error || 'Failed', variant: 'destructive' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!agencyToken) return;
    try {
      const res = await fetch(`/api/oauth/tokens/${agencyToken.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      if ((await res.json()).success) {
        toast({ title: 'Disconnected' }); setAgencyToken(null); setTargets([]);
      }
    } catch { toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' }); }
  };

  const handleRefreshTargets = async () => {
    if (!agencyToken) return;
    setRefreshingTargets(true);
    try {
      const data = await (await fetch(`/api/oauth/tokens/${agencyToken.id}/refresh-targets`, { method: 'POST' })).json();
      if (data.success) { setTargets(data.data?.targets || []); toast({ title: 'Refreshed', description: `${data.data?.targets?.length || 0} targets.` }); }
      else toast({ title: 'Failed', description: data.error, variant: 'destructive' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setRefreshingTargets(false); }
  };

  if (!oauthSupported) return null;
  const isConnected = agencyToken?.isActive;
  const isConfigured = oauthStatus?.configured === true;

  return (
    <Card data-testid="platform-integration-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <i className="fas fa-plug text-primary" aria-hidden="true" />
              Platform Integration (Agency)
            </CardTitle>
            <CardDescription>Connect to validate onboarding access.</CardDescription>
          </div>
          <Badge data-testid="connection-status-badge" variant={isConnected ? 'default' : 'secondary'}
            className={isConnected ? 'bg-green-100 text-green-700' : ''}>
            {isConnected
              ? <><i className="fas fa-check-circle mr-1" aria-hidden="true" />Connected</>
              : <><i className="fas fa-times-circle mr-1" aria-hidden="true" />Not Connected</>}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-2"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-8 bg-gray-200 rounded w-1/4" /></div>
        ) : (
          <>
            {/* OAuth status banners */}
            {!isConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">OAuth Not Configured</p>
                  <p className="text-amber-700 text-xs mt-1">{manifest?.displayName || platformKey} credentials not set.
                    {oauthStatus?.developerPortalUrl && <> Get them from <a href={oauthStatus.developerPortalUrl} target="_blank" rel="noopener noreferrer" className="underline">{oauthStatus.provider} Portal</a>.</>}
                  </p>
                </div>
              </div>
            )}

            {isConnected && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-user-check text-green-600" aria-hidden="true" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">Agency Connected</p>
                    <p className="text-green-700 text-xs">
                      Connected {agencyToken.createdAt ? new Date(agencyToken.createdAt).toLocaleDateString() : 'recently'}
                      {agencyToken.expiresAt && <> · Expires {new Date(agencyToken.expiresAt).toLocaleDateString()}</>}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 text-xs">
                      <i className="fas fa-unlink mr-1" aria-hidden="true" />Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect {manifest?.displayName || platformKey}?</AlertDialogTitle>
                      <AlertDialogDescription>This will revoke the agency OAuth connection.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">Disconnect</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {!isConnected && isConfigured && (
              <Button data-testid="connect-platform-btn" onClick={handleConnect} disabled={connecting}>
                {connecting ? <><i className="fas fa-spinner fa-spin mr-2" aria-hidden="true" />Connecting...</> : <><i className="fas fa-plug mr-2" aria-hidden="true" />Connect {manifest?.displayName || platformKey}</>}
              </Button>
            )}
            {!isConnected && !isConfigured && (
              <p className="text-sm text-muted-foreground">Configure OAuth credentials to enable agency integration.</p>
            )}

            {/* ═══ Tabs ═══ */}
            <Tabs defaultValue="onboarded" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="onboarded" data-testid="tab-onboarded-accounts">
                  Onboarded Accounts
                  {clientList.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{clientList.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="scope" data-testid="tab-integration-scope">Integration Scope</TabsTrigger>
              </TabsList>

              {/* ──── Tab 1: Onboarded Accounts (client rows) ──── */}
              <TabsContent value="onboarded" data-testid="onboarded-accounts-panel" className="space-y-3 mt-3">
                {!isConnected && clientList.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 flex items-center gap-1.5">
                      <i className="fas fa-info-circle" aria-hidden="true" />Connect to enable validation. Status stays unknown until connected.
                    </p>
                  </div>
                )}

                {loadingOnboarded ? (
                  <div className="animate-pulse space-y-2 py-4"><div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div>
                ) : clientList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm" data-testid="no-onboarded-accounts">
                    <i className="fas fa-inbox text-2xl mb-2 block opacity-40" aria-hidden="true" />No onboarded accounts yet.
                  </div>
                ) : (
                  <>
                    <ClientSummaryBar clients={clientList} />

                    {/* Filters */}
                    <div className="flex items-center gap-2" data-testid="onboarded-filters">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="status-filter-select">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="validated"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Verified</span></SelectItem>
                          <SelectItem value="pending"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Pending</span></SelectItem>
                          <SelectItem value="failed"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Failed</span></SelectItem>
                        </SelectContent>
                      </Select>

                      <Input placeholder="Search client or target..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 text-xs flex-1 max-w-[260px]" data-testid="onboarded-search-input" />

                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</span>
                        {isConnected && (
                          <Button variant="outline" size="sm" onClick={handleReVerifyAll} disabled={verifyingAll} data-testid="re-verify-all-btn" className="h-7 text-xs">
                            {verifyingAll ? <><i className="fas fa-spinner fa-spin mr-1" aria-hidden="true" />Verifying...</> : <><i className="fas fa-check-double mr-1" aria-hidden="true" />Re-verify All</>}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Client rows table */}
                    <div className="border rounded-lg overflow-hidden">
                      <div className="max-h-[420px] overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-xs font-semibold">Client</TableHead>
                              <TableHead className="text-xs font-semibold text-center w-[70px]">Items</TableHead>
                              <TableHead className="text-xs font-semibold w-[90px]">Status</TableHead>
                              <TableHead className="text-xs font-semibold w-[100px]">Last Verified</TableHead>
                              <TableHead className="text-xs font-semibold text-right w-[170px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredClients.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">No clients match the current filter.</TableCell></TableRow>
                            ) : filteredClients.map(client => {
                              const st = STATUS_BADGE[client.status] || { label: 'Unknown', cls: 'bg-gray-100 text-gray-600' };
                              return (
                                <TableRow key={client.key} data-testid={`client-row-${client.key}`} className="group">
                                  <TableCell className="py-2.5">
                                    <span className="text-sm font-medium block truncate max-w-[200px]">{client.name}</span>
                                    {client.email && <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">{client.email}</span>}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-center">
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{client.items.length}</Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <Badge variant="outline" className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs text-muted-foreground">
                                    {client.lastVerified ? client.lastVerified.toLocaleDateString() : '—'}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button variant="outline" size="sm" className="h-6 text-[10px] px-2"
                                        onClick={() => setSelectedClient(client)} data-testid={`view-details-btn-${client.key}`}>
                                        <i className="fas fa-list-ul mr-1" aria-hidden="true" />View Details
                                      </Button>
                                      {isConnected && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                                          onClick={() => handleVerifyClient(client)} disabled={verifyingAll}
                                          data-testid={`reverify-client-btn-${client.key}`}>
                                          <i className="fas fa-redo mr-1" aria-hidden="true" />Re-verify
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ──── Tab 2: Integration Scope (unchanged) ──── */}
              <TabsContent value="scope" data-testid="integration-scope-panel">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg mb-3">
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <i className="fas fa-eye text-slate-400" aria-hidden="true" />Detected via OAuth; not governed by PAM.
                  </p>
                </div>
                {!isConnected ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">Connect to discover accessible targets.</div>
                ) : (
                  <>
                    {discoverTargetsSupported && (
                      <div className="flex justify-end mb-2">
                        <Button variant="outline" size="sm" onClick={handleRefreshTargets} disabled={refreshingTargets} data-testid="refresh-targets-btn" className="h-7 text-xs">
                          <i className={`fas fa-sync-alt mr-1 ${refreshingTargets ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh
                        </Button>
                      </div>
                    )}
                    {targets.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {targets.map(t => (
                          <div key={t.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm" data-testid={`scope-target-${t.id}`}>
                            <Badge variant="outline" className="text-[10px]">{t.targetType}</Badge>
                            <span className="font-medium truncate text-sm">{t.displayName}</span>
                            <span className="text-muted-foreground text-xs truncate">({t.externalId})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No targets discovered. Click Refresh.</p>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>

      {/* Client Detail Sheet */}
      <ClientDetailSheet
        client={activeClient}
        open={!!activeClient}
        onClose={() => setSelectedClient(null)}
        isConnected={isConnected}
        onVerifyItem={handleVerifyItem}
        verifyingItem={verifyingItem}
        onVerifyClient={handleVerifyClient}
        verifyingClient={verifyingClient}
      />
    </Card>
  );
}
