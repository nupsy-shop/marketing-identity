'use client';

/**
 * Platform Integration (Agency) Card
 * Shows OAuth connection status and allows connecting/disconnecting agency-level OAuth tokens.
 * This is for admin "Platform Integration" - separate from client onboarding OAuth.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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

export default function PlatformIntegrationCard({ platformKey, manifest }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshingTargets, setRefreshingTargets] = useState(false);
  const [oauthStatus, setOauthStatus] = useState(null);
  const [agencyToken, setAgencyToken] = useState(null);
  const [targets, setTargets] = useState([]);

  // Check if OAuth is supported for this platform
  const oauthSupported = manifest?.automationCapabilities?.oauthSupported === true;
  const discoverTargetsSupported = manifest?.automationCapabilities?.discoverTargetsSupported === true;

  // Fetch OAuth status and agency token
  const fetchOAuthData = useCallback(async () => {
    if (!platformKey || !oauthSupported) {
      setLoading(false);
      return;
    }

    try {
      // Get OAuth configuration status
      const statusRes = await fetch(`/api/oauth/${platformKey}/status`);
      const statusData = await statusRes.json();
      if (statusData.success) {
        setOauthStatus(statusData.data);
      }

      // Get agency token if exists
      const tokensRes = await fetch(`/api/oauth/tokens?platformKey=${platformKey}&scope=AGENCY&limit=1`);
      const tokensData = await tokensRes.json();
      if (tokensData.success && tokensData.data?.length > 0) {
        const token = tokensData.data[0];
        setAgencyToken(token);

        // Get targets for this token
        if (token.id) {
          const targetsRes = await fetch(`/api/oauth/tokens/${token.id}/targets`);
          const targetsData = await targetsRes.json();
          if (targetsData.success) {
            setTargets(targetsData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching OAuth data:', error);
    } finally {
      setLoading(false);
    }
  }, [platformKey, oauthSupported]);

  useEffect(() => {
    fetchOAuthData();
  }, [fetchOAuthData]);

  // Start OAuth flow
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/api/oauth/callback`;
      
      const res = await fetch(`/api/oauth/${platformKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirectUri,
          scope: 'AGENCY' // Explicitly mark as agency token
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.data?.authUrl) {
        // Store state for callback verification
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_platform', platformKey);
        sessionStorage.setItem('oauth_scope', 'AGENCY');
        
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else {
        toast({
          title: 'OAuth Error',
          description: data.error || 'Failed to start OAuth flow',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect',
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect (deactivate token)
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
        toast({
          title: 'Disconnected',
          description: `${manifest?.displayName || platformKey} has been disconnected.`
        });
        setAgencyToken(null);
        setTargets([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive'
      });
    }
  };

  // Refresh targets
  const handleRefreshTargets = async () => {
    if (!agencyToken) return;

    setRefreshingTargets(true);
    try {
      const res = await fetch(`/api/oauth/tokens/${agencyToken.id}/refresh-targets`, {
        method: 'POST'
      });
      
      const data = await res.json();
      if (data.success) {
        setTargets(data.data?.targets || []);
        toast({
          title: 'Targets Refreshed',
          description: `Found ${data.data?.targets?.length || 0} accessible targets.`
        });
      } else {
        toast({
          title: 'Refresh Failed',
          description: data.error || 'Failed to refresh targets',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh targets',
        variant: 'destructive'
      });
    } finally {
      setRefreshingTargets(false);
    }
  };

  // Don't render if OAuth not supported
  if (!oauthSupported) {
    return null;
  }

  const isConnected = agencyToken && agencyToken.isActive;
  const isConfigured = oauthStatus?.configured === true;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <i className="fas fa-plug text-primary" aria-hidden="true"></i>
              Platform Integration (Agency)
            </CardTitle>
            <CardDescription>
              Connect your agency's {manifest?.displayName || platformKey} account for discovery and automation
            </CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-100 text-green-700' : ''}>
            {isConnected ? (
              <>
                <i className="fas fa-check-circle mr-1" aria-hidden="true"></i>
                Connected
              </>
            ) : (
              <>
                <i className="fas fa-times-circle mr-1" aria-hidden="true"></i>
                Not Connected
              </>
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
                      {manifest?.displayName || platformKey} OAuth credentials are not set in environment variables.
                      {oauthStatus?.developerPortalUrl && (
                        <> Get credentials from <a href={oauthStatus.developerPortalUrl} target="_blank" rel="noopener noreferrer" className="underline">{oauthStatus.provider} Developer Portal</a>.</>
                      )}
                    </p>
                    {oauthStatus?.requiredEnvVars?.length > 0 && (
                      <p className="text-amber-700 text-xs mt-1 font-mono">
                        Required: {oauthStatus.requiredEnvVars.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Connected state */}
            {isConnected && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-user-check text-green-600" aria-hidden="true"></i>
                      <div className="text-sm">
                        <p className="font-medium text-green-800">Agency Connected</p>
                        <p className="text-green-700 text-xs">
                          Connected {agencyToken.createdAt ? new Date(agencyToken.createdAt).toLocaleDateString() : 'recently'}
                          {agencyToken.expiresAt && (
                            <> · Expires {new Date(agencyToken.expiresAt).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discovered Targets */}
                {discoverTargetsSupported && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Accessible Targets</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleRefreshTargets}
                        disabled={refreshingTargets}
                      >
                        <i className={`fas fa-sync-alt mr-1 ${refreshingTargets ? 'animate-spin' : ''}`} aria-hidden="true"></i>
                        Refresh
                      </Button>
                    </div>
                    {targets.length > 0 ? (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {targets.map(target => (
                          <div key={target.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                            <Badge variant="outline" className="text-xs">
                              {target.targetType}
                            </Badge>
                            <span className="font-medium truncate">{target.displayName}</span>
                            <span className="text-muted-foreground text-xs truncate">({target.externalId})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No targets discovered. Click Refresh to discover accessible accounts/properties.
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <i className="fas fa-unlink mr-2" aria-hidden="true"></i>
                        Disconnect
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
                        <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground">
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Not connected state */}
            {!isConnected && isConfigured && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your agency's {manifest?.displayName || platformKey} account to enable:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {discoverTargetsSupported && <li>Discover accessible accounts/properties</li>}
                  {manifest?.automationCapabilities?.automatedProvisioningSupported && <li>Automated access provisioning</li>}
                  {manifest?.automationCapabilities?.apiVerificationSupported && <li>API-based access verification</li>}
                </ul>
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plug mr-2" aria-hidden="true"></i>
                      Connect {manifest?.displayName || platformKey}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Not configured - still allow viewing info */}
            {!isConnected && !isConfigured && (
              <p className="text-sm text-muted-foreground">
                Configure OAuth credentials to enable agency integration.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Need to add Label import
import { Label } from '@/components/ui/label';
