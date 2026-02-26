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
            'verify': False
        }
        
        if method.upper() == 'GET':
            if params:
                kwargs['params'] = params
            response = requests.get(url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, **kwargs)
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed for {url}: {e}")
        return None

def test_existing_capabilities_regression():
    """Test that existing capabilities endpoints still work"""
    print("🔧 TESTING EXISTING CAPABILITIES ENDPOINTS REGRESSION")
    print("="*60)
    
    tests_passed = 0
    total_tests = 6
    
    test_cases = [
        {
            "name": "GA4 Plugin Capabilities - All Access Types",
            "endpoint": "/plugins/ga4/capabilities",
            "check": lambda data: ("NAMED_INVITE" in data['data']['accessTypeCapabilities'] and 
                                 "GROUP_ACCESS" in data['data']['accessTypeCapabilities'] and 
                                 "SHARED_ACCOUNT" in data['data']['accessTypeCapabilities'])
        },
        {
            "name": "GA4 SHARED_ACCOUNT Default Capabilities",
            "endpoint": "/plugins/ga4/capabilities/SHARED_ACCOUNT", 
            "check": lambda data: (data['data']['capabilities']['clientOAuthSupported'] == False and
                                 data['data']['capabilities']['canGrantAccess'] == False and
                                 data['data']['capabilities']['canVerifyAccess'] == False and
                                 data['data']['capabilities']['requiresEvidenceUpload'] == True)
        },
        {
            "name": "GTM Plugin Capabilities - All Access Types",
            "endpoint": "/plugins/gtm/capabilities",
            "check": lambda data: ("NAMED_INVITE" in data['data']['accessTypeCapabilities'] and 
                                 "GROUP_ACCESS" in data['data']['accessTypeCapabilities'] and 
                                 "SHARED_ACCOUNT" in data['data']['accessTypeCapabilities'])
        },
        {
            "name": "GTM SHARED_ACCOUNT Default Capabilities",
            "endpoint": "/plugins/gtm/capabilities/SHARED_ACCOUNT",
            "check": lambda data: (data['data']['capabilities']['clientOAuthSupported'] == False and
                                 data['data']['capabilities']['canGrantAccess'] == False and
                                 data['data']['capabilities']['canVerifyAccess'] == False and
                                 data['data']['capabilities']['requiresEvidenceUpload'] == True)
        },
        {
            "name": "GSC Plugin Capabilities - All Access Types", 
            "endpoint": "/plugins/google-search-console/capabilities",
            "check": lambda data: ("NAMED_INVITE" in data['data']['accessTypeCapabilities'] and
                                 "SHARED_ACCOUNT" in data['data']['accessTypeCapabilities'])
        },
        {
            "name": "GSC NAMED_INVITE Capabilities",
            "endpoint": "/plugins/google-search-console/capabilities/NAMED_INVITE",
            "check": lambda data: (data['data']['capabilities']['clientOAuthSupported'] == True and
                                 data['data']['capabilities']['canGrantAccess'] == False and
                                 data['data']['capabilities']['canVerifyAccess'] == True and
                                 data['data']['capabilities']['requiresEvidenceUpload'] == False)
        }
    ]
    
    try:
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 Test {i}/{total_tests}: {test_case['name']}")
            
            response = make_request('GET', test_case['endpoint'])
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    if test_case['check'](data):
                        print("✅ PASS: Response matches expected structure/values")
                        tests_passed += 1
                    else:
                        print(f"❌ FAIL: Response validation failed")
                        print(f"   Data: {data}")
                else:
                    print(f"❌ FAIL: API error: {data.get('error')}")
            else:
                print(f"❌ FAIL: Request failed: {response.status_code if response else 'No response'}")
                
    except Exception as e:
        print(f"❌ FAIL: Exception during testing: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Existing Capabilities Regression: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_oauth_verify_grant_gates():
    """Test OAuth verify/grant access gates with config context"""
    print("\n🛡️  TESTING OAUTH VERIFY/GRANT ACCESS GATES")
    print("="*60)
    
    tests_passed = 0
    total_tests = 8
    
    fake_token = "fake_oauth_token_for_testing_12345"
    
    test_cases = [
        {
            "name": "GA4 Verify Access - SHARED_ACCOUNT + AGENCY_OWNED (Should be allowed)",
            "endpoint": "/oauth/ga4/verify-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "123456789",
                "role": "editor",
                "identity": "test@agency.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE"
            },
            "expect_allowed": True
        },
        {
            "name": "GA4 Verify Access - SHARED_ACCOUNT + CLIENT_OWNED (Should reject with 501)",
            "endpoint": "/oauth/ga4/verify-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer", 
                "target": "123456789",
                "role": "editor",
                "identity": "test@client.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "CLIENT_OWNED"
            },
            "expect_allowed": False
        },
        {
            "name": "GA4 Grant Access - SHARED_ACCOUNT + AGENCY_OWNED (Should be allowed)",
            "endpoint": "/oauth/ga4/grant-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "123456789", 
                "role": "editor",
                "identity": "test@agency.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE"
            },
            "expect_allowed": True
        },
        {
            "name": "GA4 Grant Access - SHARED_ACCOUNT + CLIENT_OWNED (Should reject with 501)",
            "endpoint": "/oauth/ga4/grant-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "123456789",
                "role": "editor", 
                "identity": "test@client.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "CLIENT_OWNED"
            },
            "expect_allowed": False
        },
        {
            "name": "GTM Verify Access - SHARED_ACCOUNT + AGENCY_OWNED (Should be allowed)",
            "endpoint": "/oauth/gtm/verify-access", 
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "123456/GTM-ABC123",
                "role": "edit",
                "identity": "test@agency.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE"
            },
            "expect_allowed": True
        },
        {
            "name": "GTM Verify Access - SHARED_ACCOUNT + CLIENT_OWNED (Should reject with 501)",
            "endpoint": "/oauth/gtm/verify-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "123456/GTM-ABC123",
                "role": "edit",
                "identity": "test@client.com", 
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "CLIENT_OWNED"
            },
            "expect_allowed": False
        },
        {
            "name": "GSC Verify Access - SHARED_ACCOUNT + AGENCY_OWNED (Should be allowed)",
            "endpoint": "/oauth/google-search-console/verify-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "https://example.com/",
                "role": "owner",
                "identity": "test@agency.com",
                "accessItemType": "SHARED_ACCOUNT", 
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE"
            },
            "expect_allowed": True
        },
        {
            "name": "GSC Verify Access - SHARED_ACCOUNT + CLIENT_OWNED (Should reject with 501)", 
            "endpoint": "/oauth/google-search-console/verify-access",
            "data": {
                "accessToken": fake_token,
                "tokenType": "Bearer",
                "target": "https://example.com/",
                "role": "owner",
                "identity": "test@client.com",
                "accessItemType": "SHARED_ACCOUNT",
                "pamOwnership": "CLIENT_OWNED"
            },
            "expect_allowed": False
        }
    ]
    
    try:
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n📝 Test {i}/{total_tests}: {test_case['name']}")
            
            response = make_request('POST', test_case['endpoint'], test_case['data'])
            
            if response:
                if test_case['expect_allowed']:
                    # Should NOT return 501 "not supported"
                    if response.status_code == 501:
                        data = response.json()
                        error_msg = data.get('error', '').lower()
                        if 'does not support' in error_msg or 'not supported' in error_msg:
                            print(f"❌ FAIL: Wrongly rejected AGENCY_OWNED config with 501: {data.get('error')}")
                        else:
                            print("✅ PASS: Allowed AGENCY_OWNED config (non-501 error)")
                            tests_passed += 1
                    else:
                        # 400/401 expected for fake token
                        print(f"✅ PASS: Allowed AGENCY_OWNED config (status: {response.status_code})")
                        tests_passed += 1
                else:
                    # Should return 501 "not supported" for CLIENT_OWNED
                    if response.status_code == 501:
                        data = response.json()
                        error_msg = data.get('error', '').lower()
                        if 'does not support' in error_msg or 'not supported' in error_msg:
                            print("✅ PASS: Correctly rejected CLIENT_OWNED with 501")
                            tests_passed += 1
                        else:
                            print(f"❌ FAIL: Wrong error for CLIENT_OWNED: {data.get('error')}")
                    else:
                        print(f"❌ FAIL: Should reject CLIENT_OWNED with 501, got: {response.status_code}")
                        try:
                            print(f"   Response: {response.json()}")
                        except:
                            print(f"   Response text: {response.text}")
            else:
                print("❌ FAIL: Request failed completely")
                
    except Exception as e:
        print(f"❌ FAIL: Exception during testing: {e}")
        traceback.print_exc()
    
    print(f"\n📊 OAuth Gate Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def main():
    """Run all tests for Conditional Capabilities implementation"""
    print("🚀 TESTING CONDITIONAL CAPABILITIES FOR SHARED_ACCOUNT (PAM)")
    print(f"Testing against: {BASE_URL}")
    
    total_passed = 0
    total_tests = 0
    
    # Test 1: Existing Capabilities Regression
    passed, tests = test_existing_capabilities_regression()
    total_passed += passed
    total_tests += tests
    
    # Test 2: OAuth Verify/Grant Access Gates
    passed, tests = test_oauth_verify_grant_gates()
    total_passed += passed
    total_tests += tests
    
    # Final Results
    print("\n" + "="*60)
    print("🎯 CONDITIONAL CAPABILITIES TEST RESULTS")
    print("="*60)
    print(f"✅ PASSED: {total_passed}/{total_tests} tests")
    print(f"❌ FAILED: {total_tests - total_passed}/{total_tests} tests")
    
    success_rate = (total_passed / total_tests) * 100 if total_tests > 0 else 0
    print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 CONDITIONAL CAPABILITIES BACKEND TESTING COMPLETED SUCCESSFULLY!")
    elif success_rate >= 70:
        print("⚠️  Most tests passed but some issues found.")
    else:
        print("❌ Multiple failures detected - review needed.")
    
    return total_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)