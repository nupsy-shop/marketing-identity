#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Test configuration
BASE_URL = "https://festive-thompson-4.preview.emergentagent.com/api"
TEST_RESULTS = []

def log_test(test_name, success, details=""):
    """Log test results"""
    result = "✅ PASS" if success else "❌ FAIL"
    print(f"{result}: {test_name}")
    if details:
        print(f"   Details: {details}")
    TEST_RESULTS.append({
        "test": test_name,
        "success": success,
        "details": details
    })

def test_agency_platform_creation_with_agency_data():
    """Test 1: Create Agency Platform with Agency Data"""
    try:
        # First get a platform ID for Google Ads
        response = requests.get(f"{BASE_URL}/platforms?clientFacing=true")
        platforms = response.json()["data"]
        google_ads_platform = next((p for p in platforms if "Google Ads" in p["name"]), None)
        
        if not google_ads_platform:
            log_test("Agency Platform Creation - Get Google Ads Platform", False, "Google Ads platform not found")
            return None
        
        platform_id = google_ads_platform["id"]
        log_test("Agency Platform Creation - Get Google Ads Platform", True, f"Platform ID: {platform_id}")
        
        # Create agency platform
        agency_platform_data = {
            "platformId": platform_id
        }
        
        response = requests.post(f"{BASE_URL}/agency/platforms", json=agency_platform_data)
        
        if response.status_code == 200:
            agency_platform = response.json()["data"]
            log_test("Agency Platform Creation - POST /api/agency/platforms", True, f"Created agency platform with ID: {agency_platform['id']}")
            
            # Add access item with agency data
            access_item_data = {
                "itemType": "PARTNER_DELEGATION",
                "accessPattern": "1 (Partner Hub)",
                "label": "Google Ads MCC Access",
                "role": "Admin",
                "agencyData": {
                    "managerAccountId": "123-456-7890"
                },
                "clientInstructions": "Provide the Manager account ID for linking your Google Ads account to our MCC."
            }
            
            response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform['id']}/items", json=access_item_data)
            
            if response.status_code == 200:
                updated_platform = response.json()["data"]
                item = updated_platform["accessItems"][0]
                
                # Verify agency data is stored
                if item.get("agencyData", {}).get("managerAccountId") == "123-456-7890":
                    log_test("Agency Platform - Add Access Item with Agency Data", True, 
                            f"Agency data stored: {item['agencyData']}")
                else:
                    log_test("Agency Platform - Add Access Item with Agency Data", False, 
                            f"Agency data missing or incorrect: {item.get('agencyData')}")
                
                # Verify client instructions are stored
                if item.get("clientInstructions"):
                    log_test("Agency Platform - Client Instructions Storage", True, 
                            f"Instructions: {item['clientInstructions'][:50]}...")
                else:
                    log_test("Agency Platform - Client Instructions Storage", False, 
                            "Client instructions not stored")
                
                return {
                    "agency_platform": updated_platform,
                    "google_ads_platform_id": platform_id
                }
            else:
                log_test("Agency Platform - Add Access Item", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        else:
            log_test("Agency Platform Creation - POST /api/agency/platforms", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        log_test("Agency Platform Creation with Agency Data", False, f"Exception: {str(e)}")
        return None

def test_create_access_request_with_agency_data(setup_data):
    """Test 2: Create Access Request with Agency Data"""
    try:
        # First create a client
        client_data = {
            "name": "Tech Solutions Inc",
            "email": "contact@techsolutions.com"
        }
        
        response = requests.post(f"{BASE_URL}/clients", json=client_data)
        if response.status_code != 200:
            log_test("Access Request - Client Creation", False, f"Status: {response.status_code}")
            return None
            
        client = response.json()["data"]
        log_test("Access Request - Client Creation", True, f"Client ID: {client['id']}")
        
        # Create access request with agency data
        access_request_data = {
            "clientId": client["id"],
            "items": [{
                "platformId": setup_data["google_ads_platform_id"],
                "accessPattern": "1 (Partner Hub)",
                "role": "Admin",
                "assetName": "Google Ads Access",
                "itemType": "PARTNER_DELEGATION",
                "agencyData": {"managerAccountId": "123-456-7890"},
                "clientInstructions": "Link your account to the agency MCC with Manager Account ID: 123-456-7890"
            }]
        }
        
        response = requests.post(f"{BASE_URL}/access-requests", json=access_request_data)
        
        if response.status_code == 200:
            access_request = response.json()["data"]
            item = access_request["items"][0]
            
            # Verify agency data is preserved
            if item.get("agencyData", {}).get("managerAccountId") == "123-456-7890":
                log_test("Access Request - Agency Data Preservation", True, 
                        f"Agency data: {item['agencyData']}")
            else:
                log_test("Access Request - Agency Data Preservation", False, 
                        f"Agency data missing: {item.get('agencyData')}")
            
            # Verify client instructions are preserved
            if item.get("clientInstructions"):
                log_test("Access Request - Client Instructions Preservation", True, 
                        f"Instructions preserved")
            else:
                log_test("Access Request - Client Instructions Preservation", False, 
                        "Client instructions missing")
            
            return {
                "access_request": access_request,
                "client": client
            }
        else:
            log_test("Access Request Creation with Agency Data", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        log_test("Create Access Request with Agency Data", False, f"Exception: {str(e)}")
        return None

def test_onboarding_api_returns_agency_data(request_data):
    """Test 3: Test Onboarding API Returns Agency Data"""
    try:
        if not request_data:
            log_test("Onboarding API - Agency Data", False, "No access request data available")
            return
            
        token = request_data["access_request"]["token"]
        
        response = requests.get(f"{BASE_URL}/onboarding/{token}")
        
        if response.status_code == 200:
            onboarding_data = response.json()["data"]
            
            # Check if items include agency data
            items = onboarding_data.get("items", [])
            if not items:
                log_test("Onboarding API - Items Present", False, "No items in onboarding response")
                return
            
            item = items[0]
            
            # Verify agency data with managerAccountId
            agency_data = item.get("agencyData")
            if agency_data and agency_data.get("managerAccountId") == "123-456-7890":
                log_test("Onboarding API - Agency Data with managerAccountId", True, 
                        f"Agency data: {agency_data}")
            else:
                log_test("Onboarding API - Agency Data with managerAccountId", False, 
                        f"Missing or incorrect agency data: {agency_data}")
            
            # Verify client instructions text
            client_instructions = item.get("clientInstructions")
            if client_instructions:
                log_test("Onboarding API - Client Instructions Text", True, 
                        f"Instructions present: {client_instructions[:50]}...")
            else:
                log_test("Onboarding API - Client Instructions Text", False, 
                        "Client instructions missing")
                
            return {
                "onboarding_data": onboarding_data,
                "token": token,
                "item_id": item["id"]
            }
        else:
            log_test("Onboarding API Returns Agency Data", False, f"Status: {response.status_code}, Response: {response.text}")
            return None
            
    except Exception as e:
        log_test("Onboarding API Returns Agency Data", False, f"Exception: {str(e)}")
        return None

def test_attestation_with_asset_selection(onboarding_data):
    """Test 4: Test Attestation with Asset Selection"""
    try:
        if not onboarding_data:
            log_test("Attestation with Asset Selection", False, "No onboarding data available")
            return
            
        token = onboarding_data["token"]
        item_id = onboarding_data["item_id"]
        
        # Test attestation with asset selection
        attestation_data = {
            "attestationText": "Access granted to the Google Ads account",
            "assetType": "Ad Account", 
            "assetId": "123456789"
        }
        
        response = requests.post(f"{BASE_URL}/onboarding/{token}/items/{item_id}/attest", json=attestation_data)
        
        if response.status_code == 200:
            updated_request = response.json()["data"]
            
            # Find the updated item
            updated_item = next((item for item in updated_request["items"] if item["id"] == item_id), None)
            
            if updated_item:
                # Verify selectedAssetType and selectedAssetId are stored
                if updated_item.get("selectedAssetType") == "Ad Account":
                    log_test("Attestation - selectedAssetType Storage", True, 
                            f"Asset type: {updated_item['selectedAssetType']}")
                else:
                    log_test("Attestation - selectedAssetType Storage", False, 
                            f"Missing asset type: {updated_item.get('selectedAssetType')}")
                
                if updated_item.get("selectedAssetId") == "123456789":
                    log_test("Attestation - selectedAssetId Storage", True, 
                            f"Asset ID: {updated_item['selectedAssetId']}")
                else:
                    log_test("Attestation - selectedAssetId Storage", False, 
                            f"Missing asset ID: {updated_item.get('selectedAssetId')}")
                
                # Verify validation result includes asset information
                validation_result = updated_item.get("validationResult", {})
                if (validation_result.get("selectedAssetType") == "Ad Account" and 
                    validation_result.get("selectedAssetId") == "123456789"):
                    log_test("Attestation - Asset Info in Validation Result", True, 
                            f"Validation result includes asset info")
                else:
                    log_test("Attestation - Asset Info in Validation Result", False, 
                            f"Missing asset info in validation: {validation_result}")
                    
            else:
                log_test("Attestation - Updated Item Retrieval", False, "Could not find updated item")
        else:
            log_test("Attestation with Asset Selection", False, f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Attestation with Asset Selection", False, f"Exception: {str(e)}")

def test_different_agency_data_fields():
    """Test 5: Test Different Agency Data Fields"""
    try:
        # Get some platforms for testing
        response = requests.get(f"{BASE_URL}/platforms?clientFacing=true")
        platforms = response.json()["data"]
        
        # Test cases for different agency data fields
        test_cases = [
            {
                "platform_name": "Meta",
                "agency_data": {"businessManagerId": "789012345"},
                "field_name": "businessManagerId"
            },
            {
                "platform_name": "TikTok", 
                "agency_data": {"businessCenterId": "456789012"},
                "field_name": "businessCenterId"
            },
            {
                "platform_name": "Google Analytics",
                "agency_data": {"agencyEmail": "agency@example.com"},
                "field_name": "agencyEmail"
            }
        ]
        
        for test_case in test_cases:
            # Find platform
            platform = next((p for p in platforms if test_case["platform_name"] in p["name"]), None)
            if not platform:
                log_test(f"Agency Data Fields - {test_case['platform_name']} Platform", False, "Platform not found")
                continue
                
            # Create agency platform
            response = requests.post(f"{BASE_URL}/agency/platforms", json={"platformId": platform["id"]})
            if response.status_code != 200:
                log_test(f"Agency Data Fields - {test_case['platform_name']} Agency Platform", False, 
                        f"Failed to create: {response.status_code}")
                continue
                
            agency_platform = response.json()["data"]
            
            # Add access item with specific agency data
            item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Default",
                "label": f"{test_case['platform_name']} Access",
                "role": "Admin",
                "agencyData": test_case["agency_data"],
                "clientInstructions": f"Please configure {test_case['platform_name']} access"
            }
            
            response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform['id']}/items", json=item_data)
            
            if response.status_code == 200:
                updated_platform = response.json()["data"]
                item = updated_platform["accessItems"][0]
                
                # Verify specific agency data field
                agency_data = item.get("agencyData", {})
                if agency_data.get(test_case["field_name"]) == test_case["agency_data"][test_case["field_name"]]:
                    log_test(f"Agency Data Fields - {test_case['platform_name']} {test_case['field_name']}", True, 
                            f"Field stored: {agency_data}")
                else:
                    log_test(f"Agency Data Fields - {test_case['platform_name']} {test_case['field_name']}", False, 
                            f"Field missing: {agency_data}")
            else:
                log_test(f"Agency Data Fields - {test_case['platform_name']} Item Creation", False, 
                        f"Status: {response.status_code}")
                        
    except Exception as e:
        log_test("Different Agency Data Fields", False, f"Exception: {str(e)}")

def test_snowflake_complex_agency_data():
    """Test 5b: Test Snowflake Complex Agency Data"""
    try:
        # Get platforms
        response = requests.get(f"{BASE_URL}/platforms?clientFacing=true")
        platforms = response.json()["data"]
        
        # Find Snowflake platform
        snowflake_platform = next((p for p in platforms if "Snowflake" in p["name"]), None)
        if not snowflake_platform:
            log_test("Agency Data Fields - Snowflake Platform", False, "Snowflake platform not found")
            return
            
        # Create agency platform
        response = requests.post(f"{BASE_URL}/agency/platforms", json={"platformId": snowflake_platform["id"]})
        if response.status_code != 200:
            log_test("Agency Data Fields - Snowflake Agency Platform", False, f"Failed to create: {response.status_code}")
            return
            
        agency_platform = response.json()["data"]
        
        # Add access item with complex Snowflake agency data
        item_data = {
            "itemType": "NAMED_INVITE",
            "accessPattern": "Service Account",
            "label": "Snowflake Data Access",
            "role": "Analyst",
            "agencyData": {
                "serviceAccountEmail": "snowflake-service@agency.com",
                "ssoGroupName": "agency_analysts_group"
            },
            "clientInstructions": "Add the service account email and SSO group to your Snowflake instance"
        }
        
        response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform['id']}/items", json=item_data)
        
        if response.status_code == 200:
            updated_platform = response.json()["data"]
            item = updated_platform["accessItems"][0]
            
            # Verify complex agency data
            agency_data = item.get("agencyData", {})
            service_email = agency_data.get("serviceAccountEmail")
            sso_group = agency_data.get("ssoGroupName")
            
            if service_email == "snowflake-service@agency.com":
                log_test("Agency Data Fields - Snowflake serviceAccountEmail", True, f"Service email: {service_email}")
            else:
                log_test("Agency Data Fields - Snowflake serviceAccountEmail", False, f"Missing service email: {service_email}")
            
            if sso_group == "agency_analysts_group":
                log_test("Agency Data Fields - Snowflake ssoGroupName", True, f"SSO group: {sso_group}")
            else:
                log_test("Agency Data Fields - Snowflake ssoGroupName", False, f"Missing SSO group: {sso_group}")
                
        else:
            log_test("Agency Data Fields - Snowflake Item Creation", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Snowflake Complex Agency Data", False, f"Exception: {str(e)}")

def test_dv360_agency_data():
    """Test 5c: Test DV360 Agency Data"""
    try:
        # Get platforms
        response = requests.get(f"{BASE_URL}/platforms?clientFacing=true")
        platforms = response.json()["data"]
        
        # Find DV360 platform
        dv360_platform = next((p for p in platforms if "DV360" in p["name"] or "Display" in p["name"]), None)
        if not dv360_platform:
            log_test("Agency Data Fields - DV360 Platform", False, "DV360 platform not found")
            return
            
        # Create agency platform  
        response = requests.post(f"{BASE_URL}/agency/platforms", json={"platformId": dv360_platform["id"]})
        if response.status_code != 200:
            log_test("Agency Data Fields - DV360 Agency Platform", False, f"Failed to create: {response.status_code}")
            return
            
        agency_platform = response.json()["data"]
        
        # Add access item with DV360 seatId
        item_data = {
            "itemType": "NAMED_INVITE", 
            "accessPattern": "Seat Assignment",
            "label": "DV360 Seat Access",
            "role": "Buyer",
            "agencyData": {
                "seatId": "12345678"
            },
            "clientInstructions": "Your account will be assigned to seat ID 12345678 in our DV360 instance"
        }
        
        response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform['id']}/items", json=item_data)
        
        if response.status_code == 200:
            updated_platform = response.json()["data"]
            item = updated_platform["accessItems"][0]
            
            # Verify seatId
            agency_data = item.get("agencyData", {})
            seat_id = agency_data.get("seatId")
            
            if seat_id == "12345678":
                log_test("Agency Data Fields - DV360 seatId", True, f"Seat ID: {seat_id}")
            else:
                log_test("Agency Data Fields - DV360 seatId", False, f"Missing seat ID: {seat_id}")
                
        else:
            log_test("Agency Data Fields - DV360 Item Creation", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("DV360 Agency Data", False, f"Exception: {str(e)}")

def test_client_instructions_in_onboarding():
    """Test 6: Verify Client Instructions in Response"""
    try:
        # Create a client first
        client_data = {
            "name": "Instructions Test Corp",
            "email": "test@instructions.com"
        }
        
        response = requests.post(f"{BASE_URL}/clients", json=client_data)
        if response.status_code != 200:
            log_test("Client Instructions - Client Creation", False, f"Status: {response.status_code}")
            return
            
        client = response.json()["data"]
        
        # Get Google Ads platform
        response = requests.get(f"{BASE_URL}/platforms?clientFacing=true")
        platforms = response.json()["data"]
        google_ads = next((p for p in platforms if "Google Ads" in p["name"]), None)
        
        if not google_ads:
            log_test("Client Instructions - Google Ads Platform", False, "Platform not found")
            return
            
        # Create access request with detailed client instructions
        detailed_instructions = "Step 1: Log into your Google Ads account. Step 2: Navigate to Account Settings > Account Access. Step 3: Click 'Invite Users' and add agency@example.com with Admin permissions. Step 4: Accept the MCC link request with Manager Account ID 123-456-7890."
        
        access_request_data = {
            "clientId": client["id"],
            "items": [{
                "platformId": google_ads["id"],
                "accessPattern": "MCC Link + User Invite", 
                "role": "Admin",
                "assetName": "Google Ads Account Access",
                "itemType": "PARTNER_DELEGATION",
                "agencyData": {
                    "managerAccountId": "123-456-7890",
                    "agencyEmail": "agency@example.com"
                },
                "clientInstructions": detailed_instructions
            }]
        }
        
        response = requests.post(f"{BASE_URL}/access-requests", json=access_request_data)
        
        if response.status_code == 200:
            access_request = response.json()["data"]
            token = access_request["token"]
            
            # Test onboarding endpoint returns client instructions
            response = requests.get(f"{BASE_URL}/onboarding/{token}")
            
            if response.status_code == 200:
                onboarding_data = response.json()["data"]
                item = onboarding_data["items"][0]
                
                returned_instructions = item.get("clientInstructions")
                if returned_instructions and "Step 1:" in returned_instructions:
                    log_test("Client Instructions in Onboarding Response", True, 
                            f"Instructions returned: {returned_instructions[:100]}...")
                else:
                    log_test("Client Instructions in Onboarding Response", False, 
                            f"Instructions missing or incomplete: {returned_instructions}")
                            
                # Verify instructions match what was sent
                if returned_instructions == detailed_instructions:
                    log_test("Client Instructions - Exact Match", True, "Instructions exactly preserved")
                else:
                    log_test("Client Instructions - Exact Match", False, "Instructions modified during storage")
                    
            else:
                log_test("Client Instructions - Onboarding API Call", False, f"Status: {response.status_code}")
        else:
            log_test("Client Instructions - Access Request Creation", False, f"Status: {response.status_code}")
            
    except Exception as e:
        log_test("Client Instructions in Onboarding", False, f"Exception: {str(e)}")

def print_test_summary():
    """Print test summary"""
    total_tests = len(TEST_RESULTS)
    passed_tests = len([t for t in TEST_RESULTS if t["success"]])
    failed_tests = total_tests - passed_tests
    
    print(f"\n" + "="*80)
    print(f"PLATFORM ACCESS INSTRUCTIONS INTEGRATION TEST SUMMARY")
    print(f"="*80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
    
    if failed_tests > 0:
        print(f"\nFailed Tests:")
        for test in TEST_RESULTS:
            if not test["success"]:
                print(f"  ❌ {test['test']}: {test['details']}")
    
    print(f"="*80)
    
    return failed_tests == 0

def main():
    """Main test execution"""
    print("Starting Platform Access Instructions Integration Tests...")
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    # Test 1: Create Agency Platform with Agency Data
    setup_data = test_agency_platform_creation_with_agency_data()
    
    # Test 2: Create Access Request with Agency Data  
    request_data = test_create_access_request_with_agency_data(setup_data)
    
    # Test 3: Test Onboarding API Returns Agency Data
    onboarding_data = test_onboarding_api_returns_agency_data(request_data)
    
    # Test 4: Test Attestation with Asset Selection
    test_attestation_with_asset_selection(onboarding_data)
    
    # Test 5: Test Different Agency Data Fields
    test_different_agency_data_fields()
    test_snowflake_complex_agency_data()
    test_dv360_agency_data()
    
    # Test 6: Verify Client Instructions in Response
    test_client_instructions_in_onboarding()
    
    # Print summary
    all_passed = print_test_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())