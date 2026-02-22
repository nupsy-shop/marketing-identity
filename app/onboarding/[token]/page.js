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
    const isClientOwned = item.pamOwnership === 'CLIENT_OWNED' || item.pamConfig?.ownership === 'CLIENT_OWNED';
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

// Helper to format agency data display
function formatAgencyDataKey(key) {
  const labels = {
    managerAccountId: 'Manager Account ID',
    businessManagerId: 'Business Manager ID',
    businessCenterId: 'Business Center ID',
    seatId: 'Seat ID',
    agencyEmail: 'Agency Email',
    serviceAccountEmail: 'Service Account Email',
    ssoGroupName: 'SSO Group Name',
    apiKey: 'API Key',
    verificationToken: 'Verification Token',
    shopifyPartnerId: 'Shopify Partner ID',
    agencyIdentity: 'Agency Identity'
  };
  return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

// ── Dynamic Field Renderer ────────────────────────────────────────────────────

function DynamicField({ field, value, onChange, error }) {
  const handleChange = (newValue) => {
    onChange(field.name, newValue);
  };

  // Text input
  if (field.type === 'text') {
    return (
      <div className="space-y-1">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder}
          className={error ? 'border-destructive' : ''}
        />
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Multi-text input (for arrays like multiple ad accounts)
  if (field.type === 'multi-text') {
    const values = Array.isArray(value) ? value : (value ? [value] : ['']);
    
    const addValue = () => handleChange([...values, '']);
    const removeValue = (idx) => handleChange(values.filter((_, i) => i !== idx));
    const updateValue = (idx, newVal) => {
      const updated = [...values];
      updated[idx] = newVal;
      handleChange(updated);
    };

    return (
      <div className="space-y-2">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {values.map((v, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              value={v}
              onChange={(e) => updateValue(idx, e.target.value)}
              placeholder={field.placeholder}
              className={error ? 'border-destructive' : ''}
            />
            {values.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeValue(idx)}>
                <i className="fas fa-times text-muted-foreground"></i>
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addValue}>
          <i className="fas fa-plus mr-1"></i>Add Another
        </Button>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Select dropdown
  if (field.type === 'select') {
    return (
      <div className="space-y-1">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <select
          value={value || field.defaultValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full border rounded-md px-3 py-2 text-sm bg-background ${error ? 'border-destructive' : 'border-input'}`}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Checkbox group (multi-select)
  if (field.type === 'checkbox-group') {
    const selected = Array.isArray(value) ? value : [];

    const toggleOption = (optValue) => {
      if (selected.includes(optValue)) {
        handleChange(selected.filter(v => v !== optValue));
      } else {
        handleChange([...selected, optValue]);
      }
    };

    return (
      <div className="space-y-2">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {field.options?.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggleOption(opt.value)}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
        {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return null;
}

// ── Onboarding Step Components ────────────────────────────────────────────────

// Standard step with dynamic asset fields + instructions
function StandardStep({ item, platform, token, onComplete, assetFields }) {
  const { toast } = useToast();
  const [done, setDone] = useState(item.status === 'validated');
  const [clientProvidedTarget, setClientProvidedTarget] = useState(item.clientProvidedTarget || {});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Get agency data to display
  const agencyData = item.agencyData || {};
  const hasAgencyData = Object.keys(agencyData).filter(k => agencyData[k]).length > 0;

  // Resolved identity to show (computed server-side)
  const resolvedIdentity = item.resolvedIdentity || item.agencyData?.agencyEmail || item.agencyGroupEmail;

  const handleFieldChange = (name, value) => {
    setClientProvidedTarget(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Parse instruction text into steps
  const parseInstructions = (text) => {
    if (!text) return [];
    
    // Replace placeholders with actual values
    let processedText = text;
    if (resolvedIdentity) {
      processedText = processedText.replace(/the email address/gi, resolvedIdentity);
      processedText = processedText.replace(/the email of the user/gi, resolvedIdentity);
      processedText = processedText.replace(/\{generated identity\}/gi, resolvedIdentity);
      processedText = processedText.replace(/\{group email\}/gi, resolvedIdentity);
    }
    if (agencyData.managerAccountId) {
      processedText = processedText.replace(/your google ads manager account/gi, `MCC: ${agencyData.managerAccountId}`);
      processedText = processedText.replace(/this mcc/gi, agencyData.managerAccountId);
    }
    if (agencyData.businessManagerId) {
      processedText = processedText.replace(/your business manager/gi, `Business Manager ID: ${agencyData.businessManagerId}`);
    }
    
    // Split into sentences as steps
    const sentences = processedText.split(/\.\s+/).filter(s => s.trim());
    return sentences.map(s => s.trim().replace(/\.$/, '') + '.');
  };

  const steps = item.clientInstructions 
    ? parseInstructions(item.clientInstructions)
    : [
        `Log in to your ${platform?.name || 'platform'} account.`,
        'Navigate to Settings → Users & Permissions.',
        resolvedIdentity ? `Add or invite: ${resolvedIdentity}` : 'Follow your agency\'s instructions to grant access.',
        `Set the role to: ${item.role}`,
        'Confirm when done.'
      ];

  const validateFields = () => {
    const newErrors = {};
    let isValid = true;

    for (const field of assetFields) {
      const value = clientProvidedTarget[field.name];
      
      // Check required
      if (field.required && (!value || (Array.isArray(value) && value.length === 0) || (Array.isArray(value) && value.every(v => !v)))) {
        newErrors[field.name] = `${field.label} is required`;
        isValid = false;
        continue;
      }
      
      // Check validation pattern
      if (value && field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (Array.isArray(value)) {
          for (const v of value) {
            if (v && !regex.test(v)) {
              newErrors[field.name] = field.validation.message || 'Invalid format';
              isValid = false;
              break;
            }
          }
        } else if (!regex.test(value)) {
          newErrors[field.name] = field.validation.message || 'Invalid format';
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleComplete = async () => {
    // Validate asset fields if any
    if (assetFields.length > 0 && !validateFields()) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields correctly', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        attestationText: `Client confirmed access was granted for ${platform?.name}`,
        clientProvidedTarget: Object.keys(clientProvidedTarget).length > 0 ? clientProvidedTarget : undefined
      };

      const res = await fetch(`/api/onboarding/${token}/items/${item.id}/attest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        setDone(true);
        onComplete();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to complete step', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to complete step', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <i className="fas fa-check-circle text-4xl text-green-500 mb-3 block"></i>
        <p className="font-semibold text-green-700">Step completed!</p>
        {item.clientProvidedTarget && Object.keys(item.clientProvidedTarget).length > 0 && (
          <div className="mt-3 text-left p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Assets selected:</p>
            {Object.entries(item.clientProvidedTarget).map(([k, v]) => (
              <p key={k} className="text-sm"><strong>{k}:</strong> {Array.isArray(v) ? v.join(', ') : v}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Identity to grant access to */}
      {resolvedIdentity && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
          <p className="text-sm font-semibold text-green-900 mb-2">
            <i className="fas fa-user-plus mr-2"></i>Identity to Grant Access
          </p>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-envelope text-green-600"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-semibold text-sm truncate">{resolvedIdentity}</p>
              <p className="text-xs text-muted-foreground">Role: <strong>{item.role}</strong></p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(resolvedIdentity);
                toast({ title: 'Copied!', description: 'Email copied to clipboard' });
              }}
            >
              <i className="fas fa-copy mr-1"></i>Copy
            </Button>
          </div>
        </div>
      )}

      {/* Agency data (MCC ID, BM ID, etc.) */}
      {hasAgencyData && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            <i className="fas fa-id-card mr-2"></i>Agency Information
          </p>
          <div className="space-y-2">
            {Object.entries(agencyData).filter(([_, v]) => v).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{formatAgencyDataKey(key)}:</span>
                <span className="font-mono font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step-by-step instructions */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-3">
          <i className="fas fa-list-check mr-2"></i>Steps to Complete
        </p>
        <ol className="space-y-2">
          {steps.map((step, idx) => (
            <li key={idx} className="flex gap-3 text-sm text-blue-800">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Dynamic Asset Fields (from client-asset-fields.js) */}
      {assetFields.length > 0 && (
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-sm font-semibold text-purple-900 mb-3">
            <i className="fas fa-database mr-2"></i>Your Account Information
          </p>
          <p className="text-xs text-purple-700 mb-4">Please provide details about the assets you're granting access to:</p>
          <div className="space-y-4">
            {assetFields.map(field => (
              <DynamicField
                key={field.name}
                field={field}
                value={clientProvidedTarget[field.name]}
                onChange={handleFieldChange}
                error={errors[field.name]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <Button onClick={handleComplete} disabled={submitting} className="w-full">
        {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Confirming...</>
          : <><i className="fas fa-check mr-2"></i>I've Completed This Step</>}
      </Button>
    </div>
  );
}

// SHARED_ACCOUNT_PAM + CLIENT_OWNED → collect credentials
function PamClientOwnedStep({ item, platform, token, onComplete, assetFields }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientProvidedTarget, setClientProvidedTarget] = useState(item.clientProvidedTarget || {});
  const [errors, setErrors] = useState({});
  const done = item.status === 'validated';

  // Get instructions from Excel if available
  const instructions = item.clientInstructions || 
    'Create a dedicated agency login for the platform. This improves security and makes access easier to revoke.';

  const handleFieldChange = (name, value) => {
    setClientProvidedTarget(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

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
        body: JSON.stringify({ 
          username, 
          password,
          clientProvidedTarget: Object.keys(clientProvidedTarget).length > 0 ? clientProvidedTarget : undefined
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

      {/* Instructions from Excel */}
      {instructions && (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
          <p className="font-medium text-gray-800 mb-1">Instructions</p>
          <p className="text-gray-700">{instructions}</p>
        </div>
      )}

      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm">
        <p className="font-medium text-blue-800 mb-1">What happens to these credentials?</p>
        <p className="text-blue-700">They are encrypted and stored in our secure vault. Your agency uses them only when needed, under a timed checkout policy, and they can be rotated at any time.</p>
      </div>

      {/* Dynamic Asset Fields */}
      {assetFields.length > 0 && (
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-sm font-semibold text-purple-900 mb-3">
            <i className="fas fa-database mr-2"></i>Account Information
          </p>
          <div className="space-y-4">
            {assetFields.map(field => (
              <DynamicField
                key={field.name}
                field={field}
                value={clientProvidedTarget[field.name]}
                onChange={handleFieldChange}
                error={errors[field.name]}
              />
            ))}
          </div>
        </div>
      )}

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
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={submitting || !username || !password} className="w-full">
        {submitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Encrypting &amp; Storing...</>
          : <><i className="fas fa-lock mr-2"></i>Submit Credentials Securely</>}
      </Button>
    </div>
  );
}

// SHARED_ACCOUNT_PAM + AGENCY_OWNED → invite agency identity
function PamAgencyOwnedStep({ item, platform, token, onComplete, assetFields }) {
  const { toast } = useToast();
  const [attestChecked, setAttestChecked] = useState(false);
  const [attestText, setAttestText] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceB64, setEvidenceB64] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [clientProvidedTarget, setClientProvidedTarget] = useState(item.clientProvidedTarget || {});
  const [errors, setErrors] = useState({});
  const done = item.status === 'validated';

  // Get agency data
  const agencyData = item.agencyData || {};
  const pamAgencyEmail = item.resolvedIdentity || item.pamAgencyIdentityEmail || item.pamConfig?.agencyIdentityEmail;
  const pamRole = item.pamRoleTemplate || item.pamConfig?.roleTemplate || item.role;

  const handleFieldChange = (name, value) => {
    setClientProvidedTarget(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

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
          attestationText: attestText || `Client confirmed: added ${pamAgencyEmail} with role ${pamRole}`,
          evidenceBase64: evidenceB64 || undefined,
          evidenceFileName: evidenceFile?.name || undefined,
          clientProvidedTarget: Object.keys(clientProvidedTarget).length > 0 ? clientProvidedTarget : undefined
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

  // Parse instruction sentences
  const instructionSteps = item.clientInstructions
    ? item.clientInstructions.split(/\.\s+/).filter(s => s.trim()).map(s => s.trim().replace(/\.$/, '') + '.')
    : [
        `Log in to your ${platform?.name || 'platform'} account.`,
        `Navigate to Settings → Users / Permissions (or similar).`,
        `Click "Add User", "Invite User", or "Add team member".`,
        `Enter the email: ${pamAgencyEmail}`,
        `Assign the role: ${pamRole}`,
        'Save and confirm the invitation.'
      ];

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
            <p className="font-mono font-semibold text-sm">{pamAgencyEmail}</p>
            <p className="text-xs text-muted-foreground">Role to assign: <strong>{pamRole}</strong></p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(pamAgencyEmail || '');
              toast({ title: 'Copied!', description: 'Email copied to clipboard' });
            }}
          >
            <i className="fas fa-copy mr-1"></i>Copy
          </Button>
        </div>
      </div>

      {/* Additional agency data if present */}
      {Object.keys(agencyData).filter(k => agencyData[k]).length > 0 && (
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm font-semibold mb-2"><i className="fas fa-info-circle mr-2"></i>Additional Information</p>
          <div className="space-y-1 text-sm">
            {Object.entries(agencyData).filter(([_, v]) => v).map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground">{formatAgencyDataKey(key)}:</span>
                <span className="font-mono">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step-by-step instructions */}
      <div className="p-4 rounded-lg bg-green-50 border border-green-200">
        <p className="text-sm font-semibold text-green-900 mb-3"><i className="fas fa-list-check mr-2"></i>Steps to Complete</p>
        <ol className="space-y-2">
          {instructionSteps.map((step, idx) => (
            <li key={idx} className="flex gap-3 text-sm text-green-800">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-semibold">{idx + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Dynamic Asset Fields */}
      {assetFields.length > 0 && (
        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-sm font-semibold text-purple-900 mb-3">
            <i className="fas fa-database mr-2"></i>Account Information
          </p>
          <div className="space-y-4">
            {assetFields.map(field => (
              <DynamicField
                key={field.name}
                field={field}
                value={clientProvidedTarget[field.name]}
                onChange={handleFieldChange}
                error={errors[field.name]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Attestation */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-start gap-3">
          <Checkbox
            id="attest"
            checked={attestChecked}
            onCheckedChange={setAttestChecked}
          />
          <label htmlFor="attest" className="text-sm leading-relaxed cursor-pointer">
            I confirm I have added <strong>{pamAgencyEmail}</strong> to my {platform?.name} account with the <strong>{pamRole}</strong> role.
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
  const [assetFieldsMap, setAssetFieldsMap] = useState({});

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
        
        // Fetch asset fields for each platform/itemType combo
        const fieldsMap = {};
        for (const item of result.data.items || []) {
          const platform = item.platform;
          if (platform) {
            const key = `${platform.id}-${item.itemType}`;
            if (!fieldsMap[key]) {
              try {
                const fieldsRes = await fetch(`/api/client-asset-fields?platformName=${encodeURIComponent(platform.name)}&itemType=${item.itemType}`);
                const fieldsData = await fieldsRes.json();
                fieldsMap[key] = fieldsData.success ? fieldsData.fields : [];
              } catch {
                fieldsMap[key] = [];
              }
            }
          }
        }
        setAssetFieldsMap(fieldsMap);
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

  const getAssetFieldsForItem = (item) => {
    if (!item.platform) return [];
    const key = `${item.platform.id}-${item.itemType}`;
    return assetFieldsMap[key] || [];
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
            <h2 className="text-2xl font-bold text-green-800 mb-2">All Done!</h2>
            <p className="text-green-700 mb-4">Your onboarding is complete. Your agency now has the access they need.</p>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <i className="fas fa-shield-check mr-2"></i>
                {items.length} platform{items.length !== 1 ? 's' : ''} configured successfully
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentItem = items[activeStep];
  const currentPlatform = currentItem?.platform;

  // Determine which step component to render
  const renderStep = () => {
    if (!currentItem) return null;

    const assetFields = getAssetFieldsForItem(currentItem);
    const isPamClientOwned = currentItem.itemType === 'SHARED_ACCOUNT_PAM' && 
      (currentItem.pamOwnership === 'CLIENT_OWNED' || currentItem.pamConfig?.ownership === 'CLIENT_OWNED');
    const isPamAgencyOwned = currentItem.itemType === 'SHARED_ACCOUNT_PAM' && 
      (currentItem.pamOwnership === 'AGENCY_OWNED' || currentItem.pamConfig?.ownership === 'AGENCY_OWNED');

    if (isPamClientOwned) {
      return <PamClientOwnedStep item={currentItem} platform={currentPlatform} token={params.token} onComplete={handleStepComplete} assetFields={assetFields} />;
    }
    if (isPamAgencyOwned) {
      return <PamAgencyOwnedStep item={currentItem} platform={currentPlatform} token={params.token} onComplete={handleStepComplete} assetFields={assetFields} />;
    }
    return <StandardStep item={currentItem} platform={currentPlatform} token={params.token} onComplete={handleStepComplete} assetFields={assetFields} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            <i className="fas fa-rocket mr-2 text-primary"></i>
            Access Onboarding
          </h1>
          <p className="text-muted-foreground">
            Hi <strong>{client?.name || 'there'}</strong>! Let's set up access for your agency.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{validatedCount} of {items.length} complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${items.length ? (validatedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Step Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                idx === activeStep 
                  ? 'bg-primary text-primary-foreground' 
                  : item.status === 'validated'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.status === 'validated' && <i className="fas fa-check text-xs"></i>}
              {item.platform?.name || `Step ${idx + 1}`}
            </button>
          ))}
        </div>

        {/* Current Step Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentPlatform?.icon && <i className={`${currentPlatform.icon} text-primary`}></i>}
                  {currentPlatform?.name || 'Platform Access'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentItem?.label} • {currentItem?.role}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={currentItem?.status} />
                <ItemTypeBadge item={currentItem || {}} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Help */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            <i className="fas fa-question-circle mr-1"></i>
            Need help? Contact your agency for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
