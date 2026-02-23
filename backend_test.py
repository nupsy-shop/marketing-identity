#!/usr/bin/env python3

import requests
import json
import sys
import os
from urllib.parse import urljoin

# Get the base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://plugin-oauth-setup.preview.emergentagent.com')
API_BASE_URL = urljoin(BASE_URL, '/api')

def test_oauth_configuration_wiring():
    """
    Test the newly implemented OAuth configuration wiring in the Marketing Identity Platform.
    
    This test verifies:
    1. OAuth Status Endpoints
    2. OAuth Start Endpoints with Unconfigured Credentials (should return 501)
    3. Error Response Structure
    4. Regression testing of existing plugin endpoints
    """
    print("🚀 Starting OAuth Configuration Wiring Testing...")
    
    results = []
    
    # ═══ TEST 1: OAuth Status Endpoints ═══
    print("\n📊 TEST 1: OAuth Status Endpoints")
    
    try:
        # GET /api/oauth/status - Should return configuration status for all OAuth providers
        print("  ➤ Testing GET /api/oauth/status...")
        response = requests.get(f"{API_BASE_URL}/oauth/status", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                providers_status = data['data']
                expected_providers = ['google', 'linkedin', 'hubspot', 'salesforce', 'snowflake', 'meta', 'tiktok', 'snapchat', 'pinterest']
                
                found_providers = list(providers_status.keys())
                print(f"    Found providers: {found_providers}")
                
                # Check if all expected providers are present
                missing_providers = [p for p in expected_providers if p not in found_providers]
                if missing_providers:
                    print(f"    ❌ Missing providers: {missing_providers}")
                    results.append(("OAuth Status All Providers", False, f"Missing providers: {missing_providers}"))
                else:
                    # Check that all providers show configured: false (since we have placeholder values)
                    misconfigured = []
                    for provider, status in providers_status.items():
                        if status.get('configured') != False:
                            misconfigured.append(provider)
                    
                    if misconfigured:
                        print(f"    ❌ Providers incorrectly showing as configured: {misconfigured}")
                        results.append(("OAuth Status All Providers", False, f"Providers showing configured=true: {misconfigured}"))
                    else:
                        print(f"    ✅ All {len(found_providers)} providers correctly show configured=false")
                        results.append(("OAuth Status All Providers", True, f"All {len(found_providers)} providers correctly unconfigured"))
            else:
                print(f"    ❌ Invalid response structure: {data}")
                results.append(("OAuth Status All Providers", False, f"Invalid response structure"))
        else:
            print(f"    ❌ Request failed with status {response.status_code}: {response.text}")
            results.append(("OAuth Status All Providers", False, f"HTTP {response.status_code}"))
    except Exception as e:
        print(f"    ❌ Exception occurred: {e}")
        results.append(("OAuth Status All Providers", False, str(e)))
    
    # Test platform-specific status endpoints
    platform_tests = [
        ('linkedin', 'linkedin'),
        ('ga4', 'google')  # ga4 should map to google provider
    ]
    
    for platform, expected_provider in platform_tests:
        try:
            print(f"  ➤ Testing GET /api/oauth/{platform}/status...")
            response = requests.get(f"{API_BASE_URL}/oauth/{platform}/status", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'data' in data:
                    status_data = data['data']
                    
                    # Verify platform key
                    if status_data.get('platformKey') != platform:
                        print(f"    ❌ Wrong platformKey: expected {platform}, got {status_data.get('platformKey')}")
                        results.append((f"OAuth Status {platform}", False, "Wrong platformKey"))
                        continue
                    
                    # Verify provider mapping
                    if status_data.get('provider') != expected_provider:
                        print(f"    ❌ Wrong provider mapping: expected {expected_provider}, got {status_data.get('provider')}")
                        results.append((f"OAuth Status {platform}", False, f"Wrong provider mapping"))
                        continue
                    
                    # Verify OAuth support
                    if not status_data.get('oauthSupported'):
                        print(f"    ❌ OAuth support not indicated for {platform}")
                        results.append((f"OAuth Status {platform}", False, "OAuth support not indicated"))
                        continue
                    
                    # Verify not configured (placeholder values)
                    if status_data.get('configured') != False:
                        print(f"    ❌ {platform} incorrectly showing as configured")
                        results.append((f"OAuth Status {platform}", False, "Incorrectly configured"))
                        continue
                    
                    # Verify required fields are present
                    required_fields = ['displayName', 'developerPortalUrl', 'requiredEnvVars']
                    missing_fields = [field for field in required_fields if field not in status_data]
                    if missing_fields:
                        print(f"    ❌ Missing fields: {missing_fields}")
                        results.append((f"OAuth Status {platform}", False, f"Missing fields: {missing_fields}"))
                        continue
                    
                    print(f"    ✅ {platform} status correct: provider={expected_provider}, configured=false")
                    results.append((f"OAuth Status {platform}", True, f"Correct status for {platform}"))
                else:
                    print(f"    ❌ Invalid response structure: {data}")
                    results.append((f"OAuth Status {platform}", False, "Invalid response structure"))
            else:
                print(f"    ❌ Request failed with status {response.status_code}: {response.text}")
                results.append((f"OAuth Status {platform}", False, f"HTTP {response.status_code}"))
        except Exception as e:
            print(f"    ❌ Exception occurred: {e}")
            results.append((f"OAuth Status {platform}", False, str(e)))
    
    # ═══ TEST 2: OAuth Start Endpoints with Unconfigured Credentials ═══
    print("\n🚫 TEST 2: OAuth Start Endpoints with Unconfigured Credentials")
    
    oauth_start_tests = [
        ('linkedin', 'LinkedIn'),
        ('hubspot', 'HubSpot'), 
        ('salesforce', 'Salesforce'),
        ('snowflake', 'Snowflake')
    ]
    
    for platform, expected_name in oauth_start_tests:
        try:
            print(f"  ➤ Testing POST /api/oauth/{platform}/start...")
            payload = {"redirectUri": "https://example.com/callback"}
            response = requests.post(f"{API_BASE_URL}/oauth/{platform}/start", 
                                   json=payload, 
                                   headers={"Content-Type": "application/json"},
                                   timeout=30)
            
            # Should return 501 Not Implemented with clear error message
            if response.status_code == 501:
                data = response.json()
                
                # Check response structure
                if not data.get('success') and 'error' in data:
                    error_message = data['error']
                    
                    # Check that error message mentions the platform and OAuth not configured
                    expected_messages = [
                        f"{expected_name} OAuth is not configured",
                        "not configured",
                        "environment variables"
                    ]
                    
                    message_found = any(msg.lower() in error_message.lower() for msg in expected_messages)
                    if not message_found:
                        print(f"    ❌ Error message doesn't match expected pattern: {error_message}")
                        results.append((f"OAuth Start {platform} Error Message", False, "Wrong error message"))
                        continue
                    
                    # Check details structure
                    if 'details' in data:
                        details = data['details']
                        required_detail_fields = ['provider', 'requiredEnvVars', 'developerPortalUrl']
                        missing_detail_fields = [field for field in required_detail_fields if field not in details]
                        
                        if missing_detail_fields:
                            print(f"    ❌ Missing detail fields: {missing_detail_fields}")
                            results.append((f"OAuth Start {platform} Details", False, f"Missing fields: {missing_detail_fields}"))
                        else:
                            # Check that requiredEnvVars is an array
                            if not isinstance(details.get('requiredEnvVars'), list) or len(details['requiredEnvVars']) == 0:
                                print(f"    ❌ requiredEnvVars should be a non-empty array")
                                results.append((f"OAuth Start {platform} Details", False, "Invalid requiredEnvVars"))
                            else:
                                print(f"    ✅ {platform} correctly returns 501 with proper error structure")
                                results.append((f"OAuth Start {platform}", True, f"Correct 501 response for {platform}"))
                    else:
                        print(f"    ❌ Missing details object in response")
                        results.append((f"OAuth Start {platform} Details", False, "Missing details"))
                else:
                    print(f"    ❌ Invalid error response structure: {data}")
                    results.append((f"OAuth Start {platform}", False, "Invalid error response structure"))
            else:
                print(f"    ❌ Expected 501, got {response.status_code}: {response.text}")
                results.append((f"OAuth Start {platform}", False, f"Expected 501, got {response.status_code}"))
        except Exception as e:
            print(f"    ❌ Exception occurred: {e}")
            results.append((f"OAuth Start {platform}", False, str(e)))
    
    # ═══ TEST 3: Error Response Structure Validation ═══
    print("\n🔍 TEST 3: Error Response Structure Deep Validation")
    
    # Test one platform in detail for error structure
    try:
        print("  ➤ Testing LinkedIn error response structure in detail...")
        payload = {"redirectUri": "https://example.com/callback"}
        response = requests.post(f"{API_BASE_URL}/oauth/linkedin/start", 
                               json=payload, 
                               headers={"Content-Type": "application/json"},
                               timeout=30)
        
        if response.status_code == 501:
            data = response.json()
            
            # Verify complete structure
            expected_structure = {
                'success': False,
                'error': str,
                'details': {
                    'provider': str,
                    'requiredEnvVars': list,
                    'developerPortalUrl': str
                }
            }
            
            structure_errors = []
            
            # Check main structure
            if data.get('success') != False:
                structure_errors.append("success should be false")
            
            if not isinstance(data.get('error'), str) or len(data.get('error', '')) == 0:
                structure_errors.append("error should be non-empty string")
            
            details = data.get('details', {})
            if not isinstance(details, dict):
                structure_errors.append("details should be object")
            else:
                if details.get('provider') != 'linkedin':
                    structure_errors.append("details.provider should be 'linkedin'")
                
                if not isinstance(details.get('requiredEnvVars'), list) or len(details.get('requiredEnvVars', [])) < 2:
                    structure_errors.append("details.requiredEnvVars should be array with at least 2 items")
                else:
                    # Check that env vars are reasonable
                    env_vars = details['requiredEnvVars']
                    if not any('LINKEDIN_CLIENT_ID' in var for var in env_vars):
                        structure_errors.append("Missing LINKEDIN_CLIENT_ID in requiredEnvVars")
                    if not any('LINKEDIN_CLIENT_SECRET' in var for var in env_vars):
                        structure_errors.append("Missing LINKEDIN_CLIENT_SECRET in requiredEnvVars")
                
                if not isinstance(details.get('developerPortalUrl'), str) or not details.get('developerPortalUrl', '').startswith('http'):
                    structure_errors.append("details.developerPortalUrl should be valid URL")
            
            if structure_errors:
                print(f"    ❌ Structure errors: {structure_errors}")
                results.append(("Error Response Structure", False, f"Structure errors: {structure_errors}"))
            else:
                print(f"    ✅ Error response structure is complete and correct")
                results.append(("Error Response Structure", True, "Complete error response structure"))
        else:
            print(f"    ❌ Expected 501 for structure test, got {response.status_code}")
            results.append(("Error Response Structure", False, f"Wrong status code for structure test"))
    except Exception as e:
        print(f"    ❌ Exception in structure test: {e}")
        results.append(("Error Response Structure", False, str(e)))
    
    # ═══ TEST 4: Existing Plugin Endpoints (Regression Testing) ═══
    print("\n🔄 TEST 4: Existing Plugin Endpoints (Regression Testing)")
    
    try:
        # GET /api/plugins - Should still return all 15 plugins
        print("  ➤ Testing GET /api/plugins (regression test)...")
        response = requests.get(f"{API_BASE_URL}/plugins", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                plugins = data['data']
                
                if len(plugins) >= 15:  # Should have at least 15 plugins
                    print(f"    ✅ Plugins endpoint working: {len(plugins)} plugins returned")
                    results.append(("Plugins Regression Test", True, f"{len(plugins)} plugins returned"))
                else:
                    print(f"    ❌ Expected at least 15 plugins, got {len(plugins)}")
                    results.append(("Plugins Regression Test", False, f"Only {len(plugins)} plugins"))
            else:
                print(f"    ❌ Invalid response structure: {data}")
                results.append(("Plugins Regression Test", False, "Invalid response structure"))
        else:
            print(f"    ❌ Plugins endpoint failed: {response.status_code}")
            results.append(("Plugins Regression Test", False, f"HTTP {response.status_code}"))
    except Exception as e:
        print(f"    ❌ Exception in plugins test: {e}")
        results.append(("Plugins Regression Test", False, str(e)))
    
    try:
        # GET /api/plugins/ga4 - Should return plugin details
        print("  ➤ Testing GET /api/plugins/ga4 (regression test)...")
        response = requests.get(f"{API_BASE_URL}/plugins/ga4", timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and 'data' in data:
                plugin_data = data['data']
                
                # Check that manifest exists
                if 'manifest' in plugin_data:
                    manifest = plugin_data['manifest']
                    
                    # Check key fields
                    if manifest.get('platformKey') == 'ga4' and manifest.get('displayName'):
                        print(f"    ✅ GA4 plugin details working: {manifest.get('displayName')}")
                        results.append(("GA4 Plugin Regression Test", True, "GA4 plugin details correct"))
                    else:
                        print(f"    ❌ GA4 plugin manifest missing key fields")
                        results.append(("GA4 Plugin Regression Test", False, "Missing manifest fields"))
                else:
                    print(f"    ❌ GA4 plugin missing manifest")
                    results.append(("GA4 Plugin Regression Test", False, "Missing manifest"))
            else:
                print(f"    ❌ Invalid GA4 response structure: {data}")
                results.append(("GA4 Plugin Regression Test", False, "Invalid response structure"))
        else:
            print(f"    ❌ GA4 plugin endpoint failed: {response.status_code}")
            results.append(("GA4 Plugin Regression Test", False, f"HTTP {response.status_code}"))
    except Exception as e:
        print(f"    ❌ Exception in GA4 plugin test: {e}")
        results.append(("GA4 Plugin Regression Test", False, str(e)))
    
    # ═══ TEST SUMMARY ═══
    print("\n" + "="*80)
    print("📋 OAUTH CONFIGURATION WIRING TEST RESULTS")
    print("="*80)
    
    passed = 0
    failed = 0
    
    for test_name, success, details in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status:10} | {test_name:<40} | {details}")
        
        if success:
            passed += 1
        else:
            failed += 1
    
    print("="*80)
    print(f"📊 SUMMARY: {passed} passed, {failed} failed, {passed+failed} total")
    
    if failed == 0:
        print("🎉 ALL OAUTH CONFIGURATION WIRING TESTS PASSED!")
        return True
    else:
        print(f"💥 {failed} TESTS FAILED - OAuth configuration wiring needs attention")
        return False

if __name__ == "__main__":
    print(f"🌐 Testing against: {BASE_URL}")
    success = test_oauth_configuration_wiring()
    sys.exit(0 if success else 1)