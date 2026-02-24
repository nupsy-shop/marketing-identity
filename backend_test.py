#!/usr/bin/env python3

import requests
import json
import sys
import traceback
from urllib.parse import urljoin

# Base URL from environment
BASE_URL = "https://oauth-refactor.preview.emergentagent.com"
API_BASE = urljoin(BASE_URL, "/api/")

def make_request(method, endpoint, data=None, headers=None):
    """Make HTTP request with proper error handling"""
    url = urljoin(API_BASE, endpoint.lstrip('/'))
    default_headers = {'Content-Type': 'application/json'}
    if headers:
        default_headers.update(headers)
    
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=default_headers)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=default_headers)
        elif method.upper() == 'PATCH':
            response = requests.patch(url, json=data, headers=default_headers)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, headers=default_headers)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=default_headers)
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

def test_save_target_endpoint():
    """Test the Save Target API endpoint"""
    print("\n" + "="*80)
    print("TESTING: Save Target Endpoint - POST /api/onboarding/:token/items/:itemId/save-target")
    print("="*80)
    
    # Test data from review request
    valid_token = "055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
    valid_item_id = "c5c93c3e-b691-4bd5-a034-50ae9df8042d"
    
    sample_target = {
        "externalId": "123456789",
        "displayName": "Test GA4 Property",
        "targetType": "PROPERTY",
        "parentExternalId": "accounts/123",
        "metadata": { "test": True }
    }
    
    tests_passed = 0
    total_tests = 4
    
    try:
        # Test 1: Missing selectedTarget (should return 400)
        print("\n[TEST 1/4] Testing missing selectedTarget...")
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/save-target', {})
        if response and response.status_code == 400:
            response_data = response.json()
            if 'selectedTarget is required' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected missing selectedTarget with 400")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 400, got {status}")
        
        # Test 2: Invalid token (should return 404)
        print("\n[TEST 2/4] Testing invalid token...")
        invalid_token = "invalid-token-12345"
        response = make_request('POST', f'/onboarding/{invalid_token}/items/{valid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 404:
            response_data = response.json()
            if 'Invalid onboarding token' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected invalid token with 404")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 404, got {status}")
        
        # Test 3: Invalid itemId (should return 404)
        print("\n[TEST 3/4] Testing invalid itemId...")
        invalid_item_id = "invalid-item-id-12345"
        response = make_request('POST', f'/onboarding/{valid_token}/items/{invalid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 404:
            response_data = response.json()
            if 'Item not found' in response_data.get('error', ''):
                print("✅ PASS: Correctly rejected invalid itemId with 404")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Wrong error message: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 404, got {status}")
        
        # Test 4: Valid request with selectedTarget object (should return 200)
        print("\n[TEST 4/4] Testing valid save target request...")
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/save-target', 
                              {"selectedTarget": sample_target})
        if response and response.status_code == 200:
            response_data = response.json()
            if (response_data.get('success') and 
                response_data.get('data', {}).get('selectedTarget', {}).get('externalId') == "123456789"):
                print("✅ PASS: Successfully saved target with 200")
                print(f"   Returned target: {response_data.get('data', {}).get('selectedTarget', {})}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Invalid response structure: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during save target tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Save Target Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_target_discovery_endpoint():
    """Test the Target Discovery API endpoint"""
    print("\n" + "="*80)
    print("TESTING: Target Discovery Endpoint - POST /api/oauth/:platformKey/discover-targets")
    print("="*80)
    
    platforms_to_test = ['ga4', 'gtm', 'google-ads']
    tests_passed = 0
    total_tests = 6  # 2 tests per platform
    
    try:
        for platform in platforms_to_test:
            print(f"\n--- Testing platform: {platform} ---")
            
            # Test 1: Missing accessToken (should return 400)
            print(f"\n[TEST] Testing missing accessToken for {platform}...")
            response = make_request('POST', f'/oauth/{platform}/discover-targets', {})
            if response and response.status_code == 400:
                response_data = response.json()
                if 'accessToken is required' in response_data.get('error', ''):
                    print(f"✅ PASS: Correctly rejected missing accessToken for {platform}")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: Wrong error message for {platform}: {response_data}")
            else:
                status = response.status_code if response else 'No response'
                print(f"❌ FAIL: Expected 400 for {platform}, got {status}")
            
            # Test 2: Fake accessToken (should return error from Google API or appropriate error)
            print(f"\n[TEST] Testing fake accessToken for {platform}...")
            fake_token = "fake_access_token_12345"
            response = make_request('POST', f'/oauth/{platform}/discover-targets', 
                                  {"accessToken": fake_token})
            
            # Should return either 400/401/500 error (depending on platform implementation)
            if response and response.status_code in [400, 401, 500, 501]:
                response_data = response.json()
                error_msg = response_data.get('error', '').lower()
                
                # Check for expected error patterns
                expected_errors = [
                    'not configured', 'oauth is not configured', 'not found',
                    'invalid', 'unauthorized', 'failed', 'does not support'
                ]
                
                if any(expected in error_msg for expected in expected_errors):
                    print(f"✅ PASS: Correctly handled fake token for {platform} (Status: {response.status_code})")
                    print(f"   Error: {response_data.get('error', '')}")
                    tests_passed += 1
                else:
                    print(f"❌ FAIL: Unexpected error message for {platform}: {response_data}")
            else:
                status = response.status_code if response else 'No response'
                print(f"❌ FAIL: Expected error status for {platform}, got {status}")
                if response:
                    print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during target discovery tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Target Discovery Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def test_regression_onboarding_endpoints():
    """Test existing onboarding endpoints still work"""
    print("\n" + "="*80)
    print("TESTING: Regression - Existing Onboarding Endpoints")
    print("="*80)
    
    # Test data from review request
    valid_token = "055b2165-83d1-4ff7-8d44-5a7dec3a17f2"
    valid_item_id = "c5c93c3e-b691-4bd5-a034-50ae9df8042d"
    
    tests_passed = 0
    total_tests = 2
    
    try:
        # Test 1: GET /api/onboarding/:token (should return onboarding data)
        print("\n[TEST 1/2] Testing GET onboarding data...")
        response = make_request('GET', f'/onboarding/{valid_token}')
        if response and response.status_code == 200:
            response_data = response.json()
            if (response_data.get('success') and 
                response_data.get('data', {}).get('client') and
                response_data.get('data', {}).get('items')):
                print("✅ PASS: Successfully retrieved onboarding data")
                print(f"   Client: {response_data['data']['client']['name']}")
                print(f"   Items count: {len(response_data['data']['items'])}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Invalid onboarding data structure: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
        # Test 2: POST /api/onboarding/:token/items/:itemId/attest (should still work)
        print("\n[TEST 2/2] Testing POST attestation endpoint...")
        attest_data = {
            "attestationText": "I have granted the requested access to my GA4 account",
            "clientProvidedTarget": {
                "propertyId": "123456789",
                "propertyName": "Test Property",
                "assetType": "GA4_PROPERTY"
            }
        }
        
        response = make_request('POST', f'/onboarding/{valid_token}/items/{valid_item_id}/attest', 
                              attest_data)
        if response and response.status_code == 200:
            response_data = response.json()
            if response_data.get('success'):
                print("✅ PASS: Successfully submitted attestation")
                print(f"   Response success: {response_data.get('success')}")
                tests_passed += 1
            else:
                print(f"❌ FAIL: Attestation failed: {response_data}")
        else:
            status = response.status_code if response else 'No response'
            print(f"❌ FAIL: Expected 200, got {status}")
            if response:
                print(f"   Response: {response.json()}")
        
    except Exception as e:
        print(f"❌ FAIL: Exception during regression tests: {e}")
        traceback.print_exc()
    
    print(f"\n📊 Regression Tests: {tests_passed}/{total_tests} PASSED")
    return tests_passed, total_tests

def main():
    """Run all Target Discovery and Save Target API tests"""
    print("🚀 STARTING TARGET DISCOVERY AND SAVE TARGET API TESTING")
    print(f"Testing against: {BASE_URL}")
    
    total_passed = 0
    total_tests = 0
    
    # Test 1: Save Target Endpoint
    passed, tests = test_save_target_endpoint()
    total_passed += passed
    total_tests += tests
    
    # Test 2: Target Discovery Endpoint  
    passed, tests = test_target_discovery_endpoint()
    total_passed += passed
    total_tests += tests
    
    # Test 3: Regression Testing
    passed, tests = test_regression_onboarding_endpoints()
    total_passed += passed
    total_tests += tests
    
    # Final Results
    print("\n" + "="*80)
    print("🎯 FINAL TEST RESULTS")
    print("="*80)
    print(f"✅ PASSED: {total_passed}/{total_tests} tests")
    print(f"❌ FAILED: {total_tests - total_passed}/{total_tests} tests")
    
    success_rate = (total_passed / total_tests) * 100 if total_tests > 0 else 0
    print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 TARGET DISCOVERY AND SAVE TARGET API TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("⚠️  Some tests failed. Please review the implementation.")
    
    return total_passed == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)