#!/usr/bin/env python3
"""
GTM and Google Ads verifyAccess Implementation Testing

Tests the GTM and Google Ads verifyAccess implementations as specified in the review request.

Critical Endpoints to Test:

### GTM Tests
1. GTM OAuth Start - POST /api/oauth/gtm/start
2. GTM Verify Access - NAMED_INVITE - POST /api/oauth/gtm/verify-access
3. GTM Verify Access - SHARED_ACCOUNT (should be rejected) - POST /api/oauth/gtm/verify-access  
4. GTM Grant Access - Should Return 501 - POST /api/oauth/gtm/grant-access
5. GTM Capabilities - GET /api/plugins/gtm/capabilities/NAMED_INVITE

### Google Ads Tests  
6. Google Ads OAuth Start - POST /api/oauth/google-ads/start
7. Google Ads Verify Access - PARTNER_DELEGATION - POST /api/oauth/google-ads/verify-access
8. Google Ads Verify Access - NAMED_INVITE - POST /api/oauth/google-ads/verify-access
9. Google Ads Grant Access - Should Return 501 - POST /api/oauth/google-ads/grant-access
10. Google Ads Capabilities - GET /api/plugins/google-ads/capabilities/PARTNER_DELEGATION
11. Google Ads Capabilities - GET /api/plugins/google-ads/capabilities/NAMED_INVITE

Base URL: https://agent-onboarding-hub.preview.emergentagent.com
"""

import requests
import json
import sys
from typing import Dict, Any, List, Tuple

# Configuration
BASE_URL = "https://agent-onboarding-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test_result(test_name: str, success: bool, details: str = ""):
    """Log test results with consistent formatting"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"   {details}")
    print()

def make_request(method: str, endpoint: str, data: Dict[Any, Any] = None, 
                expected_status: int = None) -> Tuple[bool, Dict[Any, Any], int]:
    """Make HTTP request and return success status, response data, and status code"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        print(f"🔄 {method} {url}")
        if data:
            print(f"   Body: {json.dumps(data, indent=2)}")
        
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, json=data, timeout=30)
        else:
            return False, {"error": f"Unsupported method: {method}"}, 0
        
        print(f"   Status: {response.status_code}")
        
        try:
            response_data = response.json()
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        except:
            response_data = {"raw_response": response.text}
            print(f"   Response: {response.text[:500]}")
        
        # Check expected status if provided
        status_ok = expected_status is None or response.status_code == expected_status
        
        return status_ok, response_data, response.status_code
        
    except Exception as e:
        error_msg = f"Request failed: {str(e)}"
        print(f"   Error: {error_msg}")
        return False, {"error": error_msg}, 0

# ═══════════════════════════════════════════════════════════════════════════════
# GTM TESTS
# ═══════════════════════════════════════════════════════════════════════════════

def test_gtm_oauth_start():
    """Test 1: GTM OAuth Start - POST /api/oauth/gtm/start"""
    print("=" * 80)
    print("TEST 1: GTM OAuth Start")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/gtm/start",
        data={
            "redirectUri": "https://agent-onboarding-hub.preview.emergentagent.com/onboarding/oauth-callback"
        },
        expected_status=200
    )
    
    if success and status == 200 and response.get("success"):
        data = response.get("data", {})
        auth_url = data.get("authUrl", "")
        if "accounts.google.com/oauth/v2/auth" in auth_url and "gtm" in auth_url:
            log_test_result(
                "GTM OAuth start", 
                True, 
                f"Successfully returned Google OAuth URL for GTM"
            )
            return True
        else:
            log_test_result(
                "GTM OAuth start", 
                False, 
                f"OAuth URL format incorrect: {auth_url}"
            )
            return False
    else:
        log_test_result(
            "GTM OAuth start", 
            False, 
            f"Expected 200 success, got {status}: {response.get('error', '')}"
        )
        return False

def test_gtm_verify_access_named_invite():
    """Test 2: GTM Verify Access - NAMED_INVITE"""
    print("=" * 80)
    print("TEST 2: GTM Verify Access - NAMED_INVITE")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/gtm/verify-access",
        data={
            "accessToken": "fake", 
            "target": "123456/789012", 
            "role": "edit", 
            "identity": "test@example.com", 
            "accessItemType": "NAMED_INVITE"
        },
        expected_status=400
    )
    
    if status == 400:
        error_msg = response.get("error", "").lower()
        if "not found" in error_msg or "not accessible" in error_msg:
            log_test_result(
                "GTM verify-access NAMED_INVITE fake token", 
                True, 
                f"Correctly returned 400 error for fake token: {response.get('error')}"
            )
            return True
        else:
            log_test_result(
                "GTM verify-access NAMED_INVITE fake token", 
                False, 
                f"Got 400 but error message doesn't indicate not found: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "GTM verify-access NAMED_INVITE fake token", 
            False, 
            f"Expected 400 status for fake token, got {status}"
        )
        return False

def test_gtm_verify_access_shared_account():
    """Test 3: GTM Verify Access - SHARED_ACCOUNT (should be rejected)"""
    print("=" * 80)
    print("TEST 3: GTM Verify Access - SHARED_ACCOUNT")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/gtm/verify-access",
        data={
            "accessToken": "fake", 
            "target": "123456", 
            "role": "admin", 
            "identity": "test@example.com", 
            "accessItemType": "SHARED_ACCOUNT"
        },
        expected_status=501
    )
    
    if status == 501:
        error_msg = response.get("error", "").lower()
        if "shared_account" in error_msg and ("programmatic" in error_msg or "not support" in error_msg):
            log_test_result(
                "GTM verify-access SHARED_ACCOUNT rejection", 
                True, 
                f"Correctly returned 501 about programmatic access verification for SHARED_ACCOUNT"
            )
            return True
        else:
            log_test_result(
                "GTM verify-access SHARED_ACCOUNT rejection", 
                False, 
                f"Got 501 but error message doesn't mention SHARED_ACCOUNT programmatic verification: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "GTM verify-access SHARED_ACCOUNT rejection", 
            False, 
            f"Expected 501 status for SHARED_ACCOUNT verification, got {status}"
        )
        return False

def test_gtm_grant_access():
    """Test 4: GTM Grant Access - Should Return 501"""
    print("=" * 80)
    print("TEST 4: GTM Grant Access - Should Return 501")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/gtm/grant-access",
        data={
            "accessToken": "fake", 
            "target": "123456", 
            "role": "edit", 
            "identity": "test@example.com", 
            "accessItemType": "NAMED_INVITE"
        },
        expected_status=501
    )
    
    if status == 501:
        error_msg = response.get("error", "").lower()
        if "not implemented" in error_msg or "programmatic" in error_msg or "granting" in error_msg:
            log_test_result(
                "GTM grant-access returns 501", 
                True, 
                f"Correctly returned 501 about programmatic access granting"
            )
            return True
        else:
            log_test_result(
                "GTM grant-access returns 501", 
                False, 
                f"Got 501 but error message doesn't indicate not implemented: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "GTM grant-access returns 501", 
            False, 
            f"Expected 501 status for grant access, got {status}"
        )
        return False

def test_gtm_capabilities():
    """Test 5: GTM Capabilities"""
    print("=" * 80)
    print("TEST 5: GTM Capabilities - NAMED_INVITE")
    print("=" * 80)
    
    success, response, status = make_request(
        "GET", 
        "/plugins/gtm/capabilities/NAMED_INVITE",
        expected_status=200
    )
    
    if success and status == 200:
        # Expected: canGrantAccess: false, canVerifyAccess: true
        expected = {
            "canGrantAccess": False,
            "canVerifyAccess": True
        }
        
        # The response might be nested
        capabilities = response
        if "data" in response:
            capabilities = response["data"]
        if "capabilities" in capabilities:
            capabilities = capabilities["capabilities"]
        
        all_correct = True
        for key, expected_value in expected.items():
            actual_value = capabilities.get(key)
            if actual_value != expected_value:
                log_test_result(
                    f"GTM NAMED_INVITE capabilities - {key}", 
                    False, 
                    f"Expected {key}={expected_value}, got {actual_value}"
                )
                all_correct = False
            else:
                print(f"   ✅ {key}: {actual_value}")
        
        if all_correct:
            log_test_result(
                "GTM NAMED_INVITE capabilities", 
                True, 
                "canGrantAccess=false, canVerifyAccess=true"
            )
            return True
        else:
            return False
    else:
        log_test_result(
            "GTM NAMED_INVITE capabilities", 
            False, 
            f"Expected 200 status, got {status}"
        )
        return False

# ═══════════════════════════════════════════════════════════════════════════════
# GOOGLE ADS TESTS  
# ═══════════════════════════════════════════════════════════════════════════════

def test_google_ads_oauth_start():
    """Test 6: Google Ads OAuth Start"""
    print("=" * 80)
    print("TEST 6: Google Ads OAuth Start") 
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/google-ads/start",
        data={
            "redirectUri": "https://agent-onboarding-hub.preview.emergentagent.com/onboarding/oauth-callback"
        },
        expected_status=200
    )
    
    if success and status == 200 and response.get("success"):
        data = response.get("data", {})
        auth_url = data.get("authUrl", "")
        if "accounts.google.com/oauth/v2/auth" in auth_url and "adwords" in auth_url:
            log_test_result(
                "Google Ads OAuth start", 
                True, 
                f"Successfully returned Google OAuth URL for Google Ads"
            )
            return True
        else:
            log_test_result(
                "Google Ads OAuth start", 
                False, 
                f"OAuth URL format incorrect: {auth_url}"
            )
            return False
    else:
        log_test_result(
            "Google Ads OAuth start", 
            False, 
            f"Expected 200 success, got {status}: {response.get('error', '')}"
        )
        return False

def test_google_ads_verify_access_partner_delegation():
    """Test 7: Google Ads Verify Access - PARTNER_DELEGATION"""
    print("=" * 80)
    print("TEST 7: Google Ads Verify Access - PARTNER_DELEGATION")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/google-ads/verify-access",
        data={
            "accessToken": "fake", 
            "target": "1234567890", 
            "role": "standard", 
            "identity": "9876543210", 
            "accessItemType": "PARTNER_DELEGATION"
        },
        expected_status=400
    )
    
    if status == 400:
        error_msg = response.get("error", "").lower()
        if "not found" in error_msg or "not accessible" in error_msg or "customer" in error_msg:
            log_test_result(
                "Google Ads verify-access PARTNER_DELEGATION fake token", 
                True, 
                f"Correctly returned 400 error for fake token: {response.get('error')}"
            )
            return True
        else:
            log_test_result(
                "Google Ads verify-access PARTNER_DELEGATION fake token", 
                False, 
                f"Got 400 but error message format unexpected: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "Google Ads verify-access PARTNER_DELEGATION fake token", 
            False, 
            f"Expected 400 status for fake token, got {status}"
        )
        return False

def test_google_ads_verify_access_named_invite():
    """Test 8: Google Ads Verify Access - NAMED_INVITE"""
    print("=" * 80)
    print("TEST 8: Google Ads Verify Access - NAMED_INVITE")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/google-ads/verify-access",
        data={
            "accessToken": "fake", 
            "target": "1234567890", 
            "role": "standard", 
            "identity": "test@example.com", 
            "accessItemType": "NAMED_INVITE"
        },
        expected_status=400
    )
    
    if status == 400:
        error_msg = response.get("error", "").lower()
        if "not found" in error_msg or "not accessible" in error_msg or "customer" in error_msg:
            log_test_result(
                "Google Ads verify-access NAMED_INVITE fake token", 
                True, 
                f"Correctly returned 400 error for fake token: {response.get('error')}"
            )
            return True
        else:
            log_test_result(
                "Google Ads verify-access NAMED_INVITE fake token", 
                False, 
                f"Got 400 but error message format unexpected: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "Google Ads verify-access NAMED_INVITE fake token", 
            False, 
            f"Expected 400 status for fake token, got {status}"
        )
        return False

def test_google_ads_grant_access():
    """Test 9: Google Ads Grant Access - Should Return 501"""
    print("=" * 80)
    print("TEST 9: Google Ads Grant Access - Should Return 501")
    print("=" * 80)
    
    success, response, status = make_request(
        "POST", 
        "/oauth/google-ads/grant-access",
        data={
            "accessToken": "fake", 
            "target": "123456", 
            "role": "standard", 
            "identity": "test@example.com", 
            "accessItemType": "NAMED_INVITE"
        },
        expected_status=501
    )
    
    if status == 501:
        error_msg = response.get("error", "").lower()
        if "not implemented" in error_msg or "programmatic" in error_msg or "granting" in error_msg:
            log_test_result(
                "Google Ads grant-access returns 501", 
                True, 
                f"Correctly returned 501 about programmatic access granting"
            )
            return True
        else:
            log_test_result(
                "Google Ads grant-access returns 501", 
                False, 
                f"Got 501 but error message doesn't indicate not implemented: {response.get('error')}"
            )
            return False
    else:
        log_test_result(
            "Google Ads grant-access returns 501", 
            False, 
            f"Expected 501 status for grant access, got {status}"
        )
        return False

def test_google_ads_capabilities_partner_delegation():
    """Test 10: Google Ads Capabilities - PARTNER_DELEGATION"""
    print("=" * 80)
    print("TEST 10: Google Ads Capabilities - PARTNER_DELEGATION")
    print("=" * 80)
    
    success, response, status = make_request(
        "GET", 
        "/plugins/google-ads/capabilities/PARTNER_DELEGATION",
        expected_status=200
    )
    
    if success and status == 200:
        # Expected: canGrantAccess: false, canVerifyAccess: true
        expected = {
            "canGrantAccess": False,
            "canVerifyAccess": True
        }
        
        # The response might be nested
        capabilities = response
        if "data" in response:
            capabilities = response["data"]
        if "capabilities" in capabilities:
            capabilities = capabilities["capabilities"]
        
        all_correct = True
        for key, expected_value in expected.items():
            actual_value = capabilities.get(key)
            if actual_value != expected_value:
                log_test_result(
                    f"Google Ads PARTNER_DELEGATION capabilities - {key}", 
                    False, 
                    f"Expected {key}={expected_value}, got {actual_value}"
                )
                all_correct = False
            else:
                print(f"   ✅ {key}: {actual_value}")
        
        if all_correct:
            log_test_result(
                "Google Ads PARTNER_DELEGATION capabilities", 
                True, 
                "canGrantAccess=false, canVerifyAccess=true"
            )
            return True
        else:
            return False
    else:
        log_test_result(
            "Google Ads PARTNER_DELEGATION capabilities", 
            False, 
            f"Expected 200 status, got {status}"
        )
        return False

def test_google_ads_capabilities_named_invite():
    """Test 11: Google Ads Capabilities - NAMED_INVITE"""
    print("=" * 80)
    print("TEST 11: Google Ads Capabilities - NAMED_INVITE")
    print("=" * 80)
    
    success, response, status = make_request(
        "GET", 
        "/plugins/google-ads/capabilities/NAMED_INVITE",
        expected_status=200
    )
    
    if success and status == 200:
        # Expected: canGrantAccess: false, canVerifyAccess: true
        expected = {
            "canGrantAccess": False,
            "canVerifyAccess": True
        }
        
        # The response might be nested
        capabilities = response
        if "data" in response:
            capabilities = response["data"]
        if "capabilities" in capabilities:
            capabilities = capabilities["capabilities"]
        
        all_correct = True
        for key, expected_value in expected.items():
            actual_value = capabilities.get(key)
            if actual_value != expected_value:
                log_test_result(
                    f"Google Ads NAMED_INVITE capabilities - {key}", 
                    False, 
                    f"Expected {key}={expected_value}, got {actual_value}"
                )
                all_correct = False
            else:
                print(f"   ✅ {key}: {actual_value}")
        
        if all_correct:
            log_test_result(
                "Google Ads NAMED_INVITE capabilities", 
                True, 
                "canGrantAccess=false, canVerifyAccess=true"
            )
            return True
        else:
            return False
    else:
        log_test_result(
            "Google Ads NAMED_INVITE capabilities", 
            False, 
            f"Expected 200 status, got {status}"
        )
        return False

def main():
    """Run all GTM and Google Ads verifyAccess tests"""
    print("🧪 GTM AND GOOGLE ADS VERIFYACCESS TESTING")
    print("🌐 Base URL:", BASE_URL)
    print("📋 Testing GTM and Google Ads verifyAccess implementations per review request")
    print()
    
    # Run all tests
    tests = [
        # GTM Tests
        test_gtm_oauth_start,
        test_gtm_verify_access_named_invite,
        test_gtm_verify_access_shared_account,
        test_gtm_grant_access,
        test_gtm_capabilities,
        
        # Google Ads Tests  
        test_google_ads_oauth_start,
        test_google_ads_verify_access_partner_delegation,
        test_google_ads_verify_access_named_invite,
        test_google_ads_grant_access,
        test_google_ads_capabilities_partner_delegation,
        test_google_ads_capabilities_named_invite
    ]
    
    results = []
    passed = 0
    total = len(tests)
    
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
            if result:
                passed += 1
        except Exception as e:
            print(f"❌ TEST ERROR: {test_func.__name__}")
            print(f"   Exception: {e}")
            results.append(False)
    
    # Summary
    print("=" * 80)
    print("🎯 GTM & GOOGLE ADS VERIFYACCESS TEST SUMMARY")
    print("=" * 80)
    print(f"📊 Results: {passed}/{total} tests passed ({(passed/total)*100:.1f}% success rate)")
    print()
    
    test_names = [
        "GTM OAuth Start",
        "GTM Verify Access - NAMED_INVITE",  
        "GTM Verify Access - SHARED_ACCOUNT (501)",
        "GTM Grant Access (501)",
        "GTM Capabilities - NAMED_INVITE",
        "Google Ads OAuth Start",
        "Google Ads Verify Access - PARTNER_DELEGATION",
        "Google Ads Verify Access - NAMED_INVITE", 
        "Google Ads Grant Access (501)",
        "Google Ads Capabilities - PARTNER_DELEGATION",
        "Google Ads Capabilities - NAMED_INVITE"
    ]
    
    for i, (test_name, result) in enumerate(zip(test_names, results)):
        status = "✅" if result else "❌"
        print(f"{status} {i+1}. {test_name}")
    
    print()
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! GTM and Google Ads verifyAccess implementations are working correctly.")
        return True
    else:
        print(f"⚠️  {total - passed} test(s) failed. Review the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)