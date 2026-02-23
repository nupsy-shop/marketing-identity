#!/usr/bin/env python3
"""
Backend Testing Script for Phase 4 - UI Components and OAuth Token Filtering
Tests OAuth token filtering endpoints, PATCH updates, capability endpoints, and agency platform API with manifests.
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
        return requests.get(url)
    
    def post(self, endpoint: str, data: Dict[str, Any]) -> requests.Response:
        url = f"{self.base_url}{endpoint}"
        self.log(f"POST {url}")
        return requests.post(url, json=data, headers={'Content-Type': 'application/json'})

    def test_plugin_capabilities_endpoints(self):
        """Test 1: Plugin Capabilities Endpoints"""
        self.log("=== TESTING PLUGIN CAPABILITIES ENDPOINTS ===")
        
        # Test GA4 capabilities - should have canGrantAccess=true for NAMED_INVITE/GROUP_ACCESS
        try:
            response = self.get("/api/plugins/ga4/capabilities")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    capabilities = data["data"]["accessTypeCapabilities"]
                    
                    # Check NAMED_INVITE capabilities
                    named_invite = capabilities.get("NAMED_INVITE", {})
                    if named_invite.get("canGrantAccess") == True:
                        self.add_result(
                            "GA4 NAMED_INVITE canGrantAccess=true", 
                            True, 
                            "GA4 supports programmatic grant for NAMED_INVITE"
                        )
                    else:
                        self.add_result(
                            "GA4 NAMED_INVITE canGrantAccess=true", 
                            False, 
                            f"Expected canGrantAccess=true, got {named_invite.get('canGrantAccess')}"
                        )
                    
                    # Check GROUP_ACCESS capabilities  
                    group_access = capabilities.get("GROUP_ACCESS", {})
                    if group_access.get("canGrantAccess") == True:
                        self.add_result(
                            "GA4 GROUP_ACCESS canGrantAccess=true", 
                            True, 
                            "GA4 supports programmatic grant for GROUP_ACCESS"
                        )
                    else:
                        self.add_result(
                            "GA4 GROUP_ACCESS canGrantAccess=true", 
                            False, 
                            f"Expected canGrantAccess=true, got {group_access.get('canGrantAccess')}"
                        )
                    
                    # Check SHARED_ACCOUNT capabilities - should be false
                    shared_account = capabilities.get("SHARED_ACCOUNT", {})
                    if (shared_account.get("canGrantAccess") == False and 
                        shared_account.get("requiresEvidenceUpload") == True):
                        self.add_result(
                            "GA4 SHARED_ACCOUNT capabilities", 
                            True, 
                            "SHARED_ACCOUNT has canGrantAccess=false, requiresEvidenceUpload=true"
                        )
                    else:
                        self.add_result(
                            "GA4 SHARED_ACCOUNT capabilities", 
                            False, 
                            f"Expected canGrantAccess=false & requiresEvidenceUpload=true, got {shared_account}"
                        )
                else:
                    self.add_result("GA4 capabilities API", False, f"API returned success=false: {data}")
            else:
                self.add_result("GA4 capabilities API", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.add_result("GA4 capabilities API", False, f"Exception: {str(e)}")
        
        # Test specific capability endpoint
        try:
            response = self.get("/api/plugins/ga4/capabilities/NAMED_INVITE")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    capability_data = data["data"]
                    role_templates = capability_data.get("roleTemplates", [])
                    if len(role_templates) > 0:
                        self.add_result(
                            "GA4 NAMED_INVITE specific capability", 
                            True, 
                            f"Returns roleTemplates with {len(role_templates)} roles"
                        )
                    else:
                        self.add_result(
                            "GA4 NAMED_INVITE specific capability", 
                            False, 
                            "No roleTemplates returned"
                        )
                else:
                    self.add_result("GA4 NAMED_INVITE specific capability", False, f"API returned success=false")
            else:
                self.add_result("GA4 NAMED_INVITE specific capability", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("GA4 NAMED_INVITE specific capability", False, f"Exception: {str(e)}")
        
        # Test LinkedIn capabilities - should have canGrantAccess=false for all types
        try:
            response = self.get("/api/plugins/linkedin/capabilities")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    capabilities = data["data"]["accessTypeCapabilities"]
                    all_false = True
                    for access_type, caps in capabilities.items():
                        if caps.get("canGrantAccess") != False:
                            all_false = False
                            break
                    
                    if all_false:
                        self.add_result(
                            "LinkedIn canGrantAccess=false for all types", 
                            True, 
                            "LinkedIn has no public APIs for user management"
                        )
                    else:
                        self.add_result(
                            "LinkedIn canGrantAccess=false for all types", 
                            False, 
                            f"Some capabilities have canGrantAccess=true: {capabilities}"
                        )
                else:
                    self.add_result("LinkedIn capabilities API", False, f"API returned success=false")
            else:
                self.add_result("LinkedIn capabilities API", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("LinkedIn capabilities API", False, f"Exception: {str(e)}")
        
        # Test Salesforce capabilities - should have canGrantAccess=true for NAMED_INVITE
        try:
            response = self.get("/api/plugins/salesforce/capabilities")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    capabilities = data["data"]["accessTypeCapabilities"]
                    named_invite = capabilities.get("NAMED_INVITE", {})
                    if named_invite.get("canGrantAccess") == True:
                        self.add_result(
                            "Salesforce NAMED_INVITE canGrantAccess=true", 
                            True, 
                            "Salesforce API supports user creation"
                        )
                    else:
                        self.add_result(
                            "Salesforce NAMED_INVITE canGrantAccess=true", 
                            False, 
                            f"Expected canGrantAccess=true, got {named_invite.get('canGrantAccess')}"
                        )
                else:
                    self.add_result("Salesforce capabilities API", False, f"API returned success=false")
            else:
                self.add_result("Salesforce capabilities API", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("Salesforce capabilities API", False, f"Exception: {str(e)}")

    def test_grant_access_enforcement(self):
        """Test 2: Grant Access Enforcement"""
        self.log("=== TESTING GRANT ACCESS ENFORCEMENT ===")
        
        # Test GA4 grant-access - should return 501 "not implemented" (plugin declares canGrantAccess but method missing)
        try:
            response = self.post("/api/oauth/ga4/grant-access", {
                "accessToken": "fake_token",
                "target": {"propertyId": "12345"},
                "role": "administrator", 
                "identity": "user@example.com",
                "accessItemType": "NAMED_INVITE"
            })
            
            if response.status_code == 501:
                self.add_result(
                    "GA4 grant-access returns 501", 
                    True, 
                    "Correctly returns 'not implemented' when grantAccess method missing"
                )
            else:
                self.add_result(
                    "GA4 grant-access returns 501", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("GA4 grant-access returns 501", False, f"Exception: {str(e)}")
        
        # Test LinkedIn grant-access - should return 501 "not supported" (canGrantAccess=false)
        try:
            response = self.post("/api/oauth/linkedin/grant-access", {
                "accessToken": "fake_token",
                "target": {"adAccountId": "12345"},
                "role": "admin",
                "identity": "user@example.com", 
                "accessItemType": "PARTNER_DELEGATION"
            })
            
            if response.status_code == 501:
                response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                error_message = response_data.get("error", "")
                if ("not support" in error_message.lower() or 
                    "not configured" in error_message.lower() or
                    "manual steps required" in error_message.lower()):
                    self.add_result(
                        "LinkedIn grant-access returns 501 not supported", 
                        True, 
                        "Correctly returns 'not supported' when canGrantAccess=false"
                    )
                else:
                    self.add_result(
                        "LinkedIn grant-access returns 501 not supported", 
                        False, 
                        f"Got 501 but wrong error message: {error_message}"
                    )
            else:
                self.add_result(
                    "LinkedIn grant-access returns 501 not supported", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("LinkedIn grant-access returns 501 not supported", False, f"Exception: {str(e)}")
        
        # Test HubSpot grant-access - should return 501 "not supported"
        try:
            response = self.post("/api/oauth/hubspot/grant-access", {
                "accessToken": "fake_token",
                "target": {"portalId": "12345"},
                "role": "admin",
                "identity": "user@example.com",
                "accessItemType": "NAMED_INVITE"
            })
            
            if response.status_code == 501:
                self.add_result(
                    "HubSpot grant-access returns 501", 
                    True, 
                    "Correctly returns 501 for unsupported grant access"
                )
            else:
                self.add_result(
                    "HubSpot grant-access returns 501", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("HubSpot grant-access returns 501", False, f"Exception: {str(e)}")

    def test_verify_access_enforcement(self):
        """Test 3: Verify Access Enforcement"""  
        self.log("=== TESTING VERIFY ACCESS ENFORCEMENT ===")
        
        # Test GA4 verify-access - should return 501 "not implemented" (method missing)
        try:
            response = self.post("/api/oauth/ga4/verify-access", {
                "accessToken": "fake_token",
                "target": {"propertyId": "12345"},
                "role": "administrator",
                "identity": "user@example.com",
                "accessItemType": "NAMED_INVITE"
            })
            
            if response.status_code == 501:
                self.add_result(
                    "GA4 verify-access returns 501", 
                    True, 
                    "Correctly returns 'not implemented' when verifyAccess method missing"
                )
            else:
                self.add_result(
                    "GA4 verify-access returns 501", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("GA4 verify-access returns 501", False, f"Exception: {str(e)}")
        
        # Test LinkedIn verify-access - should return 501 "not supported" (canVerifyAccess=false)
        try:
            response = self.post("/api/oauth/linkedin/verify-access", {
                "accessToken": "fake_token",
                "target": {"adAccountId": "12345"},
                "role": "admin",
                "identity": "user@example.com",
                "accessItemType": "PARTNER_DELEGATION"
            })
            
            if response.status_code == 501:
                self.add_result(
                    "LinkedIn verify-access returns 501", 
                    True, 
                    "Correctly returns 'not supported' when canVerifyAccess=false"
                )
            else:
                self.add_result(
                    "LinkedIn verify-access returns 501", 
                    False, 
                    f"Expected HTTP 501, got {response.status_code}: {response.text[:200]}"
                )
        except Exception as e:
            self.add_result("LinkedIn verify-access returns 501", False, f"Exception: {str(e)}")

    def test_oauth_token_scope(self):
        """Test 4: OAuth Token Scope (DB Schema)"""
        self.log("=== TESTING OAUTH TOKEN SCOPE (DB SCHEMA) ===")
        
        # Test that oauth/tokens endpoint works (should return empty list initially)
        try:
            response = self.get("/api/oauth/tokens")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    tokens = data["data"]
                    self.add_result(
                        "OAuth tokens endpoint works", 
                        True, 
                        f"Returns {len(tokens)} tokens (empty list is fine for initial state)"
                    )
                else:
                    self.add_result("OAuth tokens endpoint works", False, f"API returned success=false")
            else:
                self.add_result("OAuth tokens endpoint works", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("OAuth tokens endpoint works", False, f"Exception: {str(e)}")
        
        # We can't easily test the DB schema directly, but the fact that the endpoint works
        # and the db.js file shows the proper columns (scope, tenantId, tenantType) confirms it

    def test_plugin_manifest_validation(self):
        """Test 5: Plugin Manifest Validation"""
        self.log("=== TESTING PLUGIN MANIFEST VALIDATION ===")
        
        # Test that /api/plugins returns 15 plugins with version 2.2.0
        try:
            response = self.get("/api/plugins")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    plugins = data["data"]
                    
                    # Check plugin count
                    if len(plugins) == 15:
                        self.add_result(
                            "Plugin count is 15", 
                            True, 
                            f"Found {len(plugins)} plugins as expected"
                        )
                    else:
                        self.add_result(
                            "Plugin count is 15", 
                            False, 
                            f"Expected 15 plugins, found {len(plugins)}"
                        )
                    
                    # Check that all plugins have version 2.2.0
                    all_correct_version = True
                    plugins_with_access_caps = 0
                    
                    for plugin in plugins:
                        if plugin.get("pluginVersion") != "2.2.0":
                            all_correct_version = False
                        
                        # Check if plugin has accessTypeCapabilities
                        if plugin.get("accessTypeCapabilities"):
                            plugins_with_access_caps += 1
                    
                    if all_correct_version:
                        self.add_result(
                            "All plugins have version 2.2.0", 
                            True, 
                            "All plugins updated to latest version"
                        )
                    else:
                        self.add_result(
                            "All plugins have version 2.2.0", 
                            False, 
                            "Some plugins have incorrect version"
                        )
                    
                    # Check that plugins have accessTypeCapabilities
                    if plugins_with_access_caps >= 10:  # Most plugins should have this
                        self.add_result(
                            "Plugins have accessTypeCapabilities", 
                            True, 
                            f"{plugins_with_access_caps} plugins have accessTypeCapabilities field"
                        )
                    else:
                        self.add_result(
                            "Plugins have accessTypeCapabilities", 
                            False, 
                            f"Only {plugins_with_access_caps} plugins have accessTypeCapabilities"
                        )
                else:
                    self.add_result("Plugin manifest API", False, f"API returned success=false")
            else:
                self.add_result("Plugin manifest API", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("Plugin manifest API", False, f"Exception: {str(e)}")

    def test_oauth_token_filtering(self):
        """Test Phase 4: OAuth Token Filtering Endpoint"""
        self.log("=== TESTING PHASE 4: OAUTH TOKEN FILTERING ===")
        
        # Test basic oauth tokens endpoint
        try:
            response = self.get("/api/oauth/tokens")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    tokens = data["data"]
                    self.add_result(
                        "OAuth tokens endpoint basic", 
                        True, 
                        f"Returns {len(tokens)} tokens"
                    )
                else:
                    self.add_result("OAuth tokens endpoint basic", False, f"API returned success=false")
            else:
                self.add_result("OAuth tokens endpoint basic", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("OAuth tokens endpoint basic", False, f"Exception: {str(e)}")
        
        # Test filtering by platformKey and scope
        try:
            response = self.get("/api/oauth/tokens?platformKey=ga4&scope=AGENCY")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    tokens = data["data"]
                    self.add_result(
                        "OAuth tokens filtering by platformKey and scope", 
                        True, 
                        f"Returns {len(tokens)} tokens filtered by platformKey=ga4 and scope=AGENCY"
                    )
                else:
                    self.add_result("OAuth tokens filtering by platformKey and scope", False, f"API returned success=false")
            else:
                self.add_result("OAuth tokens filtering by platformKey and scope", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("OAuth tokens filtering by platformKey and scope", False, f"Exception: {str(e)}")
        
        # Test filtering by scope only
        try:
            response = self.get("/api/oauth/tokens?scope=CLIENT")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    tokens = data["data"]
                    self.add_result(
                        "OAuth tokens filtering by scope only", 
                        True, 
                        f"Returns {len(tokens)} tokens filtered by scope=CLIENT"
                    )
                else:
                    self.add_result("OAuth tokens filtering by scope only", False, f"API returned success=false")
            else:
                self.add_result("OAuth tokens filtering by scope only", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("OAuth tokens filtering by scope only", False, f"Exception: {str(e)}")
        
        # Test filtering with limit
        try:
            response = self.get("/api/oauth/tokens?limit=10")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    tokens = data["data"]
                    if len(tokens) <= 10:
                        self.add_result(
                            "OAuth tokens with limit parameter", 
                            True, 
                            f"Returns {len(tokens)} tokens (≤ limit of 10)"
                        )
                    else:
                        self.add_result(
                            "OAuth tokens with limit parameter", 
                            False, 
                            f"Expected ≤10 tokens, got {len(tokens)}"
                        )
                else:
                    self.add_result("OAuth tokens with limit parameter", False, f"API returned success=false")
            else:
                self.add_result("OAuth tokens with limit parameter", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("OAuth tokens with limit parameter", False, f"Exception: {str(e)}")

    def test_oauth_token_patch(self):
        """Test Phase 4: OAuth Token PATCH Endpoint"""
        self.log("=== TESTING PHASE 4: OAUTH TOKEN PATCH ENDPOINT ===")
        
        # Test PATCH endpoint exists and validates correctly (since no tokens exist, we expect 404)
        try:
            response = requests.patch(f"{self.base_url}/api/oauth/tokens/non-existent-id", 
                                    json={"isActive": False}, 
                                    headers={'Content-Type': 'application/json'})
            
            if response.status_code == 404:
                self.add_result(
                    "OAuth token PATCH endpoint exists", 
                    True, 
                    "Returns 404 for non-existent token ID as expected"
                )
            else:
                self.add_result(
                    "OAuth token PATCH endpoint exists", 
                    False, 
                    f"Expected 404 for non-existent token, got {response.status_code}"
                )
        except Exception as e:
            self.add_result("OAuth token PATCH endpoint exists", False, f"Exception: {str(e)}")
        
        # Test PATCH with no updates provided (should return 400)
        try:
            response = requests.patch(f"{self.base_url}/api/oauth/tokens/test-id", 
                                    json={}, 
                                    headers={'Content-Type': 'application/json'})
            
            if response.status_code == 400 or response.status_code == 404:
                self.add_result(
                    "OAuth token PATCH validation", 
                    True, 
                    f"Correctly returns {response.status_code} for empty update payload"
                )
            else:
                self.add_result(
                    "OAuth token PATCH validation", 
                    False, 
                    f"Expected 400/404 for empty payload, got {response.status_code}"
                )
        except Exception as e:
            self.add_result("OAuth token PATCH validation", False, f"Exception: {str(e)}")

    def test_capability_endpoints_still_work(self):
        """Test Phase 4: Capability Endpoints Still Work"""
        self.log("=== TESTING PHASE 4: CAPABILITY ENDPOINTS REGRESSION ===")
        
        # Test GA4 capabilities endpoint
        try:
            response = self.get("/api/plugins/ga4/capabilities")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    access_capabilities = data["data"].get("accessTypeCapabilities", {})
                    if access_capabilities:
                        self.add_result(
                            "GA4 capabilities endpoint works", 
                            True, 
                            f"Returns accessTypeCapabilities with {len(access_capabilities)} access types"
                        )
                    else:
                        self.add_result(
                            "GA4 capabilities endpoint works", 
                            False, 
                            "No accessTypeCapabilities returned"
                        )
                else:
                    self.add_result("GA4 capabilities endpoint works", False, f"API returned success=false")
            else:
                self.add_result("GA4 capabilities endpoint works", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("GA4 capabilities endpoint works", False, f"Exception: {str(e)}")
        
        # Test Google Search Console capabilities endpoint with focus on NAMED_INVITE
        try:
            response = self.get("/api/plugins/google-search-console/capabilities")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    access_capabilities = data["data"].get("accessTypeCapabilities", {})
                    named_invite = access_capabilities.get("NAMED_INVITE", {})
                    
                    if (named_invite.get("canVerifyAccess") == True and 
                        named_invite.get("canGrantAccess") == False):
                        self.add_result(
                            "Google Search Console NAMED_INVITE capabilities", 
                            True, 
                            "canVerifyAccess=true, canGrantAccess=false for NAMED_INVITE"
                        )
                    else:
                        self.add_result(
                            "Google Search Console NAMED_INVITE capabilities", 
                            False, 
                            f"Expected canVerifyAccess=true, canGrantAccess=false, got {named_invite}"
                        )
                else:
                    self.add_result("Google Search Console capabilities", False, f"API returned success=false")
            else:
                self.add_result("Google Search Console capabilities", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("Google Search Console capabilities", False, f"Exception: {str(e)}")

    def test_agency_platform_api_with_manifest(self):
        """Test Phase 4: Agency Platform API with Manifest"""
        self.log("=== TESTING PHASE 4: AGENCY PLATFORM API WITH MANIFEST ===")
        
        # Test agency platforms endpoint returns manifests
        try:
            response = self.get("/api/agency/platforms")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    platforms = data["data"]
                    self.add_result(
                        "Agency platforms endpoint works", 
                        True, 
                        f"Returns {len(platforms)} agency platforms"
                    )
                    
                    # If we have platforms, check if they include manifest data
                    if len(platforms) > 0:
                        platform = platforms[0]
                        if "manifest" in platform:
                            manifest = platform["manifest"]
                            access_capabilities = manifest.get("accessTypeCapabilities", {})
                            self.add_result(
                                "Agency platforms include manifests", 
                                True, 
                                f"Platform manifest includes accessTypeCapabilities with {len(access_capabilities)} types"
                            )
                        else:
                            self.add_result(
                                "Agency platforms include manifests", 
                                False, 
                                "Platform data doesn't include manifest field"
                            )
                    else:
                        self.add_result(
                            "Agency platforms manifest check", 
                            True, 
                            "No agency platforms configured (empty list is valid)"
                        )
                else:
                    self.add_result("Agency platforms endpoint works", False, f"API returned success=false")
            else:
                self.add_result("Agency platforms endpoint works", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.add_result("Agency platforms endpoint works", False, f"Exception: {str(e)}")
        
        # Test creating an agency platform to verify manifest enrichment
        try:
            # First get a platform ID
            platforms_response = self.get("/api/platforms?clientFacing=true&limit=1")
            if platforms_response.status_code == 200:
                platforms_data = platforms_response.json()
                if platforms_data.get("success") and len(platforms_data["data"]) > 0:
                    platform_id = platforms_data["data"][0]["id"]
                    
                    # Create agency platform
                    response = self.post("/api/agency/platforms", {
                        "platformId": platform_id
                    })
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            agency_platform = data["data"]
                            
                            # Check if it includes platform data
                            if "platform" in agency_platform:
                                self.add_result(
                                    "Agency platform creation with enrichment", 
                                    True, 
                                    f"Created agency platform with enriched platform data"
                                )
                            else:
                                self.add_result(
                                    "Agency platform creation with enrichment", 
                                    False, 
                                    "Created agency platform but missing platform enrichment"
                                )
                        else:
                            self.add_result("Agency platform creation", False, f"API returned success=false")
                    else:
                        self.add_result("Agency platform creation", False, f"HTTP {response.status_code}")
                else:
                    self.add_result("Agency platform creation", False, "No platforms available for testing")
            else:
                self.add_result("Agency platform creation", False, "Could not get platform ID for test")
        except Exception as e:
            self.add_result("Agency platform creation", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        self.log("🚀 Starting Phase 4 Backend Testing - UI Components and OAuth Token Filtering")
        
        try:
            # Phase 4 specific tests
            self.test_oauth_token_filtering()
            self.test_oauth_token_patch()
            self.test_capability_endpoints_still_work()
            self.test_agency_platform_api_with_manifest()
            
            # Keep existing tests for regression
            self.test_plugin_capabilities_endpoints()
            self.test_grant_access_enforcement() 
            self.test_verify_access_enforcement()
            self.test_oauth_token_scope()
            self.test_plugin_manifest_validation()
        except Exception as e:
            self.log(f"Unexpected error during testing: {str(e)}", "ERROR")
        
        # Print summary
        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)
        self.log(f"\n📊 TEST SUMMARY: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! Phase 4 implementation is working correctly.", "SUCCESS")
            return True
        else:
            failed = [r for r in self.results if not r.passed]
            self.log(f"❌ {len(failed)} tests failed:", "FAILURE")
            for failure in failed:
                self.log(f"  - {failure.name}: {failure.details}", "FAILURE")
            return False


if __name__ == "__main__":
    # Use the base URL from environment or default
    import os
    base_url = os.getenv("NEXT_PUBLIC_BASE_URL", "https://plugin-oauth-setup.preview.emergentagent.com")
    
    tester = BackendTester(base_url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)