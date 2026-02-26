#!/usr/bin/env python3
"""
Backend API Test Suite for Platform Mappings and New Plugins
Tests the consolidated platform mappings and new plugins (Google Merchant Center & Shopify)
"""

import requests
import json
import sys
import os
from typing import Dict, List, Any, Optional

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://manifest-sync-3.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_api_call(method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict:
    """Make API call and return response with error handling"""
    url = f"{API_BASE}/{endpoint.lstrip('/')}"
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=30)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=30)
        else:
            return {"success": False, "error": f"Unsupported method: {method}"}
            
        print(f"[{method} {endpoint}] Status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                return response.json()
            except:
                return {"success": True, "raw_response": response.text}
        else:
            return {
                "success": False, 
                "status_code": response.status_code,
                "error": response.text[:500]
            }
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection error"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def verify_plugin_count(plugins_data: List[Dict]) -> bool:
    """Verify we have exactly 21 plugins"""
    return len(plugins_data) == 21

def verify_new_plugins_exist(plugins_data: List[Dict]) -> Dict[str, bool]:
    """Verify Google Merchant Center and Shopify plugins exist"""
    plugin_keys = [p.get('platformKey') for p in plugins_data]
    return {
        'google-merchant-center': 'google-merchant-center' in plugin_keys,
        'shopify': 'shopify' in plugin_keys
    }

def verify_plugin_manifest(plugin_data: Dict, expected_key: str, expected_category: str, expected_tier: int) -> Dict[str, bool]:
    """Verify plugin manifest data"""
    return {
        'correct_platform_key': plugin_data.get('platformKey') == expected_key,
        'correct_category': plugin_data.get('category') == expected_category,
        'correct_tier': plugin_data.get('tier') == expected_tier,
        'has_display_name': bool(plugin_data.get('displayName')),
        'has_supported_access_types': bool(plugin_data.get('supportedAccessItemTypes'))
    }

def verify_platforms_count(platforms_data: List[Dict]) -> bool:
    """Verify we have 21 platforms in catalog"""
    return len(platforms_data) == 21

def verify_ecommerce_domain_exists(platforms_data: List[Dict]) -> bool:
    """Verify Ecommerce & Retail domain exists"""
    domains = [p.get('domain') for p in platforms_data]
    return 'Ecommerce & Retail' in domains

def verify_no_looker_studio(platforms_data: List[Dict]) -> bool:
    """Verify Looker Studio is not in the catalog (legacy cleanup)"""
    platform_names = [p.get('name', '').lower() for p in platforms_data]
    return 'looker studio' not in platform_names

def test_plugin_schema_endpoint(plugin_key: str, access_item_type: str) -> Dict:
    """Test plugin schema endpoints"""
    schema_result = test_api_call('GET', f'plugins/{plugin_key}/schema/agency-config', 
                                params={'accessItemType': access_item_type})
    return schema_result

def test_plugin_capabilities_endpoint(plugin_key: str) -> Dict:
    """Test plugin capabilities endpoint"""
    return test_api_call('GET', f'plugins/{plugin_key}/capabilities')

def test_plugin_roles_endpoint(plugin_key: str) -> Dict:
    """Test plugin roles endpoint"""
    return test_api_call('GET', f'plugins/{plugin_key}/roles')

def run_comprehensive_backend_tests():
    """Run comprehensive backend tests for platform mappings and new plugins"""
    print("=" * 80)
    print("BACKEND API TEST SUITE - Platform Mappings & New Plugins")
    print("=" * 80)
    
    results = {
        'total_tests': 0,
        'passed_tests': 0,
        'failed_tests': 0,
        'test_details': []
    }
    
    def log_test(test_name: str, passed: bool, details: str = ""):
        results['total_tests'] += 1
        if passed:
            results['passed_tests'] += 1
            print(f"✅ {test_name}")
        else:
            results['failed_tests'] += 1
            print(f"❌ {test_name}")
        if details:
            print(f"   {details}")
        results['test_details'].append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
    
    # Test 1: GET /api/plugins - Should return 21 plugins
    print("\n📋 Test 1: Plugin Registry - 21 Total Plugins")
    plugins_response = test_api_call('GET', 'plugins')
    
    if plugins_response.get('success') and plugins_response.get('data'):
        plugins_data = plugins_response['data']
        plugin_count_correct = verify_plugin_count(plugins_data)
        log_test("Plugin count is 21", plugin_count_correct, 
                f"Found {len(plugins_data)} plugins")
        
        # Verify new plugins exist
        new_plugins_check = verify_new_plugins_exist(plugins_data)
        log_test("Google Merchant Center plugin exists", 
                new_plugins_check['google-merchant-center'])
        log_test("Shopify plugin exists", 
                new_plugins_check['shopify'])
    else:
        log_test("Plugin registry API call", False, 
                f"Failed: {plugins_response.get('error', 'Unknown error')}")
    
    # Test 2: GET /api/plugins/google-merchant-center - Verify manifest
    print("\n🛒 Test 2: Google Merchant Center Plugin Details")
    gmc_response = test_api_call('GET', 'plugins/google-merchant-center')
    
    if gmc_response.get('success') and gmc_response.get('data'):
        gmc_data = gmc_response['data']
        manifest_data = gmc_data.get('manifest', {})
        manifest_checks = verify_plugin_manifest(manifest_data, 'google-merchant-center', 'E-commerce', 2)
        
        for check_name, passed in manifest_checks.items():
            log_test(f"GMC {check_name}", passed)
        
        # Verify specific supported access types
        supported_types = manifest_data.get('allowedAccessTypes', [])
        expected_types = ['NAMED_INVITE', 'PARTNER_DELEGATION', 'SHARED_ACCOUNT']
        types_match = set(supported_types) >= set(expected_types)
        log_test("GMC supports required access types", types_match,
                f"Supports: {supported_types}")
    else:
        log_test("Google Merchant Center plugin API call", False,
                f"Failed: {gmc_response.get('error', 'Unknown error')}")
    
    # Test 3: GET /api/plugins/shopify - Verify manifest  
    print("\n🛍️ Test 3: Shopify Plugin Details")
    shopify_response = test_api_call('GET', 'plugins/shopify')
    
    if shopify_response.get('success') and shopify_response.get('data'):
        shopify_data = shopify_response['data']
        manifest_data = shopify_data.get('manifest', {})
        manifest_checks = verify_plugin_manifest(manifest_data, 'shopify', 'E-commerce', 2)
        
        for check_name, passed in manifest_checks.items():
            log_test(f"Shopify {check_name}", passed)
            
        # Verify specific supported access types for Shopify
        supported_types = manifest_data.get('allowedAccessTypes', [])
        expected_types = ['NAMED_INVITE', 'PROXY_TOKEN', 'SHARED_ACCOUNT']
        types_match = set(supported_types) >= set(expected_types)
        log_test("Shopify supports required access types", types_match,
                f"Supports: {supported_types}")
    else:
        log_test("Shopify plugin API call", False,
                f"Failed: {shopify_response.get('error', 'Unknown error')}")
    
    # Test 4: GET /api/platforms?clientFacing=true - Should return 21 platforms
    print("\n📊 Test 4: Platform Catalog - 21 Client-Facing Platforms")
    platforms_response = test_api_call('GET', 'platforms', params={'clientFacing': 'true'})
    
    if platforms_response.get('success') and platforms_response.get('data'):
        platforms_data = platforms_response['data']
        platform_count_correct = verify_platforms_count(platforms_data)
        log_test("Platform catalog has 21 entries", platform_count_correct,
                f"Found {len(platforms_data)} platforms")
        
        # Verify Ecommerce & Retail domain exists
        ecommerce_domain_exists = verify_ecommerce_domain_exists(platforms_data)
        log_test("Ecommerce & Retail domain exists", ecommerce_domain_exists)
        
        # Verify no Looker Studio (legacy cleanup)
        no_looker_studio = verify_no_looker_studio(platforms_data)
        log_test("Legacy Looker Studio removed", no_looker_studio)
        
        # Verify specific new platforms exist with correct slugs
        platform_slugs = {p.get('slug'): p.get('name') for p in platforms_data}
        gmc_exists = 'google-merchant-center' in platform_slugs
        shopify_exists = 'shopify' in platform_slugs
        
        log_test("Google Merchant Center in catalog", gmc_exists)
        log_test("Shopify in catalog", shopify_exists)
        
        # Verify tier 2 for new platforms
        gmc_platform = next((p for p in platforms_data if p.get('slug') == 'google-merchant-center'), None)
        shopify_platform = next((p for p in platforms_data if p.get('slug') == 'shopify'), None)
        
        if gmc_platform:
            log_test("GMC is tier 2", gmc_platform.get('tier') == 2)
        if shopify_platform:
            log_test("Shopify is tier 2", shopify_platform.get('tier') == 2)
            
    else:
        log_test("Platform catalog API call", False,
                f"Failed: {platforms_response.get('error', 'Unknown error')}")
    
    # Test 5: Schema endpoints for new plugins
    print("\n📋 Test 5: Plugin Schema Endpoints")
    
    # Test GMC schema endpoints
    gmc_named_schema = test_plugin_schema_endpoint('google-merchant-center', 'NAMED_INVITE')
    log_test("GMC NAMED_INVITE schema endpoint", 
            gmc_named_schema.get('success', False))
    
    gmc_partner_schema = test_plugin_schema_endpoint('google-merchant-center', 'PARTNER_DELEGATION') 
    log_test("GMC PARTNER_DELEGATION schema endpoint",
            gmc_partner_schema.get('success', False))
    
    # Test Shopify schema endpoints
    shopify_named_schema = test_plugin_schema_endpoint('shopify', 'NAMED_INVITE')
    log_test("Shopify NAMED_INVITE schema endpoint",
            shopify_named_schema.get('success', False))
    
    shopify_proxy_schema = test_plugin_schema_endpoint('shopify', 'PROXY_TOKEN')
    log_test("Shopify PROXY_TOKEN schema endpoint",
            shopify_proxy_schema.get('success', False))
    
    # Test 6: Capabilities endpoints
    print("\n🔧 Test 6: Plugin Capabilities Endpoints")
    
    gmc_capabilities = test_plugin_capabilities_endpoint('google-merchant-center')
    log_test("GMC capabilities endpoint", 
            gmc_capabilities.get('success', False))
    
    shopify_capabilities = test_plugin_capabilities_endpoint('shopify')
    log_test("Shopify capabilities endpoint",
            shopify_capabilities.get('success', False))
    
    # Test 7: Roles endpoints
    print("\n👥 Test 7: Plugin Roles Endpoints")
    
    gmc_roles = test_plugin_roles_endpoint('google-merchant-center')
    log_test("GMC roles endpoint",
            gmc_roles.get('success', False))
    
    shopify_roles = test_plugin_roles_endpoint('shopify')
    log_test("Shopify roles endpoint", 
            shopify_roles.get('success', False))
    
    # Test 8: Regression tests for existing endpoints
    print("\n🔄 Test 8: Regression Tests")
    
    # Test agency platforms endpoint
    agency_platforms = test_api_call('GET', 'agency/platforms')
    log_test("Agency platforms endpoint", 
            agency_platforms.get('success', False))
    
    # Test clients endpoint
    clients = test_api_call('GET', 'clients')
    log_test("Clients endpoint",
            clients.get('success', False))
    
    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {results['total_tests']}")
    print(f"Passed: {results['passed_tests']} ✅")
    print(f"Failed: {results['failed_tests']} ❌")
    
    success_rate = (results['passed_tests'] / results['total_tests']) * 100 if results['total_tests'] > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    if results['failed_tests'] > 0:
        print("\n❌ FAILED TESTS:")
        for test in results['test_details']:
            if not test['passed']:
                print(f"  - {test['test']}: {test['details']}")
    
    return results

if __name__ == "__main__":
    try:
        results = run_comprehensive_backend_tests()
        
        # Exit with appropriate code
        if results['failed_tests'] == 0:
            print("\n🎉 All tests passed!")
            sys.exit(0)
        else:
            print(f"\n💥 {results['failed_tests']} test(s) failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        sys.exit(1)