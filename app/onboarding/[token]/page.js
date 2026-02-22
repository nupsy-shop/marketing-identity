'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function ItemTypeBadge({ item }) {
  if (item.itemType === 'SHARED_ACCOUNT_PAM') {
    const isClientOwned = item.pamOwnership === 'CLIENT_OWNED';
    return (
      <Badge className={`text-xs ${isClientOwned ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
        <i className="fas fa-shield-halved mr-1"></i>
        {isClientOwned ? 'Shared Account (Client-owned)' : 'Shared Account (Agency-owned)'}
      </Badge>
    );
  }
  return null;
}

function StatusBadge({ status }) {
  if (status === 'validated') return <Badge className="bg-green-100 text-green-700 border-green-200"><i className="fas fa-check mr-1"></i>Complete</Badge>;
  if (status === 'needs_evidence') return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><i className="fas fa-upload mr-1"></i>Evidence needed</Badge>;
  if (status === 'failed') return <Badge variant="destructive"><i className="fas fa-times mr-1"></i>Failed</Badge>;
  return <Badge variant="secondary"><i className="fas fa-clock mr-1"></i>Pending</Badge>;
}

// ── Onboarding Step Components ────────────────────────────────────────────────

// NAMED_INVITE / PARTNER_DELEGATION / GROUP_ACCESS / PROXY_TOKEN
function StandardStep({ item, platform, onComplete }) {
  const [done, setDone] = useState(item.status === 'validated');

  const getInstructions = () => {
    const pat = item.accessPattern || '';
    if (pat.includes('1 (Partner')) return [
      `Log in to your ${platform?.name} account.`,
      'Navigate to Settings → Business Settings or Partner Management.',
      `Find the "Partners" or "Agency Access" section and add the agency's Business ID.`,
      `Assign the role: ${item.role}`,
      'Confirm the partnership request.'
    ];
    if (pat.includes('3 (Group')) return [
      `Log in to your ${platform?.name} account.`,
      `Navigate to Admin → Users / Permissions.`,
      `Add the following group or service account: ${item.pamAgencyIdentityEmail || 'provided by your agency'}`,
      `Assign role: ${item.role}`,
      'Save the changes.'
    ];
    if (pat.includes('4 (Proxy')) return [
      `Log in to your ${platform?.name} admin panel.`,
      'Generate an API key or OAuth token with the permissions listed below.',
      'Share the generated token with your agency contact.',
      `Required scope / role: ${item.role}`
    ];
    // Default: Named Invite
    return [
      `Log in to your ${platform?.name} account.`,
      'Navigate to Settings → Users & Permissions.',
      `Click "Add User" or "Invite".`,
      `Enter the agency email address provided by your account manager.`,
      `Set the role to: ${item.role}`,
      'Send the invitation and confirm when done.'
    ];
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
        <p className="font-semibold text-green-700">Step completed!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {getInstructions().map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
            <p className="text-sm text-foreground">{step}</p>
          </li>
        ))}
      </ol>
      <Button onClick={() => { setDone(true); onComplete(); }} className="w-full">
        <i className="fas fa-check mr-2"></i>I've completed this step
      </Button>
    </div>
  );
}

// SHARED_ACCOUNT_PAM + CLIENT_OWNED  → collect credentials
function PamClientOwnedStep({ item, platform, token, onComplete }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const done = item.status === 'validated';

  const handleSubmit = async () => {
    if (!username || !password) {
      toast({ title: 'Required', description: 'Username and password are required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/${token}/items/${item.id}/submit-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

  if (done) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
        <p className="font-semibold text-green-700">Credentials received securely!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Guidance */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex gap-2">
          <i className="fas fa-triangle-exclamation text-amber-600 mt-0.5 flex-shrink-0"></i>
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Security recommendation</p>
            <p>Please create a <strong>dedicated login</strong> for agency use rather than sharing your owner/admin credentials. This improves security and makes access easier to revoke.</p>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
        <p className="font-medium text-blue-800 mb-1">What happens to these credentials?</p>
        <p className="text-blue-700">They are encrypted and stored in our secure vault. Your agency uses them only when needed, under a timed checkout policy, and they can be rotated at any time.</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="username">Username / Email <span className="text-destructive">*</span></Label>
          <Input
            id="username"
            placeholder={item.pamUsername || 'e.g., agency-login@yourbusiness.com'}
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="mt-1"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter the account password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
            </button>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</>
          : <><i className="fas fa-lock mr-2"></i>Submit Credentials Securely</>}
      </Button>
    </div>
  );
}

// SHARED_ACCOUNT_PAM + AGENCY_OWNED  → invite instructions + attestation
function PamAgencyOwnedStep({ item, platform, token, onComplete }) {
  const { toast } = useToast();
  const [attestChecked, setAttestChecked] = useState(false);
  const [attestText, setAttestText] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceB64, setEvidenceB64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const done = item.status === 'validated';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = ev => setEvidenceB64(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAttest = async () => {
    if (!attestChecked) {
      toast({ title: 'Please confirm', description: 'Tick the checkbox to confirm you completed this step', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/${token}/items/${item.id}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attestationText: attestText || `Client confirmed: added ${item.pamAgencyIdentityEmail} with role ${item.pamRoleTemplate}`,
          evidenceBase64: evidenceB64 || undefined,
          evidenceFileName: evidenceFile?.name || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Verified!', description: 'Access confirmed.' });
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

  if (done) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
        <p className="font-semibold text-green-700">Access confirmed! Your agency identity has been granted access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Identity to invite */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-3">Identity to add to your account</p>
        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-user-shield text-blue-600"></i>
          </div>
          <div className="flex-1">
            <p className="font-mono font-semibold text-sm">{item.pamAgencyIdentityEmail}</p>
            <p className="text-xs text-muted-foreground">Role to assign: <strong>{item.pamRoleTemplate || item.role}</strong></p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(item.pamAgencyIdentityEmail || '')}
          >
            <i className="fas fa-copy mr-1"></i>Copy
          </Button>
        </div>
      </div>

      {/* Step-by-step instructions */}
      <div>
        <p className="text-sm font-semibold mb-2">How to add this user</p>
        <ol className="space-y-2">
          {[
            `Log in to your ${platform?.name || 'platform'} account.`,
            `Navigate to Settings → Users / Permissions (or similar).`,
            `Click "Add User", "Invite User", or "Add team member".`,
            `Enter the email: ${item.pamAgencyIdentityEmail}`,
            `Assign the role: ${item.pamRoleTemplate || item.role}`,
            'Save and confirm the invitation.'
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              <p className="text-sm">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Verification section */}
      <div className="border rounded-lg p-4 space-y-4">
        <p className="text-sm font-semibold">Verify access was granted</p>

        <div className="flex items-start gap-3">
          <Checkbox
            id="attest"
            checked={attestChecked}
            onCheckedChange={v => setAttestChecked(v)}
            className="mt-0.5"
          />
          <label htmlFor="attest" className="text-sm cursor-pointer">
            I confirm I have added <strong>{item.pamAgencyIdentityEmail}</strong> to my {platform?.name} account with the <strong>{item.pamRoleTemplate || item.role}</strong> role.
          </label>
        </div>

        {/* Optional evidence upload */}
        <div>
          <p className="text-sm font-medium mb-1">Evidence (optional but recommended)</p>
          <p className="text-xs text-muted-foreground mb-2">Upload a screenshot of the user permissions screen as confirmation.</p>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-xs cursor-pointer"
          />
          {evidenceFile && (
            <p className="text-xs text-green-600 mt-1"><i className="fas fa-check mr-1"></i>{evidenceFile.name} ready to upload</p>
          )}
        </div>

        <Button onClick={handleAttest} disabled={submitting || !attestChecked} className="w-full">
          {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Verifying...</>
            : <><i className="fas fa-check mr-2"></i>Confirm & Verify</>}
        </Button>
      </div>
    </div>
  );
}

// ── Main Onboarding Page ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const params = useParams();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
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
        // Start at first incomplete item
        const firstIncomplete = result.data.items?.findIndex(i => i.status !== 'validated');
        setActiveStep(firstIncomplete === -1 ? 0 : firstIncomplete);
      } else {
        setError(result.error || 'Invalid link');
      }
    } catch {
      setError('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = () => {
    loadData(); // re-fetch to get updated statuses
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <i className="fas fa-exclamation-circle text-5xl text-destructive mb-4 block"></i>
            <h2 className="text-xl font-bold mb-2">Invalid Onboarding Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, items = [] } = data || {};
  const validatedCount = items.filter(i => i.status === 'validated').length;
  const allDone = validatedCount === items.length && items.length > 0;

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check-circle text-5xl text-green-500"></i>
            </div>
            <h2 className="text-2xl font-bold mb-2">All done!</h2>
            <p className="text-muted-foreground mb-6">
              You've completed all {items.length} access grant{items.length !== 1 ? 's' : ''}. Your agency can now start work.
            </p>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-4 py-2">
              {validatedCount}/{items.length} completed
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Platform Access Setup</h1>
              <p className="text-sm text-muted-foreground">Welcome, {client?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{validatedCount}/{items.length} complete</span>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${items.length > 0 ? (validatedCount / items.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Grant Platform Access</h2>
          <p className="text-muted-foreground">
            Your agency needs access to the following platforms. Complete each step to grant the required access.
          </p>
        </div>

        {/* Step list */}
        <div className="space-y-4">
          {items.map((item, idx) => {
            // Platform is already embedded in each item from the API
            const platform = item.platform;
            const isActive = idx === activeStep;
            const isDone = item.status === 'validated';
            const isPam = item.itemType === 'SHARED_ACCOUNT_PAM';

            return (
              <Card
                key={item.id}
                className={`transition-all border-2 ${isDone ? 'border-green-200' : isActive ? 'border-primary shadow-md' : 'border-border opacity-80'}`}
              >
                {/* Step header */}
                <CardHeader
                  className="pb-3 cursor-pointer"
                  onClick={() => !isDone && setActiveStep(idx)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isDone ? 'bg-green-100 text-green-600' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {isDone ? <i className="fas fa-check"></i> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {platform?.iconName && (
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <i className={`${platform.iconName} text-xs text-primary`}></i>
                          </div>
                        )}
                        <CardTitle className="text-base">{item.assetName || platform?.name || 'Platform Access'}</CardTitle>
                        <ItemTypeBadge item={item} />
                        <StatusBadge status={item.status} />
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {platform?.name} &bull; {item.accessPattern} &bull; Role: {item.role}
                        {item.assetType && ` &bull; ${item.assetType}${item.assetId ? ` #${item.assetId}` : ''}`}
                      </CardDescription>
                    </div>
                    <i className={`fas fa-chevron-${isActive && !isDone ? 'up' : 'down'} text-muted-foreground`}></i>
                  </div>
                </CardHeader>

                {/* Step body — only when active and not done */}
                {isActive && !isDone && (
                  <CardContent className="border-t pt-5">
                    {isPam && item.pamOwnership === 'CLIENT_OWNED' ? (
                      <PamClientOwnedStep
                        item={item}
                        platform={platform}
                        token={params.token}
                        onComplete={handleStepComplete}
                      />
                    ) : isPam && item.pamOwnership === 'AGENCY_OWNED' ? (
                      <PamAgencyOwnedStep
                        item={item}
                        platform={platform}
                        token={params.token}
                        onComplete={handleStepComplete}
                      />
                    ) : (
                      <StandardStep
                        item={item}
                        platform={platform}
                        onComplete={() => {
                          // For standard steps: use attestation endpoint
                          fetch(`/api/onboarding/${params.token}/items/${item.id}/attest`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ attestationText: 'Client confirmed access was granted' })
                          }).then(() => {
                            handleStepComplete();
                            setActiveStep(idx + 1);
                          });
                        }}
                      />
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
