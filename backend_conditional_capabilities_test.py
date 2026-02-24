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
BASE_URL = "https://festive-thompson-4.preview.emergentagent.com"
API_BASE = urljoin(BASE_URL, "/api/")

def make_request(method, endpoint, data=None, headers=None, params=None):
    """Make HTTP request with proper error handling"""
    url = urljoin(API_BASE, endpoint.lstrip('/'))
    default_headers = {'Content-Type': 'application/json'}
    if headers:
        default_headers.update(headers)
    
    try:
        kwargs = {
            'headers': default_headers,
            'timeout': 30,
            'verify': False  # Disable SSL verification for testing
        }
        
        if method.upper() == 'GET':
            if params:
                kwargs['params'] = params
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

# ═══════════════════════════════════════════════════════════════════════════════
# CONDITIONAL CAPABILITIES TESTS - NEW EFFECTIVE-CAPABILITIES ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

def test_ga4_effective_capabilities():
    """Test GA4 effective capabilities endpoint with different PAM configurations"""
    print("\n" + "="*80)
    print("🔥 TESTING GA4 EFFECTIVE CAPABILITIES WITH CONDITIONAL RULES")
    print("="*80)
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: GA4 SHARED_ACCOUNT with no config (should return evidence required)
        print("\n📝 Test 1: GA4 SHARED_ACCOUNT - No Config (Default)")
        params = {
            'accessItemType': 'SHARED_ACCOUNT'
        }
        response = make_request('GET', '/plugins/ga4/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Default should be evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GA4 SHARED_ACCOUNT default = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 SHARED_ACCOUNT default capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GA4 effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 2: GA4 SHARED_ACCOUNT + pamOwnership=AGENCY_OWNED + identityPurpose=HUMAN_INTERACTIVE
        print("\n📝 Test 2: GA4 SHARED_ACCOUNT - AGENCY_OWNED + HUMAN_INTERACTIVE")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'AGENCY_OWNED',
            'identityPurpose': 'HUMAN_INTERACTIVE'
        }
        response = make_request('GET', '/plugins/ga4/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should enable OAuth+verify
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == True and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GA4 SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE = OAuth+verify enabled")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GA4 effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 3: GA4 SHARED_ACCOUNT + pamOwnership=CLIENT_OWNED
        print("\n📝 Test 3: GA4 SHARED_ACCOUNT - CLIENT_OWNED")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'CLIENT_OWNED'
        }
        response = make_request('GET', '/plugins/ga4/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should return evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GA4 SHARED_ACCOUNT CLIENT_OWNED = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 SHARED_ACCOUNT CLIENT_OWNED capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GA4 effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 4: GA4 NAMED_INVITE (should be unchanged)
        print("\n📝 Test 4: GA4 NAMED_INVITE - Should be unchanged")
        params = {
            'accessItemType': 'NAMED_INVITE'
        }
        response = make_request('GET', '/plugins/ga4/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # NAMED_INVITE should always have OAuth + grant + verify
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == True and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GA4 NAMED_INVITE unchanged = OAuth + grant + verify")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 NAMED_INVITE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GA4 effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 effective capabilities request failed: {response.status_code if response else 'No response'}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during GA4 effective capabilities tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 GA4 Effective Capabilities Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_gtm_effective_capabilities():
    """Test GTM effective capabilities endpoint with different PAM configurations"""
    print("\n" + "="*80)
    print("🔥 TESTING GTM EFFECTIVE CAPABILITIES WITH CONDITIONAL RULES") 
    print("="*80)
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: GTM SHARED_ACCOUNT with no config (should return evidence required)
        print("\n📝 Test 1: GTM SHARED_ACCOUNT - No Config (Default)")
        params = {
            'accessItemType': 'SHARED_ACCOUNT'
        }
        response = make_request('GET', '/plugins/gtm/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Default should be evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GTM SHARED_ACCOUNT default = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM SHARED_ACCOUNT default capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GTM effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 2: GTM SHARED_ACCOUNT + pamOwnership=AGENCY_OWNED + identityPurpose=HUMAN_INTERACTIVE
        print("\n📝 Test 2: GTM SHARED_ACCOUNT - AGENCY_OWNED + HUMAN_INTERACTIVE")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'AGENCY_OWNED',
            'identityPurpose': 'HUMAN_INTERACTIVE'
        }
        response = make_request('GET', '/plugins/gtm/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should enable OAuth+grant+verify
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == True and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GTM SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE = OAuth+grant+verify enabled")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GTM effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 3: GTM SHARED_ACCOUNT + pamOwnership=CLIENT_OWNED
        print("\n📝 Test 3: GTM SHARED_ACCOUNT - CLIENT_OWNED")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'CLIENT_OWNED'
        }
        response = make_request('GET', '/plugins/gtm/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should return evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GTM SHARED_ACCOUNT CLIENT_OWNED = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM SHARED_ACCOUNT CLIENT_OWNED capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GTM effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 4: GTM NAMED_INVITE (should be unchanged)  
        print("\n📝 Test 4: GTM NAMED_INVITE - Should be unchanged")
        params = {
            'accessItemType': 'NAMED_INVITE'
        }
        response = make_request('GET', '/plugins/gtm/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # NAMED_INVITE should have OAuth + grant + verify
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == True and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GTM NAMED_INVITE unchanged = OAuth + grant + verify")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM NAMED_INVITE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GTM effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM effective capabilities request failed: {response.status_code if response else 'No response'}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during GTM effective capabilities tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 GTM Effective Capabilities Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_gsc_effective_capabilities():
    """Test GSC effective capabilities endpoint with different PAM configurations"""
    print("\n" + "="*80)
    print("🔥 TESTING GSC EFFECTIVE CAPABILITIES WITH CONDITIONAL RULES")
    print("="*80)
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: GSC SHARED_ACCOUNT with no config (should return evidence required)
        print("\n📝 Test 1: GSC SHARED_ACCOUNT - No Config (Default)")
        params = {
            'accessItemType': 'SHARED_ACCOUNT'
        }
        response = make_request('GET', '/plugins/google-search-console/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Default should be evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GSC SHARED_ACCOUNT default = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC SHARED_ACCOUNT default capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GSC effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 2: GSC SHARED_ACCOUNT + pamOwnership=AGENCY_OWNED + identityPurpose=HUMAN_INTERACTIVE
        print("\n📝 Test 2: GSC SHARED_ACCOUNT - AGENCY_OWNED + HUMAN_INTERACTIVE")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'AGENCY_OWNED',
            'identityPurpose': 'HUMAN_INTERACTIVE'
        }
        response = make_request('GET', '/plugins/google-search-console/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should enable OAuth+verify (GSC can't grant access programmatically)
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GSC SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE = OAuth+verify enabled (no grant)")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC SHARED_ACCOUNT AGENCY_OWNED+HUMAN_INTERACTIVE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GSC effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 3: GSC SHARED_ACCOUNT + pamOwnership=CLIENT_OWNED
        print("\n📝 Test 3: GSC SHARED_ACCOUNT - CLIENT_OWNED")
        params = {
            'accessItemType': 'SHARED_ACCOUNT',
            'pamOwnership': 'CLIENT_OWNED'
        }
        response = make_request('GET', '/plugins/google-search-console/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # Should return evidence required
                if (effective_caps.get('clientOAuthSupported') == False and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == False and 
                    effective_caps.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GSC SHARED_ACCOUNT CLIENT_OWNED = evidence required")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC SHARED_ACCOUNT CLIENT_OWNED capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GSC effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC effective capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 4: GSC NAMED_INVITE (should be unchanged)
        print("\n📝 Test 4: GSC NAMED_INVITE - Should be unchanged")
        params = {
            'accessItemType': 'NAMED_INVITE'
        }
        response = make_request('GET', '/plugins/google-search-console/effective-capabilities', params)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                effective_caps = data['data']['effectiveCapabilities']
                # NAMED_INVITE should have OAuth + verify (GSC can't grant access)
                if (effective_caps.get('clientOAuthSupported') == True and 
                    effective_caps.get('canGrantAccess') == False and 
                    effective_caps.get('canVerifyAccess') == True and 
                    effective_caps.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GSC NAMED_INVITE unchanged = OAuth + verify (no grant)")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC NAMED_INVITE capabilities wrong: {effective_caps}")
            else:
                print(f"❌ FAIL: GSC effective capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC effective capabilities request failed: {response.status_code if response else 'No response'}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during GSC effective capabilities tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 GSC Effective Capabilities Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY EXISTING CAPABILITIES ENDPOINTS STILL WORK
# ═══════════════════════════════════════════════════════════════════════════════

def test_existing_capabilities_endpoints():
    """Test that existing capabilities endpoints still work correctly"""
    print("\n" + "="*80)
    print("🔧 TESTING EXISTING CAPABILITIES ENDPOINTS REGRESSION")
    print("="*80)
    
    tests_passed = 0
    total_tests = 6
    
    try:
        # Test 1: GET /api/plugins/ga4/capabilities → should return accessTypeCapabilities for all types
        print("\n📝 Test 1: GA4 Plugin Capabilities - All Access Types")
        response = make_request('GET', '/plugins/ga4/capabilities')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                access_type_caps = data['data']['accessTypeCapabilities']
                # Should have NAMED_INVITE, GROUP_ACCESS, SHARED_ACCOUNT
                if ('NAMED_INVITE' in access_type_caps and 
                    'GROUP_ACCESS' in access_type_caps and 
                    'SHARED_ACCOUNT' in access_type_caps):
                    print("✅ PASS: GA4 plugin capabilities contains all access types")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 plugin capabilities missing access types: {list(access_type_caps.keys())}")
            else:
                print(f"❌ FAIL: GA4 plugin capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 plugin capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 2: GET /api/plugins/ga4/capabilities/SHARED_ACCOUNT → should return default capabilities
        print("\n📝 Test 2: GA4 SHARED_ACCOUNT Default Capabilities")
        response = make_request('GET', '/plugins/ga4/capabilities/SHARED_ACCOUNT')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                capabilities = data['data']['capabilities']
                # Should return default capabilities (evidence required)
                if (capabilities.get('clientOAuthSupported') == False and 
                    capabilities.get('canGrantAccess') == False and 
                    capabilities.get('canVerifyAccess') == False and 
                    capabilities.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GA4 SHARED_ACCOUNT default capabilities correct")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GA4 SHARED_ACCOUNT default capabilities wrong: {capabilities}")
            else:
                print(f"❌ FAIL: GA4 SHARED_ACCOUNT capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 SHARED_ACCOUNT capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 3: GET /api/plugins/gtm/capabilities → should return accessTypeCapabilities for all types
        print("\n📝 Test 3: GTM Plugin Capabilities - All Access Types")
        response = make_request('GET', '/plugins/gtm/capabilities')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                access_type_caps = data['data']['accessTypeCapabilities']
                # Should have NAMED_INVITE, GROUP_ACCESS, SHARED_ACCOUNT
                if ('NAMED_INVITE' in access_type_caps and 
                    'GROUP_ACCESS' in access_type_caps and 
                    'SHARED_ACCOUNT' in access_type_caps):
                    print("✅ PASS: GTM plugin capabilities contains all access types")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM plugin capabilities missing access types: {list(access_type_caps.keys())}")
            else:
                print(f"❌ FAIL: GTM plugin capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM plugin capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 4: GET /api/plugins/gtm/capabilities/SHARED_ACCOUNT → should return default capabilities
        print("\n📝 Test 4: GTM SHARED_ACCOUNT Default Capabilities")
        response = make_request('GET', '/plugins/gtm/capabilities/SHARED_ACCOUNT')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                capabilities = data['data']['capabilities']
                # Should return default capabilities (evidence required)
                if (capabilities.get('clientOAuthSupported') == False and 
                    capabilities.get('canGrantAccess') == False and 
                    capabilities.get('canVerifyAccess') == False and 
                    capabilities.get('requiresEvidenceUpload') == True):
                    print("✅ PASS: GTM SHARED_ACCOUNT default capabilities correct")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GTM SHARED_ACCOUNT default capabilities wrong: {capabilities}")
            else:
                print(f"❌ FAIL: GTM SHARED_ACCOUNT capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM SHARED_ACCOUNT capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 5: GET /api/plugins/google-search-console/capabilities → should return accessTypeCapabilities for all types
        print("\n📝 Test 5: GSC Plugin Capabilities - All Access Types")
        response = make_request('GET', '/plugins/google-search-console/capabilities')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                access_type_caps = data['data']['accessTypeCapabilities']
                # Should have NAMED_INVITE, SHARED_ACCOUNT (GSC doesn't have GROUP_ACCESS)
                if ('NAMED_INVITE' in access_type_caps and 
                    'SHARED_ACCOUNT' in access_type_caps):
                    print("✅ PASS: GSC plugin capabilities contains expected access types")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC plugin capabilities missing access types: {list(access_type_caps.keys())}")
            else:
                print(f"❌ FAIL: GSC plugin capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC plugin capabilities request failed: {response.status_code if response else 'No response'}")
        
        # Test 6: GET /api/plugins/google-search-console/capabilities/NAMED_INVITE
        print("\n📝 Test 6: GSC NAMED_INVITE Capabilities")
        response = make_request('GET', '/plugins/google-search-console/capabilities/NAMED_INVITE')
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('success'):
                capabilities = data['data']['capabilities']
                # Should have OAuth + verify but no grant (GSC API limitation)
                if (capabilities.get('clientOAuthSupported') == True and 
                    capabilities.get('canGrantAccess') == False and 
                    capabilities.get('canVerifyAccess') == True and 
                    capabilities.get('requiresEvidenceUpload') == False):
                    print("✅ PASS: GSC NAMED_INVITE capabilities correct (OAuth + verify, no grant)")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: GSC NAMED_INVITE capabilities wrong: {capabilities}")
            else:
                print(f"❌ FAIL: GSC NAMED_INVITE capabilities API error: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC NAMED_INVITE capabilities request failed: {response.status_code if response else 'No response'}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during existing capabilities regression tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Existing Capabilities Regression Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY GRANT-ACCESS/VERIFY-ACCESS GATES WITH CONFIG CONTEXT 
# ═══════════════════════════════════════════════════════════════════════════════

def test_grant_verify_access_gates():
    """Test grant-access/verify-access endpoints with config context"""
    print("\n" + "="*80)
    print("🛡️  TESTING GRANT/VERIFY ACCESS GATES WITH CONFIG CONTEXT")
    print("="*80)
    
    tests_passed = 0
    total_tests = 8
    
    # Fake token for testing
    fake_token = "fake_oauth_token_for_testing_12345"
    
    try:
        # Test 1: GA4 verify-access with SHARED_ACCOUNT + AGENCY_OWNED config → should be allowed (401/400 but not 501)
        print("\n📝 Test 1: GA4 Verify Access - SHARED_ACCOUNT + AGENCY_OWNED (Should be allowed)")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "editor",
            "identity": "test@agency.com",
            "accessItemType": "SHARED_ACCOUNT",
            # Config context for AGENCY_OWNED
            "pamOwnership": "AGENCY_OWNED",
            "identityPurpose": "HUMAN_INTERACTIVE"
        }
        response = make_request('POST', '/oauth/ga4/verify-access', verify_data)
        
        # Should NOT return 501 "not supported", but could return 400/401 for fake token
        if response:
            if response.status_code == 501:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'does not support' in error_msg or 'not supported' in error_msg:
                    print(f"❌ FAIL: GA4 verify-access wrongly rejected AGENCY_OWNED config with 501: {data.get('error')}")
                else:
                    print("✅ PASS: GA4 verify-access allowed AGENCY_OWNED config (non-501 error)")
                    tests_passed += 1
            else:
                # 400/401 expected for fake token
                print(f"✅ PASS: GA4 verify-access allowed AGENCY_OWNED config (status: {response.status_code})")
                tests_passed += 1
        else:
            print("❌ FAIL: GA4 verify-access request failed completely")
        
        # Test 2: GA4 verify-access with SHARED_ACCOUNT + CLIENT_OWNED config → should return 501 "does not support"
        print("\n📝 Test 2: GA4 Verify Access - SHARED_ACCOUNT + CLIENT_OWNED (Should reject)")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "editor", 
            "identity": "test@client.com",
            "accessItemType": "SHARED_ACCOUNT",
            # Config context for CLIENT_OWNED
            "pamOwnership": "CLIENT_OWNED"
        }
        response = make_request('POST', '/oauth/ga4/verify-access', verify_data)
        
        # Should return 501 "does not support" for CLIENT_OWNED
        if response and response.status_code == 501:
            data = response.json()
            error_msg = data.get('error', '').lower()
            if 'does not support' in error_msg or 'not supported' in error_msg:
                print("✅ PASS: GA4 verify-access correctly rejected CLIENT_OWNED with 501")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GA4 verify-access wrong error for CLIENT_OWNED: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 verify-access should reject CLIENT_OWNED with 501, got: {response.status_code if response else 'No response'}")
        
        # Test 3: GA4 grant-access with SHARED_ACCOUNT + AGENCY_OWNED + HUMAN_INTERACTIVE → should be allowed
        print("\n📝 Test 3: GA4 Grant Access - SHARED_ACCOUNT + AGENCY_OWNED + HUMAN_INTERACTIVE")
        grant_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "editor",
            "identity": "test@agency.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "AGENCY_OWNED",
            "identityPurpose": "HUMAN_INTERACTIVE"
        }
        response = make_request('POST', '/oauth/ga4/grant-access', grant_data)
        
        # Should NOT return 501 "not supported"
        if response:
            if response.status_code == 501:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'does not support' in error_msg:
                    print(f"❌ FAIL: GA4 grant-access wrongly rejected AGENCY_OWNED config: {data.get('error')}")
                else:
                    print("✅ PASS: GA4 grant-access allowed AGENCY_OWNED config")
                    tests_passed += 1
            else:
                # 400/401 expected for fake token
                print(f"✅ PASS: GA4 grant-access allowed AGENCY_OWNED config (status: {response.status_code})")
                tests_passed += 1
        else:
            print("❌ FAIL: GA4 grant-access request failed completely")
        
        # Test 4: GA4 grant-access with SHARED_ACCOUNT + CLIENT_OWNED → should return 501 "does not support"
        print("\n📝 Test 4: GA4 Grant Access - SHARED_ACCOUNT + CLIENT_OWNED")
        grant_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "editor",
            "identity": "test@client.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "CLIENT_OWNED"
        }
        response = make_request('POST', '/oauth/ga4/grant-access', grant_data)
        
        # Should return 501 for CLIENT_OWNED
        if response and response.status_code == 501:
            data = response.json()
            error_msg = data.get('error', '').lower()
            if 'does not support' in error_msg:
                print("✅ PASS: GA4 grant-access correctly rejected CLIENT_OWNED with 501")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GA4 grant-access wrong error for CLIENT_OWNED: {data.get('error')}")
        else:
            print(f"❌ FAIL: GA4 grant-access should reject CLIENT_OWNED with 501, got: {response.status_code if response else 'No response'}")
        
        # Test 5: GTM verify-access with SHARED_ACCOUNT + AGENCY_OWNED → should be allowed
        print("\n📝 Test 5: GTM Verify Access - SHARED_ACCOUNT + AGENCY_OWNED")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer", 
            "target": "123456/GTM-ABC123",
            "role": "edit",
            "identity": "test@agency.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "AGENCY_OWNED",
            "identityPurpose": "HUMAN_INTERACTIVE"
        }
        response = make_request('POST', '/oauth/gtm/verify-access', verify_data)
        
        # Should NOT return 501 for AGENCY_OWNED
        if response:
            if response.status_code == 501:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'does not support' in error_msg:
                    print(f"❌ FAIL: GTM verify-access wrongly rejected AGENCY_OWNED: {data.get('error')}")
                else:
                    print("✅ PASS: GTM verify-access allowed AGENCY_OWNED config")
                    tests_passed += 1
            else:
                print(f"✅ PASS: GTM verify-access allowed AGENCY_OWNED config (status: {response.status_code})")
                tests_passed += 1
        else:
            print("❌ FAIL: GTM verify-access request failed")
        
        # Test 6: GTM verify-access with SHARED_ACCOUNT + CLIENT_OWNED → should return 501
        print("\n📝 Test 6: GTM Verify Access - SHARED_ACCOUNT + CLIENT_OWNED")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "123456/GTM-ABC123",
            "role": "edit",
            "identity": "test@client.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "CLIENT_OWNED"
        }
        response = make_request('POST', '/oauth/gtm/verify-access', verify_data)
        
        # Should return 501 for CLIENT_OWNED
        if response and response.status_code == 501:
            data = response.json()
            error_msg = data.get('error', '').lower()
            if 'does not support' in error_msg:
                print("✅ PASS: GTM verify-access correctly rejected CLIENT_OWNED with 501")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GTM verify-access wrong error for CLIENT_OWNED: {data.get('error')}")
        else:
            print(f"❌ FAIL: GTM verify-access should reject CLIENT_OWNED with 501, got: {response.status_code if response else 'No response'}")
        
        # Test 7: GSC verify-access with SHARED_ACCOUNT + AGENCY_OWNED → should be allowed
        print("\n📝 Test 7: GSC Verify Access - SHARED_ACCOUNT + AGENCY_OWNED")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "https://example.com/",
            "role": "owner",
            "identity": "test@agency.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "AGENCY_OWNED",
            "identityPurpose": "HUMAN_INTERACTIVE"
        }
        response = make_request('POST', '/oauth/google-search-console/verify-access', verify_data)
        
        # Should NOT return 501 for AGENCY_OWNED
        if response:
            if response.status_code == 501:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'does not support' in error_msg:
                    print(f"❌ FAIL: GSC verify-access wrongly rejected AGENCY_OWNED: {data.get('error')}")
                else:
                    print("✅ PASS: GSC verify-access allowed AGENCY_OWNED config")
                    tests_passed += 1
            else:
                print(f"✅ PASS: GSC verify-access allowed AGENCY_OWNED config (status: {response.status_code})")
                tests_passed += 1
        else:
            print("❌ FAIL: GSC verify-access request failed")
        
        # Test 8: GSC verify-access with SHARED_ACCOUNT + CLIENT_OWNED → should return 501
        print("\n📝 Test 8: GSC Verify Access - SHARED_ACCOUNT + CLIENT_OWNED")
        verify_data = {
            "accessToken": fake_token,
            "tokenType": "Bearer",
            "target": "https://example.com/",
            "role": "owner",
            "identity": "test@client.com",
            "accessItemType": "SHARED_ACCOUNT",
            "pamOwnership": "CLIENT_OWNED"
        }
        response = make_request('POST', '/oauth/google-search-console/verify-access', verify_data)
        
        # Should return 501 for CLIENT_OWNED
        if response and response.status_code == 501:
            data = response.json()
            error_msg = data.get('error', '').lower()
            if 'does not support' in error_msg:
                print("✅ PASS: GSC verify-access correctly rejected CLIENT_OWNED with 501")
                tests_passed += 1
            else:
                print(f"❌ FAIL: GSC verify-access wrong error for CLIENT_OWNED: {data.get('error')}")
        else:
            print(f"❌ FAIL: GSC verify-access should reject CLIENT_OWNED with 501, got: {response.status_code if response else 'No response'}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during grant/verify access gate tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Grant/Verify Access Gate Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN TEST FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Run comprehensive Conditional Capabilities testing"""
    print("🚀 STARTING COMPREHENSIVE CONDITIONAL CAPABILITIES TESTING")
    print(f"Testing against: {BASE_URL}")
    
    total_passed = 0
    total_tests = 0
    
    # Test 1: GA4 Effective Capabilities
    passed, tests = test_ga4_effective_capabilities()
    total_passed += passed
    total_tests += tests
    
    # Test 2: GTM Effective Capabilities  
    passed, tests = test_gtm_effective_capabilities()
    total_passed += passed
    total_tests += tests
    
    # Test 3: GSC Effective Capabilities
    passed, tests = test_gsc_effective_capabilities()
    total_passed += passed
    total_tests += tests
    
    # Test 4: Existing Capabilities Endpoints Regression
    passed, tests = test_existing_capabilities_endpoints()
    total_passed += passed
    total_tests += tests
    
    # Test 5: Grant/Verify Access Gates with Config Context
    passed, tests = test_grant_verify_access_gates()
    total_passed += passed
    total_tests += tests
    
    # Final Results
    print("\n" + "="*80)
    print("🎯 CONDITIONAL CAPABILITIES TEST RESULTS")
    print("="*80)
    print(f"✅ PASSED: {total_passed}/{total_tests} tests")
    print(f"❌ FAILED: {total_tests - total_passed}/{total_tests} tests")
    
    success_rate = (total_passed / total_tests) * 100 if total_tests > 0 else 0
    print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 CONDITIONAL CAPABILITIES TESTING COMPLETED SUCCESSFULLY!")
        print("✨ NEW EFFECTIVE-CAPABILITIES ENDPOINT WORKING CORRECTLY!")
        print("🔥 PAM CONFIG CONTEXT CONDITIONAL RULES IMPLEMENTED PERFECTLY!")
    elif success_rate >= 80:
        print("⚠️  Most tests passed but some issues found. Review implementation.")
    else:
        print("❌ Multiple failures detected. Major issues need to be addressed.")
    
    return total_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)