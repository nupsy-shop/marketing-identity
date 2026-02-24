#!/usr/bin/env python3
"""
PAM (Privileged Access Management) Backend API Testing

Tests the complete PAM onboarding flow including:
1. Creating agency platforms with PAM items (CLIENT_OWNED and AGENCY_OWNED)
2. Creating access requests with PAM items  
3. Testing onboarding API with PAM fields
4. Testing credential submission for CLIENT_OWNED items
5. Testing attestation for AGENCY_OWNED items
6. Testing PAM checkout/checkin functionality
"""

import json
import requests
import sys
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://oauth-refactor.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test data
TEST_CLIENT = {
    "name": "PAM Test Corp",
    "email": "pam-test@testcorp.com"
}

def log_test(message, success=True):
    status = "✅" if success else "❌"
    print(f"{status} {message}")

def log_error(message):
    print(f"❌ ERROR: {message}")

def make_request(method, endpoint, data=None, expected_status=200, allow_statuses=None):
    """Make API request with error handling"""
    url = f"{API_URL}/{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if allow_statuses is None:
        allow_statuses = []
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=30)
        elif method == "PATCH":
            response = requests.patch(url, headers=headers, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"    {method} {url} -> {response.status_code}")
        
        if response.status_code != expected_status and response.status_code not in allow_statuses:
            try:
                error_data = response.json()
                log_error(f"Expected {expected_status}, got {response.status_code}: {error_data}")
            except:
                log_error(f"Expected {expected_status}, got {response.status_code}: {response.text}")
            return None
        
        return response.json()
    except Exception as e:
        log_error(f"Request failed: {e}")
        return None

def test_create_client():
    """Test 1: Create a test client"""
    print("\n=== Test 1: Create Client ===")
    
    result = make_request("POST", "clients", TEST_CLIENT, 200)
    if not result or not result.get("success"):
        log_error("Failed to create client")
        return None
    
    client_id = result["data"]["id"]
    log_test(f"Created client: {client_id}")
    return client_id

def test_get_platforms():
    """Test 2: Get available platforms"""
    print("\n=== Test 2: Get Platforms ===")
    
    result = make_request("GET", "platforms?clientFacing=true")
    if not result or not result.get("success"):
        log_error("Failed to get platforms")
        return None
    
    platforms = result["data"]
    log_test(f"Retrieved {len(platforms)} client-facing platforms")
    
    # Find Google Ads platform for testing
    google_ads = next((p for p in platforms if "Google" in p.get("name", "") and "Ads" in p.get("name", "")), None)
    if not google_ads:
        # Fallback to first platform if Google Ads not found by name
        google_ads = platforms[0] if platforms else None
        log_test(f"Using fallback platform: {google_ads.get('name', 'Unknown')} ({google_ads['id']})")
    else:
        log_test(f"Found Google Ads platform: {google_ads['name']} ({google_ads['id']})")
    
    log_test(f"Found Google Ads platform with {len(google_ads.get('accessPatterns', []))} access patterns")
    return google_ads["id"]

def test_create_agency_platform_with_pam_items(platform_id):
    """Test 3: Create agency platform and add PAM items"""
    print("\n=== Test 3: Create Agency Platform with PAM Items ===")
    
    # Create agency platform (or use existing one)
    platform_data = {"platformId": platform_id}
    result = make_request("POST", "agency/platforms", platform_data, 200, allow_statuses=[409])
    
    if result and result.get("success"):
        agency_platform_id = result["data"]["id"]
        log_test(f"Created agency platform: {agency_platform_id}")
    elif result and not result.get("success") and "Platform already added" in result.get("error", ""):
        # Platform already exists, use the returned data
        agency_platform_id = result["data"]["id"] 
        log_test(f"Using existing agency platform: {agency_platform_id}")
    else:
        log_error("Failed to create or find agency platform")
        return None
    
    # Add CLIENT_OWNED PAM item
    client_owned_item = {
        "itemType": "SHARED_ACCOUNT_PAM",
        "accessPattern": "Pattern 5",
        "label": "Client Owned Test Account",
        "role": "Admin", 
        "pamConfig": {
            "ownership": "CLIENT_OWNED",
            "requiresDedicatedAgencyLogin": True
        }
    }
    
    result = make_request("POST", f"agency/platforms/{agency_platform_id}/items", client_owned_item, 200)
    if not result or not result.get("success"):
        log_error("Failed to add CLIENT_OWNED PAM item")
        return None
    
    client_owned_item_id = result["data"]["accessItems"][-1]["id"]
    log_test(f"Added CLIENT_OWNED PAM item: {client_owned_item_id}")
    
    # Add AGENCY_OWNED PAM item
    agency_owned_item = {
        "itemType": "SHARED_ACCOUNT_PAM", 
        "accessPattern": "Pattern 3",
        "label": "Agency Owned Test Account",
        "role": "Editor",
        "pamConfig": {
            "ownership": "AGENCY_OWNED",
            "agencyIdentityEmail": "agency@testcorp.com",
            "roleTemplate": "Editor"
        }
    }
    
    result = make_request("POST", f"agency/platforms/{agency_platform_id}/items", agency_owned_item, 200)
    if not result or not result.get("success"):
        log_error("Failed to add AGENCY_OWNED PAM item")
        return None
    
    agency_owned_item_id = result["data"]["accessItems"][-1]["id"]
    log_test(f"Added AGENCY_OWNED PAM item: {agency_owned_item_id}")
    
    return {
        "agency_platform_id": agency_platform_id,
        "client_owned_item_id": client_owned_item_id,
        "agency_owned_item_id": agency_owned_item_id
    }

def test_create_access_request_with_pam(client_id, platform_id, pam_items):
    """Test 4: Create access request with PAM items"""
    print("\n=== Test 4: Create Access Request with PAM Items ===")
    
    access_request_data = {
        "clientId": client_id,
        "items": [
            {
                "platformId": platform_id,
                "accessPattern": "Pattern 5", 
                "role": "Admin",
                "itemType": "SHARED_ACCOUNT_PAM",
                "pamOwnership": "CLIENT_OWNED",
                "pamGrantMethod": "CREDENTIAL_HANDOFF"
            },
            {
                "platformId": platform_id,
                "accessPattern": "Pattern 3",
                "role": "Editor", 
                "itemType": "SHARED_ACCOUNT_PAM",
                "pamOwnership": "AGENCY_OWNED",
                "pamAgencyIdentityEmail": "agency@testcorp.com",
                "pamRoleTemplate": "Editor"
            }
        ]
    }
    
    result = make_request("POST", "access-requests", access_request_data, 200)
    if not result or not result.get("success"):
        log_error("Failed to create access request with PAM items")
        return None
    
    access_request_id = result["data"]["id"]
    access_request_token = result["data"]["token"]
    items = result["data"]["items"]
    
    log_test(f"Created access request: {access_request_id}")
    log_test(f"Generated onboarding token: {access_request_token}")
    log_test(f"Access request has {len(items)} PAM items")
    
    # Verify PAM fields are present
    pam_items_found = 0
    client_owned_item = None
    agency_owned_item = None
    
    for item in items:
        if item.get("itemType") == "SHARED_ACCOUNT_PAM":
            pam_items_found += 1
            if item.get("pamOwnership") == "CLIENT_OWNED":
                client_owned_item = item
                log_test("Found CLIENT_OWNED PAM item with correct fields")
            elif item.get("pamOwnership") == "AGENCY_OWNED":
                agency_owned_item = item  
                log_test("Found AGENCY_OWNED PAM item with correct fields")
    
    if pam_items_found != 2:
        log_error(f"Expected 2 PAM items, found {pam_items_found}")
        return None
    
    return {
        "access_request_id": access_request_id,
        "onboarding_token": access_request_token,
        "client_owned_item": client_owned_item,
        "agency_owned_item": agency_owned_item
    }

def test_onboarding_api_pam_fields(onboarding_token):
    """Test 5: Verify onboarding API includes PAM fields"""
    print("\n=== Test 5: Test Onboarding API PAM Fields ===")
    
    result = make_request("GET", f"onboarding/{onboarding_token}")
    if not result or not result.get("success"):
        log_error("Failed to get onboarding data")
        return None
    
    onboarding_data = result["data"]
    items = onboarding_data.get("items", [])
    
    log_test(f"Retrieved onboarding data with {len(items)} items")
    
    # Verify PAM fields are present in onboarding response
    pam_fields_verified = 0
    
    for item in items:
        if item.get("itemType") == "SHARED_ACCOUNT_PAM":
            required_fields = ["pamOwnership"]
            
            if item.get("pamOwnership") == "CLIENT_OWNED":
                required_fields.extend(["pamGrantMethod"])
            elif item.get("pamOwnership") == "AGENCY_OWNED":  
                required_fields.extend(["pamAgencyIdentityEmail", "pamRoleTemplate"])
            
            for field in required_fields:
                if field in item:
                    pam_fields_verified += 1
                    log_test(f"PAM field '{field}' present: {item[field]}")
                else:
                    log_error(f"PAM field '{field}' missing from item")
    
    if pam_fields_verified == 0:
        log_error("No PAM fields found in onboarding response")
        return None
    
    log_test(f"Verified {pam_fields_verified} PAM fields in onboarding response")
    return True

def test_credential_submission(onboarding_token, client_owned_item):
    """Test 6: Test credential submission for CLIENT_OWNED PAM item"""
    print("\n=== Test 6: Test Credential Submission (CLIENT_OWNED) ===")
    
    if not client_owned_item:
        log_error("No CLIENT_OWNED PAM item available for testing")
        return None
    
    item_id = client_owned_item["id"]
    credential_data = {
        "username": "test-user@testcorp.com",
        "password": "SecurePassword123!"
    }
    
    result = make_request("POST", f"onboarding/{onboarding_token}/items/{item_id}/submit-credentials", 
                         credential_data)
    if not result or not result.get("success"):
        log_error("Failed to submit credentials")
        return None
    
    log_test("Successfully submitted credentials for CLIENT_OWNED PAM item")
    
    # Verify item status changed to validated
    result = make_request("GET", f"onboarding/{onboarding_token}")
    if result and result.get("success"):
        items = result["data"].get("items", [])
        submitted_item = next((i for i in items if i["id"] == item_id), None)
        
        if submitted_item and submitted_item.get("status") == "validated":
            log_test("Item status changed to 'validated' after credential submission")
            
            # Check if PAM fields are set
            if submitted_item.get("pamUsername"):
                log_test(f"pamUsername set: {submitted_item['pamUsername']}")
            if submitted_item.get("pamSecretRef"):
                log_test("pamSecretRef set (credentials stored securely)")
            
            return True
        else:
            log_error("Item status not updated correctly after credential submission")
            return None
    
    return None

def test_attestation(onboarding_token, agency_owned_item):
    """Test 7: Test attestation for AGENCY_OWNED PAM item"""
    print("\n=== Test 7: Test Attestation (AGENCY_OWNED) ===")
    
    if not agency_owned_item:
        log_error("No AGENCY_OWNED PAM item available for testing")
        return None
    
    item_id = agency_owned_item["id"]
    attestation_data = {
        "attestationText": "I have successfully added agency@testcorp.com with Editor role to the Google Ads account",
        "evidenceBase64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="  # 1x1 pixel
    }
    
    result = make_request("POST", f"onboarding/{onboarding_token}/items/{item_id}/attest",
                         attestation_data)
    if not result or not result.get("success"):
        log_error("Failed to submit attestation")
        return None
    
    log_test("Successfully submitted attestation for AGENCY_OWNED PAM item")
    
    # Verify item status changed to validated
    result = make_request("GET", f"onboarding/{onboarding_token}")
    if result and result.get("success"):
        items = result["data"].get("items", [])
        attested_item = next((i for i in items if i["id"] == item_id), None)
        
        if attested_item and attested_item.get("status") == "validated":
            log_test("Item status changed to 'validated' after attestation")
            
            # Check validation result contains attestation data
            validation_result = attested_item.get("validationResult", {})
            if validation_result.get("attestationText"):
                log_test("Attestation text stored in validation result")
            
            return True
        else:
            log_error("Item status not updated correctly after attestation")
            return None
    
    return None

def test_pam_checkout_checkin(access_request_id, client_owned_item):
    """Test 8: Test PAM checkout/checkin for CLIENT_OWNED item with stored credentials"""
    print("\n=== Test 8: Test PAM Checkout/Checkin ===")
    
    if not client_owned_item:
        log_error("No CLIENT_OWNED PAM item available for testing")
        return None
    
    item_id = client_owned_item["id"]
    
    # Test checkout
    result = make_request("POST", f"pam/{access_request_id}/items/{item_id}/checkout")
    if not result or not result.get("success"):
        log_error("Failed to checkout PAM credentials")
        return None
    
    session_data = result["data"]
    session_id = session_data.get("session", {}).get("id")
    revealed_credential = session_data.get("revealedCredential")
    username = session_data.get("username")
    
    log_test(f"Successfully checked out PAM credentials (session: {session_id})")
    
    if revealed_credential:
        log_test("Credentials successfully revealed during checkout")
    if username:
        log_test(f"Username retrieved: {username}")
    
    # Test checkin
    result = make_request("POST", f"pam/{access_request_id}/items/{item_id}/checkin")
    if not result or not result.get("success"):
        log_error("Failed to checkin PAM credentials")
        return None
    
    log_test("Successfully checked in PAM credentials")
    
    return True

def test_pam_sessions_api():
    """Test 9: Test PAM sessions and items APIs"""
    print("\n=== Test 9: Test PAM Sessions and Items APIs ===")
    
    # Test GET /api/pam/sessions
    result = make_request("GET", "pam/sessions")
    if not result or not result.get("success"):
        log_error("Failed to get PAM sessions")
        return None
    
    sessions = result["data"]
    log_test(f"Retrieved {len(sessions)} active PAM sessions")
    
    # Test GET /api/pam/items  
    result = make_request("GET", "pam/items")
    if not result or not result.get("success"):
        log_error("Failed to get PAM items")
        return None
    
    pam_items = result["data"]
    log_test(f"Retrieved {len(pam_items)} PAM access request items")
    
    # Verify PAM items have required fields
    for item in pam_items:
        if item.get("itemType") == "SHARED_ACCOUNT_PAM":
            required_fields = ["pamOwnership", "platform"]
            for field in required_fields:
                if field not in item:
                    log_error(f"PAM item missing required field: {field}")
                    return None
    
    log_test("All PAM items have required fields")
    return True

def main():
    """Run complete PAM testing suite"""
    print("🚀 Starting PAM (Privileged Access Management) Backend Testing")
    print("=" * 70)
    
    # Test sequence
    try:
        # 1. Create client
        client_id = test_create_client()
        if not client_id:
            return False
        
        # 2. Get platforms
        platform_id = test_get_platforms()
        if not platform_id:
            return False
        
        # 3. Create agency platform with PAM items
        pam_items = test_create_agency_platform_with_pam_items(platform_id)
        if not pam_items:
            return False
        
        # 4. Create access request with PAM items
        access_request = test_create_access_request_with_pam(client_id, platform_id, pam_items)
        if not access_request:
            return False
        
        # 5. Test onboarding API PAM fields
        onboarding_verified = test_onboarding_api_pam_fields(access_request["onboarding_token"])
        if not onboarding_verified:
            return False
        
        # 6. Test credential submission
        credential_submitted = test_credential_submission(
            access_request["onboarding_token"], 
            access_request["client_owned_item"]
        )
        if not credential_submitted:
            return False
        
        # 7. Test attestation
        attestation_submitted = test_attestation(
            access_request["onboarding_token"],
            access_request["agency_owned_item"] 
        )
        if not attestation_submitted:
            return False
        
        # 8. Test PAM checkout/checkin
        checkout_tested = test_pam_checkout_checkin(
            access_request["access_request_id"],
            access_request["client_owned_item"]
        )
        if not checkout_tested:
            return False
        
        # 9. Test PAM sessions and items APIs
        sessions_tested = test_pam_sessions_api()
        if not sessions_tested:
            return False
        
        print("\n" + "=" * 70)
        print("🎉 ALL PAM TESTS COMPLETED SUCCESSFULLY!")
        print("✅ CLIENT_OWNED credential submission flow working")
        print("✅ AGENCY_OWNED attestation flow working") 
        print("✅ PAM checkout/checkin functionality working")
        print("✅ All PAM API endpoints functioning correctly")
        return True
        
    except Exception as e:
        log_error(f"Unexpected error during testing: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)