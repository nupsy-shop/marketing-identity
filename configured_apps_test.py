#!/usr/bin/env python3
"""
Configured Apps API Testing for Marketing Identity Platform
Tests the newly fixed/added configured-apps endpoints
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
            BASE_URL = 'https://plugin-unify.preview.emergentagent.com'
except:
    BASE_URL = 'https://plugin-unify.preview.emergentagent.com'

API_BASE = f"{BASE_URL}/api"

print(f"Testing Configured Apps API at: {API_BASE}")

# Test data storage
test_results = []
test_client_id = None
test_platform_id = None
test_configured_app_id = None

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
        elif method == 'PUT':
            response = requests.put(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == 'PATCH':
            response = requests.patch(url, json=data, headers={'Content-Type': 'application/json'})
        elif method == 'DELETE':
            response = requests.delete(url)
        
        print(f"{method} {url} -> {response.status_code}")
        
        if response.status_code != expected_status:
            try:
                error_data = response.json()
                return False, f"Expected status {expected_status}, got {response.status_code}: {error_data.get('error', 'Unknown error')}"
            except:
                return False, f"Expected status {expected_status}, got {response.status_code}"
        
        try:
            json_response = response.json()
            return True, json_response
        except:
            return True, response.text
            
    except requests.exceptions.RequestException as e:
        return False, f"Request failed: {str(e)}"

def test_prerequisites():
    """Set up test prerequisites: create client and get platform ID"""
    print("\n=== Setting up Prerequisites ===")
    global test_client_id, test_platform_id
    
    # Create test client
    client_data = {
        "name": "Test Client", 
        "email": "test@test.com"
    }
    
    success, result = make_request('POST', 'clients', client_data)
    if success and isinstance(result, dict) and result.get('success'):
        client = result.get('data')
        test_client_id = client.get('id')
        log_test("Create Test Client", True, f"Created client with ID: {test_client_id}")
    else:
        log_test("Create Test Client", False, f"Failed to create client: {result}")
        return False
    
    # Get valid platform ID from client-facing platforms
    success, result = make_request('GET', 'platforms?clientFacing=true')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        if platforms:
            test_platform_id = platforms[0]['id']
            log_test("Get Valid Platform ID", True, f"Using platform ID: {test_platform_id} ({platforms[0].get('name')})")
        else:
            log_test("Get Valid Platform ID", False, "No client-facing platforms found")
            return False
    else:
        log_test("Get Valid Platform ID", False, f"Failed to get platforms: {result}")
        return False
    
    return True

def test_post_configured_app():
    """Test POST /api/clients/:id/configured-apps endpoint"""
    print("\n=== Testing POST /api/clients/:id/configured-apps ===")
    global test_configured_app_id
    
    if not test_client_id or not test_platform_id:
        log_test("POST configured app", False, "Missing prerequisites")
        return
    
    # Test successful creation
    app_data = {
        "platformId": test_platform_id,
        "items": [
            {
                "accessPattern": "Standard Access",
                "label": "Main Account",
                "role": "Admin",
                "assetType": "Ad Account",
                "assetId": "123"
            }
        ]
    }
    
    success, result = make_request('POST', f'clients/{test_client_id}/configured-apps', app_data)
    if success and isinstance(result, dict) and result.get('success'):
        configured_app = result.get('data')
        if configured_app and configured_app.get('platformId') == test_platform_id:
            test_configured_app_id = configured_app.get('id')
            items = configured_app.get('items', [])
            if len(items) > 0 and items[0].get('label') == 'Main Account':
                log_test("POST /api/clients/:id/configured-apps", True, f"Successfully created configured app with ID: {test_configured_app_id}")
            else:
                log_test("POST /api/clients/:id/configured-apps", False, "Items not configured correctly")
        else:
            log_test("POST /api/clients/:id/configured-apps", False, "Platform ID mismatch in response")
    else:
        log_test("POST /api/clients/:id/configured-apps", False, f"API call failed: {result}")
    
    # Test error case: Try posting again for same client+platform (should return 400)
    success, result = make_request('POST', f'clients/{test_client_id}/configured-apps', app_data, expected_status=400)
    if success:
        log_test("POST configured app (duplicate)", True, "Correctly rejected duplicate platform for client")
    else:
        log_test("POST configured app (duplicate)", False, result)
    
    # Test error case: Invalid platformId (should return 404)
    invalid_data = {
        "platformId": "invalid-platform-id",
        "items": [{"accessPattern": "Standard", "label": "Test", "role": "Admin", "assetType": "Ad Account", "assetId": "123"}]
    }
    success, result = make_request('POST', f'clients/{test_client_id}/configured-apps', invalid_data, expected_status=404)
    if success:
        log_test("POST configured app (invalid platformId)", True, "Correctly rejected invalid platform ID")
    else:
        log_test("POST configured app (invalid platformId)", False, result)
    
    # Test error case: Missing required fields
    invalid_data = {
        "platformId": test_platform_id
        # Missing items array
    }
    success, result = make_request('POST', f'clients/{test_client_id}/configured-apps', invalid_data, expected_status=400)
    if success:
        log_test("POST configured app (missing items)", True, "Correctly rejected missing items array")
    else:
        log_test("POST configured app (missing items)", False, result)

def test_get_configured_apps():
    """Test GET /api/clients/:id/configured-apps endpoint"""
    print("\n=== Testing GET /api/clients/:id/configured-apps ===")
    
    if not test_client_id:
        log_test("GET configured apps", False, "Missing client ID")
        return
    
    # Test getting configured apps (should return the app we just created)
    success, result = make_request('GET', f'clients/{test_client_id}/configured-apps')
    if success and isinstance(result, dict) and result.get('success'):
        apps = result.get('data', [])
        if len(apps) >= 1:
            app = apps[0]
            # Should have isActive: true initially
            if app.get('isActive') == True and app.get('platformId') == test_platform_id:
                # Check for platform enrichment
                if 'platform' in app and app['platform'].get('id') == test_platform_id:
                    log_test("GET /api/clients/:id/configured-apps (active)", True, f"Found {len(apps)} configured app(s) with platform enrichment")
                else:
                    log_test("GET /api/clients/:id/configured-apps (active)", False, "Missing platform enrichment in response")
            else:
                log_test("GET /api/clients/:id/configured-apps (active)", False, f"App status or platform ID mismatch. isActive: {app.get('isActive')}, platformId: {app.get('platformId')}")
        else:
            log_test("GET /api/clients/:id/configured-apps (active)", False, "No configured apps found")
    else:
        log_test("GET /api/clients/:id/configured-apps (active)", False, f"API call failed: {result}")

def test_toggle_configured_app():
    """Test PATCH /api/configured-apps/:id/toggle endpoint"""
    print("\n=== Testing PATCH /api/configured-apps/:id/toggle ===")
    
    if not test_configured_app_id:
        log_test("PATCH toggle configured app", False, "Missing configured app ID")
        return
    
    # Toggle the app to inactive
    success, result = make_request('PATCH', f'configured-apps/{test_configured_app_id}/toggle')
    if success and isinstance(result, dict) and result.get('success'):
        app = result.get('data')
        if app and app.get('isActive') == False:
            log_test("PATCH /api/configured-apps/:id/toggle (to inactive)", True, "Successfully toggled app to inactive")
        else:
            log_test("PATCH /api/configured-apps/:id/toggle (to inactive)", False, f"Toggle failed. isActive: {app.get('isActive') if app else 'No app data'}")
    else:
        log_test("PATCH /api/configured-apps/:id/toggle (to inactive)", False, f"API call failed: {result}")
    
    # Now test that GET still returns the inactive app
    success, result = make_request('GET', f'clients/{test_client_id}/configured-apps')
    if success and isinstance(result, dict) and result.get('success'):
        apps = result.get('data', [])
        inactive_app = None
        for app in apps:
            if app.get('id') == test_configured_app_id:
                inactive_app = app
                break
        
        if inactive_app and inactive_app.get('isActive') == False:
            log_test("GET /api/clients/:id/configured-apps (includes inactive)", True, "Correctly returns inactive apps (not just active ones)")
        else:
            log_test("GET /api/clients/:id/configured-apps (includes inactive)", False, "Failed to return inactive app or app is still active")
    else:
        log_test("GET /api/clients/:id/configured-apps (includes inactive)", False, f"API call failed: {result}")

def test_end_to_end_flow():
    """Test full end-to-end flow: Create client → Add configured app → Create access request using configured items"""
    print("\n=== Testing Full End-to-End Flow ===")
    
    try:
        # Create a new client for this test
        client_data = {"name": "E2E Flow Client", "email": "e2e@flowtest.com"}
        success, client_result = make_request('POST', 'clients', client_data)
        if not success or not client_result.get('success'):
            log_test("E2E Flow - Create Client", False, "Failed to create client for flow test")
            return
        
        e2e_client_id = client_result.get('data', {}).get('id')
        
        # Get a platform ID
        success, platforms_result = make_request('GET', 'platforms?clientFacing=true')
        if not success or not platforms_result.get('success'):
            log_test("E2E Flow - Get Platform", False, "Failed to get platforms for flow test")
            return
        
        platforms = platforms_result.get('data', [])
        if not platforms:
            log_test("E2E Flow - Get Platform", False, "No platforms available for flow test")
            return
        
        e2e_platform_id = platforms[0]['id']
        
        # Create configured app
        app_data = {
            "platformId": e2e_platform_id,
            "items": [
                {
                    "accessPattern": "Standard Access",
                    "label": "Main Account",
                    "role": "Admin",
                    "assetType": "Ad Account", 
                    "assetId": "456",
                    "assetName": "Main Account"
                }
            ]
        }
        
        success, app_result = make_request('POST', f'clients/{e2e_client_id}/configured-apps', app_data)
        if not success or not app_result.get('success'):
            log_test("E2E Flow - Create Configured App", False, "Failed to create configured app")
            return
        
        configured_app = app_result.get('data', {})
        configured_items = configured_app.get('items', [])
        
        # Create access request using the configured items
        if configured_items:
            # Transform configured items to access request items format
            access_request_items = []
            for item in configured_items:
                access_request_items.append({
                    "platformId": e2e_platform_id,
                    "accessPattern": item.get('accessPattern'),
                    "role": item.get('role'),
                    "assetType": item.get('assetType'),
                    "assetId": item.get('assetId'),
                    "assetName": item.get('assetName', item.get('label'))
                })
            
            access_request_data = {
                "clientId": e2e_client_id,
                "items": access_request_items
            }
            
            success, request_result = make_request('POST', 'access-requests', access_request_data)
            if success and isinstance(request_result, dict) and request_result.get('success'):
                access_request = request_result.get('data', {})
                request_items = access_request.get('items', [])
                
                # Verify the access request contains the items from configured app
                if (len(request_items) == len(access_request_items) and
                    request_items[0].get('platformId') == e2e_platform_id and
                    request_items[0].get('assetId') == '456'):
                    log_test("E2E Flow - Create Access Request", True, "Successfully created access request using configured app items")
                else:
                    log_test("E2E Flow - Create Access Request", False, "Access request items don't match configured app items")
            else:
                log_test("E2E Flow - Create Access Request", False, f"Failed to create access request: {request_result}")
        else:
            log_test("E2E Flow - Create Access Request", False, "No configured items found to create access request")
        
        log_test("End-to-End Flow", True, "Complete configured apps workflow successful")
        
    except Exception as e:
        log_test("End-to-End Flow", False, f"Exception during flow: {str(e)}")

def run_configured_apps_tests():
    """Run all configured apps test suites"""
    print("Starting Configured Apps API testing...\n")
    
    # Set up prerequisites
    if not test_prerequisites():
        print("Failed to set up prerequisites. Aborting tests.")
        return False
    
    # Run test suites
    test_post_configured_app()
    test_get_configured_apps()
    test_toggle_configured_app()
    test_end_to_end_flow()
    
    # Print summary
    print("\n" + "="*60)
    print("CONFIGURED APPS API TEST SUMMARY")
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
        print("\n🎉 ALL CONFIGURED APPS API TESTS PASSED!")
    
    return passed == total

if __name__ == "__main__":
    success = run_configured_apps_tests()
    sys.exit(0 if success else 1)