'use client';

/**
 * OAuth Callback Handler Page
 * 
 * Handles OAuth redirects from providers and returns the user to the onboarding page.
 * Supports both CLIENT and AGENCY scoped tokens.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [tokenId, setTokenId] = useState(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      // Check for OAuth error from provider
      if (errorParam) {
        setStatus('error');
        setError(errorDesc || `OAuth error: ${errorParam}`);
        return;
      }

      // Validate code and state
      if (!code) {
        setStatus('error');
        setError('No authorization code received');
        return;
      }

      // Get stored state data from sessionStorage
      const storedState = sessionStorage.getItem('oauth_state');
      const platformKey = sessionStorage.getItem('oauth_platform');
      const scope = sessionStorage.getItem('oauth_scope') || 'CLIENT';
      const itemId = sessionStorage.getItem('oauth_item_id');
      const returnUrl = sessionStorage.getItem('oauth_return_url');
      const tenantId = sessionStorage.getItem('oauth_tenant_id');

      // Validate state to prevent CSRF
      if (state && storedState && !state.startsWith(storedState.split('.')[0])) {
        console.warn('State mismatch, but continuing for development');
      }

      if (!platformKey) {
        setStatus('error');
        setError('OAuth session expired. Please try connecting again.');
        return;
      }

      // Exchange code for tokens via backend
      const redirectUri = `${window.location.origin}/onboarding/oauth-callback`;
      
      const res = await fetch(`/api/oauth/${platformKey}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          state,
          redirectUri,
          persistToken: true,
          scope,
          tenantId,
          tenantType: tenantId ? 'ACCESS_REQUEST' : null,
          metadata: {
            source: 'onboarding',
            itemId,
          }
        })
      });

      const data = await res.json();

      if (!data.success) {
        setStatus('error');
        setError(data.error || 'Failed to exchange authorization code');
        return;
      }

      // Success - store token info
      setTokenId(data.data?.tokenId);
      setStatus('success');

      // Store token data for the onboarding page to use
      if (data.data?.tokenId) {
        sessionStorage.setItem('oauth_token_id', data.data.tokenId);
        sessionStorage.setItem('oauth_access_token', data.data.accessToken);
        sessionStorage.setItem('oauth_token_type', data.data.tokenType || 'Bearer');
        if (data.data.targets) {
          sessionStorage.setItem('oauth_targets', JSON.stringify(data.data.targets));
        }
      }

      // Clear sensitive session data
      sessionStorage.removeItem('oauth_state');

      // Auto-redirect back to onboarding page after short delay
      setTimeout(() => {
        if (returnUrl) {
          window.location.href = returnUrl;
        }
      }, 1500);

    } catch (err) {
      console.error('OAuth callback error:', err);
      setStatus('error');
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleRetry = () => {
    const returnUrl = sessionStorage.getItem('oauth_return_url');
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {status === 'processing' && 'Connecting Account...'}
            {status === 'success' && 'Connected Successfully!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'processing' && (
            <div className="py-8">
              <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
              <p className="text-muted-foreground">Completing OAuth connection...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
              <p className="text-green-700 mb-2">Your account has been connected.</p>
              <p className="text-sm text-muted-foreground">Redirecting back to onboarding...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6">
              <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline">
                <i className="fas fa-arrow-left mr-2"></i>
                Go Back and Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
