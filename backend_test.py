#!/usr/bin/env python3
"""
Bug Fix Testing for Marketing Identity Platform
Tests specific bug fixes requested in review:
1. CLIENT_DEDICATED restriction for Named Invite
2. CLIENT_DEDICATED works correctly for PAM  
3. Group Access service account fields
4. Pattern Derivation functionality
"""

import requests
import json
import sys
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://pam-identity-hub.preview.emergentagent.com/api"
GOOGLE_ANALYTICS_PLATFORM_ID = "0f75633f-0f75-40f7-80f7-0f75633f0000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_test(test_name, status, message=""):
    status_color = Colors.GREEN if status else Colors.RED
    status_text = "✅ PASS" if status else "❌ FAIL"
    print(f"{Colors.BOLD}{test_name}{Colors.END}: {status_color}{status_text}{Colors.END} {message}")
    return status

def api_request(method, endpoint, data=None, expected_status=200):
    """Make API request and return response"""
    url = urljoin(BASE_URL + "/", endpoint)
    headers = {"Content-Type": "application/json"}
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=30)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"{Colors.RED}API Request Error for {method} {url}: {e}{Colors.END}")
        return None
    except Exception as e:
        print(f"{Colors.RED}Unexpected Error: {e}{Colors.END}")
        return None

def test_named_invite_client_dedicated_restriction():
    """Test 1: CLIENT_DEDICATED restriction for Named Invite - should receive 400 error"""
    print(f"\n{Colors.BLUE}=== Test 1: Named Invite Identity Strategy Restrictions ==={Colors.END}")
    
    # Create agency platform first
    platform_data = {"platformId": GOOGLE_ANALYTICS_PLATFORM_ID}
    platform_resp = api_request("POST", "agency/platforms", platform_data)
    
    if not platform_resp or platform_resp.status_code != 200:
        agency_platform_id = None
        # Try to get existing platform
        platforms_resp = api_request("GET", "agency/platforms")
        if platforms_resp and platforms_resp.status_code == 200:
            platforms = platforms_resp.json().get('data', [])
            ga_platform = next((p for p in platforms if p['platformId'] == GOOGLE_ANALYTICS_PLATFORM_ID), None)
            if ga_platform:
                agency_platform_id = ga_platform['id']
    else:
        agency_platform_id = platform_resp.json()['data']['id']
    
    if not agency_platform_id:
        return log_test("Named Invite - Setup Agency Platform", False, "Could not create or find agency platform")
    
    # Test 1a: CLIENT_DEDICATED should be rejected for NAMED_INVITE
    client_dedicated_item = {
        "itemType": "NAMED_INVITE",
        "label": "GA4 Client Dedicated Access",
        "role": "Analyst", 
        "humanIdentityStrategy": "CLIENT_DEDICATED",
        "namingTemplate": "{clientSlug}-ga4@agency.com"
    }
    
    resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", client_dedicated_item, expected_status=400)
    
    test_1a = log_test(
        "Named Invite - CLIENT_DEDICATED Rejection", 
        resp is not None and resp.status_code == 400 and "CLIENT_DEDICATED identity strategy is not allowed for Named Invite" in resp.text,
        f"Status: {resp.status_code if resp else 'N/A'}"
    )
    
    # Test 1b: AGENCY_GROUP should succeed for NAMED_INVITE
    agency_group_item = {
        "itemType": "NAMED_INVITE",
        "label": "GA4 Agency Group Access",
        "role": "Analyst",
        "humanIdentityStrategy": "AGENCY_GROUP", 
        "agencyGroupEmail": "analytics-team@agency.com"
    }
    
    resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", agency_group_item)
    test_1b = log_test(
        "Named Invite - AGENCY_GROUP Success",
        resp and resp.status_code == 200,
        f"Status: {resp.status_code if resp else 'N/A'}"
    )
    
    # Test 1c: INDIVIDUAL_USERS should succeed for NAMED_INVITE  
    individual_users_item = {
        "itemType": "NAMED_INVITE",
        "label": "GA4 Individual Users Access", 
        "role": "Analyst",
        "humanIdentityStrategy": "INDIVIDUAL_USERS"
    }
    
    resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", individual_users_item)
    test_1c = log_test(
        "Named Invite - INDIVIDUAL_USERS Success",
        resp and resp.status_code == 200,
        f"Status: {resp.status_code if resp else 'N/A'}"
    )
    
    return test_1a and test_1b and test_1c

def test_pam_client_dedicated_identity():
    """Test 2: CLIENT_DEDICATED works correctly for PAM"""
    print(f"\n{Colors.BLUE}=== Test 2: PAM Client-Dedicated Identity ==={Colors.END}")
    
    # Get or create agency platform
    platforms_resp = api_request("GET", "agency/platforms")
    if not platforms_resp or platforms_resp.status_code != 200:
        return log_test("PAM - Get Agency Platforms", False, "Could not get agency platforms")
    
    platforms = platforms_resp.json().get('data', [])
    ga_platform = next((p for p in platforms if p['platformId'] == GOOGLE_ANALYTICS_PLATFORM_ID), None)
    
    if not ga_platform:
        return log_test("PAM - Find GA Platform", False, "Google Analytics platform not found in agency")
    
    agency_platform_id = ga_platform['id']
    
    # Test 2a: Create SHARED_ACCOUNT_PAM with CLIENT_DEDICATED identity strategy
    pam_item = {
        "itemType": "SHARED_ACCOUNT_PAM",
        "label": "GA4 PAM Account", 
        "role": "Administrator",
        "pamConfig": {
            "ownership": "AGENCY_OWNED",
            "identityStrategy": "CLIENT_DEDICATED",
            "namingTemplate": "{clientSlug}-pam-ga4@agency.com",
            "identityType": "MAILBOX", 
            "roleTemplate": "Administrator"
        }
    }
    
    resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", pam_item)
    
    if not resp or resp.status_code != 200:
        return log_test("PAM - Create CLIENT_DEDICATED Item", False, f"Status: {resp.status_code if resp else 'N/A'}")
    
    pam_item_data = resp.json()['data']
    test_2a = log_test("PAM - Create CLIENT_DEDICATED Item", True, "PAM item created successfully")
    
    # Test 2b: Verify pamConfig is stored correctly
    stored_pam_config = None
    for item in pam_item_data['accessItems']:
        if item.get('itemType') == 'SHARED_ACCOUNT_PAM':
            stored_pam_config = item.get('pamConfig')
            break
    
    pam_config_valid = (stored_pam_config and 
                       stored_pam_config.get('identityStrategy') == 'CLIENT_DEDICATED' and
                       stored_pam_config.get('namingTemplate') == '{clientSlug}-pam-ga4@agency.com' and
                       stored_pam_config.get('identityType') == 'MAILBOX')
    
    test_2b = log_test(
        "PAM - Verify pamConfig Storage", 
        pam_config_valid,
        f"pamConfig: {json.dumps(stored_pam_config, indent=2) if stored_pam_config else 'None'}"
    )
    
    # Test 2c: Create access request and verify resolvedIdentity generation
    client_data = {
        "name": "Test Corporation",
        "email": "test@testcorp.com"
    }
    client_resp = api_request("POST", "clients", client_data)
    
    if not client_resp or client_resp.status_code != 200:
        return log_test("PAM - Create Test Client", False, "Could not create test client") and test_2a and test_2b
    
    client_id = client_resp.json()['data']['id']
    
    # Create access request with PAM item
    access_request_data = {
        "clientId": client_id,
        "items": [{
            "platformId": GOOGLE_ANALYTICS_PLATFORM_ID,
            "itemType": "SHARED_ACCOUNT_PAM",
            "accessPattern": "PAM",
            "role": "Administrator", 
            "pamOwnership": "AGENCY_OWNED",
            "pamIdentityStrategy": "CLIENT_DEDICATED",
            "pamNamingTemplate": "{clientSlug}-pam-ga4@agency.com",
            "pamIdentityType": "MAILBOX",
            "pamRoleTemplate": "Administrator"
        }]
    }
    
    req_resp = api_request("POST", "access-requests", access_request_data)
    
    if not req_resp or req_resp.status_code != 200:
        return log_test("PAM - Create Access Request", False, f"Status: {req_resp.status_code if req_resp else 'N/A'}") and test_2a and test_2b
    
    access_request = req_resp.json()['data']
    pam_item_in_request = access_request['items'][0] if access_request['items'] else None
    
    expected_identity = "test-corporation-pam-ga4@agency.com" 
    test_2c = log_test(
        "PAM - Verify resolvedIdentity Generation",
        pam_item_in_request and pam_item_in_request.get('resolvedIdentity') == expected_identity,
        f"Expected: {expected_identity}, Got: {pam_item_in_request.get('resolvedIdentity') if pam_item_in_request else 'N/A'}"
    )
    
    return test_2a and test_2b and test_2c

def test_group_access_service_account_fields():
    """Test 3: Group Access service account fields storage"""
    print(f"\n{Colors.BLUE}=== Test 3: Group Access Service Account Fields ==={Colors.END}")
    
    # Get agency platform
    platforms_resp = api_request("GET", "agency/platforms")
    if not platforms_resp or platforms_resp.status_code != 200:
        return log_test("Group Access - Get Platforms", False, "Could not get agency platforms")
    
    platforms = platforms_resp.json().get('data', [])
    ga_platform = next((p for p in platforms if p['platformId'] == GOOGLE_ANALYTICS_PLATFORM_ID), None)
    
    if not ga_platform:
        return log_test("Group Access - Find GA Platform", False, "Google Analytics platform not found")
    
    agency_platform_id = ga_platform['id']
    
    # Test 3a: Create GROUP_ACCESS item with service account fields
    group_access_item = {
        "itemType": "GROUP_ACCESS", 
        "label": "GA4 Service Account Access",
        "role": "Analyst",
        "agencyData": {
            "serviceAccountEmail": "analytics-sa@agency.iam.gserviceaccount.com",
            "ssoGroupName": "analytics-team@agency.com"
        }
    }
    
    resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", group_access_item)
    
    if not resp or resp.status_code != 200:
        return log_test("Group Access - Create Item", False, f"Status: {resp.status_code if resp else 'N/A'}")
    
    item_data = resp.json()['data']
    test_3a = log_test("Group Access - Create Item", True, "GROUP_ACCESS item created")
    
    # Test 3b: Verify agencyData fields are stored correctly  
    created_item = None
    for item in item_data['accessItems']:
        if item.get('itemType') == 'GROUP_ACCESS':
            created_item = item
            break
    
    agency_data_valid = (created_item and
                        created_item.get('agencyData', {}).get('serviceAccountEmail') == 'analytics-sa@agency.iam.gserviceaccount.com' and
                        created_item.get('agencyData', {}).get('ssoGroupName') == 'analytics-team@agency.com')
    
    test_3b = log_test(
        "Group Access - Verify agencyData Storage",
        agency_data_valid,
        f"agencyData: {json.dumps(created_item.get('agencyData') if created_item else None, indent=2)}"
    )
    
    # Test 3c: Retrieve item and confirm fields persist
    platform_resp = api_request("GET", f"agency/platforms/{agency_platform_id}")
    
    if not platform_resp or platform_resp.status_code != 200:
        return log_test("Group Access - Retrieve Item", False, "Could not retrieve platform") and test_3a and test_3b
    
    platform_data = platform_resp.json()['data']
    retrieved_item = None
    
    for item in platform_data['accessItems']:
        if item.get('itemType') == 'GROUP_ACCESS':
            retrieved_item = item
            break
    
    fields_persist = (retrieved_item and
                     retrieved_item.get('agencyData', {}).get('serviceAccountEmail') == 'analytics-sa@agency.iam.gserviceaccount.com' and 
                     retrieved_item.get('agencyData', {}).get('ssoGroupName') == 'analytics-team@agency.com')
    
    test_3c = log_test(
        "Group Access - Verify Field Persistence", 
        fields_persist,
        f"Retrieved agencyData: {json.dumps(retrieved_item.get('agencyData') if retrieved_item else None)}"
    )
    
    return test_3a and test_3b and test_3c

def test_pattern_derivation():
    """Test 4: Pattern derivation from itemType"""
    print(f"\n{Colors.BLUE}=== Test 4: Access Pattern Derivation ==={Colors.END}")
    
    # Get agency platform
    platforms_resp = api_request("GET", "agency/platforms") 
    if not platforms_resp or platforms_resp.status_code != 200:
        return log_test("Pattern Derivation - Get Platforms", False, "Could not get agency platforms")
    
    platforms = platforms_resp.json().get('data', [])
    ga_platform = next((p for p in platforms if p['platformId'] == GOOGLE_ANALYTICS_PLATFORM_ID), None)
    
    if not ga_platform:
        return log_test("Pattern Derivation - Find GA Platform", False, "Google Analytics platform not found")
    
    agency_platform_id = ga_platform['id']
    
    # Test different item types and their expected patterns
    test_cases = [
        ("NAMED_INVITE", "NAMED_INVITE"),
        ("GROUP_ACCESS", "GROUP_BASED"), 
        ("SHARED_ACCOUNT_PAM", "PAM")
    ]
    
    all_tests_passed = True
    
    for item_type, expected_pattern in test_cases:
        # Create item without specifying accessPattern
        if item_type == "NAMED_INVITE":
            item_data = {
                "itemType": item_type,
                "label": f"Test {item_type} Item",
                "role": "Analyst",
                "humanIdentityStrategy": "AGENCY_GROUP",
                "agencyGroupEmail": "test@agency.com"
            }
        elif item_type == "GROUP_ACCESS":
            item_data = {
                "itemType": item_type,
                "label": f"Test {item_type} Item", 
                "role": "Analyst"
            }
        elif item_type == "SHARED_ACCOUNT_PAM":
            item_data = {
                "itemType": item_type,
                "label": f"Test {item_type} Item",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "CLIENT_OWNED"
                }
            }
        
        resp = api_request("POST", f"agency/platforms/{agency_platform_id}/items", item_data)
        
        if not resp or resp.status_code != 200:
            test_passed = log_test(f"Pattern Derivation - {item_type}", False, f"Could not create {item_type} item")
            all_tests_passed = False
            continue
        
        # Check if pattern was derived correctly
        created_data = resp.json()['data']
        created_item = None
        
        for item in created_data['accessItems']:
            if item.get('itemType') == item_type and item.get('label') == f"Test {item_type} Item":
                created_item = item
                break
        
        pattern_correct = created_item and created_item.get('accessPattern') == expected_pattern
        
        test_passed = log_test(
            f"Pattern Derivation - {item_type} → {expected_pattern}",
            pattern_correct,
            f"Got: {created_item.get('accessPattern') if created_item else 'N/A'}"
        )
        
        all_tests_passed = all_tests_passed and test_passed
    
    return all_tests_passed

def test_platform_compatibility():
    """Test platform compatibility with supported item types"""
    print(f"\n{Colors.BLUE}=== Test 5: Platform Compatibility Validation ==={Colors.END}")
    
    # Test that Google Analytics supports required item types
    platform_resp = api_request("GET", f"platforms/{GOOGLE_ANALYTICS_PLATFORM_ID}")
    
    if not platform_resp or platform_resp.status_code != 200:
        return log_test("Platform Compatibility - Get GA Platform", False, "Could not get Google Analytics platform")
    
    platform = platform_resp.json()['data']
    supported_types = platform.get('supportedItemTypes', [])
    
    required_types = ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT_PAM']
    supports_required = all(item_type in supported_types for item_type in required_types)
    
    test_5a = log_test(
        "Platform Compatibility - Required Item Types",
        supports_required, 
        f"Supported: {supported_types}, Required: {required_types}"
    )
    
    # Test that unsupported item type is rejected (PARTNER_DELEGATION not supported by GA)
    platforms_resp = api_request("GET", "agency/platforms")
    if not platforms_resp or platforms_resp.status_code != 200:
        return test_5a and log_test("Platform Compatibility - Get Agency Platforms", False, "Could not get agency platforms")
    
    platforms = platforms_resp.json().get('data', [])
    ga_platform = next((p for p in platforms if p['platformId'] == GOOGLE_ANALYTICS_PLATFORM_ID), None)
    
    if not ga_platform:
        return test_5a and log_test("Platform Compatibility - Find Agency GA Platform", False, "GA platform not in agency")
    
    # Try to create unsupported item type
    unsupported_item = {
        "itemType": "PARTNER_DELEGATION",
        "label": "Test Unsupported Item",
        "role": "Admin"
    }
    
    resp = api_request("POST", f"agency/platforms/{ga_platform['id']}/items", unsupported_item, expected_status=400)
    
    test_5b = log_test(
        "Platform Compatibility - Reject Unsupported Type",
        resp is not None and resp.status_code == 400 and "not supported" in resp.text.lower(),
        f"Status: {resp.status_code if resp else 'N/A'}"
    )
    
    return test_5a and test_5b

def main():
    print(f"{Colors.BOLD}{Colors.BLUE}Marketing Identity Platform - Bug Fix Testing{Colors.END}")
    print(f"{Colors.BLUE}Testing specific bug fixes for CLIENT_DEDICATED restrictions, PAM identity, Group Access fields, and Pattern Derivation{Colors.END}")
    print(f"Base URL: {BASE_URL}")
    print(f"Google Analytics Platform ID: {GOOGLE_ANALYTICS_PLATFORM_ID}")
    
    # Run all tests
    tests = [
        ("Named Invite CLIENT_DEDICATED Restriction", test_named_invite_client_dedicated_restriction),
        ("PAM Client-Dedicated Identity", test_pam_client_dedicated_identity), 
        ("Group Access Service Account Fields", test_group_access_service_account_fields),
        ("Pattern Derivation", test_pattern_derivation),
        ("Platform Compatibility", test_platform_compatibility)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"{Colors.RED}Test '{test_name}' failed with exception: {e}{Colors.END}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== TEST SUMMARY ==={Colors.END}")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{status} {test_name}")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}🎉 All bug fix tests PASSED!{Colors.END}")
        return 0
    else:
        print(f"{Colors.RED}{Colors.BOLD}❌ Some tests FAILED. Review implementation.{Colors.END}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)