#!/usr/bin/env python3
"""
Backend Testing Script for OAuth and Capability-Driven Access Flow Endpoints
Tests specific endpoints mentioned in the review_request for Marketing Identity Platform
"""

import requests
import json
import sys
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class TestResult:
    name: str
    passed: bool
    details: str
    response_data: Any = None


class BackendTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.results: List[TestResult] = []
    
    def log(self, message: str, level: str = "INFO"):
        print(f"[{level}] {message}")
    
    def add_result(self, name: str, passed: bool, details: str, response_data: Any = None):
        result = TestResult(name, passed, details, response_data)
        self.results.append(result)
        status = "✅ PASS" if passed else "❌ FAIL"
        self.log(f"{status}: {name} - {details}")
        return result
    
    def get(self, endpoint: str) -> requests.Response:
        url = f"{self.base_url}{endpoint}"
        self.log(f"GET {url}")
        try:
            return requests.get(url, timeout=30)
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> requests.Response:
        url = f"{self.base_url}{endpoint}"
        self.log(f"POST {url}")
        try:
            return requests.post(url, json=data, headers={'Content-Type': 'application/json'}, timeout=30)
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            raise

    def test_oauth_ga4_start(self):
        """Test 1: OAuth Start Endpoint for GA4 (per-platform OAuth)"""
        self.log("=== TESTING OAUTH GA4 START ENDPOINT ===")
        
        try:
            response = self.post("/api/oauth/ga4/start", {
                "redirectUri": "https://agent-onboarding-hub.preview.emergentagent.com/onboarding/oauth-callback"
            })
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and 
                    "authUrl" in data.get("data", {}) and 
                    "state" in data.get("data", {}) and
                    "platformKey" in data.get("data", {})):
                    
                    auth_url = data["data"]["authUrl"]
                    if "accounts.google.com" in auth_url and "client_id" in auth_url:
                        self.add_result(
                            "GA4 OAuth start endpoint", 
                            True, 
                            f"Returns valid Google OAuth URL with client_id, state: {data['data']['state'][:8]}..."
                        )
                    else:
                        self.add_result(
                            "GA4 OAuth start endpoint", 
                            False, 
                            f"AuthUrl doesn't contain expected Google OAuth components: {auth_url[:100]}"
                        )
                else:
                    self.add_result(
                        "GA4 OAuth start endpoint", 
                        False, 
                        f"Missing required fields (authUrl, state, platformKey): {data}"
                    )
            else:
                self.add_result(
                    "GA4 OAuth start endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("GA4 OAuth start endpoint", False, f"Exception: {str(e)}")

    def test_oauth_linkedin_start(self):
        """Test 2: OAuth Start for unconfigured platform (LinkedIn)"""
        self.log("=== TESTING OAUTH LINKEDIN START (UNCONFIGURED) ===")
        
        try:
            response = self.post("/api/oauth/linkedin/start", {
                "redirectUri": "https://agent-onboarding-hub.preview.emergentagent.com/onboarding/oauth-callback"
            })
            
            if response.status_code == 501:
                data = response.json()
                if ("success" in data and data["success"] == False and 
                    "error" in data):
                    error_msg = data["error"].lower()
                    if ("missing credentials" in error_msg or 
                        "not configured" in error_msg or
                        "placeholder" in error_msg):
                        self.add_result(
                            "LinkedIn OAuth start (unconfigured)", 
                            True, 
                            f"Returns 501 with clear error about missing credentials: {data['error'][:100]}"
                        )
                    else:
                        self.add_result(
                            "LinkedIn OAuth start (unconfigured)", 
                            False, 
                            f"Returns 501 but unclear error message: {data['error']}"
                        )
                else:
                    self.add_result(
                        "LinkedIn OAuth start (unconfigured)", 
                        False, 
                        f"Returns 501 but wrong response format: {data}"
                    )
            else:
                self.add_result(
                    "LinkedIn OAuth start (unconfigured)", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("LinkedIn OAuth start (unconfigured)", False, f"Exception: {str(e)}")

    def test_platform_capabilities(self):
        """Test 3: Platform Capabilities Endpoint"""
        self.log("=== TESTING PLATFORM CAPABILITIES ===")
        
        try:
            response = self.get("/api/plugins/ga4/capabilities/NAMED_INVITE")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and 
                    "data" in data):
                    capability_data = data["data"]
                    # The capabilities are nested inside a "capabilities" field
                    capabilities = capability_data.get("capabilities", {})
                    required_fields = ["clientOAuthSupported", "canGrantAccess", "canVerifyAccess"]
                    
                    all_present = all(field in capabilities for field in required_fields)
                    if all_present:
                        self.add_result(
                            "GA4 NAMED_INVITE capabilities", 
                            True, 
                            f"Returns capabilities: OAuth={capabilities.get('clientOAuthSupported')}, "
                            f"Grant={capabilities.get('canGrantAccess')}, "
                            f"Verify={capabilities.get('canVerifyAccess')}"
                        )
                    else:
                        missing = [f for f in required_fields if f not in capabilities]
                        self.add_result(
                            "GA4 NAMED_INVITE capabilities", 
                            False, 
                            f"Missing required fields in capabilities: {missing}. Got capabilities: {list(capabilities.keys())}"
                        )
                else:
                    self.add_result(
                        "GA4 NAMED_INVITE capabilities", 
                        False, 
                        f"Invalid response format: {data}"
                    )
            else:
                self.add_result(
                    "GA4 NAMED_INVITE capabilities", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("GA4 NAMED_INVITE capabilities", False, f"Exception: {str(e)}")

    def test_access_grant_endpoint(self):
        """Test 4: Access Grant Endpoint (should return 501 - not implemented)"""
        self.log("=== TESTING ACCESS GRANT ENDPOINT ===")
        
        try:
            response = self.post("/api/access/grant", {
                "platformKey": "ga4",
                "accessRequestId": "test",
                "targetId": "test"
            })
            
            if response.status_code == 501:
                data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                self.add_result(
                    "Access grant endpoint (501 expected)", 
                    True, 
                    f"Returns 501 'Not Implemented' as expected: {data.get('error', 'No error message')[:100]}"
                )
            else:
                self.add_result(
                    "Access grant endpoint (501 expected)", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("Access grant endpoint (501 expected)", False, f"Exception: {str(e)}")

    def test_access_verify_endpoint(self):
        """Test 5: Access Verify Endpoint (should return 501 - not implemented)"""
        self.log("=== TESTING ACCESS VERIFY ENDPOINT ===")
        
        try:
            response = self.post("/api/access/verify", {
                "platformKey": "ga4",
                "accessRequestId": "test",
                "targetId": "test"
            })
            
            if response.status_code == 501:
                data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                self.add_result(
                    "Access verify endpoint (501 expected)", 
                    True, 
                    f"Returns 501 'Not Implemented' as expected: {data.get('error', 'No error message')[:100]}"
                )
            else:
                self.add_result(
                    "Access verify endpoint (501 expected)", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("Access verify endpoint (501 expected)", False, f"Exception: {str(e)}")

    def test_onboarding_token_endpoint(self):
        """Test 6: Onboarding Token Endpoint with existing token"""
        self.log("=== TESTING ONBOARDING TOKEN ENDPOINT ===")
        
        # Use existing token from review request
        token = "055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
        
        try:
            response = self.get(f"/api/onboarding/{token}")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and 
                    "data" in data and
                    "items" in data["data"]):
                    
                    items = data["data"]["items"]
                    # Check if items have accessTypeCapabilities field
                    items_with_capabilities = 0
                    for item in items:
                        if "accessTypeCapabilities" in item:
                            items_with_capabilities += 1
                    
                    if items_with_capabilities > 0:
                        self.add_result(
                            "Onboarding token with accessTypeCapabilities", 
                            True, 
                            f"Found {len(items)} items, {items_with_capabilities} have accessTypeCapabilities field"
                        )
                    else:
                        self.add_result(
                            "Onboarding token with accessTypeCapabilities", 
                            False, 
                            f"None of {len(items)} items have accessTypeCapabilities field"
                        )
                else:
                    self.add_result(
                        "Onboarding token endpoint", 
                        False, 
                        f"Invalid response format, missing items: {data}"
                    )
            elif response.status_code == 404:
                self.add_result(
                    "Onboarding token endpoint", 
                    False, 
                    f"Token not found (404). The test token {token} may not exist in this environment"
                )
            else:
                self.add_result(
                    "Onboarding token endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("Onboarding token endpoint", False, f"Exception: {str(e)}")

    def test_oauth_status_endpoint(self):
        """Test 7: OAuth Status Endpoint"""
        self.log("=== TESTING OAUTH STATUS ENDPOINT ===")
        
        try:
            response = self.get("/api/oauth/status")
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("success") and 
                    "data" in data):
                    
                    status_data = data["data"]
                    if isinstance(status_data, dict) and len(status_data) > 0:
                        # Check if we have platform status information
                        configured_count = sum(1 for platform_info in status_data.values() 
                                             if isinstance(platform_info, dict) and 
                                             platform_info.get("configured") == True)
                        total_count = len(status_data)
                        
                        self.add_result(
                            "OAuth status endpoint", 
                            True, 
                            f"Returns status of {total_count} platforms, {configured_count} configured"
                        )
                    else:
                        self.add_result(
                            "OAuth status endpoint", 
                            False, 
                            f"Invalid status data format: {status_data}"
                        )
                else:
                    self.add_result(
                        "OAuth status endpoint", 
                        False, 
                        f"Invalid response format: {data}"
                    )
            else:
                self.add_result(
                    "OAuth status endpoint", 
                    False, 
                    f"HTTP {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("OAuth status endpoint", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test suites for OAuth and capability-driven access flow"""
        self.log("🚀 Starting OAuth and Capability-Driven Access Flow Testing")
        self.log(f"Testing against base URL: {self.base_url}")
        
        try:
            # Test all endpoints mentioned in review_request
            self.test_oauth_ga4_start()
            self.test_oauth_linkedin_start()
            self.test_platform_capabilities()
            self.test_access_grant_endpoint()
            self.test_access_verify_endpoint()
            self.test_onboarding_token_endpoint()
            self.test_oauth_status_endpoint()
            
        except Exception as e:
            self.log(f"Unexpected error during testing: {str(e)}", "ERROR")
        
        # Print summary
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        success_rate = (passed/total*100) if total > 0 else 0
        
        self.log(f"\n📊 TEST SUMMARY: {passed}/{total} tests passed ({success_rate:.1f}%)")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! OAuth and capability-driven access flow endpoints are working correctly.", "SUCCESS")
            return True
        else:
            failed = [r for r in self.results if not r.passed]
            self.log(f"❌ {len(failed)} tests failed:", "FAILURE")
            for failure in failed:
                self.log(f"  - {failure.name}: {failure.details}", "FAILURE")
            return False


if __name__ == "__main__":
    # Use the base URL from the review request
    base_url = "https://agent-onboarding-hub.preview.emergentagent.com"
    
    tester = BackendTester(base_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)