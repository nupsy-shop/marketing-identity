#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Marketing Identity Platform
Tests all endpoints: platforms, clients, access-requests, and onboarding
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
            BASE_URL = 'https://identity-platform-7.preview.emergentagent.com'
except:
    BASE_URL = 'https://identity-platform-7.preview.emergentagent.com'

API_BASE = f"{BASE_URL}/api"

print(f"Testing API at: {API_BASE}")

# Test data
test_results = []
created_client_id = None
created_access_request_id = None
access_request_token = None
test_platform_ids = []

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

def test_platforms_api():
    """Test all platforms API endpoints"""
    print("\n=== Testing Platforms API ===")
    
    # Test GET /api/platforms - Should return 60+ platforms
    success, result = make_request('GET', 'platforms')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        if len(platforms) >= 60:
            log_test("GET /api/platforms", True, f"Found {len(platforms)} platforms")
            # Store first 3 platform IDs for later tests
            global test_platform_ids
            test_platform_ids = [p['id'] for p in platforms[:3]]
        else:
            log_test("GET /api/platforms", False, f"Expected 60+ platforms, got {len(platforms)}")
    else:
        log_test("GET /api/platforms", False, f"API call failed: {result}")
    
    # Test GET /api/platforms?domain=Paid Media - Filter by domain
    success, result = make_request('GET', 'platforms?domain=Paid Media')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        paid_media_count = len(platforms)
        # Verify all returned platforms are Paid Media
        all_paid_media = all(p.get('domain') == 'Paid Media' for p in platforms)
        if all_paid_media and paid_media_count > 0:
            log_test("GET /api/platforms?domain=Paid Media", True, f"Found {paid_media_count} Paid Media platforms")
        else:
            log_test("GET /api/platforms?domain=Paid Media", False, "Filter not working correctly")
    else:
        log_test("GET /api/platforms?domain=Paid Media", False, f"API call failed: {result}")
    
    # Test GET /api/platforms?automation=High - Filter by automation level
    success, result = make_request('GET', 'platforms?automation=High')
    if success and isinstance(result, dict) and result.get('success'):
        platforms = result.get('data', [])
        high_automation_count = len(platforms)
        all_high_automation = all(p.get('automationFeasibility') == 'High' for p in platforms)
        if all_high_automation:
            log_test("GET /api/platforms?automation=High", True, f"Found {high_automation_count} High automation platforms")
        else:
            log_test("GET /api/platforms?automation=High", False, "Automation filter not working correctly")
    else:
        log_test("GET /api/platforms?automation=High", False, f"API call failed: {result}")
    
    # Test GET /api/platforms/:id - Get specific platform
    if test_platform_ids:
        platform_id = test_platform_ids[0]
        success, result = make_request('GET', f'platforms/{platform_id}')
        if success and isinstance(result, dict) and result.get('success'):
            platform = result.get('data')
            if platform and platform.get('id') == platform_id:
                log_test("GET /api/platforms/:id", True, f"Retrieved platform: {platform.get('name')}")
            else:
                log_test("GET /api/platforms/:id", False, "Platform ID mismatch")
        else:
            log_test("GET /api/platforms/:id", False, f"API call failed: {result}")
    
    # Test invalid platform ID
    success, result = make_request('GET', 'platforms/invalid-id', expected_status=404)
    if success:
        log_test("GET /api/platforms/invalid-id (404)", True, "Correctly returned 404 for invalid ID")
    else:
        log_test("GET /api/platforms/invalid-id (404)", False, result)

def test_clients_api():
    """Test all clients API endpoints"""
    print("\n=== Testing Clients API ===")
    global created_client_id
    
    # Test POST /api/clients - Create new client
    client_data = {
        "name": "Acme Marketing Agency",
        "email": "contact@acmemarketing.com"
    }
    
    success, result = make_request('POST', 'clients', client_data)
    if success and isinstance(result, dict) and result.get('success'):
        client = result.get('data')
        if client and client.get('name') == client_data['name'] and client.get('email') == client_data['email']:
            created_client_id = client.get('id')
            log_test("POST /api/clients", True, f"Created client with ID: {created_client_id}")
        else:
            log_test("POST /api/clients", False, "Client data mismatch")
    else:
        log_test("POST /api/clients", False, f"API call failed: {result}")
    
    # Test validation - missing name
    invalid_data = {"email": "test@example.com"}
    success, result = make_request('POST', 'clients', invalid_data, expected_status=400)
    if success:
        log_test("POST /api/clients (missing name)", True, "Correctly rejected missing name")
    else:
        log_test("POST /api/clients (missing name)", False, result)
    
    # Test validation - missing email
    invalid_data = {"name": "Test Client"}
    success, result = make_request('POST', 'clients', invalid_data, expected_status=400)
    if success:
        log_test("POST /api/clients (missing email)", True, "Correctly rejected missing email")
    else:
        log_test("POST /api/clients (missing email)", False, result)
    
    # Test GET /api/clients - List all clients
    success, result = make_request('GET', 'clients')
    if success and isinstance(result, dict) and result.get('success'):
        clients = result.get('data', [])
        if len(clients) >= 1:
            log_test("GET /api/clients", True, f"Found {len(clients)} clients")
        else:
            log_test("GET /api/clients", False, "No clients found")
    else:
        log_test("GET /api/clients", False, f"API call failed: {result}")
    
    # Test GET /api/clients/:id - Get specific client
    if created_client_id:
        success, result = make_request('GET', f'clients/{created_client_id}')
        if success and isinstance(result, dict) and result.get('success'):
            client = result.get('data')
            if client and client.get('id') == created_client_id:
                log_test("GET /api/clients/:id", True, f"Retrieved client: {client.get('name')}")
            else:
                log_test("GET /api/clients/:id", False, "Client ID mismatch")
        else:
            log_test("GET /api/clients/:id", False, f"API call failed: {result}")
    
    # Test invalid client ID
    success, result = make_request('GET', 'clients/invalid-id', expected_status=404)
    if success:
        log_test("GET /api/clients/invalid-id (404)", True, "Correctly returned 404 for invalid ID")
    else:
        log_test("GET /api/clients/invalid-id (404)", False, result)

def test_access_requests_api():
    """Test all access requests API endpoints"""
    print("\n=== Testing Access Requests API ===")
    global created_access_request_id, access_request_token
    
    if not created_client_id or not test_platform_ids:
        log_test("Access Requests API", False, "Missing prerequisites (client_id or platform_ids)")
        return
    
    # Test POST /api/access-requests - Create access request
    access_request_data = {
        "clientId": created_client_id,
        "platformIds": test_platform_ids
    }
    
    success, result = make_request('POST', 'access-requests', access_request_data)
    if success and isinstance(result, dict) and result.get('success'):
        access_request = result.get('data')
        if access_request and access_request.get('clientId') == created_client_id:
            created_access_request_id = access_request.get('id')
            access_request_token = access_request.get('token')
            platform_statuses = access_request.get('platformStatuses', [])
            if len(platform_statuses) == len(test_platform_ids):
                log_test("POST /api/access-requests", True, f"Created access request with ID: {created_access_request_id}")
            else:
                log_test("POST /api/access-requests", False, "Platform statuses count mismatch")
        else:
            log_test("POST /api/access-requests", False, "Access request data mismatch")
    else:
        log_test("POST /api/access-requests", False, f"API call failed: {result}")
    
    # Test validation - missing clientId
    invalid_data = {"platformIds": test_platform_ids}
    success, result = make_request('POST', 'access-requests', invalid_data, expected_status=400)
    if success:
        log_test("POST /api/access-requests (missing clientId)", True, "Correctly rejected missing clientId")
    else:
        log_test("POST /api/access-requests (missing clientId)", False, result)
    
    # Test validation - invalid clientId
    invalid_data = {"clientId": "invalid-id", "platformIds": test_platform_ids}
    success, result = make_request('POST', 'access-requests', invalid_data, expected_status=404)
    if success:
        log_test("POST /api/access-requests (invalid clientId)", True, "Correctly rejected invalid clientId")
    else:
        log_test("POST /api/access-requests (invalid clientId)", False, result)
    
    # Test validation - invalid platformIds
    invalid_data = {"clientId": created_client_id, "platformIds": ["invalid-id"]}
    success, result = make_request('POST', 'access-requests', invalid_data, expected_status=400)
    if success:
        log_test("POST /api/access-requests (invalid platformIds)", True, "Correctly rejected invalid platformIds")
    else:
        log_test("POST /api/access-requests (invalid platformIds)", False, result)
    
    # Test GET /api/access-requests/:id - Get access request details
    if created_access_request_id:
        success, result = make_request('GET', f'access-requests/{created_access_request_id}')
        if success and isinstance(result, dict) and result.get('success'):
            access_request = result.get('data')
            if access_request and access_request.get('id') == created_access_request_id:
                log_test("GET /api/access-requests/:id", True, f"Retrieved access request")
            else:
                log_test("GET /api/access-requests/:id", False, "Access request ID mismatch")
        else:
            log_test("GET /api/access-requests/:id", False, f"API call failed: {result}")
    
    # Test GET /api/clients/:id/access-requests - Get all requests for a client
    success, result = make_request('GET', f'clients/{created_client_id}/access-requests')
    if success and isinstance(result, dict) and result.get('success'):
        requests_list = result.get('data', [])
        if len(requests_list) >= 1:
            log_test("GET /api/clients/:id/access-requests", True, f"Found {len(requests_list)} access requests")
        else:
            log_test("GET /api/clients/:id/access-requests", False, "No access requests found for client")
    else:
        log_test("GET /api/clients/:id/access-requests", False, f"API call failed: {result}")
    
    # Test POST /api/access-requests/:id/validate - Validate a platform
    if created_access_request_id and test_platform_ids:
        validate_data = {
            "platformId": test_platform_ids[0],
            "notes": "Test validation"
        }
        
        success, result = make_request('POST', f'access-requests/{created_access_request_id}/validate', validate_data)
        if success and isinstance(result, dict) and result.get('success'):
            access_request = result.get('data')
            # Find the validated platform status
            platform_status = None
            for ps in access_request.get('platformStatuses', []):
                if ps.get('platformId') == test_platform_ids[0]:
                    platform_status = ps
                    break
            
            if platform_status and platform_status.get('status') == 'validated':
                log_test("POST /api/access-requests/:id/validate", True, "Platform validated successfully")
            else:
                log_test("POST /api/access-requests/:id/validate", False, "Platform status not updated")
        else:
            log_test("POST /api/access-requests/:id/validate", False, f"API call failed: {result}")
    
    # Test POST /api/access-requests/:id/refresh - Refresh validation status
    if created_access_request_id:
        success, result = make_request('POST', f'access-requests/{created_access_request_id}/refresh')
        if success and isinstance(result, dict) and result.get('success'):
            data = result.get('data')
            if data and 'verificationResults' in data:
                log_test("POST /api/access-requests/:id/refresh", True, "Refresh completed with verification results")
            else:
                log_test("POST /api/access-requests/:id/refresh", False, "Missing verification results")
        else:
            log_test("POST /api/access-requests/:id/refresh", False, f"API call failed: {result}")
    
    # Test DELETE /api/access-requests/:id/platforms/:platformId - Revoke platform access
    if created_access_request_id and test_platform_ids:
        platform_id = test_platform_ids[1]  # Use second platform
        success, result = make_request('DELETE', f'access-requests/{created_access_request_id}/platforms/{platform_id}')
        if success and isinstance(result, dict) and result.get('success'):
            access_request = result.get('data')
            # Find the revoked platform status
            platform_status = None
            for ps in access_request.get('platformStatuses', []):
                if ps.get('platformId') == platform_id:
                    platform_status = ps
                    break
            
            if platform_status and platform_status.get('status') == 'pending':
                log_test("DELETE /api/access-requests/:id/platforms/:platformId", True, "Platform access revoked")
            else:
                log_test("DELETE /api/access-requests/:id/platforms/:platformId", False, "Platform status not reverted")
        else:
            log_test("DELETE /api/access-requests/:id/platforms/:platformId", False, f"API call failed: {result}")

def test_onboarding_api():
    """Test onboarding API endpoint"""
    print("\n=== Testing Onboarding API ===")
    
    if not access_request_token:
        log_test("Onboarding API", False, "Missing access request token")
        return
    
    # Test GET /api/onboarding/:token - Get access request by token
    success, result = make_request('GET', f'onboarding/{access_request_token}')
    if success and isinstance(result, dict) and result.get('success'):
        data = result.get('data')
        if data and 'client' in data and 'platformStatuses' in data:
            # Verify enriched data
            client = data.get('client')
            platform_statuses = data.get('platformStatuses', [])
            
            # Check if platform details are included
            has_platform_details = all('platform' in ps for ps in platform_statuses)
            
            if client and has_platform_details:
                log_test("GET /api/onboarding/:token", True, f"Retrieved enriched onboarding data with {len(platform_statuses)} platforms")
            else:
                log_test("GET /api/onboarding/:token", False, "Missing enriched data (client or platform details)")
        else:
            log_test("GET /api/onboarding/:token", False, "Missing required fields in response")
    else:
        log_test("GET /api/onboarding/:token", False, f"API call failed: {result}")
    
    # Test invalid token
    success, result = make_request('GET', 'onboarding/invalid-token', expected_status=404)
    if success:
        log_test("GET /api/onboarding/invalid-token (404)", True, "Correctly returned 404 for invalid token")
    else:
        log_test("GET /api/onboarding/invalid-token (404)", False, result)

def test_end_to_end_flow():
    """Test complete end-to-end user flow"""
    print("\n=== Testing End-to-End Flow ===")
    
    try:
        # 1. Get platforms
        success, platforms_result = make_request('GET', 'platforms')
        if not success or not platforms_result.get('success'):
            log_test("E2E Flow Step 1 (Get Platforms)", False, "Failed to get platforms")
            return
        
        platforms = platforms_result.get('data', [])[:3]
        platform_ids = [p['id'] for p in platforms]
        
        # 2. Create client
        client_data = {"name": "E2E Test Client", "email": "e2e@testclient.com"}
        success, client_result = make_request('POST', 'clients', client_data)
        if not success or not client_result.get('success'):
            log_test("E2E Flow Step 2 (Create Client)", False, "Failed to create client")
            return
        
        client_id = client_result.get('data', {}).get('id')
        
        # 3. Create access request
        request_data = {"clientId": client_id, "platformIds": platform_ids}
        success, request_result = make_request('POST', 'access-requests', request_data)
        if not success or not request_result.get('success'):
            log_test("E2E Flow Step 3 (Create Access Request)", False, "Failed to create access request")
            return
        
        request_id = request_result.get('data', {}).get('id')
        token = request_result.get('data', {}).get('token')
        
        # 4. Validate one platform
        validate_data = {"platformId": platform_ids[0]}
        success, validate_result = make_request('POST', f'access-requests/{request_id}/validate', validate_data)
        if not success or not validate_result.get('success'):
            log_test("E2E Flow Step 4 (Validate Platform)", False, "Failed to validate platform")
            return
        
        # 5. Get onboarding data
        success, onboarding_result = make_request('GET', f'onboarding/{token}')
        if not success or not onboarding_result.get('success'):
            log_test("E2E Flow Step 5 (Get Onboarding Data)", False, "Failed to get onboarding data")
            return
        
        # Verify complete flow
        onboarding_data = onboarding_result.get('data', {})
        if (onboarding_data.get('client', {}).get('id') == client_id and 
            len(onboarding_data.get('platformStatuses', [])) == 3):
            log_test("End-to-End Flow", True, "Complete user flow working correctly")
        else:
            log_test("End-to-End Flow", False, "Data consistency issues in flow")
            
    except Exception as e:
        log_test("End-to-End Flow", False, f"Exception during flow: {str(e)}")

def run_all_tests():
    """Run all test suites"""
    print("Starting comprehensive backend API testing...\n")
    
    # Run all test suites
    test_platforms_api()
    test_clients_api()
    test_access_requests_api()
    test_onboarding_api()
    test_end_to_end_flow()
    
    # Print summary
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
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
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)