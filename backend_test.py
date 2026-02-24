#!/usr/bin/env python3
"""
Backend Testing Script for GTM and Google Ads Grant Access Functionality
Testing the newly implemented grantAccess endpoints for GTM and Google Ads plugins.
"""

import sys
import json
import requests
import traceback
from urllib.parse import quote

# Test configuration
BASE_URL = "https://oauth-refactor.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test_result(test_name, success, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if success:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    
    print(result)
    test_results.append({
        "test": test_name,
        "success": success,
        "details": details
    })

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with error handling"""
    try:
        url = f"{API_BASE}{endpoint}"
        print(f"  → {method} {url}")
        
        if headers is None:
            headers = {"Content-Type": "application/json"}
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"  ← {response.status_code} {response.reason}")
        
        try:
            response_data = response.json()
        except:
            response_data = {"text": response.text}
        
        return {
            "status_code": response.status_code,
            "data": response_data,
            "success": response.status_code < 400
        }
    
    except Exception as e:
        print(f"  ← ERROR: {str(e)}")
        return {
            "status_code": 0,
            "data": {"error": str(e)},
            "success": False
        }

def test_gtm_capabilities():
    """Test GTM capability endpoints"""
    print("\n=== GTM CAPABILITY TESTING ===")
    
    # Test 1: GET /api/plugins/gtm/capabilities/NAMED_INVITE
    test_name = "GTM NAMED_INVITE capabilities"
    try:
        response = make_request("GET", "/plugins/gtm/capabilities/NAMED_INVITE")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == True:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=true, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/plugins/gtm/capabilities/GROUP_ACCESS
    test_name = "GTM GROUP_ACCESS capabilities"
    try:
        response = make_request("GET", "/plugins/gtm/capabilities/GROUP_ACCESS")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == True:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=true, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 3: GET /api/plugins/gtm/capabilities/SHARED_ACCOUNT
    test_name = "GTM SHARED_ACCOUNT capabilities"
    try:
        response = make_request("GET", "/plugins/gtm/capabilities/SHARED_ACCOUNT")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == False:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=false, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")

def test_gtm_grant_access():
    """Test GTM grant access endpoint"""
    print("\n=== GTM GRANT ACCESS TESTING ===")
    
    # Test 1: Missing required fields (should return 400)
    test_name = "GTM grant access - missing required fields"
    try:
        payload = {"accessToken": "fake_token"}  # Missing other required fields
        response = make_request("POST", "/oauth/gtm/grant-access", payload)
        
        if response["status_code"] == 400:
            log_test_result(test_name, True, "Correctly rejected incomplete request")
        else:
            log_test_result(test_name, False, f"Expected 400, got {response['status_code']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: Fake access token (should return appropriate error from Google API)
    test_name = "GTM grant access - fake access token"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "admin",
            "identity": "test@example.com",
            "accessItemType": "NAMED_INVITE"
        }
        response = make_request("POST", "/oauth/gtm/grant-access", payload)
        
        # Should return error (400-499 range) due to invalid token
        if 400 <= response["status_code"] < 500:
            log_test_result(test_name, True, f"HTTP {response['status_code']}: {response['data'].get('error', 'Unknown error')}")
        else:
            log_test_result(test_name, False, f"Expected 4xx error, got {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 3: SHARED_ACCOUNT type (should return 501)
    test_name = "GTM grant access - SHARED_ACCOUNT type"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "admin",
            "identity": "test@example.com",
            "accessItemType": "SHARED_ACCOUNT"
        }
        response = make_request("POST", "/oauth/gtm/grant-access", payload)
        
        if response["status_code"] == 501:
            log_test_result(test_name, True, f"Correctly rejected SHARED_ACCOUNT: {response['data'].get('error', '')}")
        else:
            log_test_result(test_name, False, f"Expected 501, got {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")

def test_google_ads_capabilities():
    """Test Google Ads capability endpoints"""
    print("\n=== GOOGLE ADS CAPABILITY TESTING ===")
    
    # Test 1: GET /api/plugins/google-ads/capabilities/PARTNER_DELEGATION
    test_name = "Google Ads PARTNER_DELEGATION capabilities"
    try:
        response = make_request("GET", "/plugins/google-ads/capabilities/PARTNER_DELEGATION")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == True:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=true, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: GET /api/plugins/google-ads/capabilities/NAMED_INVITE
    test_name = "Google Ads NAMED_INVITE capabilities"
    try:
        response = make_request("GET", "/plugins/google-ads/capabilities/NAMED_INVITE")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == True:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=true, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 3: GET /api/plugins/google-ads/capabilities/SHARED_ACCOUNT
    test_name = "Google Ads SHARED_ACCOUNT capabilities"
    try:
        response = make_request("GET", "/plugins/google-ads/capabilities/SHARED_ACCOUNT")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == False:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=false, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")

def test_google_ads_grant_access():
    """Test Google Ads grant access endpoint"""
    print("\n=== GOOGLE ADS GRANT ACCESS TESTING ===")
    
    # Test 1: Missing required fields (should return 400)
    test_name = "Google Ads grant access - missing required fields"
    try:
        payload = {"accessToken": "fake_token"}  # Missing other required fields
        response = make_request("POST", "/oauth/google-ads/grant-access", payload)
        
        if response["status_code"] == 400:
            log_test_result(test_name, True, "Correctly rejected incomplete request")
        else:
            log_test_result(test_name, False, f"Expected 400, got {response['status_code']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: Fake access token (should return appropriate error)
    test_name = "Google Ads grant access - fake access token"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "1234567890",
            "role": "admin",
            "identity": "test@example.com",
            "accessItemType": "NAMED_INVITE"
        }
        response = make_request("POST", "/oauth/google-ads/grant-access", payload)
        
        # Should return error (400-499 range) due to invalid token
        if 400 <= response["status_code"] < 500:
            log_test_result(test_name, True, f"HTTP {response['status_code']}: {response['data'].get('error', 'Unknown error')}")
        else:
            log_test_result(test_name, False, f"Expected 4xx error, got {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 3: SHARED_ACCOUNT type (should return 501)
    test_name = "Google Ads grant access - SHARED_ACCOUNT type"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "1234567890",
            "role": "admin",
            "identity": "test@example.com",
            "accessItemType": "SHARED_ACCOUNT"
        }
        response = make_request("POST", "/oauth/google-ads/grant-access", payload)
        
        if response["status_code"] == 501:
            log_test_result(test_name, True, f"Correctly rejected SHARED_ACCOUNT: {response['data'].get('error', '')}")
        else:
            log_test_result(test_name, False, f"Expected 501, got {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 4: PARTNER_DELEGATION type with fake token (verify error handling)
    test_name = "Google Ads grant access - PARTNER_DELEGATION with fake token"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "1234567890",
            "role": "admin",
            "identity": "9876543210",  # MCC ID for PARTNER_DELEGATION
            "accessItemType": "PARTNER_DELEGATION"
        }
        response = make_request("POST", "/oauth/google-ads/grant-access", payload)
        
        # Should return error due to fake token
        if 400 <= response["status_code"] < 500:
            log_test_result(test_name, True, f"HTTP {response['status_code']}: {response['data'].get('error', 'Unknown error')}")
        else:
            log_test_result(test_name, False, f"Expected 4xx error, got {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")

def test_ga4_regression():
    """Test existing GA4 functionality still works"""
    print("\n=== GA4 REGRESSION TESTING ===")
    
    # Test 1: GET /api/plugins/ga4/capabilities/NAMED_INVITE (should have canGrantAccess: true)
    test_name = "GA4 NAMED_INVITE capabilities regression"
    try:
        response = make_request("GET", "/plugins/ga4/capabilities/NAMED_INVITE")
        
        if response["success"] and response["status_code"] == 200:
            capabilities = response["data"]["data"]["capabilities"]
            if capabilities.get("canGrantAccess") == True:
                log_test_result(test_name, True, f"canGrantAccess: {capabilities.get('canGrantAccess')}")
            else:
                log_test_result(test_name, False, f"Expected canGrantAccess=true, got: {capabilities.get('canGrantAccess')}")
        else:
            log_test_result(test_name, False, f"HTTP {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")
    
    # Test 2: POST /api/oauth/ga4/grant-access still works
    test_name = "GA4 grant access endpoint regression"
    try:
        payload = {
            "accessToken": "fake_access_token_12345",
            "tokenType": "Bearer",
            "target": "123456789",
            "role": "admin",
            "identity": "test@example.com",
            "accessItemType": "NAMED_INVITE"
        }
        response = make_request("POST", "/oauth/ga4/grant-access", payload)
        
        # Should return error (400-499 range) due to invalid token, but endpoint should exist
        if 400 <= response["status_code"] < 500:
            log_test_result(test_name, True, f"GA4 grant access endpoint exists and handles fake tokens: HTTP {response['status_code']}")
        else:
            log_test_result(test_name, False, f"GA4 grant access endpoint issue: {response['status_code']}: {response['data']}")
    except Exception as e:
        log_test_result(test_name, False, f"Exception: {str(e)}")

def test_all_endpoints():
    """Run all endpoint tests"""
    print("Starting GTM and Google Ads Grant Access Functionality Testing...")
    print(f"Base URL: {BASE_URL}")
    
    try:
        # Test GTM functionality
        test_gtm_capabilities()
        test_gtm_grant_access()
        
        # Test Google Ads functionality  
        test_google_ads_capabilities()
        test_google_ads_grant_access()
        
        # Test GA4 regression
        test_ga4_regression()
        
        # Print final results
        print("\n" + "="*50)
        print("FINAL TEST RESULTS:")
        print(f"✅ Tests Passed: {tests_passed}")
        print(f"❌ Tests Failed: {tests_failed}")
        print(f"📊 Success Rate: {tests_passed}/{tests_passed + tests_failed} ({(tests_passed/(tests_passed + tests_failed)*100):.1f}%)")
        
        if tests_failed == 0:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - review details above")
        
        return tests_failed == 0
        
    except Exception as e:
        print(f"Fatal error during testing: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_all_endpoints()
    sys.exit(0 if success else 1)