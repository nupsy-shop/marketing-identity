'use client';

/**
 * Platform Integration (Agency) Card
 * Shows OAuth connection status, onboarded accounts (from access requests),
 * and OAuth-discovered targets in a tabbed interface.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ITEM_TYPE_LABELS = {
  NAMED_INVITE: 'Named Invite',
  GROUP_ACCESS: 'Group / Service Acct',
  SHARED_ACCOUNT: 'Shared Account (PAM)',
  PARTNER_DELEGATION: 'Partner Delegation',
  PROXY_TOKEN: 'Proxy Token',
};

const STATUS_CONFIG = {
  validated: { label: 'Verified', className: 'bg-green-100 text-green-700 border-green-200' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
  needs_evidence: { label: 'Needs Review', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

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
  const [verifyingAll, setVerifyingAll] = useState(false);

  const oauthSupported = manifest?.automationCapabilities?.oauthSupported === true;
  const discoverTargetsSupported = manifest?.automationCapabilities?.discoverTargetsSupported === true;

  const fetchOAuthData = useCallback(async () => {
    if (!platformKey || !oauthSupported) {
      setLoading(false);
      return;
    }
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
    } catch (error) {
      console.error('Error fetching OAuth data:', error);
    } finally {
      setLoading(false);
    }
  }, [platformKey, oauthSupported]);

  const fetchOnboardedAccounts = useCallback(async () => {
    if (!platformKey) return;
    setLoadingOnboarded(true);
    try {
      const res = await fetch(`/api/admin/platforms/${platformKey}/onboarded-accounts`);
      const data = await res.json();
      if (data.success) setOnboardedAccounts(data.data || []);
    } catch (error) {
      console.error('Error fetching onboarded accounts:', error);
    } finally {
      setLoadingOnboarded(false);
    }
  }, [platformKey]);

  useEffect(() => { fetchOAuthData(); }, [fetchOAuthData]);
  useEffect(() => { fetchOnboardedAccounts(); }, [fetchOnboardedAccounts]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/api/oauth/callback`;
      const res = await fetch(`/api/oauth/${platformKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUri, scope: 'AGENCY' })
      });
      const data = await res.json();
      if (data.success && data.data?.authUrl) {
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_platform', platformKey);
        sessionStorage.setItem('oauth_scope', 'AGENCY');
        sessionStorage.setItem('oauth_return_url', window.location.href);
        window.location.href = data.data.authUrl;
      } else {
        toast({ title: 'OAuth Error', description: data.error || 'Failed to start OAuth flow', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Connection Error', description: error.message, variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!agencyToken) return;
    try {
      const res = await fetch(`/api/oauth/tokens/${agencyToken.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Disconnected', description: `${manifest?.displayName || platformKey} has been disconnected.` });
        setAgencyToken(null);
        setTargets([]);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    }
  };

  const handleRefreshTargets = async () => {
    if (!agencyToken) return;
    setRefreshingTargets(true);
    try {
      const res = await fetch(`/api/oauth/tokens/${agencyToken.id}/refresh-targets`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTargets(data.data?.targets || []);
        toast({ title: 'Targets Refreshed', description: `Found ${data.data?.targets?.length || 0} accessible targets.` });
      } else {
        toast({ title: 'Refresh Failed', description: data.error || 'Failed to refresh targets', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to refresh targets', variant: 'destructive' });
    } finally {
      setRefreshingTargets(false);
    }
  };

  const handleReVerify = async (item) => {
    if (!agencyToken?.accessToken) {
      toast({ title: 'Not Connected', description: 'Connect to enable verification.', variant: 'destructive' });
      return;
    }
    setVerifyingItem(item.id);
    try {
      const target = item.clientProvidedTarget;
      const targetId = typeof target === 'string' ? JSON.parse(target) : target;
      const externalId = targetId?.id || targetId?.externalId || '';

      const res = await fetch(`/api/oauth/${platformKey}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: agencyToken.accessToken,
          tokenType: agencyToken.tokenType || 'Bearer',
          target: externalId,
          role: item.role,
          identity: item.resolvedIdentity || item.agencyGroupEmail || '',
          accessItemType: item.itemType,
          accessRequestItemId: item.id,
          accessRequestId: item.accessRequestId,
        })
      });
      const data = await res.json();
      if (data.success && data.data?.verified) {
        toast({ title: 'Verified', description: `Access confirmed for ${item.resolvedIdentity || item.agencyGroupEmail || 'identity'}.` });
      } else if (data.success && !data.data?.verified) {
        toast({ title: 'Not Verified', description: 'Expected access binding not found.', variant: 'destructive' });
      } else {
        toast({ title: 'Verification Failed', description: data.error || 'Could not verify', variant: 'destructive' });
      }
      await fetchOnboardedAccounts();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setVerifyingItem(null);
    }
  };

  const handleReVerifyAll = async () => {
    if (!agencyToken?.accessToken) {
      toast({ title: 'Not Connected', description: 'Connect to enable verification.', variant: 'destructive' });
      return;
    }
    setVerifyingAll(true);
    let verified = 0, failed = 0;
    for (const item of onboardedAccounts) {
      try {
        const target = item.clientProvidedTarget;
        const targetId = typeof target === 'string' ? JSON.parse(target) : target;
        const externalId = targetId?.id || targetId?.externalId || '';
        const identity = item.resolvedIdentity || item.agencyGroupEmail || '';
        if (!externalId || !identity) { failed++; continue; }

        const res = await fetch(`/api/oauth/${platformKey}/verify-access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: agencyToken.accessToken,
            tokenType: agencyToken.tokenType || 'Bearer',
            target: externalId,
            role: item.role,
            identity,
            accessItemType: item.itemType,
            accessRequestItemId: item.id,
            accessRequestId: item.accessRequestId,
          })
        });
        const data = await res.json();
        if (data.success && data.data?.verified) verified++;
        else failed++;
      } catch { failed++; }
    }
    await fetchOnboardedAccounts();
    toast({ title: 'Re-verify Complete', description: `${verified} verified, ${failed} failed or skipped.` });
    setVerifyingAll(false);
  };

  if (!oauthSupported) return null;

  const isConnected = agencyToken && agencyToken.isActive;
  const isConfigured = oauthStatus?.configured === true;

  const getTargetDisplay = (item) => {
    try {
      const t = typeof item.clientProvidedTarget === 'string'
        ? JSON.parse(item.clientProvidedTarget)
        : item.clientProvidedTarget;
      return { name: t?.name || t?.displayName || '—', id: t?.id || t?.externalId || '—' };
    } catch {
      return { name: '—', id: '—' };
    }
  };

  return (
    <Card data-testid="platform-integration-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <i className="fas fa-plug text-primary" aria-hidden="true"></i>
              Platform Integration (Agency)
            </CardTitle>
            <CardDescription>Connect to validate onboarding access.</CardDescription>
          </div>
          <Badge
            data-testid="connection-status-badge"
            variant={isConnected ? 'default' : 'secondary'}
            className={isConnected ? 'bg-green-100 text-green-700' : ''}
          >
            {isConnected ? (
              <><i className="fas fa-check-circle mr-1" aria-hidden="true"></i>Connected</>
            ) : (
              <><i className="fas fa-times-circle mr-1" aria-hidden="true"></i>Not Connected</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        ) : (
          <>
            {/* Not configured warning */}
            {!isConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5" aria-hidden="true"></i>
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">OAuth Not Configured</p>
                    <p className="text-amber-700 text-xs mt-1">
                      {manifest?.displayName || platformKey} OAuth credentials are not set.
                      {oauthStatus?.developerPortalUrl && (
                        <> Get credentials from <a href={oauthStatus.developerPortalUrl} target="_blank" rel="noopener noreferrer" className="underline">{oauthStatus.provider} Developer Portal</a>.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Connected state: info + disconnect */}
            {isConnected && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-user-check text-green-600" aria-hidden="true"></i>
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
                        <i className="fas fa-unlink mr-1" aria-hidden="true"></i>Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {manifest?.displayName || platformKey}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will revoke the agency OAuth connection. You'll need to reconnect to use automated features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">Disconnect</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Not connected CTA */}
            {!isConnected && isConfigured && (
              <div className="space-y-3">
                <Button data-testid="connect-platform-btn" onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <><i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>Connecting...</>
                  ) : (
                    <><i className="fas fa-plug mr-2" aria-hidden="true"></i>Connect {manifest?.displayName || platformKey}</>
                  )}
                </Button>
              </div>
            )}

            {!isConnected && !isConfigured && (
              <p className="text-sm text-muted-foreground">Configure OAuth credentials to enable agency integration.</p>
            )}

            {/* === Tabs: Onboarded Accounts | Integration Scope === */}
            <Tabs defaultValue="onboarded" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="onboarded" data-testid="tab-onboarded-accounts">
                  Onboarded Accounts
                  {onboardedAccounts.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{onboardedAccounts.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scope" data-testid="tab-integration-scope">Integration Scope</TabsTrigger>
              </TabsList>

              {/* Tab 1: Onboarded Accounts */}
              <TabsContent value="onboarded" data-testid="onboarded-accounts-panel">
                {!isConnected && onboardedAccounts.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                    <p className="text-xs text-amber-800 flex items-center gap-1.5">
                      <i className="fas fa-info-circle" aria-hidden="true"></i>
                      Connect to enable validation. Status stays unknown until connected.
                    </p>
                  </div>
                )}

                {loadingOnboarded ? (
                  <div className="animate-pulse space-y-2 py-4">
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : onboardedAccounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm" data-testid="no-onboarded-accounts">
                    <i className="fas fa-inbox text-2xl mb-2 block opacity-40" aria-hidden="true"></i>
                    No onboarded accounts yet.
                  </div>
                ) : (
                  <>
                    {/* Re-verify all button */}
                    {isConnected && (
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReVerifyAll}
                          disabled={verifyingAll}
                          data-testid="re-verify-all-btn"
                          className="h-7 text-xs"
                        >
                          {verifyingAll ? (
                            <><i className="fas fa-spinner fa-spin mr-1" aria-hidden="true"></i>Verifying...</>
                          ) : (
                            <><i className="fas fa-check-double mr-1" aria-hidden="true"></i>Re-verify All</>
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs font-semibold">Target</TableHead>
                            <TableHead className="text-xs font-semibold">Type</TableHead>
                            <TableHead className="text-xs font-semibold">Role</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                            <TableHead className="text-xs font-semibold">Verified</TableHead>
                            {isConnected && <TableHead className="text-xs font-semibold w-[80px]">Action</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {onboardedAccounts.map(item => {
                            const tgt = getTargetDisplay(item);
                            const statusCfg = STATUS_CONFIG[item.status] || { label: item.status || 'Unknown', className: 'bg-gray-100 text-gray-600' };
                            return (
                              <TableRow key={item.id} data-testid={`onboarded-row-${item.id}`}>
                                <TableCell className="py-2">
                                  <div>
                                    <span className="text-sm font-medium">{tgt.name}</span>
                                    <span className="block text-xs text-muted-foreground">{tgt.id}</span>
                                    {item.clientName && (
                                      <span className="block text-[10px] text-muted-foreground/70">{item.clientName}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <span className="text-xs text-muted-foreground">{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className="text-[10px] font-normal">{item.role}</Badge>
                                </TableCell>
                                <TableCell className="py-2">
                                  <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>
                                    {statusCfg.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 text-xs text-muted-foreground">
                                  {item.validatedAt ? new Date(item.validatedAt).toLocaleDateString() : '—'}
                                </TableCell>
                                {isConnected && (
                                  <TableCell className="py-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] px-2"
                                      disabled={verifyingItem === item.id || verifyingAll}
                                      onClick={() => handleReVerify(item)}
                                      data-testid={`re-verify-btn-${item.id}`}
                                    >
                                      {verifyingItem === item.id ? (
                                        <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                                      ) : (
                                        <><i className="fas fa-redo mr-1" aria-hidden="true"></i>Verify</>
                                      )}
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab 2: Integration Scope (OAuth-discovered targets) */}
              <TabsContent value="scope" data-testid="integration-scope-panel">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg mb-3">
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <i className="fas fa-eye text-slate-400" aria-hidden="true"></i>
                    Detected via OAuth; not governed by PAM.
                  </p>
                </div>

                {!isConnected ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Connect to discover accessible targets.
                  </div>
                ) : (
                  <>
                    {discoverTargetsSupported && (
                      <div className="flex justify-end mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshTargets}
                          disabled={refreshingTargets}
                          data-testid="refresh-targets-btn"
                          className="h-7 text-xs"
                        >
                          <i className={`fas fa-sync-alt mr-1 ${refreshingTargets ? 'animate-spin' : ''}`} aria-hidden="true"></i>
                          Refresh
                        </Button>
                      </div>
                    )}
                    {targets.length > 0 ? (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {targets.map(target => (
                          <div key={target.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm" data-testid={`scope-target-${target.id}`}>
                            <Badge variant="outline" className="text-[10px]">{target.targetType}</Badge>
                            <span className="font-medium truncate text-sm">{target.displayName}</span>
                            <span className="text-muted-foreground text-xs truncate">({target.externalId})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No targets discovered. Click Refresh to discover.
                      </p>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
