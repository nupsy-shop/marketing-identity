#!/usr/bin/env python3
"""
Phase 2 Backend API Testing for Marketing Identity Platform
Tests Phase 2 specific changes:
1. Platform data update verification (27 platforms with YouTube Ads)
2. Full configured apps flow with new platform IDs
3. Domain filtering functionality
"""

import requests
import json
import sys
from urllib.parse import urljoin

# Load environment variables to get the base URL
try:
    with open('/app/.env', 'r') as f:
        env_content = f.read()
        for line in env_content.split('\n'):
            if line.startswith('NEXT_PUBLIC_BASE_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break
        else:
            BASE_URL = 'https://agency-pam.preview.emergentagent.com'
except:
    BASE_URL = 'https://agency-pam.preview.emergentagent.com'

API_BASE = f"{BASE_URL}/api"

print(f"Testing Phase 2 API changes at: {API_BASE}")

# Test data
test_results = []
created_client_id = None
created_configured_app_id = None
google_analytics_platform_id = None
access_request_token = None

def log_test(name, success, message=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {name}: {message}")
    test_results.append({
        'test': name,
        'success': success,
        'message': message
    })

def make_request(method, endpoint, data=None, expected_status=200):
    """Make HTTP request with error handling"""
    url = f"{API_BASE}/{endpoint}"
    try:
        if method == 'GET':
            response = requests.get(url)
        elif method == 'POST':
            response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == 'PATCH':
            response = requests.patch(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == 'DELETE':
            response = requests.delete(url)
        
        print(f"{method} {url} -> {response.status_code}")
        
        if response.status_code != expected_status:
            return False, f"Expected status {expected_status}, got {response.status_code}"
        
        try:
            json_response = response.json()
            return True, json_response
        except:
            return True, response.text
            
    except requests.exceptions.RequestException as e:
        return False, f"Request failed: {str(e)}"

def test_phase2_platform_data():
    """Test Phase 2 platform data updates"""
    print("\n=== Testing Phase 2 Platform Data Updates ===")
    global google_analytics_platform_id
    
    # Test GET /api/platforms?clientFacing=true - Should return 27 platforms
    success, result = make_request('GET', 'platforms?clientFacing=true')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        platform_count = len(platforms)
        
        if platform_count == 27:
            log_test("GET /api/platforms?clientFacing=true count", True, f"Found exactly 27 client-facing platforms")
        else:
            log_test("GET /api/platforms?clientFacing=true count", False, f"Expected 27 platforms, got {platform_count}")
        
        # Check that all platforms have accessPatterns array
        platforms_with_access_patterns = 0
        youtube_ads_found = False
        gong_found = False
        google_analytics_ga4_found = False
        microsoft_advertising_found = False
        linkedin_ads_found = False
        
        for platform in platforms:
            # Check accessPatterns array
            access_patterns = platform.get('accessPatterns', [])
            if isinstance(access_patterns, list) and len(access_patterns) > 0:
                platforms_with_access_patterns += 1
                
                # Check each access pattern has label and roles
                for pattern in access_patterns:
                    if not pattern.get('label') or not pattern.get('roles'):
                        log_test(f"Platform {platform.get('name')} access pattern validation", False, "Missing label or roles field")
                        break
            
            # Check for specific platforms
            platform_name = platform.get('name', '').lower()
            if 'youtube ads' in platform_name:
                youtube_ads_found = True
            elif 'gong' in platform_name:
                gong_found = True
            elif 'google analytics' in platform_name or 'ga4' in platform_name:
                google_analytics_ga4_found = True
                google_analytics_platform_id = platform.get('id')
            elif 'microsoft advertising' in platform_name:
                microsoft_advertising_found = True
            elif 'linkedin ads' in platform_name:
                linkedin_ads_found = True
        
        # Check access patterns coverage
        if platforms_with_access_patterns == platform_count:
            log_test("All platforms have accessPatterns", True, f"All {platform_count} platforms have accessPatterns array")
        else:
            log_test("All platforms have accessPatterns", False, f"Only {platforms_with_access_patterns}/{platform_count} platforms have accessPatterns")
        
        # Check YouTube Ads presence
        if youtube_ads_found:
            log_test("YouTube Ads platform present", True, "YouTube Ads found in platform list")
        else:
            log_test("YouTube Ads platform present", False, "YouTube Ads NOT found in platform list")
        
        # Check Gong absence (should be removed as irrelevant)
        if not gong_found:
            log_test("Gong platform absent", True, "Gong correctly removed from client-facing platforms")
        else:
            log_test("Gong platform absent", False, "Gong incorrectly still present in client-facing platforms")
        
        # Check for platforms with multiple access patterns
        if google_analytics_ga4_found:
            ga4_platform = next((p for p in platforms if 'google analytics' in p.get('name', '').lower() or 'ga4' in p.get('name', '').lower()), None)
            if ga4_platform:
                ga4_patterns = ga4_platform.get('accessPatterns', [])
                if len(ga4_patterns) >= 2:
                    log_test("Google Analytics/GA4 multiple patterns", True, f"Found {len(ga4_patterns)} access patterns for GA4")
                else:
                    log_test("Google Analytics/GA4 multiple patterns", False, f"Expected 2+ access patterns, got {len(ga4_patterns)}")
        
        if microsoft_advertising_found:
            ms_platform = next((p for p in platforms if 'microsoft advertising' in p.get('name', '').lower()), None)
            if ms_platform:
                ms_patterns = ms_platform.get('accessPatterns', [])
                if len(ms_patterns) >= 2:
                    log_test("Microsoft Advertising multiple patterns", True, f"Found {len(ms_patterns)} access patterns")
                else:
                    log_test("Microsoft Advertising multiple patterns", False, f"Expected 2+ access patterns, got {len(ms_patterns)}")
        
        if linkedin_ads_found:
            linkedin_platform = next((p for p in platforms if 'linkedin ads' in p.get('name', '').lower()), None)
            if linkedin_platform:
                linkedin_patterns = linkedin_platform.get('accessPatterns', [])
                if len(linkedin_patterns) >= 2:
                    log_test("LinkedIn Ads multiple patterns", True, f"Found {len(linkedin_patterns)} access patterns")
                else:
                    log_test("LinkedIn Ads multiple patterns", False, f"Expected 2+ access patterns, got {len(linkedin_patterns)}")
        
        # Check that all platforms have descriptions
        platforms_with_descriptions = sum(1 for p in platforms if p.get('description'))
        if platforms_with_descriptions == platform_count:
            log_test("All platforms have descriptions", True, f"All {platform_count} platforms have descriptions")
        else:
            log_test("All platforms have descriptions", False, f"Only {platforms_with_descriptions}/{platform_count} platforms have descriptions")
        
    else:
        log_test("GET /api/platforms?clientFacing=true", False, f"API call failed: {result}")

def test_domain_filtering():
    """Test new domain filtering functionality"""
    print("\n=== Testing Domain Filtering ===")
    
    # Test GET /api/platforms?domain=Paid%20Search
    success, result = make_request('GET', 'platforms?domain=Paid%20Search')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        paid_search_count = len(platforms)
        
        # Check that returned platforms are Paid Search related
        found_platforms = [p.get('name', '').lower() for p in platforms]
        
        google_ads_found = any('google ads' in name for name in found_platforms)
        microsoft_ads_found = any('microsoft advertising' in name for name in found_platforms)
        apple_search_ads_found = any('apple search ads' in name for name in found_platforms)
        
        if google_ads_found and microsoft_ads_found and apple_search_ads_found:
            log_test("GET /api/platforms?domain=Paid Search content", True, f"Found expected Paid Search platforms: Google Ads, Microsoft Advertising, Apple Search Ads")
        else:
            log_test("GET /api/platforms?domain=Paid Search content", False, f"Missing expected platforms. Found: {', '.join(found_platforms)}")
            
        if paid_search_count >= 3:
            log_test("GET /api/platforms?domain=Paid Search count", True, f"Found {paid_search_count} Paid Search platforms")
        else:
            log_test("GET /api/platforms?domain=Paid Search count", False, f"Expected 3+ Paid Search platforms, got {paid_search_count}")
    else:
        log_test("GET /api/platforms?domain=Paid Search", False, f"API call failed: {result}")
    
    # Test GET /api/platforms?domain=Paid%20Social
    success, result = make_request('GET', 'platforms?domain=Paid%20Social')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        paid_social_count = len(platforms)
        
        # Check for expected social platforms
        found_platforms = [p.get('name', '').lower() for p in platforms]
        meta_found = any('meta' in name or 'facebook' in name for name in found_platforms)
        linkedin_found = any('linkedin' in name for name in found_platforms)
        tiktok_found = any('tiktok' in name for name in found_platforms)
        
        if meta_found and linkedin_found and tiktok_found:
            log_test("GET /api/platforms?domain=Paid Social content", True, f"Found expected Paid Social platforms: Meta/Facebook, LinkedIn, TikTok")
        else:
            log_test("GET /api/platforms?domain=Paid Social content", False, f"Missing expected platforms. Found: {', '.join(found_platforms)}")
            
        if paid_social_count >= 3:
            log_test("GET /api/platforms?domain=Paid Social count", True, f"Found {paid_social_count} Paid Social platforms")
        else:
            log_test("GET /api/platforms?domain=Paid Social count", False, f"Expected 3+ Paid Social platforms, got {paid_social_count}")
    else:
        log_test("GET /api/platforms?domain=Paid Social", False, f"API call failed: {result}")
    
    # Test GET /api/platforms?tier=1
    success, result = make_request('GET', 'platforms?tier=1')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        tier1_count = len(platforms)
        
        # Verify all returned platforms are tier 1
        all_tier1 = all(p.get('tier') == 1 for p in platforms)
        
        if all_tier1 and tier1_count == 11:
            log_test("GET /api/platforms?tier=1", True, f"Found exactly 11 Tier 1 platforms")
        elif all_tier1:
            log_test("GET /api/platforms?tier=1", False, f"Expected 11 Tier 1 platforms, got {tier1_count}")
        else:
            log_test("GET /api/platforms?tier=1", False, f"Some returned platforms are not Tier 1")
    else:
        log_test("GET /api/platforms?tier=1", False, f"API call failed: {result}")

def test_configured_apps_flow():
    """Test full configured apps flow with new platform IDs"""
    print("\n=== Testing Full Configured Apps Flow ===")
    global created_client_id, created_configured_app_id, google_analytics_platform_id
    
    # Step 1: Create a client
    client_data = {
        "name": "Phase2 Test Agency",
        "email": "phase2test@agency.com"
    }
    
    success, result = make_request('POST', 'clients', client_data)
    if success and isinstance(result, dict) and result.get('success'):
        client = result.get('data')
        created_client_id = client.get('id')
        log_test("Create client for configured apps", True, f"Created client with ID: {created_client_id}")
    else:
        log_test("Create client for configured apps", False, f"Failed to create client: {result}")
        return
    
    # Step 2: Get Google Analytics/GA4 platform ID
    if not google_analytics_platform_id:
        success, result = make_request('GET', 'platforms?clientFacing=true')
        if success and isinstance(result, dict) and result.get('success'):
            platforms = result.get('data', [])
            ga4_platform = next((p for p in platforms if 'google analytics' in p.get('name', '').lower() or 'ga4' in p.get('name', '').lower()), None)
            if ga4_platform:
                google_analytics_platform_id = ga4_platform.get('id')
                log_test("Get Google Analytics platform ID", True, f"Found GA4 platform ID: {google_analytics_platform_id}")
            else:
                log_test("Get Google Analytics platform ID", False, "Google Analytics/GA4 platform not found")
                return
        else:
            log_test("Get Google Analytics platform ID", False, "Failed to fetch platforms")
            return
    
    # Step 3: Create configured app with multiple items
    configured_app_data = {
        "platformId": google_analytics_platform_id,
        "items": [
            {
                "accessPattern": "2 (Named Invites)",
                "label": "GA4 Property - Analytics Site", 
                "role": "Analyst",
                "assetType": "Property",
                "assetId": "GA4-123456789",
                "credentials": "analyst@agency.com"
            },
            {
                "accessPattern": "3 (Group Access)",
                "label": "GA4 Property - Dev Site",
                "role": "Viewer",
                "assetType": "Property", 
                "assetId": "GA4-987654321",
                "credentials": "dev-group@agency.com"
            }
        ]
    }
    
    success, result = make_request('POST', f'clients/{created_client_id}/configured-apps', configured_app_data)
    if success and isinstance(result, dict) and result.get('success'):
        configured_app = result.get('data')
        created_configured_app_id = configured_app.get('id')
        items = configured_app.get('items', [])
        
        if len(items) == 2:
            log_test("Create configured app with multiple items", True, f"Created configured app with {len(items)} items")
            
            # Verify items have correct fields
            item1, item2 = items[0], items[1]
            if (item1.get('accessPattern') == "2 (Named Invites)" and 
                item1.get('role') == "Analyst" and
                item2.get('accessPattern') == "3 (Group Access)" and
                item2.get('role') == "Viewer"):
                log_test("Configured app items validation", True, "All items have correct access patterns and roles")
            else:
                log_test("Configured app items validation", False, "Items missing or incorrect data")
        else:
            log_test("Create configured app with multiple items", False, f"Expected 2 items, got {len(items)}")
    else:
        log_test("Create configured app with multiple items", False, f"Failed to create configured app: {result}")
        return
    
    # Step 4: Verify configured app is saved
    success, result = make_request('GET', f'clients/{created_client_id}/configured-apps')
    if success and isinstance(result, dict) and result.get('success'):
        configured_apps = result.get('data', [])
        
        if len(configured_apps) == 1:
            configured_app = configured_apps[0]
            platform = configured_app.get('platform')
            items = configured_app.get('items', [])
            
            if platform and len(items) == 2:
                log_test("Verify configured app saved", True, f"Configured app saved with platform enrichment and {len(items)} items")
            else:
                log_test("Verify configured app saved", False, "Missing platform enrichment or items")
        else:
            log_test("Verify configured app saved", False, f"Expected 1 configured app, got {len(configured_apps)}")
    else:
        log_test("Verify configured app saved", False, f"Failed to retrieve configured apps: {result}")
    
    # Step 5: Create access request using configured app items
    access_request_data = {
        "clientId": created_client_id,
        "items": [
            {
                "platformId": google_analytics_platform_id,
                "accessPattern": "2 (Named Invites)",
                "role": "Analyst",
                "assetType": "Property",
                "assetId": "GA4-123456789",
                "assetName": "GA4 Property - Analytics Site"
            },
            {
                "platformId": google_analytics_platform_id,
                "accessPattern": "3 (Group Access)", 
                "role": "Viewer",
                "assetType": "Property",
                "assetId": "GA4-987654321", 
                "assetName": "GA4 Property - Dev Site"
            }
        ]
    }
    
    success, result = make_request('POST', 'access-requests', access_request_data)
    if success and isinstance(result, dict) and result.get('success'):
        access_request = result.get('data')
        items = access_request.get('items', [])
        token = access_request.get('token')
        
        if len(items) == 2 and token:
            log_test("Create access request from configured app", True, f"Created access request with {len(items)} items")
            
            # Verify items have all required fields
            item1 = items[0]
            if (item1.get('platformId') == google_analytics_platform_id and
                item1.get('accessPattern') == "2 (Named Invites)" and
                item1.get('role') == "Analyst" and
                item1.get('assetType') == "Property" and
                item1.get('assetId') == "GA4-123456789" and
                item1.get('assetName') == "GA4 Property - Analytics Site"):
                log_test("Access request items validation", True, "Items contain all required fields")
            else:
                log_test("Access request items validation", False, "Items missing required fields")
            
            global access_request_token
            access_request_token = token
        else:
            log_test("Create access request from configured app", False, f"Expected 2 items and token, got {len(items)} items")
    else:
        log_test("Create access request from configured app", False, f"Failed to create access request: {result}")
    
    # Step 6: Verify onboarding token works with enriched data
    if access_request_token:
        success, result = make_request('GET', f'onboarding/{access_request_token}')
        if success and isinstance(result, dict) and result.get('success'):
            onboarding_data = result.get('data')
            client = onboarding_data.get('client')
            items = onboarding_data.get('items', [])
            
            if client and len(items) == 2:
                # Check if items have platform enrichment
                item1 = items[0]
                platform = item1.get('platform')
                
                if platform and platform.get('name'):
                    log_test("Onboarding token enriched data", True, f"Onboarding returns enriched data with platform details")
                else:
                    log_test("Onboarding token enriched data", False, "Missing platform enrichment in onboarding data")
            else:
                log_test("Onboarding token enriched data", False, f"Expected client and 2 items, got client={bool(client)}, items={len(items)}")
        else:
            log_test("Onboarding token enriched data", False, f"Failed to get onboarding data: {result}")

def run_all_phase2_tests():
    """Run all Phase 2 test suites"""
    print("Starting Phase 2 backend API testing...\n")
    
    # Run Phase 2 specific tests
    test_phase2_platform_data()
    test_domain_filtering()
    test_configured_apps_flow()
    
    # Print summary
    print("\n" + "="*60)
    print("PHASE 2 TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for result in test_results if result['success'])
    total = len(test_results)
    
    print(f"Total tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success rate: {(passed/total)*100:.1f}%")
    
    if total - passed > 0:
        print("\nFailed tests:")
        for result in test_results:
            if not result['success']:
                print(f"  ❌ {result['test']}: {result['message']}")
    else:
        print("\n🎉 ALL PHASE 2 TESTS PASSED!")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_phase2_tests()
    sys.exit(0 if success else 1)