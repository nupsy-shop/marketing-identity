#!/usr/bin/env python3
"""
Backend Test Suite for OAuth 2.0 Flows with Target Discovery
Testing Marketing Identity Platform OAuth implementation
"""

import requests
import json
import sys
import os
from urllib.parse import urlparse, parse_qs

# Get base URL from environment
BASE_URL = "https://plugin-oauth-setup.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_get_request(url, description):
    """Helper function to test GET requests"""
    try:
        print(f"\n🧪 Testing: {description}")
        print(f"📡 GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"📊 Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                data = response.json()
                print(f"📋 Response: {json.dumps(data, indent=2)}")
                return response.status_code, data
            except:
                print(f"📋 Response: {response.text[:500]}")
                return response.status_code, response.text
        else:
            print(f"📋 Response: {response.text[:200]}")
            return response.status_code, response.text
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None, str(e)

def test_post_request(url, payload, description):
    """Helper function to test POST requests"""
    try:
        print(f"\n🧪 Testing: {description}")
        print(f"📡 POST {url}")
        print(f"📦 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"📊 Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                data = response.json()
                print(f"📋 Response: {json.dumps(data, indent=2)}")
                return response.status_code, data
            except:
                print(f"📋 Response: {response.text[:500]}")
                return response.status_code, response.text
        else:
            print(f"📋 Response: {response.text[:200]}")
            return response.status_code, response.text
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None, str(e)

def main():
    """Main test execution"""
    print("🎯 OAuth 2.0 Flows with Target Discovery - Backend Testing")
    print("=" * 80)
    
    test_results = {
        "plugin_manifest_updates": [],
        "oauth_status_endpoints": [],
        "oauth_flows_unconfigured": [],
        "token_storage_endpoints": [],
        "regression_tests": []
    }
    
    # ===============================================================================
    # 1. PLUGIN MANIFEST UPDATES - Test discoverTargetsSupported and targetTypes
    # ===============================================================================
    
    print("\n" + "="*50)
    print("1. PLUGIN MANIFEST UPDATES TESTING")
    print("="*50)
    
    # Test LinkedIn plugin manifest
    status, data = test_get_request(f"{API_BASE}/plugins/linkedin", "LinkedIn Plugin Manifest")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        manifest_data = data.get('data', {}).get('manifest', data)
        automation_caps = manifest_data.get('automationCapabilities', {})
        discover_supported = automation_caps.get('discoverTargetsSupported', False)
        target_types = automation_caps.get('targetTypes', [])
        
        if discover_supported and 'AD_ACCOUNT' in target_types:
            print("✅ LinkedIn: discoverTargetsSupported=true, targetTypes includes AD_ACCOUNT")
            test_results["plugin_manifest_updates"].append("LinkedIn: PASS")
        else:
            print(f"❌ LinkedIn: discoverTargetsSupported={discover_supported}, targetTypes={target_types}")
            test_results["plugin_manifest_updates"].append("LinkedIn: FAIL")
    else:
        print("❌ LinkedIn: Failed to get plugin manifest")
        test_results["plugin_manifest_updates"].append("LinkedIn: ERROR")
    
    # Test HubSpot plugin manifest
    status, data = test_get_request(f"{API_BASE}/plugins/hubspot", "HubSpot Plugin Manifest")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        manifest_data = data.get('data', {}).get('manifest', data)
        automation_caps = manifest_data.get('automationCapabilities', {})
        discover_supported = automation_caps.get('discoverTargetsSupported', False)
        target_types = automation_caps.get('targetTypes', [])
        
        if discover_supported and 'PORTAL' in target_types:
            print("✅ HubSpot: discoverTargetsSupported=true, targetTypes includes PORTAL")
            test_results["plugin_manifest_updates"].append("HubSpot: PASS")
        else:
            print(f"❌ HubSpot: discoverTargetsSupported={discover_supported}, targetTypes={target_types}")
            test_results["plugin_manifest_updates"].append("HubSpot: FAIL")
    else:
        print("❌ HubSpot: Failed to get plugin manifest")
        test_results["plugin_manifest_updates"].append("HubSpot: ERROR")
    
    # Test Salesforce plugin manifest
    status, data = test_get_request(f"{API_BASE}/plugins/salesforce", "Salesforce Plugin Manifest")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        manifest_data = data.get('data', {}).get('manifest', data)
        automation_caps = manifest_data.get('automationCapabilities', {})
        discover_supported = automation_caps.get('discoverTargetsSupported', False)
        target_types = automation_caps.get('targetTypes', [])
        
        if discover_supported and 'ORG' in target_types:
            print("✅ Salesforce: discoverTargetsSupported=true, targetTypes includes ORG")
            test_results["plugin_manifest_updates"].append("Salesforce: PASS")
        else:
            print(f"❌ Salesforce: discoverTargetsSupported={discover_supported}, targetTypes={target_types}")
            test_results["plugin_manifest_updates"].append("Salesforce: FAIL")
    else:
        print("❌ Salesforce: Failed to get plugin manifest")
        test_results["plugin_manifest_updates"].append("Salesforce: ERROR")
    
    # Test Snowflake plugin manifest
    status, data = test_get_request(f"{API_BASE}/plugins/snowflake", "Snowflake Plugin Manifest")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        manifest_data = data.get('data', {}).get('manifest', data)
        automation_caps = manifest_data.get('automationCapabilities', {})
        discover_supported = automation_caps.get('discoverTargetsSupported', False)
        target_types = automation_caps.get('targetTypes', [])
        
        expected_types = ['ACCOUNT', 'WAREHOUSE', 'DATABASE']
        has_expected_types = all(t in target_types for t in expected_types)
        
        if discover_supported and has_expected_types:
            print("✅ Snowflake: discoverTargetsSupported=true, targetTypes includes ACCOUNT, WAREHOUSE, DATABASE")
            test_results["plugin_manifest_updates"].append("Snowflake: PASS")
        else:
            print(f"❌ Snowflake: discoverTargetsSupported={discover_supported}, targetTypes={target_types}")
            test_results["plugin_manifest_updates"].append("Snowflake: FAIL")
    else:
        print("❌ Snowflake: Failed to get plugin manifest")
        test_results["plugin_manifest_updates"].append("Snowflake: ERROR")
    
    # ===============================================================================
    # 2. OAUTH STATUS ENDPOINTS TESTING
    # ===============================================================================
    
    print("\n" + "="*50)
    print("2. OAUTH STATUS ENDPOINTS TESTING")
    print("="*50)
    
    # Test GET /api/oauth/status - Should list all 9 providers
    status, data = test_get_request(f"{API_BASE}/oauth/status", "OAuth Status - All Providers")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        status_data = data.get('data', data)
        found_providers = list(status_data.keys())
        all_configured_false = all(not provider.get('configured', True) for provider in status_data.values())
        
        if len(found_providers) >= 9 and all_configured_false:
            print(f"✅ OAuth Status: Found {len(found_providers)} providers, all showing configured=false")
            test_results["oauth_status_endpoints"].append("Global Status: PASS")
        else:
            print(f"❌ OAuth Status: Expected 9+ providers with configured=false, got {len(found_providers)}, configured_false={all_configured_false}")
            test_results["oauth_status_endpoints"].append("Global Status: FAIL")
    else:
        print("❌ OAuth Status: Failed to get provider status")
        test_results["oauth_status_endpoints"].append("Global Status: ERROR")
    
    # Test GET /api/oauth/linkedin/status - Platform specific status
    status, data = test_get_request(f"{API_BASE}/oauth/linkedin/status", "LinkedIn OAuth Status")
    if status == 200 and isinstance(data, dict):
        # Handle API response wrapper
        status_data = data.get('data', data)
        configured = status_data.get('configured', True)
        required_vars = status_data.get('requiredEnvVars', [])
        
        if not configured and 'LINKEDIN_CLIENT_ID' in required_vars and 'LINKEDIN_CLIENT_SECRET' in required_vars:
            print("✅ LinkedIn Status: configured=false with proper required env vars")
            test_results["oauth_status_endpoints"].append("LinkedIn Status: PASS")
        else:
            print(f"❌ LinkedIn Status: configured={configured}, requiredEnvVars={required_vars}")
            test_results["oauth_status_endpoints"].append("LinkedIn Status: FAIL")
    else:
        print("❌ LinkedIn Status: Failed to get LinkedIn status")
        test_results["oauth_status_endpoints"].append("LinkedIn Status: ERROR")
    
    # ===============================================================================
    # 3. OAUTH FLOWS WITH UNCONFIGURED CREDENTIALS
    # ===============================================================================
    
    print("\n" + "="*50)
    print("3. OAUTH FLOWS WITH UNCONFIGURED CREDENTIALS")
    print("="*50)
    
    # Test POST /api/oauth/linkedin/start - Should return 501 (not configured)
    payload = {"redirectUri": "https://example.com/callback"}
    status, data = test_post_request(f"{API_BASE}/oauth/linkedin/start", payload, "LinkedIn OAuth Start")
    
    if status == 501:
        if isinstance(data, dict) and not data.get('success', True):
            print("✅ LinkedIn Start: Returns HTTP 501 with error message")
            test_results["oauth_flows_unconfigured"].append("LinkedIn Start: PASS")
        else:
            print("❌ LinkedIn Start: Wrong error response format")
            test_results["oauth_flows_unconfigured"].append("LinkedIn Start: FAIL")
    else:
        print(f"❌ LinkedIn Start: Expected HTTP 501, got {status}")
        test_results["oauth_flows_unconfigured"].append("LinkedIn Start: FAIL")
    
    # Test POST /api/oauth/linkedin/discover-targets - Should return 501 (not configured)
    payload = {"accessToken": "test"}
    status, data = test_post_request(f"{API_BASE}/oauth/linkedin/discover-targets", payload, "LinkedIn Discover Targets")
    
    if status == 501:
        if isinstance(data, dict) and not data.get('success', True):
            print("✅ LinkedIn Discover Targets: Returns HTTP 501 with error message")
            test_results["oauth_flows_unconfigured"].append("LinkedIn Discover: PASS")
        else:
            print("❌ LinkedIn Discover Targets: Wrong error response format")
            test_results["oauth_flows_unconfigured"].append("LinkedIn Discover: FAIL")
    else:
        print(f"❌ LinkedIn Discover Targets: Expected HTTP 501, got {status}")
        test_results["oauth_flows_unconfigured"].append("LinkedIn Discover: FAIL")
    
    # Test HubSpot OAuth start
    status, data = test_post_request(f"{API_BASE}/oauth/hubspot/start", payload, "HubSpot OAuth Start")
    
    if status == 501:
        print("✅ HubSpot Start: Returns HTTP 501 (not configured)")
        test_results["oauth_flows_unconfigured"].append("HubSpot Start: PASS")
    else:
        print(f"❌ HubSpot Start: Expected HTTP 501, got {status}")
        test_results["oauth_flows_unconfigured"].append("HubSpot Start: FAIL")
    
    # Test Salesforce OAuth start
    status, data = test_post_request(f"{API_BASE}/oauth/salesforce/start", payload, "Salesforce OAuth Start")
    
    if status == 501:
        print("✅ Salesforce Start: Returns HTTP 501 (not configured)")
        test_results["oauth_flows_unconfigured"].append("Salesforce Start: PASS")
    else:
        print(f"❌ Salesforce Start: Expected HTTP 501, got {status}")
        test_results["oauth_flows_unconfigured"].append("Salesforce Start: FAIL")
    
    # Test Snowflake OAuth start
    status, data = test_post_request(f"{API_BASE}/oauth/snowflake/start", payload, "Snowflake OAuth Start")
    
    if status == 501:
        print("✅ Snowflake Start: Returns HTTP 501 (not configured)")
        test_results["oauth_flows_unconfigured"].append("Snowflake Start: PASS")
    else:
        print(f"❌ Snowflake Start: Expected HTTP 501, got {status}")
        test_results["oauth_flows_unconfigured"].append("Snowflake Start: FAIL")
    
    # ===============================================================================
    # 4. TOKEN STORAGE ENDPOINTS
    # ===============================================================================
    
    print("\n" + "="*50)
    print("4. TOKEN STORAGE ENDPOINTS TESTING")
    print("="*50)
    
    # Test GET /api/oauth/tokens - Should return empty array initially
    status, data = test_get_request(f"{API_BASE}/oauth/tokens", "OAuth Tokens List")
    
    if status == 200:
        if isinstance(data, list) and len(data) == 0:
            print("✅ OAuth Tokens: Returns empty array initially")
            test_results["token_storage_endpoints"].append("Tokens List: PASS")
        elif isinstance(data, dict) and data.get('tokens') is not None:
            tokens = data.get('tokens', [])
            if len(tokens) == 0:
                print("✅ OAuth Tokens: Returns empty tokens array initially")
                test_results["token_storage_endpoints"].append("Tokens List: PASS")
            else:
                print(f"⚠️ OAuth Tokens: Found {len(tokens)} existing tokens")
                test_results["token_storage_endpoints"].append("Tokens List: PASS (with data)")
        else:
            print(f"❌ OAuth Tokens: Unexpected response format: {type(data)}")
            test_results["token_storage_endpoints"].append("Tokens List: FAIL")
    else:
        print(f"❌ OAuth Tokens: Expected HTTP 200, got {status}")
        test_results["token_storage_endpoints"].append("Tokens List: ERROR")
    
    # ===============================================================================
    # 5. EXISTING PLUGIN API ENDPOINTS (REGRESSION TESTING)
    # ===============================================================================
    
    print("\n" + "="*50)
    print("5. REGRESSION TESTING - EXISTING PLUGIN API ENDPOINTS")
    print("="*50)
    
    # Test GET /api/plugins - Should return all plugins
    status, data = test_get_request(f"{API_BASE}/plugins", "All Plugins List")
    
    if status == 200 and isinstance(data, list):
        if len(data) >= 15:
            print(f"✅ Plugins List: Returns {len(data)} plugins")
            test_results["regression_tests"].append("Plugins List: PASS")
        else:
            print(f"❌ Plugins List: Expected 15+ plugins, got {len(data)}")
            test_results["regression_tests"].append("Plugins List: FAIL")
    else:
        print("❌ Plugins List: Failed to get plugins list")
        test_results["regression_tests"].append("Plugins List: ERROR")
    
    # Test GET /api/platforms - Should return platforms from catalog
    status, data = test_get_request(f"{API_BASE}/platforms", "Platforms List")
    
    if status == 200 and isinstance(data, list):
        if len(data) > 0:
            print(f"✅ Platforms List: Returns {len(data)} platforms")
            test_results["regression_tests"].append("Platforms List: PASS")
        else:
            print("❌ Platforms List: No platforms returned")
            test_results["regression_tests"].append("Platforms List: FAIL")
    else:
        print("❌ Platforms List: Failed to get platforms list")
        test_results["regression_tests"].append("Platforms List: ERROR")
    
    # ===============================================================================
    # SUMMARY AND RESULTS
    # ===============================================================================
    
    print("\n" + "="*80)
    print("🎯 OAUTH 2.0 TESTING SUMMARY")
    print("="*80)
    
    total_tests = 0
    passed_tests = 0
    
    for category, results in test_results.items():
        print(f"\n📊 {category.upper().replace('_', ' ')}:")
        for result in results:
            total_tests += 1
            if "PASS" in result:
                passed_tests += 1
                print(f"  ✅ {result}")
            elif "FAIL" in result:
                print(f"  ❌ {result}")
            else:
                print(f"  ⚠️ {result}")
    
    print(f"\n🏆 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({(passed_tests/total_tests*100):.1f}%)")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED - OAuth 2.0 implementation is working correctly!")
        return True
    else:
        print("⚠️ Some tests failed - Check the details above")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)