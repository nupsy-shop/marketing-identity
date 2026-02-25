#!/usr/bin/env python3
"""
Test script for the complete onboarding flow with client asset fields.
Testing the requirements from review_request:
1. Test /api/client-asset-fields endpoint
2. Test onboarding token retrieval  
3. Test clientProvidedTarget storage via attest endpoint
4. Test PAM credential submission with clientProvidedTarget
5. End-to-end flow
"""

import requests
import json
import sys
import os

# Get base URL from environment
BASE_URL = "https://ga4-dual-grant.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def log_test(test_name, success, details=""):
    """Log test results"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    {details}")
    return success

def get_google_analytics_id():
    """Get the correct Google Analytics platform ID"""
    return "0f75633f-0f75-40f7-80f7-0f75633f0000"

def test_client_asset_fields():
    """Test 1: /api/client-asset-fields endpoint with different platforms"""
    print("\n=== Testing Client Asset Fields API ===")
    
    all_passed = True
    
    # Test 1.1: Google Analytics with NAMED_INVITE
    response = requests.get(f"{API_BASE}/client-asset-fields", params={
        'platformName': 'Google Analytics / GA4',
        'itemType': 'NAMED_INVITE'
    })
    
    if response.status_code == 200:
        data = response.json()
        fields = data.get('fields', [])
        
        # Check for expected fields
        has_property_id = any(field.get('name') == 'propertyId' for field in fields)
        has_role = any(field.get('name') == 'role' for field in fields)
        
        all_passed &= log_test("GA4 NAMED_INVITE fields", 
                              has_property_id and has_role,
                              f"Found {len(fields)} fields: {[f.get('name') for f in fields]}")
    else:
        all_passed &= log_test("GA4 NAMED_INVITE request", False, f"Status: {response.status_code}")
    
    # Test 1.2: Meta Business Manager
    response = requests.get(f"{API_BASE}/client-asset-fields", params={
        'platformName': 'Meta Business Manager / Facebook Ads',
        'itemType': 'NAMED_INVITE'
    })
    
    if response.status_code == 200:
        data = response.json()
        fields = data.get('fields', [])
        all_passed &= log_test("Meta Business Manager fields", 
                              len(fields) > 0,
                              f"Found {len(fields)} fields")
    else:
        all_passed &= log_test("Meta Business Manager request", False, f"Status: {response.status_code}")
    
    # Test 1.3: Google Ads
    response = requests.get(f"{API_BASE}/client-asset-fields", params={
        'platformName': 'Google Ads',
        'itemType': 'NAMED_INVITE'
    })
    
    if response.status_code == 200:
        data = response.json()
        fields = data.get('fields', [])
        all_passed &= log_test("Google Ads fields", 
                              len(fields) > 0,
                              f"Found {len(fields)} fields")
    else:
        all_passed &= log_test("Google Ads request", False, f"Status: {response.status_code}")
    
    # Test 1.4: Shopify
    response = requests.get(f"{API_BASE}/client-asset-fields", params={
        'platformName': 'Shopify',
        'itemType': 'NAMED_INVITE'
    })
    
    if response.status_code == 200:
        data = response.json()
        fields = data.get('fields', [])
        all_passed &= log_test("Shopify fields", 
                              len(fields) > 0,
                              f"Found {len(fields)} fields")
    else:
        all_passed &= log_test("Shopify request", False, f"Status: {response.status_code}")
    
    return all_passed

def create_test_client():
    """Create a test client for testing"""
    client_data = {
        "name": "Test Corporation",
        "email": "test@example.com"
    }
    
    response = requests.post(f"{API_BASE}/clients", json=client_data)
    if response.status_code == 200:
        return response.json()['data']
    else:
        print(f"❌ Failed to create test client: {response.status_code}")
        return None

def test_onboarding_token_retrieval():
    """Test 2: Onboarding token retrieval with complete data"""
    print("\n=== Testing Onboarding Token Retrieval ===")
    
    all_passed = True
    
    # First create a client
    client = create_test_client()
    if not client:
        return False
    
    client_id = client['id']
    ga_platform_id = get_google_analytics_id()
    
    # Create access request with GA4 item
    access_request_data = {
        "clientId": client_id,
        "items": [{
            "platformId": ga_platform_id,
            "accessPattern": "Named User Access", 
            "role": "Analyst",
            "assetType": "GA4 Property",
            "assetId": "123456789",
            "assetName": "Main Website Property"
        }]
    }
    
    response = requests.post(f"{API_BASE}/access-requests", json=access_request_data)
    
    if response.status_code == 200:
        access_request = response.json()['data']
        token = access_request['onboardingToken']
        
        all_passed &= log_test("Access request creation", True, f"Token: {token}")
        
        # Test onboarding data retrieval
        response = requests.get(f"{API_BASE}/onboarding/{token}")
        
        if response.status_code == 200:
            onboarding_data = response.json()['data']
            
            has_client = 'client' in onboarding_data
            has_items = 'items' in onboarding_data and len(onboarding_data['items']) > 0
            has_platform_info = False
            
            if has_items:
                item = onboarding_data['items'][0]
                has_platform_info = 'platform' in item and item['platform'] is not None
            
            all_passed &= log_test("Onboarding data structure", 
                                  has_client and has_items and has_platform_info,
                                  f"Client: {has_client}, Items: {has_items}, Platform: {has_platform_info}")
            
            return all_passed, token, onboarding_data['items'][0]['id']
        else:
            all_passed &= log_test("Onboarding data retrieval", False, f"Status: {response.status_code}")
    else:
        all_passed &= log_test("Access request creation", False, f"Status: {response.status_code}")
    
    return all_passed, None, None

def test_clientprovided_target_storage(token, item_id):
    """Test 3: clientProvidedTarget storage via attest endpoint"""
    print("\n=== Testing clientProvidedTarget Storage ===")
    
    if not token or not item_id:
        return log_test("clientProvidedTarget storage", False, "Missing token or item_id")
    
    # Submit attestation with clientProvidedTarget
    attestation_data = {
        "clientProvidedTarget": {
            "propertyId": "123456789",
            "role": "Analyst"
        }
    }
    
    response = requests.post(f"{API_BASE}/onboarding/{token}/items/{item_id}/attest", 
                           json=attestation_data)
    
    if response.status_code == 200:
        success = log_test("clientProvidedTarget submission", True, "Attestation successful")
        
        # Verify data is stored by retrieving onboarding data again
        response = requests.get(f"{API_BASE}/onboarding/{token}")
        
        if response.status_code == 200:
            onboarding_data = response.json()['data']
            item = onboarding_data['items'][0]
            
            has_client_target = 'clientProvidedTarget' in item
            status_validated = item.get('status') == 'validated'
            
            return log_test("clientProvidedTarget verification",
                          has_client_target and status_validated,
                          f"Stored: {has_client_target}, Status: {item.get('status')}")
        else:
            return log_test("clientProvidedTarget verification", False, 
                          f"Failed to retrieve updated data: {response.status_code}")
    else:
        return log_test("clientProvidedTarget submission", False, f"Status: {response.status_code}")

def test_pam_credentials_with_target():
    """Test 4: PAM credential submission with clientProvidedTarget"""
    print("\n=== Testing PAM Credentials with clientProvidedTarget ===")
    
    # Create a client for PAM testing
    client = create_test_client()
    if not client:
        return False
    
    client_id = client['id']
    ga_platform_id = get_google_analytics_id()
    
    # Create access request with SHARED_ACCOUNT_PAM + CLIENT_OWNED item
    access_request_data = {
        "clientId": client_id,
        "items": [{
            "platformId": ga_platform_id,
            "itemType": "SHARED_ACCOUNT_PAM",
            "accessPattern": "Named User Access",
            "role": "Analyst", 
            "assetType": "GA4 Property",
            "assetId": "987654321",
            "assetName": "PAM Test Property",
            "pamOwnership": "CLIENT_OWNED",
            "pamGrantMethod": "CREDENTIAL_HANDOFF"
        }]
    }
    
    response = requests.post(f"{API_BASE}/access-requests", json=access_request_data)
    
    if response.status_code == 200:
        access_request = response.json()['data']
        token = access_request['onboardingToken']
        item_id = access_request['items'][0]['id']
        
        log_test("PAM access request creation", True, f"Token: {token}")
        
        # Submit credentials with clientProvidedTarget
        credential_data = {
            "username": "test@example.com",
            "password": "testpassword123",
            "clientProvidedTarget": {
                "propertyId": "987654321",
                "propertyName": "PAM Test Property",
                "role": "Analyst"
            }
        }
        
        response = requests.post(f"{API_BASE}/onboarding/{token}/items/{item_id}/submit-credentials",
                               json=credential_data)
        
        if response.status_code == 200:
            log_test("PAM credential submission", True, "Credentials submitted successfully")
            
            # Verify clientProvidedTarget is stored alongside credentials
            response = requests.get(f"{API_BASE}/onboarding/{token}")
            
            if response.status_code == 200:
                onboarding_data = response.json()['data']
                item = onboarding_data['items'][0]
                
                has_credentials = item.get('pamUsername') == "test@example.com"
                has_client_target = 'clientProvidedTarget' in item
                status_validated = item.get('status') == 'validated'
                
                return log_test("PAM with clientProvidedTarget verification",
                              has_credentials and has_client_target and status_validated,
                              f"Credentials: {has_credentials}, Target: {has_client_target}, Status: {item.get('status')}")
            else:
                return log_test("PAM verification retrieval", False, f"Status: {response.status_code}")
        else:
            return log_test("PAM credential submission", False, f"Status: {response.status_code}")
    else:
        return log_test("PAM access request creation", False, f"Status: {response.status_code}")

def test_end_to_end_flow():
    """Test 5: Complete end-to-end flow"""
    print("\n=== Testing End-to-End Flow ===")
    
    all_passed = True
    
    # Step 1: Create client
    client = create_test_client()
    if not client:
        return False
    
    client_id = client['id']
    ga_platform_id = get_google_analytics_id()
    all_passed &= log_test("Step 1: Client creation", True, f"Client ID: {client_id}")
    
    # Step 2: Create or get existing agency platform with GA4
    agency_platform_data = {
        "platformId": ga_platform_id
    }
    
    response = requests.post(f"{API_BASE}/agency/platforms", json=agency_platform_data)
    
    if response.status_code == 200:
        agency_platform = response.json()['data']
        agency_platform_id = agency_platform['id']
        all_passed &= log_test("Step 2: Agency platform creation", True, f"Agency platform ID: {agency_platform_id}")
    elif response.status_code == 409:
        # Platform already exists, get existing one
        existing_data = response.json()['data']
        agency_platform_id = existing_data['id']
        all_passed &= log_test("Step 2: Agency platform (existing)", True, f"Using existing agency platform ID: {agency_platform_id}")
    else:
        all_passed &= log_test("Step 2: Agency platform creation", False, f"Status: {response.status_code}")
        return all_passed
    
    # Step 3: Add NAMED_INVITE item to agency platform
    item_data = {
        "accessPattern": "Named User Access",
        "label": "GA4 Analytics Access",
        "role": "Analyst",
        "assetType": "GA4 Property",
        "assetId": "999888777",
        "notes": "End-to-end test item"
    }
    
    response = requests.post(f"{API_BASE}/agency/platforms/{agency_platform_id}/items", json=item_data)
    
    if response.status_code == 200:
        updated_platform = response.json()['data']
        all_passed &= log_test("Step 3: Add NAMED_INVITE item", True, 
                             f"Items count: {len(updated_platform['accessItems'])}")
        
        # Step 4: Create access request using agency platform items
        access_request_data = {
            "clientId": client_id,
            "items": [{
                "platformId": ga_platform_id,
                "accessPattern": "Named User Access",
                "role": "Analyst",
                "assetType": "GA4 Property", 
                "assetId": "999888777",
                "assetName": "E2E Test Property"
            }]
        }
            
            response = requests.post(f"{API_BASE}/access-requests", json=access_request_data)
            
            if response.status_code == 200:
                access_request = response.json()['data']
                token = access_request['onboardingToken']
                item_id = access_request['items'][0]['id']
                all_passed &= log_test("Step 4: Access request creation", True, f"Token: {token}")
                
                # Step 5: Get onboarding token data
                response = requests.get(f"{API_BASE}/onboarding/{token}")
                
                if response.status_code == 200:
                    onboarding_data = response.json()['data']
                    has_complete_data = ('client' in onboarding_data and 
                                       'items' in onboarding_data and
                                       len(onboarding_data['items']) > 0 and
                                       'platform' in onboarding_data['items'][0])
                    
                    all_passed &= log_test("Step 5: Onboarding data verification", has_complete_data,
                                         "Complete data structure present")
                    
                    # Step 6: Submit attestation with clientProvidedTarget
                    attestation_data = {
                        "clientProvidedTarget": {
                            "propertyId": "999888777",
                            "propertyName": "E2E Test Property", 
                            "role": "Analyst"
                        }
                    }
                    
                    response = requests.post(f"{API_BASE}/onboarding/{token}/items/{item_id}/attest",
                                           json=attestation_data)
                    
                    if response.status_code == 200:
                        all_passed &= log_test("Step 6: Attestation completion", True, "Flow completed successfully")
                        
                        # Final verification
                        response = requests.get(f"{API_BASE}/onboarding/{token}")
                        if response.status_code == 200:
                            final_data = response.json()['data']
                            final_item = final_data['items'][0]
                            
                            flow_complete = (final_item.get('status') == 'validated' and
                                           'clientProvidedTarget' in final_item)
                            
                            all_passed &= log_test("Step 7: Final verification", flow_complete,
                                                 f"Status: {final_item.get('status')}, Has clientProvidedTarget: {'clientProvidedTarget' in final_item}")
                        else:
                            all_passed &= log_test("Step 7: Final verification", False, f"Status: {response.status_code}")
                    else:
                        all_passed &= log_test("Step 6: Attestation completion", False, f"Status: {response.status_code}")
                else:
                    all_passed &= log_test("Step 5: Onboarding data verification", False, f"Status: {response.status_code}")
            else:
                all_passed &= log_test("Step 4: Access request creation", False, f"Status: {response.status_code}")
        else:
            all_passed &= log_test("Step 3: Add NAMED_INVITE item", False, f"Status: {response.status_code}")
    else:
        all_passed &= log_test("Step 2: Agency platform creation", False, f"Status: {response.status_code}")
    
    return all_passed

def main():
    """Main test execution"""
    print("🔍 ONBOARDING FLOW WITH CLIENT ASSET FIELDS - COMPREHENSIVE TESTING")
    print(f"🌐 Testing against: {BASE_URL}")
    
    # Calculate Google Analytics platform ID
    ga_id = get_google_analytics_id()
    print(f"📋 Using Google Analytics Platform ID: {ga_id}")
    
    all_tests_passed = True
    
    # Test 1: Client Asset Fields API
    all_tests_passed &= test_client_asset_fields()
    
    # Test 2: Onboarding Token Retrieval  
    token_passed, token, item_id = test_onboarding_token_retrieval()
    all_tests_passed &= token_passed
    
    # Test 3: clientProvidedTarget Storage
    all_tests_passed &= test_clientprovided_target_storage(token, item_id)
    
    # Test 4: PAM Credentials with clientProvidedTarget
    all_tests_passed &= test_pam_credentials_with_target()
    
    # Test 5: End-to-End Flow
    all_tests_passed &= test_end_to_end_flow()
    
    # Final summary
    print("\n" + "="*60)
    if all_tests_passed:
        print("🎉 ALL ONBOARDING FLOW TESTS PASSED!")
        print("✅ Client asset fields API working correctly")
        print("✅ Onboarding token retrieval functional")
        print("✅ clientProvidedTarget storage operational") 
        print("✅ PAM credentials with clientProvidedTarget working")
        print("✅ Complete end-to-end flow successful")
        return True
    else:
        print("❌ SOME TESTS FAILED")
        print("🔍 Review test output above for details")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)