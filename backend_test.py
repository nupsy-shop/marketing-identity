#!/usr/bin/env python3

import requests
import json
import sys
import traceback
from urllib.parse import urljoin
import urllib3

# Disable SSL warnings for testing
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Base URL from environment
BASE_URL = "https://access-provisioning.preview.emergentagent.com"
API_BASE = urljoin(BASE_URL, "/api/")

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with proper error handling"""
    url = urljoin(API_BASE, endpoint.lstrip('/'))
    default_headers = {'Content-Type': 'application/json'}
    if headers:
        default_headers.update(headers)
    
    try:
        # Add timeout and SSL verification settings
        kwargs = {
            'headers': default_headers,
            'timeout': 30,
            'verify': False  # Disable SSL verification for testing
        }
        
        if method.upper() == 'GET':
            response = requests.get(url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, **kwargs)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, **kwargs)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, **kwargs)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, **kwargs)
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed for {url}: {e}")
        return None

def test_save_target_endpoint():
    """Test the Save Target API endpoint"""
    print("\n" + "="*80)
    print("TESTING: Save Target Endpoint - POST /api/onboarding/:token/items/:itemId/save-target")
    print("="*80)
    
    # Test data from review request
    valid_token = "055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
    valid_item_id = "c5c93c3e-b691-4bd5-a034-50ae9df8042d"
    
    sample_target = {
        "externalId": "123456789",
        "displayName": "Test GA4 Property",
        "targetType": "PROPERTY",
        "parentExternalId": "accounts/123",
        "metadata": { "test": True }
    }
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: Missing selectedTarget (should return 400)
        print("\n[TEST 1/4] Testing missing selectedTarget...")
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/save-target', {})
        if response and response.status_code == 400:
            response_data = response.json()
            if 'selectedTarget is required' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected missing selectedTarget with 400")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 400, got {status}")
        
        # Test 2: Invalid token (should return 404)
        print("\n[TEST 2/4] Testing invalid token...")
        invalid_token = "invalid-token-12345"
        response = make_request('POST', f'/onboarding/{invalid_token}/items/{valid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 404:
            response_data = response.json()
            if 'Invalid onboarding token' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected invalid token with 404")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 404, got {status}")
        
        # Test 3: Invalid itemId (should return 404)
        print("\n[TEST 3/4] Testing invalid itemId...")
        invalid_item_id = "invalid-item-id-12345"
        response = make_request('POST', f'/onboarding/{valid_token}/items/{invalid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 404:
            response_data = response.json()
            if 'Item not found' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected invalid itemId with 404")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 404, got {status}")
        
        # Test 4: Valid request with selectedTarget object (should return 200)
        print("\n[TEST 4/4] Testing valid save target request...")
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 200:
            response_data = response.json()
            if (response_data.get('success') and 
                response_data.get('data', {}).get('selectedTarget', {}).get('externalId') == "123456789"):
                print("✅ PASS: Successfully saved target with 200")
                print(f"   Returned target: {response_data.get('data', {}).get('selectedTarget', {})}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Invalid response structure: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during save target tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Save Target Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_target_discovery_endpoint():
    """Test the Target Discovery API endpoint"""
    print("\n" + "="*80)
    print("TESTING: Target Discovery Endpoint - POST /api/oauth/:platformKey/discover-targets")
    print("="*80)
    
    platforms_to_test = ['ga4', 'gtm', 'google-ads']
    tests_passed = 0
    total_tests = 6  # 2 tests per platform
    
    try:
        for platform in platforms_to_test:
            print(f"\n--- Testing platform: {platform} ---")
            
            # Test 1: Missing accessToken (should return 400)
            print(f"\n[TEST] Testing missing accessToken for {platform}...")
            response = make_request('POST', f'/oauth/{platform}/discover-targets', {})
            if response and response.status_code == 400:
                response_data = response.json()
                if 'accessToken is required' in response_data.get('error', ''):
                    print(f"✅ PASS: Correctly rejected missing accessToken for {platform}")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: Wrong error message for {platform}: {response_data}")
            else:
                status = response.status_code if response else 'No response'
                print(f"❌ FAIL: Expected 400 for {platform}, got {status}")
            
            # Test 2: Fake accessToken (should return error from Google API or appropriate error)
            print(f"\n[TEST] Testing fake accessToken for {platform}...")
            fake_token = "fake_access_token_12345"
            response = make_request('POST', f'/oauth/{platform}/discover-targets', 
                                  {"accessToken": fake_token})
            
            # Should return either 400/401/500 error (depending on platform implementation)
            if response and response.status_code in [400, 401, 500, 501]:
                response_data = response.json()
                error_msg = response_data.get('error', '').lower()
                
                # Check for expected error patterns
                expected_errors = [
                    'not configured', 'oauth is not configured', 'not found',
                    'invalid', 'unauthorized', 'failed', 'does not support'
                ]
                
                if any(expected in error_msg for expected in expected_errors):
                    print(f"✅ PASS: Correctly handled fake token for {platform} (Status: {response.status_code})")
                    print(f"   Error: {response_data.get('error', '')}")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: Unexpected error message for {platform}: {response_data}")
            else:
                status = response.status_code if response else 'No response'
                print(f"❌ FAIL: Expected error status for {platform}, got {status}")
                if response:
                    print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during target discovery tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Target Discovery Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_regression_onboarding_endpoints():
    """Test existing onboarding endpoints still work"""
    print("\n" + "="*80)
    print("TESTING: Regression - Existing Onboarding Endpoints")
    print("="*80)
    
    # Test data from review request
    valid_token = "055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
    valid_item_id = "c5c93c3e-b691-4bd5-a034-50ae9df8042d"
    
    tests_passed = 0
    total_tests = 2
    
    try:
        # Test 1: GET /api/onboarding/:token (should return onboarding data)
        print("\n[TEST 1/2] Testing GET onboarding data...")
        response = make_request('GET', f'/onboarding/{valid_token}')
        if response and response.status_code == 200:
            response_data = response.json()
            if (response_data.get('success') and 
                response_data.get('data', {}).get('client') and
                response_data.get('data', {}).get('items')):
                print("✅ PASS: Successfully retrieved onboarding data")
                print(f"   Client: {response_data['data']['client']['name']}")
                print(f"   Items count: {len(response_data['data']['items'])}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Invalid onboarding data structure: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
        # Test 2: POST /api/onboarding/:token/items/:itemId/attest (should still work)
        print("\n[TEST 2/2] Testing POST attestation endpoint...")
        attest_data = {
            "attestationText": "I have granted the requested access to my GA4 account",
            "clientProvidedTarget": {
                "propertyId": "123456789",
                "propertyName": "Test Property",
                "assetType": "GA4_PROPERTY"
            }
        }
        
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/attest', 
                              attest_data)
        if response and response.status_code == 200:
            response_data = response.json()
            if response_data.get('success'):
                print("✅ PASS: Successfully submitted attestation")
                print(f"   Response success: {response_data.get('success')}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Attestation failed: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during regression tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Regression Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE SEARCH CONSOLE (GSC) PLUGIN TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def test_gsc_capabilities():
    """Test GSC plugin capabilities endpoints"""
    print("\n" + "="*80)
    print("🔥 TESTING GSC CAPABILITIES ENDPOINTS")
    print("="*80)
    
    tests_passed = 0
    total_tests = 6
    
    try:
        # Test 1: GSC Capabilities NAMED_INVITE
        print("\n📝 Test 1: GSC Capabilities NAMED_INVITE")
        response = make_request('GET', '/plugins/google-search-console/capabilities/NAMED_INVITE')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                capabilities = data['data']['capabilities']
                # Expected: canGrantAccess=false, canVerifyAccess=true, clientOAuthSupported=true
                if (capabilities.get('canGrantAccess') == False and 
                    capabilities.get('canVerifyAccess') == True and 
                    capabilities.get('clientOAuthSupported') == True):
                    print("✅ PASS: GSC NAMED_INVITE capabilities correct")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC NAMED_INVITE capabilities wrong: {capabilities}")
            else:
                print(f"❌ FAIL: GSC NAMED_INVITE capabilities API error: {data.get('error')}")
        else:
            print("❌ FAIL: GSC NAMED_INVITE capabilities request failed")
        
        # Test 2: GSC Capabilities SHARED_ACCOUNT  
        print("\n📝 Test 2: GSC Capabilities SHARED_ACCOUNT")
        response = make_request('GET', '/plugins/google-search-console/capabilities/SHARED_ACCOUNT')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                capabilities = data['data']['capabilities']
                # Expected: canGrantAccess=false, canVerifyAccess=false, clientOAuthSupported=false
                if (capabilities.get('canGrantAccess') == False and 
                    capabilities.get('canVerifyAccess') == False and 
                    capabilities.get('clientOAuthSupported') == False):
                    print("✅ PASS: GSC SHARED_ACCOUNT capabilities correct")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC SHARED_ACCOUNT capabilities wrong: {capabilities}")
            else:
                print(f"❌ FAIL: GSC SHARED_ACCOUNT capabilities API error: {data.get('error')}")
        else:
            print("❌ FAIL: GSC SHARED_ACCOUNT capabilities request failed")
            
        # Test 3: GSC OAuth Start
        print("\n📝 Test 3: GSC OAuth Start") 
        oauth_data = {
            "redirectUri": f"{BASE_URL}/api/oauth/callback"
        }
        response = make_request('POST', '/oauth/google-search-console/start', oauth_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                auth_url = data['data'].get('authUrl')
                state = data['data'].get('state')
                if auth_url and state and 'accounts.google.com' in auth_url:
                    print("✅ PASS: GSC OAuth start returns valid Google OAuth URL")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC OAuth start invalid response: authUrl={auth_url}, state={state}")
            else:
                print(f"❌ FAIL: GSC OAuth start API error: {data.get('error')}")
        else:
            print("❌ FAIL: GSC OAuth start request failed")
            
        # Test 4: GSC OAuth Status
        print("\n📝 Test 4: GSC OAuth Status")
        response = make_request('GET', '/oauth/google-search-console/status')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                oauth_data = data['data']
                if (oauth_data.get('oauthSupported') == True and 
                    oauth_data.get('configured') == True and 
                    oauth_data.get('platformKey') == 'google-search-console'):
                    print("✅ PASS: GSC OAuth status shows configured and supported")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC OAuth status wrong values: {oauth_data}")
            else:
                print(f"❌ FAIL: GSC OAuth status API error: {data.get('error')}")
        else:
            print("❌ FAIL: GSC OAuth status request failed")
            
        # Test 5: GSC Verify Access with fake token
        print("\n📝 Test 5: GSC Verify Access - Fake Token")
        verify_data = {
            "accessToken": "fake_oauth_token_for_testing",
            "tokenType": "Bearer",
            "target": "https://example.com/",
            "role": "owner", 
            "identity": "test@example.com",
            "accessItemType": "NAMED_INVITE"
        }
        response = make_request('POST', '/oauth/google-search-console/verify-access', verify_data)
        
        # Should return success=false in response for fake token, or error from Google API
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success') and not data['data'].get('verified'):
                print("✅ PASS: GSC verify access properly handles fake token - verification failed as expected")
                tests_passed += 1
            elif not data.get('success'):
                print("✅ PASS: GSC verify access properly handles fake token with error")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GSC verify access unexpectedly passed with fake token: {data}")
        else:
            print(f"❌ FAIL: GSC verify access should return 200, got: {response.status_code if response else 'No response'}")
            
        # Test 6: GSC Grant Access (should fail with manual instructions)
        print("\n📝 Test 6: GSC Grant Access - Should Return Manual Instructions") 
        grant_data = {
            "accessToken": "fake_oauth_token_for_testing",
            "tokenType": "Bearer",
            "target": "https://example.com/",
            "role": "owner",
            "identity": "test@example.com", 
            "accessItemType": "NAMED_INVITE"
        }
        response = make_request('POST', '/oauth/google-search-console/grant-access', grant_data)
        
        # Should return error with manual instructions or 501
        if response and response.status_code == 501:
            print("✅ PASS: GSC grant access properly returns 501 (not supported)")
            tests_passed += 1
        elif response and response.status_code == 200:
            data = response.json()
            if not data.get('success') and ('manual' in data.get('error', '').lower() or 
                                            'programmatic' in data.get('error', '').lower()):
                print("✅ PASS: GSC grant access properly returns manual instructions")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GSC grant access unexpected success: {data}")
        else:
            print(f"❌ FAIL: GSC grant access should fail with manual instructions, got: {response.status_code if response else 'No response'}")
            
    except Exception as e:
        print(f"❌ FAIL: Exception during GSC capabilities tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 GSC Capabilities Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_gsc_additional_endpoints():
    """Test additional GSC plugin endpoints"""
    print("\n" + "="*80)
    print("🔍 TESTING GSC ADDITIONAL ENDPOINTS")
    print("="*80)
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: GSC Verify Access - Missing Fields
        print("\n📝 Test 1: GSC Verify Access - Missing Required Fields")
        verify_data_incomplete = {
            "accessItemType": "NAMED_INVITE"
            # Missing auth, target, role, identity
        }
        response = make_request('POST', '/oauth/google-search-console/verify-access', verify_data_incomplete)
        
        if response and response.status_code == 400:
            print("✅ PASS: GSC verify access properly rejects missing required fields")
            tests_passed += 1
        else:
            print(f"❌ FAIL: GSC verify access should return 400 for missing fields, got: {response.status_code if response else 'No response'}")
            
        # Test 2: GSC Verify Access - SHARED_ACCOUNT type
        print("\n📝 Test 2: GSC Verify Access - SHARED_ACCOUNT Type")
        verify_shared_data = {
            "accessToken": "fake_oauth_token_for_testing",
            "tokenType": "Bearer",
            "target": "https://example.com/",
            "role": "owner",
            "identity": "test@example.com",
            "accessItemType": "SHARED_ACCOUNT"
        }
        response = make_request('POST', '/oauth/google-search-console/verify-access', verify_shared_data)
        
        # Should return error for SHARED_ACCOUNT
        if response and response.status_code == 501:
            print("✅ PASS: GSC verify access properly returns 501 for SHARED_ACCOUNT (not supported)")
            tests_passed += 1
        elif response and response.status_code == 200:
            data = response.json()
            if not data.get('success') and ('shared account' in data.get('error', '').lower() or 
                                           'cannot be verified' in data.get('error', '').lower()):
                print("✅ PASS: GSC verify access properly rejects SHARED_ACCOUNT")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GSC verify access unexpected response for SHARED_ACCOUNT: {data}")
        else:
            print(f"❌ FAIL: GSC verify access should handle SHARED_ACCOUNT properly, got: {response.status_code if response else 'No response'}")
            
        # Test 3: GSC Discover Targets - Fake Token
        print("\n📝 Test 3: GSC Discover Targets - Fake Token")
        discover_data = {
            "accessToken": "fake_oauth_token_for_testing",
            "tokenType": "Bearer"
        }
        response = make_request('POST', '/oauth/google-search-console/discover-targets', discover_data)
        
        # Should return error from Google API for fake token or 501 if not configured
        if response and response.status_code == 501:
            print("✅ PASS: GSC discover targets properly returns 501 (not configured/supported)")
            tests_passed += 1
        elif response and response.status_code == 200:
            data = response.json()
            if not data.get('success'):
                print("✅ PASS: GSC discover targets properly handles fake token with error")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GSC discover targets unexpectedly succeeded with fake token: {data}")
        else:
            print(f"❌ FAIL: GSC discover targets should handle fake token properly, got: {response.status_code if response else 'No response'}")
            
        # Test 4: GSC Discover Targets - Missing Token
        print("\n📝 Test 4: GSC Discover Targets - Missing Token")
        discover_data_empty = {}  # No auth token
        response = make_request('POST', '/oauth/google-search-console/discover-targets', discover_data_empty)
        
        if response and response.status_code == 400:
            print("✅ PASS: GSC discover targets properly rejects missing token")
            tests_passed += 1
        else:
            print(f"❌ FAIL: GSC discover targets should reject missing token, got: {response.status_code if response else 'No response'}")
            
    except Exception as e:
        print(f"❌ FAIL: Exception during GSC additional endpoint tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 GSC Additional Endpoint Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def main():
    """Run all Target Discovery, Save Target API, and GSC Plugin tests"""
    print("🚀 STARTING COMPREHENSIVE BACKEND API TESTING")
    print(f"Testing against: {BASE_URL}")
    
    total_passed = 0
    total_tests = 0
    
    # Test 1: Save Target Endpoint
    passed, tests = test_save_target_endpoint()
    total_passed += passed
    total_tests += tests
    
    # Test 2: Target Discovery Endpoint  
    passed, tests = test_target_discovery_endpoint()
    total_passed += passed
    total_tests += tests
    
    # Test 3: Regression Testing
    passed, tests = test_regression_onboarding_endpoints()
    total_passed += passed
    total_tests += tests
    
    # Test 4: GSC Capabilities Testing
    passed, tests = test_gsc_capabilities()
    total_passed += passed
    total_tests += tests
    
    # Test 5: GSC Additional Endpoints Testing
    passed, tests = test_gsc_additional_endpoints()
    total_passed += passed
    total_tests += tests
    
    # Final Results
    print("\n" + "="*80)
    print("🎯 FINAL TEST RESULTS")
    print("="*80)
    print(f"✅ PASSED: {total_passed}/{total_tests} tests")
    print(f"❌ FAILED: {total_tests - total_passed}/{total_tests} tests")
    
    success_rate = (total_passed / total_tests) * 100 if total_tests > 0 else 0
    print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 COMPREHENSIVE BACKEND API TESTING COMPLETED SUCCESSFULLY!")
        print("🔥 GSC PLUGIN TESTING INCLUDED - OAuth, verifyAccess, grantAccess all tested!")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    return total_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)