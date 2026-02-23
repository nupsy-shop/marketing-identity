#!/usr/bin/env python3
"""
OAuth Flow Testing for Plugin-Based Platform System
Tests OAuth endpoints for LinkedIn, HubSpot, Salesforce, and Snowflake plugins.
"""

import requests
import json
from urllib.parse import urljoin

# Test configuration
BASE_URL = "https://agent-onboarding-hub.preview.emergentagent.com"
API_BASE = urljoin(BASE_URL, "/api/")

def test_oauth_support_verification():
    """Test 1: OAuth Support Verification - Check plugin manifests for OAuth support"""
    print("\n=== TEST 1: OAuth Support Verification ===")
    
    # Test OAuth-supported plugins
    oauth_platforms = ['linkedin', 'hubspot', 'salesforce', 'snowflake']
    
    for platform in oauth_platforms:
        try:
            response = requests.get(f"{API_BASE}plugins/{platform}")
            print(f"Testing GET /api/plugins/{platform}")
            
            if response.status_code == 200:
                data = response.json()
                manifest = data.get('data', {}).get('manifest', {})
                oauth_supported = manifest.get('automationCapabilities', {}).get('oauthSupported', False)
                
                if oauth_supported:
                    print(f"  ✅ {platform}: OAuth support VERIFIED (oauthSupported: {oauth_supported})")
                else:
                    print(f"  ❌ {platform}: OAuth support NOT FOUND (oauthSupported: {oauth_supported})")
            else:
                print(f"  ❌ {platform}: Failed to get plugin info (Status: {response.status_code})")
                
        except Exception as e:
            print(f"  ❌ {platform}: Error - {str(e)}")
    
    print(f"\n--- Testing platforms WITHOUT OAuth support ---")
    # Test non-OAuth platforms
    non_oauth_platforms = ['google-ads', 'meta', 'tiktok']
    
    for platform in non_oauth_platforms:
        try:
            response = requests.get(f"{API_BASE}plugins/{platform}")
            print(f"Testing GET /api/plugins/{platform}")
            
            if response.status_code == 200:
                data = response.json()
                manifest = data.get('data', {}).get('manifest', {})
                oauth_supported = manifest.get('automationCapabilities', {}).get('oauthSupported', False)
                
                if not oauth_supported:
                    print(f"  ✅ {platform}: OAuth correctly DISABLED (oauthSupported: {oauth_supported})")
                else:
                    print(f"  ❌ {platform}: OAuth incorrectly ENABLED (oauthSupported: {oauth_supported})")
            else:
                print(f"  ❌ {platform}: Failed to get plugin info (Status: {response.status_code})")
                
        except Exception as e:
            print(f"  ❌ {platform}: Error - {str(e)}")
    
    print("OAuth Support Verification completed.\n")

def test_oauth_start_endpoints():
    """Test 2: OAuth Start Endpoint - Test POST /api/oauth/:platformKey/start"""
    print("\n=== TEST 2: OAuth Start Endpoints ===")
    
    # Test OAuth-supported platforms - should return error about missing credentials (expected)
    oauth_platforms = ['linkedin', 'hubspot', 'salesforce']
    
    for platform in oauth_platforms:
        try:
            payload = {"redirectUri": "https://test.com/callback"}
            response = requests.post(f"{API_BASE}oauth/{platform}/start", json=payload)
            print(f"Testing POST /api/oauth/{platform}/start")
            print(f"  Request payload: {payload}")
            print(f"  Response status: {response.status_code}")
            
            if response.status_code in [400, 401, 500]:  # Expected to fail due to missing credentials
                try:
                    error_data = response.json()
                    print(f"  ✅ Expected error response: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"  ✅ Expected error (non-JSON response)")
            else:
                print(f"  ⚠️ Unexpected status code: {response.status_code}")
                if response.headers.get('content-type', '').startswith('application/json'):
                    print(f"  Response: {response.json()}")
                
        except Exception as e:
            print(f"  ❌ {platform}: Error - {str(e)}")
    
    # Test Snowflake - special case requiring accountIdentifier
    print(f"\nTesting Snowflake (requires accountIdentifier):")
    try:
        # Test without accountIdentifier - should fail
        payload = {"redirectUri": "https://test.com/callback"}
        response = requests.post(f"{API_BASE}oauth/snowflake/start", json=payload)
        print(f"POST /api/oauth/snowflake/start (missing accountIdentifier)")
        print(f"  Request payload: {payload}")
        print(f"  Response status: {response.status_code}")
        
        if response.status_code in [400, 422]:  # Expected validation error
            try:
                error_data = response.json()
                print(f"  ✅ Expected validation error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"  ✅ Expected validation error (non-JSON response)")
        else:
            print(f"  ⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ Snowflake: Error - {str(e)}")
    
    # Test non-OAuth platform - should return error that OAuth is not supported
    print(f"\nTesting non-OAuth platform (Google Ads):")
    try:
        payload = {"redirectUri": "https://test.com/callback"}
        response = requests.post(f"{API_BASE}oauth/google-ads/start", json=payload)
        print(f"POST /api/oauth/google-ads/start")
        print(f"  Request payload: {payload}")
        print(f"  Response status: {response.status_code}")
        
        if response.status_code == 400:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', '')
                if 'does not support OAuth' in error_msg or 'OAuth' in error_msg:
                    print(f"  ✅ Correct OAuth not supported error: {error_msg}")
                else:
                    print(f"  ⚠️ Different error: {error_msg}")
            except:
                print(f"  ✅ OAuth not supported (non-JSON response)")
        else:
            print(f"  ⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ Google Ads: Error - {str(e)}")
    
    print("OAuth Start Endpoints testing completed.\n")

def test_oauth_callback_endpoints():
    """Test 3: OAuth Callback Endpoint - Test POST /api/oauth/:platformKey/callback"""
    print("\n=== TEST 3: OAuth Callback Endpoints ===")
    
    # Test LinkedIn callback - should attempt callback (may fail due to invalid code)
    print(f"Testing LinkedIn OAuth callback:")
    try:
        payload = {"code": "test"}
        response = requests.post(f"{API_BASE}oauth/linkedin/callback", json=payload)
        print(f"POST /api/oauth/linkedin/callback")
        print(f"  Request payload: {payload}")
        print(f"  Response status: {response.status_code}")
        
        if response.status_code in [400, 401, 500]:  # Expected to fail due to invalid code
            try:
                error_data = response.json()
                print(f"  ✅ Expected error for invalid code: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"  ✅ Expected error (non-JSON response)")
        elif response.status_code == 200:
            print(f"  ⚠️ Unexpected success - code might be processed differently")
        else:
            print(f"  ⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ LinkedIn callback: Error - {str(e)}")
    
    print("OAuth Callback Endpoints testing completed.\n")

def test_oauth_refresh_endpoints():
    """Test 4: OAuth Refresh Endpoint - Test POST /api/oauth/:platformKey/refresh"""
    print("\n=== TEST 4: OAuth Refresh Endpoints ===")
    
    # Test HubSpot refresh - should attempt refresh
    print(f"Testing HubSpot OAuth refresh:")
    try:
        payload = {"refreshToken": "test"}
        response = requests.post(f"{API_BASE}oauth/hubspot/refresh", json=payload)
        print(f"POST /api/oauth/hubspot/refresh")
        print(f"  Request payload: {payload}")
        print(f"  Response status: {response.status_code}")
        
        if response.status_code in [400, 401, 500]:  # Expected to fail due to invalid token
            try:
                error_data = response.json()
                print(f"  ✅ Expected error for invalid refresh token: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"  ✅ Expected error (non-JSON response)")
        elif response.status_code == 200:
            print(f"  ⚠️ Unexpected success - token might be processed differently")
        else:
            print(f"  ⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ HubSpot refresh: Error - {str(e)}")
    
    print("OAuth Refresh Endpoints testing completed.\n")

def test_oauth_fetch_accounts_endpoints():
    """Test 5: OAuth Fetch Accounts Endpoint - Test POST /api/oauth/:platformKey/fetch-accounts"""
    print("\n=== TEST 5: OAuth Fetch Accounts Endpoints ===")
    
    # Test LinkedIn fetch accounts - should attempt to fetch (may fail auth, but endpoint should work)
    print(f"Testing LinkedIn OAuth fetch accounts:")
    try:
        payload = {"accessToken": "test"}
        response = requests.post(f"{API_BASE}oauth/linkedin/fetch-accounts", json=payload)
        print(f"POST /api/oauth/linkedin/fetch-accounts")
        print(f"  Request payload: {payload}")
        print(f"  Response status: {response.status_code}")
        
        if response.status_code in [400, 401, 403, 500]:  # Expected to fail due to invalid token
            try:
                error_data = response.json()
                print(f"  ✅ Expected error for invalid access token: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"  ✅ Expected error (non-JSON response)")
        elif response.status_code == 200:
            try:
                data = response.json()
                print(f"  ⚠️ Unexpected success - got data: {data}")
            except:
                print(f"  ⚠️ Unexpected success (non-JSON response)")
        else:
            print(f"  ⚠️ Unexpected status code: {response.status_code}")
            
    except Exception as e:
        print(f"  ❌ LinkedIn fetch accounts: Error - {str(e)}")
    
    print("OAuth Fetch Accounts Endpoints testing completed.\n")

def test_endpoint_routing():
    """Test 6: Verify all OAuth endpoints are properly routed"""
    print("\n=== TEST 6: OAuth Endpoint Routing Verification ===")
    
    oauth_endpoints = [
        ("linkedin", "start"),
        ("linkedin", "callback"), 
        ("linkedin", "refresh"),
        ("linkedin", "fetch-accounts"),
        ("hubspot", "start"),
        ("hubspot", "callback"),
        ("hubspot", "refresh"),
        ("hubspot", "fetch-accounts"),
        ("salesforce", "start"),
        ("salesforce", "callback"),
        ("salesforce", "refresh"),
        ("salesforce", "fetch-accounts"),
        ("snowflake", "start"),
        ("snowflake", "callback"),
        ("snowflake", "refresh"),
        ("snowflake", "fetch-accounts"),
    ]
    
    for platform, endpoint in oauth_endpoints:
        try:
            # Use GET to test if endpoint exists (should return 405 Method Not Allowed)
            response = requests.get(f"{API_BASE}oauth/{platform}/{endpoint}")
            print(f"Testing routing for /api/oauth/{platform}/{endpoint}")
            
            if response.status_code == 405:  # Method Not Allowed - endpoint exists but wrong method
                print(f"  ✅ Endpoint exists (405 Method Not Allowed)")
            elif response.status_code == 404:  # Not Found - endpoint doesn't exist
                print(f"  ❌ Endpoint not found (404)")
            else:
                print(f"  ⚠️ Unexpected response (Status: {response.status_code})")
                
        except Exception as e:
            print(f"  ❌ Routing error for {platform}/{endpoint}: {str(e)}")
    
    print("OAuth Endpoint Routing Verification completed.\n")

def main():
    """Run all OAuth tests"""
    print("🚀 OAUTH FLOW TESTING FOR PLUGIN-BASED PLATFORM SYSTEM")
    print("=" * 70)
    print(f"Backend URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    
    try:
        # Test basic API connectivity
        response = requests.get(f"{API_BASE}plugins")
        print(f"API connectivity test: Status {response.status_code}")
        if response.status_code != 200:
            print("⚠️ API connectivity issue detected, but continuing with tests...")
    except Exception as e:
        print(f"⚠️ API connectivity error: {e}, but continuing with tests...")
    
    # Run all test suites
    test_oauth_support_verification()
    test_oauth_start_endpoints()
    test_oauth_callback_endpoints() 
    test_oauth_refresh_endpoints()
    test_oauth_fetch_accounts_endpoints()
    test_endpoint_routing()
    
    print("=" * 70)
    print("🎉 OAuth Flow Testing completed!")
    print("=" * 70)

if __name__ == "__main__":
    main()