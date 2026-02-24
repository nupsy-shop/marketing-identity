'use client';

/**
 * Client Onboarding Page - Plugin-Based Architecture
 * Uses schema-driven forms from plugins for client asset selection
 * Now with capability-driven actions based on accessTypeCapabilities
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import SchemaForm from '@/components/SchemaForm';
import { CapabilityBadges } from '@/components/CapabilityDrivenActions';
import TargetDiscoverySelector from '@/components/TargetDiscoverySelector';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ItemTypeBadge({ item }) {
  const typeLabels = {
    'NAMED_INVITE': { label: 'User Invite', icon: 'fa-user-plus', color: 'blue' },
    'PARTNER_DELEGATION': { label: 'Partner Access', icon: 'fa-handshake', color: 'green' },
    'GROUP_ACCESS': { label: 'Group Access', icon: 'fa-users', color: 'purple' },
    'SHARED_ACCOUNT_PAM': { label: 'Shared Account', icon: 'fa-shield-halved', color: 'orange' },
  };
  
  const config = typeLabels[item.itemType] || { label: item.itemType, icon: 'fa-key', color: 'gray' };
  
  return (
    <Badge className={`text-xs bg-${config.color}-100 text-${config.color}-700 border-${config.color}-200`}>
      <i className={`fas ${config.icon} mr-1`}></i>
      {config.label}
    </Badge>
  );
}

function StatusBadge({ status }) {
  if (status === 'validated') return <Badge className="bg-green-100 text-green-700 border-green-200"><i className="fas fa-check mr-1"></i>Complete</Badge>;
  if (status === 'needs_evidence') return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><i className="fas fa-upload mr-1"></i>Evidence needed</Badge>;
  if (status === 'failed') return <Badge variant="destructive"><i className="fas fa-times mr-1"></i>Failed</Badge>;
  return <Badge variant="secondary"><i className="fas fa-clock mr-1"></i>Pending</Badge>;
}

function VerificationModeBadge({ mode }) {
  const modes = {
    'AUTO': { label: 'Auto-Verified', icon: 'fa-bolt', color: 'green' },
    'EVIDENCE_REQUIRED': { label: 'Evidence Required', icon: 'fa-camera', color: 'amber' },
    'ATTESTATION_ONLY': { label: 'Attestation', icon: 'fa-check-square', color: 'blue' },
  };
  const config = modes[mode] || modes['ATTESTATION_ONLY'];
  return (
    <Badge variant="outline" className={`text-xs text-${config.color}-600`}>
      <i className={`fas ${config.icon} mr-1`}></i>
      {config.label}
    </Badge>
  );
}

// ── Plugin Instructions Renderer ───────────────────────────────────────────────

function PluginInstructions({ instructions, identity, role }) {
  if (!instructions) return null;
  
  // Handle both string and array (step objects) instructions
  if (typeof instructions === 'string') {
    return (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <p className="text-sm font-semibold text-green-900 mb-2">
          <i className="fas fa-list-check mr-2"></i>Instructions
        </p>
        <p className="text-sm text-green-800">{instructions}</p>
      </div>
    );
  }
  
  if (Array.isArray(instructions) && instructions.length > 0) {
    return (
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <p className="text-sm font-semibold text-green-900 mb-3">
          <i className="fas fa-list-check mr-2"></i>Step-by-Step Instructions
        </p>
        <ol className="space-y-4">
          {instructions.map((step, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-sm font-semibold">
                {step.step || idx + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <p className="font-medium text-green-900">{step.title}</p>
                <p className="text-sm text-green-700 mt-0.5">{step.description}</p>
                {step.link && (
                  <a 
                    href={step.link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800 mt-1"
                  >
                    <i className="fas fa-external-link-alt"></i>
                    {step.link.label}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
        
        {/* Highlight identity to add */}
        {identity && (
          <div className="mt-4 p-3 rounded bg-green-100 border border-green-300">
            <p className="text-sm font-medium text-green-900">
              <i className="fas fa-user-plus mr-2"></i>
              Add this identity: <code className="px-2 py-0.5 bg-white rounded text-green-800 font-mono">{identity}</code>
            </p>
            {role && (
              <p className="text-xs text-green-700 mt-1">With role: <strong>{role}</strong></p>
            )}
          </div>
        )}
      </div>
    );
  }
  
  return null;
}

// ── Access Item Card Component ─────────────────────────────────────────────────

function AccessItemCard({ item, client, isActive, onComplete }) {
  const { toast } = useToast();
  const [clientTarget, setClientTarget] = useState(item.clientProvidedTarget || {});
  const [attestChecked, setAttestChecked] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // PAM credential submission state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // OAuth and capability-driven state
  const [clientToken, setClientToken] = useState(null);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [discoveredTargets, setDiscoveredTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [discoveringTargets, setDiscoveringTargets] = useState(false);
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  
  const platform = item.platform;
  const isPAM = item.itemType === 'SHARED_ACCOUNT_PAM';
  const isClientOwnedPAM = isPAM && (item.pamConfig?.ownership === 'CLIENT_OWNED' || item.pamOwnership === 'CLIENT_OWNED');
  
  // Get capabilities from plugin manifest
  const capabilities = item.accessTypeCapabilities || {};
  const canUseOAuth = capabilities.clientOAuthSupported === true && !isPAM;
  const canGrantAccess = capabilities.canGrantAccess === true && !isPAM;
  const canVerifyAccess = capabilities.canVerifyAccess === true && !isPAM;
  
  // Get identity to display in instructions
  const getIdentityToAdd = () => {
    if (item.resolvedIdentity) return item.resolvedIdentity;
    if (item.agencyGroupEmail) return item.agencyGroupEmail;
    if (item.pamConfig?.agencyIdentityEmail) return item.pamConfig.agencyIdentityEmail;
    if (item.agencyConfigJson?.agencyGroupEmail) return item.agencyConfigJson.agencyGroupEmail;
    if (item.agencyConfigJson?.pamAgencyIdentityEmail) return item.agencyConfigJson.pamAgencyIdentityEmail;
    return null;
  };
  
  const identityToAdd = getIdentityToAdd();
  
  // Map platform slug to plugin key (for legacy DB platforms that don't have pluginKey)
  const SLUG_TO_PLUGIN_KEY = {
    'google-analytics': 'ga4',
    'google-tag-manager': 'gtm',
    'google-search-console': 'google-search-console',
    'google-ads': 'google-ads',
    'dv360': 'dv360',
    'meta-ads': 'meta',
    'linkedin-ads': 'linkedin',
    'tiktok-ads': 'tiktok',
    'snapchat-ads': 'snapchat',
    'pinterest-ads': 'pinterest',
    'the-trade-desk': 'trade-desk',
    'snowflake': 'snowflake',
    'hubspot': 'hubspot',
    'salesforce': 'salesforce',
  };
  
  const platformKey = platform?.pluginKey || SLUG_TO_PLUGIN_KEY[platform?.slug] || platform?.slug;
  
  // ── Recover OAuth session after callback redirect ────────────────────────────
  useEffect(() => {
    // Check if we're returning from OAuth callback for this item
    const storedItemId = sessionStorage.getItem('oauth_item_id');
    const storedTokenId = sessionStorage.getItem('oauth_token_id');
    const storedAccessToken = sessionStorage.getItem('oauth_access_token');
    const storedTargets = sessionStorage.getItem('oauth_targets');
    
    if (storedItemId === item.id && storedAccessToken) {
      // Recover OAuth state
      setClientToken({
        tokenId: storedTokenId,
        accessToken: storedAccessToken,
        tokenType: sessionStorage.getItem('oauth_token_type') || 'Bearer',
      });
      
      // Recover discovered targets if available
      if (storedTargets) {
        try {
          const targets = JSON.parse(storedTargets);
          setDiscoveredTargets(targets);
          // Auto-select if only one target
          if (targets.length === 1) {
            setSelectedTarget(targets[0]);
          }
        } catch (e) {
          console.warn('Failed to parse stored targets:', e);
        }
      }
      
      // Clear session storage for this item (keep it clean)
      sessionStorage.removeItem('oauth_item_id');
      sessionStorage.removeItem('oauth_token_id');
      sessionStorage.removeItem('oauth_access_token');
      sessionStorage.removeItem('oauth_token_type');
      sessionStorage.removeItem('oauth_targets');
      
      toast({ 
        title: 'Connected!', 
        description: `Successfully connected to ${platform?.name || 'platform'}` 
      });
    }
  }, [item.id, platform?.name, toast]);
  
  // ── OAuth Flow Handlers ────────────────────────────────────────────────────
  
  const handleOAuthConnect = async () => {
    if (!platformKey) {
      toast({ title: 'Error', description: 'Platform not configured for OAuth', variant: 'destructive' });
      return;
    }
    
    setOauthConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/onboarding/oauth-callback`;
      
      const res = await fetch(`/api/oauth/${platformKey}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          redirectUri,
          scope: 'CLIENT',
          tenantId: item.accessRequestId,
          tenantType: 'ACCESS_REQUEST'
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.data?.authUrl) {
        // Store state for callback
        sessionStorage.setItem('oauth_state', data.data.state);
        sessionStorage.setItem('oauth_platform', platformKey);
        sessionStorage.setItem('oauth_scope', 'CLIENT');
        sessionStorage.setItem('oauth_item_id', item.id);
        sessionStorage.setItem('oauth_tenant_id', item.accessRequestId || item.id);
        sessionStorage.setItem('oauth_return_url', window.location.href);
        
        // Redirect to OAuth provider
        window.location.href = data.data.authUrl;
      } else {
        toast({
          title: 'OAuth Error',
          description: data.error || 'Failed to start OAuth flow. Provider may not be configured.',
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
      setOauthConnecting(false);
    }
  };
  
  const handleDiscoverTargets = async () => {
    if (!clientToken?.accessToken || !platformKey) return;
    
    setDiscoveringTargets(true);
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
        setDiscoveredTargets(data.data?.targets || []);
        if (data.data?.targets?.length === 1) {
          setSelectedTarget(data.data.targets[0]);
        }
        toast({ title: 'Targets Found', description: `Found ${data.data?.targets?.length || 0} accessible targets.` });
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
      setDiscoveringTargets(false);
    }
  };
  
  const handleGrantAccess = async () => {
    if (!clientToken?.accessToken || !selectedTarget || !identityToAdd || !platformKey) {
      toast({ title: 'Missing Data', description: 'Please connect and select a target first', variant: 'destructive' });
      return;
    }
    
    setGrantingAccess(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: clientToken.accessToken,
          tokenType: clientToken.tokenType,
          target: selectedTarget?.externalId || selectedTarget,
          role: item.role,
          identity: identityToAdd,
          accessItemType: item.itemType
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Access Granted!', description: 'Access has been provisioned automatically.' });
        onComplete();
      } else {
        toast({
          title: 'Grant Failed',
          description: data.error || 'Could not grant access. You may need to complete this manually.',
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
      setGrantingAccess(false);
    }
  };
  
  const handleVerifyAccess = async () => {
    if (!clientToken?.accessToken || !selectedTarget || !identityToAdd || !platformKey) {
      toast({ title: 'Missing Data', description: 'Please connect and select a target first', variant: 'destructive' });
      return;
    }
    
    setVerifyingAccess(true);
    try {
      const res = await fetch(`/api/oauth/${platformKey}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: clientToken.accessToken,
          tokenType: clientToken.tokenType,
          target: selectedTarget?.externalId || selectedTarget,
          role: item.role,
          identity: identityToAdd,
          accessItemType: item.itemType
        })
      });
      
      const data = await res.json();
      if (data.success && data.data?.verified) {
        toast({ title: 'Access Verified!', description: 'Your access grant has been confirmed.' });
        onComplete();
      } else if (data.success && !data.data?.verified) {
        toast({
          title: 'Not Found',
          description: 'Access not found yet. Please complete the manual steps and try again.',
          variant: 'destructive'
        });
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
      setVerifyingAccess(false);
    }
  };
  
  // Handle file selection for evidence
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setEvidenceFile(e.target.files[0]);
    }
  };
  
  // Handle attestation submission
  const handleAttest = async () => {
    // Validate required fields from schema
    if (item.clientTargetSchema?.required) {
      const newErrors = {};
      for (const field of item.clientTargetSchema.required) {
        if (!clientTarget[field]) {
          newErrors[field] = `${field} is required`;
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast({ title: 'Missing Fields', description: 'Please fill in all required fields', variant: 'destructive' });
        return;
      }
    }
    
    setSubmitting(true);
    try {
      // Build form data for file upload
      const formData = new FormData();
      formData.append('attestationText', `I confirm access has been granted to ${identityToAdd} with ${item.role} role.`);
      formData.append('clientProvidedTarget', JSON.stringify(clientTarget));
      if (evidenceFile) {
        formData.append('evidence', evidenceFile);
      }
      
      // Try JSON first, fall back to FormData if needed
      const res = await fetch(`/api/onboarding/${item.accessRequestId}/items/${item.id}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestationText: `I confirm access has been granted to ${identityToAdd} with ${item.role} role.`,
          clientProvidedTarget: Object.keys(clientTarget).length > 0 ? clientTarget : undefined
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Verified!', description: 'Access confirmed successfully.' });
        onComplete();
      } else {
        toast({ title: 'Error', description: data.error || 'Verification failed', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Verification failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle PAM credential submission
  const handleSubmitCredentials = async () => {
    if (!username || !password) {
      toast({ title: 'Required', description: 'Username and password are required', variant: 'destructive' });
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/${item.accessRequestId}/items/${item.id}/submit-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password,
          clientProvidedTarget: Object.keys(clientTarget).length > 0 ? clientTarget : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Credentials received', description: 'Your credentials have been securely stored.' });
        onComplete();
      } else {
        toast({ title: 'Error', description: data.error || 'Submission failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Submission failed', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Already completed
  if (item.status === 'validated') {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <i className={`${platform?.icon || 'fas fa-cube'} text-green-600`}></i>
              </div>
              <div>
                <CardTitle className="text-base">{platform?.name}</CardTitle>
                <CardDescription>{item.role} access</CardDescription>
              </div>
            </div>
            <StatusBadge status="validated" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-700">
            <i className="fas fa-check-circle"></i>
            <span>Access verified successfully</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`transition-all ${isActive ? 'border-primary shadow-lg' : 'opacity-60'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <i className={`${platform?.icon || 'fas fa-cube'} text-xl text-primary`}></i>
            </div>
            <div>
              <CardTitle className="text-lg">{platform?.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <ItemTypeBadge item={item} />
                <Badge variant="outline">{item.role}</Badge>
                {item.verificationMode && <VerificationModeBadge mode={item.verificationMode} />}
              </div>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plugin Instructions */}
        {item.pluginInstructions && (
          <PluginInstructions 
            instructions={item.pluginInstructions} 
            identity={identityToAdd}
            role={item.role}
          />
        )}
        
        {/* Fallback: Agency data display if no plugin instructions */}
        {!item.pluginInstructions && identityToAdd && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              <i className="fas fa-info-circle mr-2"></i>Grant Access To
            </p>
            <div className="flex items-center gap-2 bg-white rounded p-2">
              <i className="fas fa-user text-blue-600"></i>
              <code className="font-mono text-sm text-blue-800">{identityToAdd}</code>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Add this identity to your {platform?.name} account with <strong>{item.role}</strong> role.
            </p>
          </div>
        )}
        
        {/* ─── Capability-Driven OAuth Flow ─────────────────────────────────────── */}
        {canUseOAuth && !isPAM && (
          <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fas fa-plug text-primary"></i>
                <span className="font-medium text-sm">Quick Connect</span>
              </div>
              <CapabilityBadges capabilities={capabilities} />
            </div>
            
            {/* Step 1: Connect via OAuth */}
            {!clientToken && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your {platform?.name} account to {canGrantAccess ? 'automatically grant access' : 'verify your setup'}.
                </p>
                <Button 
                  onClick={handleOAuthConnect} 
                  disabled={oauthConnecting}
                  variant="outline"
                  className="w-full"
                >
                  {oauthConnecting ? (
                    <><i className="fas fa-spinner fa-spin mr-2"></i>Connecting...</>
                  ) : (
                    <><i className="fas fa-plug mr-2"></i>Connect {platform?.name}</>
                  )}
                </Button>
              </div>
            )}
            
            {/* Step 2: Connected - Target Discovery */}
            {clientToken && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                  <i className="fas fa-check-circle"></i>
                  <span className="text-sm font-medium">Connected to {platform?.name}</span>
                </div>
                
                {/* Enhanced Target Discovery Selector */}
                <TargetDiscoverySelector
                  platformKey={platformKey}
                  platformName={platform?.name}
                  accessToken={clientToken.accessToken}
                  tokenType={clientToken.tokenType}
                  initialTargets={discoveredTargets}
                  selectedTarget={selectedTarget}
                  onTargetSelected={async (target) => {
                    setSelectedTarget(target);
                    // Store in session for persistence
                    if (target) {
                      sessionStorage.setItem(`selected_target_${item.id}`, JSON.stringify(target));
                      // Also save to backend
                      try {
                        await fetch(`/api/onboarding/${item.accessRequestId}/items/${item.id}/save-target`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ selectedTarget: target })
                        });
                      } catch (e) {
                        console.warn('Failed to save target to backend:', e);
                      }
                    }
                  }}
                  onTargetsDiscovered={(targets) => {
                    setDiscoveredTargets(targets);
                    // Store in session for persistence
                    sessionStorage.setItem('oauth_targets', JSON.stringify(targets));
                  }}
                  autoDiscover={discoveredTargets.length === 0}
                  maxHeight="300px"
                />
                
                {/* Action buttons based on capabilities */}
                {selectedTarget && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    {/* Summary of what will happen */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <i className="fas fa-info-circle mr-2"></i>
                        {canGrantAccess 
                          ? `Will grant ${item.role} access to ${identityToAdd} on "${selectedTarget.displayName}"`
                          : `Will verify ${identityToAdd} has ${item.role} access on "${selectedTarget.displayName}"`
                        }
                      </p>
                    </div>
                    
                    {/* Grant Access button (if platform supports it) */}
                    {canGrantAccess && (
                      <Button 
                        onClick={handleGrantAccess} 
                        disabled={grantingAccess}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {grantingAccess ? (
                          <><i className="fas fa-spinner fa-spin mr-2"></i>Granting Access...</>
                        ) : (
                          <><i className="fas fa-user-plus mr-2"></i>Grant Access Automatically</>
                        )}
                      </Button>
                    )}
                    
                    {/* Verify Access button (if grant not available but verify is) */}
                    {!canGrantAccess && canVerifyAccess && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Complete the manual steps above, then verify your setup.
                        </p>
                        <Button 
                          onClick={handleVerifyAccess} 
                          disabled={verifyingAccess}
                          variant="outline"
                          className="w-full"
                        >
                          {verifyingAccess ? (
                            <><i className="fas fa-spinner fa-spin mr-2"></i>Verifying...</>
                          ) : (
                            <><i className="fas fa-shield-check mr-2"></i>Verify Access</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Client Target Schema Form (from plugin) */}
        {item.clientTargetSchema && Object.keys(item.clientTargetSchema).length > 0 && (
          <SchemaForm
            schema={item.clientTargetSchema}
            value={clientTarget}
            onChange={setClientTarget}
            title="Your Account Information"
            description="Please provide your account details so we can verify access"
            errors={errors}
          />
        )}
        
        {/* Client-Owned PAM: Credential submission */}
        {isClientOwnedPAM && (
          <div className="space-y-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex gap-2">
              <i className="fas fa-key text-amber-600 mt-0.5"></i>
              <div>
                <p className="font-semibold text-amber-900">Provide Account Credentials</p>
                <p className="text-sm text-amber-700">Create a dedicated login for agency use. Credentials are encrypted and stored securely.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Username / Email</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username or email"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm">Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                />
              </div>
            </div>
            
            <Button onClick={handleSubmitCredentials} disabled={submitting} className="w-full">
              {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</> : 
                <><i className="fas fa-lock mr-2"></i>Submit Credentials Securely</>}
            </Button>
          </div>
        )}
        
        {/* Non-PAM or Agency-Owned PAM: Attestation */}
        {!isClientOwnedPAM && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`attest-${item.id}`}
                checked={attestChecked}
                onCheckedChange={setAttestChecked}
              />
              <label htmlFor={`attest-${item.id}`} className="text-sm leading-relaxed cursor-pointer">
                I confirm I have granted access to <strong>{identityToAdd || 'the agency identity'}</strong> in my {platform?.name} account with the <strong>{item.role}</strong> role.
              </label>
            </div>
            
            {/* Evidence upload for EVIDENCE_REQUIRED mode */}
            {item.verificationMode === 'EVIDENCE_REQUIRED' && (
              <div>
                <p className="text-sm font-medium mb-1">Upload Evidence</p>
                <p className="text-xs text-muted-foreground mb-2">A screenshot of the permissions screen is required.</p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-xs cursor-pointer"
                />
                {evidenceFile && (
                  <p className="text-xs text-green-600 mt-1"><i className="fas fa-check mr-1"></i>{evidenceFile.name}</p>
                )}
              </div>
            )}
            
            {/* Optional evidence for ATTESTATION_ONLY */}
            {item.verificationMode !== 'EVIDENCE_REQUIRED' && (
              <div>
                <p className="text-sm font-medium mb-1">Evidence (optional)</p>
                <p className="text-xs text-muted-foreground mb-2">Upload a screenshot as confirmation.</p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-secondary file:text-secondary-foreground file:text-xs cursor-pointer"
                />
                {evidenceFile && (
                  <p className="text-xs text-green-600 mt-1"><i className="fas fa-check mr-1"></i>{evidenceFile.name}</p>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleAttest} 
              disabled={submitting || !attestChecked} 
              className="w-full"
            >
              {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Verifying...</> : 
                <><i className="fas fa-check mr-2"></i>Confirm Access Granted</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Onboarding Page ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const params = useParams();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params.token) loadData();
  }, [params.token]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/onboarding/${params.token}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Invalid onboarding link');
      }
    } catch (err) {
      setError('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleItemComplete = () => {
    loadData(); // Refresh to get updated statuses
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
            <h2 className="text-xl font-bold mb-2">Onboarding Link Invalid</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const client = data?.client;
  const items = data?.items || [];
  const completedCount = items.filter(i => i.status === 'validated').length;
  const allComplete = completedCount === items.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Platform Access Onboarding
          </h1>
          <p className="text-muted-foreground">
            Welcome, <strong>{client?.name}</strong>! Complete the steps below to grant your agency access.
          </p>
        </div>

        {/* Progress */}
        <Card className="bg-white/80 backdrop-blur">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{completedCount} of {items.length} complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* All Complete Message */}
        {allComplete && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-6 text-center">
              <i className="fas fa-check-circle text-5xl text-green-500 mb-3"></i>
              <h2 className="text-xl font-bold text-green-800 mb-2">All Access Verified!</h2>
              <p className="text-green-700">Thank you for completing the onboarding. Your agency now has the requested access.</p>
            </CardContent>
          </Card>
        )}

        {/* Access Items */}
        <div className="space-y-4">
          {items.map((item, idx) => {
            // Add accessRequestId to item for API calls
            const enhancedItem = { ...item, accessRequestId: params.token };
            const isActive = item.status !== 'validated' && 
              items.slice(0, idx).every(i => i.status === 'validated');
            
            return (
              <AccessItemCard
                key={item.id}
                item={enhancedItem}
                client={client}
                isActive={isActive || item.status !== 'validated'}
                onComplete={handleItemComplete}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-6">
          <p>Need help? Contact your agency representative.</p>
        </div>
      </div>
    </div>
  );
}
