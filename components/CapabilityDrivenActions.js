'use client';

/**
 * Capability-Driven Onboarding Actions
 * Renders the appropriate action buttons/flows based on plugin accessTypeCapabilities
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

/**
 * Renders OAuth Connect + Target Selection flow
 */
export function OAuthConnectFlow({ 
  platformKey, 
  platformName,
  accessItemType,
  onTokenReceived,
  onTargetSelected,
  disabled = false 
}) {
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);
  const [clientToken, setClientToken] = useState(null);
  const [targets, setTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [discovering, setDiscovering] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/api/oauth/callback`;
      
      const res = await fetch(`/api/oauth/${platformKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirectUri,
          scope: 'CLIENT'  // Client-level token
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.data?.authUrl) {
        // Store state for callback
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_platform', platformKey);
        sessionStorage.setItem('oauth_scope', 'CLIENT');
        sessionStorage.setItem('oauth_access_item_type', accessItemType);
        
        // Redirect
        window.location.href = data.data.authUrl;
      } else {
        toast({
          title: 'Connection Error',
          description: data.error || 'Failed to start OAuth',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDiscoverTargets = async () => {
    if (!clientToken?.accessToken) return;
    
    setDiscovering(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/discover-targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken: clientToken.accessToken,
          tokenType: clientToken.tokenType 
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setTargets(data.data?.targets || []);
        if (data.data?.targets?.length === 1) {
          // Auto-select if only one target
          setSelectedTarget(data.data.targets[0]);
          onTargetSelected?.(data.data.targets[0]);
        }
      } else {
        toast({
          title: 'Discovery Failed',
          description: data.error || 'Could not discover targets',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setDiscovering(false);
    }
  };

  const handleTargetSelect = (targetId) => {
    const target = targets.find(t => t.externalId === targetId);
    setSelectedTarget(target);
    onTargetSelected?.(target);
  };

  // If we have a token, show target selection
  if (clientToken) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
          <i className="fas fa-check-circle" aria-hidden="true"></i>
          <span className="text-sm font-medium">Connected to {platformName}</span>
        </div>
        
        {targets.length === 0 && (
          <Button onClick={handleDiscoverTargets} disabled={discovering} variant="outline">
            {discovering ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Discovering...
              </>
            ) : (
              <>
                <i className="fas fa-search mr-2" aria-hidden="true"></i>
                Discover Accessible Targets
              </>
            )}
          </Button>
        )}
        
        {targets.length > 0 && (
          <div className="space-y-2">
            <Label>Select Target</Label>
            <Select value={selectedTarget?.externalId} onValueChange={handleTargetSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account/property..." />
              </SelectTrigger>
              <SelectContent>
                {targets.map(target => (
                  <SelectItem key={target.externalId} value={target.externalId}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{target.targetType}</Badge>
                      <span>{target.displayName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTarget && (
              <p className="text-xs text-muted-foreground">
                ID: {selectedTarget.externalId}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show connect button
  return (
    <Button onClick={handleConnect} disabled={disabled || connecting}>
      {connecting ? (
        <>
          <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          Connecting...
        </>
      ) : (
        <>
          <i className="fas fa-plug mr-2" aria-hidden="true"></i>
          Connect {platformName}
        </>
      )}
    </Button>
  );
}

/**
 * Renders Grant Access button (when canGrantAccess=true)
 */
export function GrantAccessButton({ 
  platformKey,
  accessToken,
  target,
  role,
  identity,
  accessItemType,
  onGranted,
  disabled = false
}) {
  const { toast } = useToast();
  const [granting, setGranting] = useState(false);

  const handleGrant = async () => {
    setGranting(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          target,
          role,
          identity,
          accessItemType
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast({
          title: 'Access Granted',
          description: 'Access has been provisioned successfully.'
        });
        onGranted?.(data.data);
      } else {
        toast({
          title: 'Grant Failed',
          description: data.error || 'Could not grant access',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGranting(false);
    }
  };

  return (
    <Button onClick={handleGrant} disabled={disabled || granting} className="bg-green-600 hover:bg-green-700">
      {granting ? (
        <>
          <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          Granting Access...
        </>
      ) : (
        <>
          <i className="fas fa-user-plus mr-2" aria-hidden="true"></i>
          Grant Access
        </>
      )}
    </Button>
  );
}

/**
 * Renders Verify Access button (when canVerifyAccess=true)
 */
export function VerifyAccessButton({ 
  platformKey,
  accessToken,
  target,
  role,
  identity,
  accessItemType,
  onVerified,
  disabled = false
}) {
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          target,
          role,
          identity,
          accessItemType
        })
      });
      
      const data = await res.json();
      if (data.success && data.data?.verified) {
        toast({
          title: 'Access Verified',
          description: 'Access has been confirmed.'
        });
        onVerified?.(true, data.data);
      } else if (data.success && !data.data?.verified) {
        toast({
          title: 'Not Found',
          description: 'Access not found. Please complete the manual steps and try again.',
          variant: 'destructive'
        });
        onVerified?.(false, data.data);
      } else {
        toast({
          title: 'Verification Failed',
          description: data.error || 'Could not verify access',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Button onClick={handleVerify} disabled={disabled || verifying} variant="outline">
      {verifying ? (
        <>
          <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
          Verifying...
        </>
      ) : (
        <>
          <i className="fas fa-shield-check mr-2" aria-hidden="true"></i>
          Verify Access
        </>
      )}
    </Button>
  );
}

/**
 * Capability indicator badges for showing what's possible
 * Updated to handle effective capabilities including PAM-specific flows
 */
export function CapabilityBadges({ capabilities }) {
  if (!capabilities) return null;
  
  // Determine if this is a fully manual flow (no OAuth, no verify, requires evidence)
  const isManualFlow = !capabilities.clientOAuthSupported && 
                       !capabilities.canVerifyAccess && 
                       capabilities.requiresEvidenceUpload;
  
  return (
    <div className="flex flex-wrap gap-1">
      {capabilities.clientOAuthSupported && (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
          <i className="fas fa-plug mr-1" aria-hidden="true"></i>OAuth
        </Badge>
      )}
      {capabilities.canGrantAccess && (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
          <i className="fas fa-bolt mr-1" aria-hidden="true"></i>Auto-Grant
        </Badge>
      )}
      {capabilities.canVerifyAccess && (
        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
          <i className="fas fa-shield-check mr-1" aria-hidden="true"></i>API Verify
        </Badge>
      )}
      {capabilities.requiresEvidenceUpload && (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
          <i className="fas fa-camera mr-1" aria-hidden="true"></i>Evidence
        </Badge>
      )}
      {isManualFlow && (
        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
          <i className="fas fa-hand-pointer mr-1" aria-hidden="true"></i>Manual
        </Badge>
      )}
    </div>
  );
}

/**
 * Main component that renders the appropriate flow based on capabilities
 */
export default function CapabilityDrivenActions({
  platformKey,
  platformName,
  accessItemType,
  capabilities,
  identity,
  role,
  instructions,
  onComplete
}) {
  const [clientToken, setClientToken] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Determine which flow to show
  const showOAuth = capabilities?.clientOAuthSupported;
  const showGrant = capabilities?.canGrantAccess && clientToken;
  const showVerify = capabilities?.canVerifyAccess && clientToken && !capabilities?.canGrantAccess;
  const showManual = !showOAuth && !showGrant && !showVerify;
  const showEvidence = capabilities?.requiresEvidenceUpload;

  return (
    <div className="space-y-4">
      {/* Capability Badges */}
      <CapabilityBadges capabilities={capabilities} />
      
      {/* OAuth Flow */}
      {showOAuth && (
        <OAuthConnectFlow
          platformKey={platformKey}
          platformName={platformName}
          accessItemType={accessItemType}
          onTokenReceived={setClientToken}
          onTargetSelected={setSelectedTarget}
        />
      )}
      
      {/* Grant Access (if available after OAuth) */}
      {showGrant && selectedTarget && (
        <GrantAccessButton
          platformKey={platformKey}
          accessToken={clientToken.accessToken}
          target={selectedTarget}
          role={role}
          identity={identity}
          accessItemType={accessItemType}
          onGranted={onComplete}
        />
      )}
      
      {/* Verify Access (if grant not available but verify is) */}
      {showVerify && selectedTarget && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <i className="fas fa-info-circle mr-2" aria-hidden="true"></i>
              Please complete the manual steps above, then click Verify Access.
            </p>
          </div>
          <VerifyAccessButton
            platformKey={platformKey}
            accessToken={clientToken.accessToken}
            target={selectedTarget}
            role={role}
            identity={identity}
            accessItemType={accessItemType}
            onVerified={(verified) => verified && onComplete?.()}
          />
        </div>
      )}
      
      {/* Manual flow indicator */}
      {showManual && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <p className="text-sm text-slate-700">
            <i className="fas fa-hand-point-right mr-2" aria-hidden="true"></i>
            Follow the instructions above to grant access manually.
          </p>
        </div>
      )}
      
      {/* Evidence upload indicator */}
      {showEvidence && !showGrant && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <i className="fas fa-camera mr-2" aria-hidden="true"></i>
            Screenshot evidence will be required to complete this step.
          </p>
        </div>
      )}
    </div>
  );
}
