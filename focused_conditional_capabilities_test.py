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
BASE_URL = "https://ga4-dual-grant.preview.emergentagent.com"
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
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed for {url}: {e}")
        return None

def test_conditional_capabilities_focused():
    """Focused test of the NEW effective-capabilities endpoint"""
    print("🎯 TESTING NEW EFFECTIVE-CAPABILITIES ENDPOINT")
    print("="*60)
    
    tests_passed = 0
    total_tests = 12
    
    # Test scenarios based on review_request
    test_scenarios = [
        # GA4 Tests
        {
            "platform": "ga4",
            "name": "GA4 SHARED_ACCOUNT (No config) → evidence required",
            "params": {"accessItemType": "SHARED_ACCOUNT"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "ga4", 
            "name": "GA4 SHARED_ACCOUNT + AGENCY_OWNED + HUMAN_INTERACTIVE → OAuth+verify enabled",
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "AGENCY_OWNED", "identityPurpose": "HUMAN_INTERACTIVE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": True, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        },
        {
            "platform": "ga4",
            "name": "GA4 SHARED_ACCOUNT + CLIENT_OWNED → evidence required", 
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "CLIENT_OWNED"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "ga4",
            "name": "GA4 NAMED_INVITE → unchanged (OAuth + grant + verify)",
            "params": {"accessItemType": "NAMED_INVITE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": True, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        },
        # GTM Tests
        {
            "platform": "gtm",
            "name": "GTM SHARED_ACCOUNT (No config) → evidence required",
            "params": {"accessItemType": "SHARED_ACCOUNT"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "gtm", 
            "name": "GTM SHARED_ACCOUNT + AGENCY_OWNED + HUMAN_INTERACTIVE → OAuth+grant+verify enabled",
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "AGENCY_OWNED", "identityPurpose": "HUMAN_INTERACTIVE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": True, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        },
        {
            "platform": "gtm",
            "name": "GTM SHARED_ACCOUNT + CLIENT_OWNED → evidence required",
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "CLIENT_OWNED"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "gtm",
            "name": "GTM NAMED_INVITE → unchanged (OAuth + grant + verify)",
            "params": {"accessItemType": "NAMED_INVITE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": True, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        },
        # GSC Tests
        {
            "platform": "google-search-console",
            "name": "GSC SHARED_ACCOUNT (No config) → evidence required",
            "params": {"accessItemType": "SHARED_ACCOUNT"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "google-search-console", 
            "name": "GSC SHARED_ACCOUNT + AGENCY_OWNED + HUMAN_INTERACTIVE → OAuth+verify (no grant)",
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "AGENCY_OWNED", "identityPurpose": "HUMAN_INTERACTIVE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": False, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        },
        {
            "platform": "google-search-console",
            "name": "GSC SHARED_ACCOUNT + CLIENT_OWNED → evidence required",
            "params": {"accessItemType": "SHARED_ACCOUNT", "pamOwnership": "CLIENT_OWNED"},
            "expected": {"clientOAuthSupported": False, "canGrantAccess": False, "canVerifyAccess": False, "requiresEvidenceUpload": True}
        },
        {
            "platform": "google-search-console",
            "name": "GSC NAMED_INVITE → unchanged (OAuth + verify, no grant)",
            "params": {"accessItemType": "NAMED_INVITE"},
            "expected": {"clientOAuthSupported": True, "canGrantAccess": False, "canVerifyAccess": True, "requiresEvidenceUpload": False}
        }
    ]
    
    try:
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📝 Test {i}/{total_tests}: {scenario['name']}")
            
            response = make_request('GET', f"/plugins/{scenario['platform']}/effective-capabilities", params=scenario['params'])
            
            if response and response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    effective_caps = data['data']['effectiveCapabilities']
                    expected = scenario['expected']
                    
                    # Check all expected capabilities
                    all_match = True
                    mismatches = []
                    
                    for key, expected_value in expected.items():
                        actual_value = effective_caps.get(key)
                        if actual_value != expected_value:
                            all_match = False
                            mismatches.append(f"{key}: expected {expected_value}, got {actual_value}")
                    
                    if all_match:
                        print(f"✅ PASS: All capabilities match expected values")
                        print(f"   Capabilities: {effective_caps}")
                        tests_passed += 1
                    else:
                        print(f"❌ FAIL: Capability mismatches:")
                        for mismatch in mismatches:
                            print(f"     - {mismatch}")
                        print(f"   Full response: {effective_caps}")
                else:
                    print(f"❌ FAIL: API error: {data.get('error')}")
            else:
                print(f"❌ FAIL: Request failed: {response.status_code if response else 'No response'}")
                if response:
                    try:
                        print(f"   Response: {response.json()}")
                    except:
                        print(f"   Response text: {response.text}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during testing: {e}")
        traceback.print_exc()
    
    print(f"\n📊 FINAL RESULTS: {tests_passed}/{total_tests} PASSED")
    success_rate = (tests_passed / total_tests) * 100 if total_tests > 0 else 0
    print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 CONDITIONAL CAPABILITIES IMPLEMENTATION IS WORKING PERFECTLY!")
    elif success_rate >= 70:
        print("⚠️  Most tests passed, minor issues to address")
    else:
        print("❌ Multiple failures - implementation needs review")
    
    return tests_passed == total_tests

if __name__ == "__main__":
    success = test_conditional_capabilities_focused()
    sys.exit(0 if success else 1)