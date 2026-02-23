#!/usr/bin/env python3
"""
Modular Advertising Platform Plugin System Backend Test
Tests the newly implemented GA4 plugin refactored into modular architecture
"""

import requests
import json
import sys
from typing import Dict, List, Any

# Backend URL from environment
BASE_URL = "https://plugin-driven-pam.preview.emergentagent.com"

def make_request(method: str, endpoint: str, data: Dict = None) -> Dict:
    """Make HTTP request to backend API"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=30)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, timeout=30)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, timeout=30)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, timeout=30)
        else:
            print(f"❌ Unsupported HTTP method: {method}")
            return {"success": False, "error": f"Unsupported method: {method}"}
        
        return response.json() if response.text else {"success": True}
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed for {method} {endpoint}: {str(e)}")
        return {"success": False, "error": str(e)}
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON response for {method} {endpoint}: {str(e)}")
        return {"success": False, "error": f"Invalid JSON: {str(e)}"}

def test_plugin_api_verification():
    """Test Plugin API Verification"""
    print("\n🔍 Testing Plugin API Verification...")
    
    # Test GET /api/plugins - should list all 15 plugins
    print("1. Testing GET /api/plugins")
    result = make_request('GET', '/api/plugins')
    
    if not result.get('success'):
        print(f"❌ Failed to get plugins: {result.get('error')}")
        return False
    
    plugins = result.get('data', [])
    print(f"✅ Found {len(plugins)} plugins")
    
    if len(plugins) != 15:
        print(f"❌ Expected 15 plugins, got {len(plugins)}")
        return False
    
    # Test GET /api/plugins/ga4 - should return GA4 plugin with version 2.1.0
    print("2. Testing GET /api/plugins/ga4")
    result = make_request('GET', '/api/plugins/ga4')
    
    if not result.get('success'):
        print(f"❌ Failed to get GA4 plugin: {result.get('error')}")
        return False
    
    ga4_plugin = result.get('data', {})
    manifest = ga4_plugin.get('manifest', {})
    
    # Verify GA4 plugin details
    if manifest.get('pluginVersion') != '2.1.0':
        print(f"❌ Expected GA4 version 2.1.0, got {manifest.get('pluginVersion')}")
        return False
    
    print(f"✅ GA4 plugin version: {manifest.get('pluginVersion')}")
    
    # Verify GA4 manifest includes required fields
    supported_types = manifest.get('supportedAccessItemTypes', [])
    security_caps = manifest.get('securityCapabilities', {})
    automation_caps = manifest.get('automationCapabilities', {})
    
    # Check supportedAccessItemTypes includes NAMED_INVITE, GROUP_ACCESS, SHARED_ACCOUNT
    expected_types = ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT']
    found_types = []
    
    for item_type in supported_types:
        if isinstance(item_type, dict):
            found_types.append(item_type.get('type'))
        else:
            found_types.append(item_type)
    
    for expected in expected_types:
        if expected not in found_types:
            print(f"❌ Missing access item type: {expected}")
            return False
    
    print(f"✅ GA4 supports access types: {found_types}")
    
    # Check securityCapabilities has pamRecommendation
    if 'pamRecommendation' not in security_caps:
        print("❌ Missing pamRecommendation in securityCapabilities")
        return False
    
    print(f"✅ GA4 pamRecommendation: {security_caps.get('pamRecommendation')}")
    
    # Check automationCapabilities exists
    if not automation_caps:
        print("❌ Missing automationCapabilities")
        return False
    
    print("✅ GA4 automationCapabilities present")
    
    return True

def test_schema_generation():
    """Test Schema Generation endpoints"""
    print("\n🔍 Testing Schema Generation...")
    
    # Test NAMED_INVITE schema - should return schema with humanIdentityStrategy field
    print("1. Testing GET /api/plugins/ga4/schema/agency-config?accessItemType=NAMED_INVITE")
    result = make_request('GET', '/api/plugins/ga4/schema/agency-config?accessItemType=NAMED_INVITE')
    
    if not result.get('success'):
        print(f"❌ Failed to get NAMED_INVITE schema: {result.get('error')}")
        return False
    
    schema = result.get('data', {})
    properties = schema.get('properties', {})
    
    if 'humanIdentityStrategy' not in properties:
        print("❌ Missing humanIdentityStrategy field in NAMED_INVITE schema")
        return False
    
    print("✅ NAMED_INVITE schema includes humanIdentityStrategy field")
    
    # Test GROUP_ACCESS schema - should return schema with serviceAccountEmail field
    print("2. Testing GET /api/plugins/ga4/schema/agency-config?accessItemType=GROUP_ACCESS")
    result = make_request('GET', '/api/plugins/ga4/schema/agency-config?accessItemType=GROUP_ACCESS')
    
    if not result.get('success'):
        print(f"❌ Failed to get GROUP_ACCESS schema: {result.get('error')}")
        return False
    
    schema = result.get('data', {})
    properties = schema.get('properties', {})
    
    if 'serviceAccountEmail' not in properties:
        print("❌ Missing serviceAccountEmail field in GROUP_ACCESS schema")
        return False
    
    print("✅ GROUP_ACCESS schema includes serviceAccountEmail field")
    
    # Test SHARED_ACCOUNT schema - should return PAM schema with specific fields
    print("3. Testing GET /api/plugins/ga4/schema/agency-config?accessItemType=SHARED_ACCOUNT")
    result = make_request('GET', '/api/plugins/ga4/schema/agency-config?accessItemType=SHARED_ACCOUNT')
    
    if not result.get('success'):
        print(f"❌ Failed to get SHARED_ACCOUNT schema: {result.get('error')}")
        return False
    
    schema = result.get('data', {})
    properties = schema.get('properties', {})
    
    # Check for PAM schema fields
    expected_pam_fields = ['pamOwnership', 'identityPurpose', 'identityStrategy', 'agencyIdentityId']
    missing_fields = []
    
    for field in expected_pam_fields:
        if field not in properties:
            missing_fields.append(field)
    
    if missing_fields:
        print(f"❌ Missing PAM schema fields: {missing_fields}")
        return False
    
    print(f"✅ SHARED_ACCOUNT schema includes PAM fields: {list(properties.keys())}")
    
    return True

def test_pam_schema_validation():
    """Test PAM Schema Validation Rules via API calls"""
    print("\n🔍 Testing PAM Schema Validation Rules...")
    
    # Test pamOwnership is required
    print("1. Testing pamOwnership requirement")
    test_config = {"identityPurpose": "HUMAN_INTERACTIVE"}
    result = make_request('POST', '/api/plugins/ga4/validate/agency-config', {
        'accessItemType': 'SHARED_ACCOUNT',
        'config': test_config
    })
    
    if result.get('success') and result.get('data', {}).get('valid', True):
        print("❌ Should have failed validation without pamOwnership")
        return False
    
    print("✅ Correctly rejects config without pamOwnership")
    
    # Test AGENCY_OWNED requires identityPurpose
    print("2. Testing AGENCY_OWNED requires identityPurpose")
    test_config = {"pamOwnership": "AGENCY_OWNED"}
    result = make_request('POST', '/api/plugins/ga4/validate/agency-config', {
        'accessItemType': 'SHARED_ACCOUNT',
        'config': test_config
    })
    
    if result.get('success') and result.get('data', {}).get('valid', True):
        print("❌ Should have failed validation without identityPurpose for AGENCY_OWNED")
        return False
    
    print("✅ Correctly rejects AGENCY_OWNED config without identityPurpose")
    
    # Test HUMAN_INTERACTIVE requires identityStrategy
    print("3. Testing HUMAN_INTERACTIVE requires identityStrategy")
    test_config = {
        "pamOwnership": "AGENCY_OWNED",
        "identityPurpose": "HUMAN_INTERACTIVE"
    }
    result = make_request('POST', '/api/plugins/ga4/validate/agency-config', {
        'accessItemType': 'SHARED_ACCOUNT',
        'config': test_config
    })
    
    if result.get('success') and result.get('data', {}).get('valid', True):
        print("❌ Should have failed validation without identityStrategy for HUMAN_INTERACTIVE")
        return False
    
    print("✅ Correctly rejects HUMAN_INTERACTIVE config without identityStrategy")
    
    # Test STATIC_AGENCY_IDENTITY requires agencyIdentityId
    print("4. Testing STATIC_AGENCY_IDENTITY requires agencyIdentityId")
    test_config = {
        "pamOwnership": "AGENCY_OWNED",
        "identityPurpose": "HUMAN_INTERACTIVE",
        "identityStrategy": "STATIC_AGENCY_IDENTITY"
    }
    result = make_request('POST', '/api/plugins/ga4/validate/agency-config', {
        'accessItemType': 'SHARED_ACCOUNT',
        'config': test_config
    })
    
    if result.get('success') and result.get('data', {}).get('valid', True):
        print("❌ Should have failed validation without agencyIdentityId for STATIC_AGENCY_IDENTITY")
        return False
    
    print("✅ Correctly rejects STATIC_AGENCY_IDENTITY config without agencyIdentityId")
    
    # Test CLIENT_DEDICATED_IDENTITY requires pamNamingTemplate
    print("5. Testing CLIENT_DEDICATED_IDENTITY requires pamNamingTemplate")
    test_config = {
        "pamOwnership": "AGENCY_OWNED",
        "identityPurpose": "HUMAN_INTERACTIVE",
        "identityStrategy": "CLIENT_DEDICATED_IDENTITY"
    }
    result = make_request('POST', '/api/plugins/ga4/validate/agency-config', {
        'accessItemType': 'SHARED_ACCOUNT',
        'config': test_config
    })
    
    if result.get('success') and result.get('data', {}).get('valid', True):
        print("❌ Should have failed validation without pamNamingTemplate for CLIENT_DEDICATED_IDENTITY")
        return False
    
    print("✅ Correctly rejects CLIENT_DEDICATED_IDENTITY config without pamNamingTemplate")
    
    return True

def test_client_target_schema():
    """Test Client Target Schema endpoints"""
    print("\n🔍 Testing Client Target Schema...")
    
    # Test SHARED_ACCOUNT client target schema - should include propertyId as required
    print("1. Testing GET /api/plugins/ga4/schema/client-target?accessItemType=SHARED_ACCOUNT")
    result = make_request('GET', '/api/plugins/ga4/schema/client-target?accessItemType=SHARED_ACCOUNT')
    
    if not result.get('success'):
        print(f"❌ Failed to get SHARED_ACCOUNT client target schema: {result.get('error')}")
        return False
    
    schema = result.get('data', {})
    properties = schema.get('properties', {})
    required_fields = schema.get('required', [])
    
    if 'propertyId' not in properties:
        print("❌ Missing propertyId field in SHARED_ACCOUNT client target schema")
        return False
    
    if 'propertyId' not in required_fields:
        print("❌ propertyId is not required in SHARED_ACCOUNT client target schema")
        return False
    
    print("✅ SHARED_ACCOUNT client target schema includes propertyId as required field")
    
    return True

def test_other_plugin_integrity():
    """Test Other Plugin Integrity - verify other plugins still work"""
    print("\n🔍 Testing Other Plugin Integrity...")
    
    # Test Meta plugin - should return v2.0.0
    print("1. Testing GET /api/plugins/meta")
    result = make_request('GET', '/api/plugins/meta')
    
    if not result.get('success'):
        print(f"❌ Failed to get Meta plugin: {result.get('error')}")
        return False
    
    meta_plugin = result.get('data', {})
    manifest = meta_plugin.get('manifest', {})
    
    if manifest.get('pluginVersion') != '2.0.0':
        print(f"❌ Expected Meta version 2.0.0, got {manifest.get('pluginVersion')}")
        return False
    
    print(f"✅ Meta plugin version: {manifest.get('pluginVersion')}")
    
    # Test Google Ads plugin - should return v2.0.0
    print("2. Testing GET /api/plugins/google-ads")
    result = make_request('GET', '/api/plugins/google-ads')
    
    if not result.get('success'):
        print(f"❌ Failed to get Google Ads plugin: {result.get('error')}")
        return False
    
    google_ads_plugin = result.get('data', {})
    manifest = google_ads_plugin.get('manifest', {})
    
    if manifest.get('pluginVersion') != '2.0.0':
        print(f"❌ Expected Google Ads version 2.0.0, got {manifest.get('pluginVersion')}")
        return False
    
    print(f"✅ Google Ads plugin version: {manifest.get('pluginVersion')}")
    
    return True

def main():
    """Run all tests for Modular Advertising Platform Plugin System"""
    print("🚀 Starting Modular Advertising Platform Plugin System Backend Tests")
    print(f"Backend URL: {BASE_URL}")
    
    tests = [
        ("Plugin API Verification", test_plugin_api_verification),
        ("Schema Generation", test_schema_generation),
        ("PAM Schema Validation Rules", test_pam_schema_validation),
        ("Client Target Schema", test_client_target_schema),
        ("Other Plugin Integrity", test_other_plugin_integrity),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            print(f"\n{'='*60}")
            print(f"🧪 Running: {test_name}")
            print('='*60)
            
            if test_func():
                print(f"✅ {test_name}: PASSED")
                passed += 1
            else:
                print(f"❌ {test_name}: FAILED")
                
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {str(e)}")
    
    print(f"\n{'='*60}")
    print(f"🏁 Test Results: {passed}/{total} tests passed")
    print('='*60)
    
    if passed == total:
        print("🎉 All tests passed! The Modular Advertising Platform Plugin System is working correctly.")
        return True
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please review the issues above.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)