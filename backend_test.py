#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Access Provisioning Platform Plugin System
Testing 19 plugins implementing unified AccessProvisioningPlugin interface
"""

import requests
import json
import sys
from typing import Dict, List, Any, Optional

# Configuration
BASE_URL = "https://plugin-unify.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Expected 19 plugin keys
EXPECTED_PLUGINS = [
    'ga4', 'gtm', 'google-ads', 'google-search-console', 'meta', 
    'dv360', 'trade-desk', 'tiktok', 'snapchat', 'linkedin', 
    'pinterest', 'hubspot', 'salesforce', 'snowflake', 'ga-ua', 
    'amazon-ads', 'reddit-ads', 'microsoft-ads', 'spotify-ads'
]

# Plugins with API support for NAMED_INVITE (should reach real APIs)
API_SUPPORTED_PLUGINS = [
    'hubspot', 'salesforce', 'snowflake', 'ga-ua', 'meta', 'microsoft-ads'
]

# Plugins WITHOUT API support (should return clear "no API" messages)  
NO_API_PLUGINS = [
    'dv360', 'tiktok', 'snapchat', 'pinterest', 'linkedin', 
    'trade-desk', 'amazon-ads', 'reddit-ads', 'spotify-ads'
]

# Plugins where canGrantAccess=false for NAMED_INVITE (should get 501)
NO_GRANT_ACCESS_PLUGINS = [
    'spotify-ads', 'amazon-ads', 'reddit-ads'
]

class TestResults:
    def __init__(self):
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.results = []
    
    def add_result(self, test_name: str, status: str, message: str = ""):
        self.total_tests += 1
        if status == "PASS":
            self.passed_tests += 1
        else:
            self.failed_tests += 1
        
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message
        })
        
        status_emoji = "✅" if status == "PASS" else "❌"
        print(f"{status_emoji} {test_name}: {message}")
    
    def print_summary(self):
        print(f"\n{'='*80}")
        print(f"TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%")
        
        if self.failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if result["status"] == "FAIL":
                    print(f"  - {result['test']}: {result['message']}")

def make_request(method: str, url: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
    """Make HTTP request and return (status_code, response_json, error)"""
    try:
        if method.upper() == "GET":
            response = requests.get(url, params=params, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=30)
        else:
            return None, None, f"Unsupported method: {method}"
            
        try:
            json_response = response.json()
        except:
            json_response = {"message": response.text}
            
        return response.status_code, json_response, None
        
    except requests.exceptions.Timeout:
        return None, None, "Request timeout"
    except requests.exceptions.RequestException as e:
        return None, None, str(e)

def test_plugin_registration(results: TestResults):
    """Test 1: Plugin Registration - GET /api/plugins should return exactly 19 plugins"""
    print(f"\n{'='*60}")
    print("TEST 1: PLUGIN REGISTRATION")
    print(f"{'='*60}")
    
    status_code, response, error = make_request("GET", f"{API_BASE}/plugins")
    
    if error:
        results.add_result("Plugin Registration", "FAIL", f"Request error: {error}")
        return
    
    if status_code != 200:
        results.add_result("Plugin Registration", "FAIL", f"HTTP {status_code}: {response}")
        return
    
    # Handle wrapped response format
    if isinstance(response, dict) and 'data' in response:
        plugins_list = response['data']
    elif isinstance(response, list):
        plugins_list = response
    else:
        results.add_result("Plugin Registration", "FAIL", "Response is not a list or wrapped object")
        return
    
    # Check total count
    if len(response) != 19:
        results.add_result("Plugin Count", "FAIL", f"Expected 19 plugins, got {len(response)}")
    else:
        results.add_result("Plugin Count", "PASS", f"Found exactly 19 plugins")
    
    # Check each plugin has required fields
    plugin_keys = []
    for plugin in response:
        if not all(key in plugin for key in ['platformKey', 'displayName', 'pluginVersion', 'category']):
            results.add_result("Plugin Structure", "FAIL", f"Plugin missing required fields: {plugin}")
            return
        plugin_keys.append(plugin['platformKey'])
    
    results.add_result("Plugin Structure", "PASS", "All plugins have required fields")
    
    # Check if all expected plugins are present
    missing_plugins = set(EXPECTED_PLUGINS) - set(plugin_keys)
    extra_plugins = set(plugin_keys) - set(EXPECTED_PLUGINS)
    
    if missing_plugins:
        results.add_result("Expected Plugins", "FAIL", f"Missing plugins: {missing_plugins}")
    elif extra_plugins:
        results.add_result("Expected Plugins", "FAIL", f"Extra plugins: {extra_plugins}")
    else:
        results.add_result("Expected Plugins", "PASS", "All expected plugins present")

def test_validation_all_plugins(results: TestResults):
    """Test 2: Validation Tests for ALL 19 plugins"""
    print(f"\n{'='*60}")
    print("TEST 2: VALIDATION TESTS (ALL 19 PLUGINS)")
    print(f"{'='*60}")
    
    validation_payload = {
        "accessToken": "",
        "target": "",
        "role": "",
        "identity": "",
        "accessItemType": ""
    }
    
    for plugin_key in EXPECTED_PLUGINS:
        status_code, response, error = make_request(
            "POST", 
            f"{API_BASE}/oauth/{plugin_key}/grant-access",
            data=validation_payload
        )
        
        if error:
            results.add_result(f"Validation {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        # Should return success: false with validation error
        if isinstance(response, dict):
            if response.get('success') == False:
                if 'missing' in str(response).lower() or 'required' in str(response).lower() or 'validation' in str(response).lower():
                    results.add_result(f"Validation {plugin_key}", "PASS", "Correctly validates missing fields")
                else:
                    results.add_result(f"Validation {plugin_key}", "FAIL", f"Wrong validation error: {response}")
            else:
                results.add_result(f"Validation {plugin_key}", "FAIL", f"Should fail validation: {response}")
        else:
            results.add_result(f"Validation {plugin_key}", "FAIL", f"Unexpected response format: {response}")

def test_shared_account_rejection(results: TestResults):
    """Test 3: SHARED_ACCOUNT Rejection for ALL 19 plugins"""
    print(f"\n{'='*60}")
    print("TEST 3: SHARED_ACCOUNT REJECTION (ALL 19 PLUGINS)")
    print(f"{'='*60}")
    
    shared_account_payload = {
        "accessToken": "tok",
        "target": "res/1",
        "role": "editor",
        "identity": "user@test.com",
        "accessItemType": "SHARED_ACCOUNT"
    }
    
    for plugin_key in EXPECTED_PLUGINS:
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/grant-access",
            data=shared_account_payload
        )
        
        if error:
            results.add_result(f"SHARED_ACCOUNT {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        # All plugins should reject SHARED_ACCOUNT grant attempts
        if isinstance(response, dict):
            if response.get('success') == False or status_code in [501, 400]:
                results.add_result(f"SHARED_ACCOUNT {plugin_key}", "PASS", "Correctly rejects SHARED_ACCOUNT")
            else:
                results.add_result(f"SHARED_ACCOUNT {plugin_key}", "FAIL", f"Should reject SHARED_ACCOUNT: {response}")
        else:
            results.add_result(f"SHARED_ACCOUNT {plugin_key}", "FAIL", f"Unexpected response: {response}")

def test_capabilities_check(results: TestResults):
    """Test 4: Capabilities Check"""
    print(f"\n{'='*60}")
    print("TEST 4: CAPABILITIES CHECK")
    print(f"{'='*60}")
    
    capabilities_payload = {
        "accessItemType": "NAMED_INVITE"
    }
    
    for plugin_key in EXPECTED_PLUGINS:
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/capabilities",
            data=capabilities_payload
        )
        
        if error:
            results.add_result(f"Capabilities {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        if status_code == 200 and isinstance(response, dict):
            results.add_result(f"Capabilities {plugin_key}", "PASS", "Returns capabilities")
        else:
            results.add_result(f"Capabilities {plugin_key}", "FAIL", f"HTTP {status_code}: {response}")

def test_real_api_integration(results: TestResults):
    """Test 5: Real API Integration with fake tokens"""
    print(f"\n{'='*60}")
    print("TEST 5: REAL API INTEGRATION (FAKE TOKENS)")
    print(f"{'='*60}")
    
    fake_token_payload = {
        "accessToken": "fake_token_12345",
        "target": "test_target",
        "role": "editor", 
        "identity": "test@example.com",
        "accessItemType": "NAMED_INVITE"
    }
    
    # Test plugins with API support - should reach real APIs and get auth errors
    for plugin_key in API_SUPPORTED_PLUGINS:
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/grant-access",
            data=fake_token_payload
        )
        
        if error:
            results.add_result(f"API Integration {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        # Should reach real API and get authentication/authorization error
        if status_code in [400, 401, 403] or (isinstance(response, dict) and 
            ('auth' in str(response).lower() or 'unauthorized' in str(response).lower() or 
             'invalid' in str(response).lower() or 'not found' in str(response).lower())):
            results.add_result(f"API Integration {plugin_key}", "PASS", "Reaches real API (auth error expected)")
        else:
            results.add_result(f"API Integration {plugin_key}", "FAIL", f"Unexpected response: {status_code} {response}")
    
    # Test plugins WITHOUT API support - should return clear "no API" messages
    for plugin_key in NO_API_PLUGINS:
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/grant-access", 
            data=fake_token_payload
        )
        
        if error:
            results.add_result(f"No API {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        if status_code == 501 or (isinstance(response, dict) and 
            ('not support' in str(response).lower() or 'no api' in str(response).lower() or
             'not implemented' in str(response).lower())):
            results.add_result(f"No API {plugin_key}", "PASS", "Returns clear 'no API' message")
        else:
            results.add_result(f"No API {plugin_key}", "FAIL", f"Should return 'no API': {status_code} {response}")

def test_manifest_capability_enforcement(results: TestResults):
    """Test 6: Manifest Capability Enforcement"""
    print(f"\n{'='*60}")
    print("TEST 6: MANIFEST CAPABILITY ENFORCEMENT")
    print(f"{'='*60}")
    
    fake_token_payload = {
        "accessToken": "fake_token_12345",
        "target": "test_target",
        "role": "editor",
        "identity": "test@example.com", 
        "accessItemType": "NAMED_INVITE"
    }
    
    # Test plugins where canGrantAccess=false for NAMED_INVITE should get 501
    for plugin_key in NO_GRANT_ACCESS_PLUGINS:
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/grant-access",
            data=fake_token_payload
        )
        
        if error:
            results.add_result(f"Capability Enforcement {plugin_key}", "FAIL", f"Request error: {error}")
            continue
        
        if status_code == 501:
            results.add_result(f"Capability Enforcement {plugin_key}", "PASS", "Correctly returns 501 (no API support)")
        else:
            results.add_result(f"Capability Enforcement {plugin_key}", "FAIL", f"Should return 501: {status_code} {response}")

def run_additional_verify_revoke_tests(results: TestResults):
    """Additional tests for verify-access and revoke-access endpoints"""
    print(f"\n{'='*60}")
    print("ADDITIONAL TESTS: VERIFY AND REVOKE ACCESS")
    print(f"{'='*60}")
    
    verify_payload = {
        "accessToken": "fake_token_12345",
        "target": "test_target", 
        "identity": "test@example.com",
        "accessItemType": "NAMED_INVITE"
    }
    
    revoke_payload = {
        "accessToken": "fake_token_12345",
        "target": "test_target",
        "identity": "test@example.com",
        "accessItemType": "NAMED_INVITE"  
    }
    
    # Test verify-access for a few key plugins
    for plugin_key in ['ga4', 'gtm', 'google-ads', 'meta', 'salesforce']:
        # Verify Access
        status_code, response, error = make_request(
            "POST",
            f"{API_BASE}/oauth/{plugin_key}/verify-access",
            data=verify_payload
        )
        
        if error:
            results.add_result(f"Verify Access {plugin_key}", "FAIL", f"Request error: {error}")
        elif status_code in [200, 400, 401, 403, 501]:
            results.add_result(f"Verify Access {plugin_key}", "PASS", f"Endpoint accessible (HTTP {status_code})")
        else:
            results.add_result(f"Verify Access {plugin_key}", "FAIL", f"Unexpected status: {status_code}")
        
        # Revoke Access  
        status_code, response, error = make_request(
            "POST", 
            f"{API_BASE}/oauth/{plugin_key}/revoke-access",
            data=revoke_payload
        )
        
        if error:
            results.add_result(f"Revoke Access {plugin_key}", "FAIL", f"Request error: {error}")
        elif status_code in [200, 400, 401, 403, 501]:
            results.add_result(f"Revoke Access {plugin_key}", "PASS", f"Endpoint accessible (HTTP {status_code})")
        else:
            results.add_result(f"Revoke Access {plugin_key}", "FAIL", f"Unexpected status: {status_code}")

def main():
    """Run all plugin system tests"""
    print("🚀 Starting Access Provisioning Platform Plugin System Testing")
    print(f"Base URL: {BASE_URL}")
    print(f"Testing {len(EXPECTED_PLUGINS)} plugins")
    
    results = TestResults()
    
    try:
        # Run all test suites
        test_plugin_registration(results)
        test_validation_all_plugins(results)
        test_shared_account_rejection(results)
        test_capabilities_check(results)
        test_real_api_integration(results)
        test_manifest_capability_enforcement(results)
        run_additional_verify_revoke_tests(results)
        
        # Print final summary
        results.print_summary()
        
        # Exit with appropriate code
        if results.failed_tests == 0:
            print(f"\n🎉 ALL TESTS PASSED! Plugin system is working correctly.")
            sys.exit(0)
        else:
            print(f"\n❌ {results.failed_tests} test(s) failed. See details above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()