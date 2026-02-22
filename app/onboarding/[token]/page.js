'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const params = useParams();
  const { toast } = useToast();
  const [accessRequest, setAccessRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params.token) {
      loadOnboardingData();
    }
  }, [params.token]);

  const loadOnboardingData = async () => {
    try {
      const response = await fetch(`/api/onboarding/${params.token}`);
      const result = await response.json();
      
      if (result.success) {
        setAccessRequest(result.data);
      } else {
        setError(result.error || 'Invalid onboarding link');
      }
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
      setError('Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  };

  const markAsGranted = async (itemId, platformId) => {
    try {
      const response = await fetch(`/api/access-requests/${accessRequest.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: itemId,
          platformId: platformId, // Fallback for backward compatibility
          notes: 'Manually confirmed by client'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Access validated successfully'
        });
        loadOnboardingData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to validate access',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to validate:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate access',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading onboarding...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-destructive">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3 className="text-lg font-semibold mb-2">Invalid Link</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Support both old and new structure
  const items = accessRequest.items || accessRequest.platformStatuses || [];
  const validatedCount = items.filter(item => item.status === 'validated').length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (validatedCount / totalCount) * 100 : 0;
  const isComplete = validatedCount === totalCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Platform Access Onboarding</h1>
            <p className="text-xl text-muted-foreground mb-4">
              Welcome, {accessRequest.client?.name}
            </p>
            <Card className="inline-block">
              <CardContent className="py-3 px-6">
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="text-2xl font-bold">{validatedCount} / {totalCount}</p>
                  </div>
                  <div className="w-32">
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Completion Message */}
          {isComplete && (
            <Card className="mb-8 border-green-500 bg-green-50">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 flex-shrink-0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div>
                    <h3 className="text-xl font-bold text-green-900 mb-1">Onboarding Complete!</h3>
                    <p className="text-green-800">
                      All platforms have been successfully configured. Our team will be in touch shortly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Please grant access to the following platforms. Each platform has specific instructions based on its access method.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Platform Checklist */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <PlatformAccessCard 
                key={item.id || item.platformId}
                item={item}
                index={index + 1}
                onMarkGranted={markAsGranted}
              />
            ))}
          </div>

          {/* Footer */}
          <Card className="mt-8 bg-muted">
            <CardContent className="py-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Need help? Contact us at <a href="mailto:support@agency.com" className="text-primary hover:underline">support@agency.com</a>
                </p>
                <p className="text-xs text-muted-foreground">
                  This onboarding link will remain active until all platforms are validated.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PlatformAccessCard({ item, index, onMarkGranted }) {
  const [expanded, setExpanded] = useState(false);
  const platform = item.platform;
  const isValidated = item.status === 'validated';
  const isHighAutomation = platform?.automationFeasibility?.includes('High');
  const isMediumAutomation = platform?.automationFeasibility?.includes('Medium');
  const isLowAutomation = platform?.automationFeasibility === 'Low' || platform?.automationFeasibility === 'Low-Medium';

  const getInstructions = () => {
    if (!platform) return '';

    const agencyEmail = 'agency@example.com';
    const platformName = platform.name;

    if (platform.accessPattern.includes('Partner Hub') || platform.accessPattern.includes('1')) {
      return `
**${platformName} uses Partner Hub access**

1. Log into your ${platformName} account
2. Navigate to Account Settings → Linked Accounts or Partner Access
3. Grant access to our agency account
4. Our team will handle the rest automatically

${platform.notes ? `\n**Note:** ${platform.notes}` : ''}
      `.trim();
    }

    if (platform.accessPattern.includes('Named Invites') || platform.accessPattern.includes('2')) {
      return `
**${platformName} requires named user invitation**

1. Log into your ${platformName} account
2. Navigate to User Management or Team Settings
3. Click "Invite User" or "Add Team Member"
4. Enter: ${agencyEmail}
5. Assign appropriate permissions (we recommend Admin or Standard access)
6. Send the invitation
7. Click "I have granted access" below once completed

${platform.notes ? `\n**Note:** ${platform.notes}` : ''}
      `.trim();
    }

    if (platform.accessPattern.includes('Proxy') || platform.accessPattern.includes('4')) {
      return `
**${platformName} requires proxy or service account**

1. This platform will connect through our secure proxy service
2. Our team will contact you to coordinate the setup
3. No direct action is needed at this time

${platform.notes ? `\n**Note:** ${platform.notes}` : ''}
      `.trim();
    }

    if (platform.accessPattern.includes('PAM') || platform.accessPattern.includes('5')) {
      return `
**${platformName} requires privileged access management**

1. This platform requires credential sharing via our secure PAM system
2. Our team will contact you to coordinate credential exchange
3. All access will be audited and time-boxed per your requirements

${platform.notes ? `\n**Note:** ${platform.notes}` : ''}
      `.trim();
    }

    return `
**Grant access to ${platformName}**

1. Log into your ${platformName} account
2. Navigate to account settings or user management
3. Add ${agencyEmail} with appropriate permissions
4. Click "I have granted access" below once completed

${platform.notes ? `\n**Note:** ${platform.notes}` : ''}
    `.trim();
  };

  return (
    <Card className={isValidated ? 'border-green-500 bg-green-50/50' : ''}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">
            {isValidated ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              index
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <CardTitle className="text-xl">{platform?.name || 'Unknown Platform'}</CardTitle>
                <CardDescription className="mt-1">{platform?.domain}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={isValidated ? 'default' : 'secondary'}>
                  {isValidated ? 'Validated' : 'Pending'}
                </Badge>
                <Badge variant="outline">
                  {platform?.automationFeasibility}
                </Badge>
              </div>
            </div>

            {!isValidated && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setExpanded(!expanded)}
                  className="w-full justify-between"
                >
                  {expanded ? 'Hide Instructions' : 'Show Instructions'}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && !isValidated && (
        <CardContent>
          <div className="bg-muted p-4 rounded-lg mb-4">
            <div className="prose prose-sm max-w-none">
              {getInstructions().split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={i} className="font-bold mb-2">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.match(/^\d+\./)) {
                  return <p key={i} className="ml-4 mb-1">{line}</p>;
                }
                return <p key={i} className="mb-1">{line}</p>;
              })}
            </div>
          </div>

          <div className="flex gap-2">
            {isHighAutomation || isMediumAutomation ? (
              <>
                <Button className="flex-1" disabled>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Connect via OAuth
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => onMarkGranted(platformStatus.platformId)}>
                  I have granted access manually
                </Button>
              </>
            ) : (
              <Button className="flex-1" onClick={() => onMarkGranted(platformStatus.platformId)}>
                I have granted access
              </Button>
            )}
          </div>

          {platform?.accessPattern && (
            <p className="text-xs text-muted-foreground mt-3">
              Access Pattern: {platform.accessPattern}
            </p>
          )}
        </CardContent>
      )}

      {isValidated && (
        <CardContent>
          <div className="flex items-center gap-2 text-green-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="text-sm font-medium">
              Access validated on {new Date(platformStatus.validatedAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
