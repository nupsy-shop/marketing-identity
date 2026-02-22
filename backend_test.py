#!/usr/bin/env python3
"""
Backend API Testing for Marketing Identity Platform Bug Fixes
Testing specific bug fixes related to identity strategies and access patterns.
"""

import json
import requests
import sys
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://pam-identity-hub.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class IdentityPlatformTester:
    def __init__(self):
        self.test_results = []
        self.client_id = None
        self.agency_platform_id = None
        self.google_analytics_platform_id = "0f75633f-0f75-40f7-80f7-0f75633f0000"  # Google Analytics platform ID
        
    def log_test(self, test_name, success, details=None, error=None):
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def make_request(self, method, endpoint, data=None):
        """Make HTTP request to API"""
        url = f"{API_BASE}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.RequestException as e:
            print(f"Request error: {e}")
            return None

    def setup_test_data(self):
        """Setup test client and agency platform"""
        print("📋 Setting up test data...")
        
        # Create test client
        client_data = {
            "name": "Test Corporation",
            "email": "test@testcorp.com"
        }
        
        response = self.make_request('POST', 'clients', client_data)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                self.client_id = result['data']['id']
                print(f"✅ Created test client: {self.client_id}")
            else:
                print(f"❌ Failed to create client: {result}")
                return False
        else:
            print(f"❌ Failed to create client: HTTP {response.status_code if response else 'No response'}")
            return False

        # Create agency platform for Google Analytics
        platform_data = {
            "platformId": self.google_analytics_platform_id
        }
        
        response = self.make_request('POST', 'agency/platforms', platform_data)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                self.agency_platform_id = result['data']['id']
                print(f"✅ Created agency platform: {self.agency_platform_id}")
            else:
                print(f"❌ Failed to create agency platform: {result}")
                return False
        else:
            print(f"❌ Failed to create agency platform: HTTP {response.status_code if response else 'No response'}")
            return False

        return True

    def test_1_named_invite_identity_strategy_restrictions(self):
        """Test 1: Verify CLIENT_DEDICATED is NOT an option for Named Invite"""
        print("🧪 Test 1: Named Invite Identity Strategy Restrictions")
        
        # Test 1.1: Try to create NAMED_INVITE with CLIENT_DEDICATED (should fail)
        invalid_named_invite = {
            "itemType": "NAMED_INVITE",
            "label": "GA4 Standard Access",
            "role": "Viewer",
            "humanIdentityStrategy": "CLIENT_DEDICATED",  # This should NOT be allowed for Named Invite
            "namingTemplate": "{clientSlug}-ga4@agency.com"
        }
        
        response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', invalid_named_invite)
        if response and response.status_code == 400:
            result = response.json()
            self.log_test(
                "1.1 Named Invite with CLIENT_DEDICATED rejected", 
                True,
                f"Correctly rejected with error: {result.get('error', 'Unknown error')}"
            )
        else:
            error_msg = f"Expected 400 error but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("1.1 Named Invite with CLIENT_DEDICATED rejected", False, error=error_msg)

        # Test 1.2: Create valid NAMED_INVITE with AGENCY_GROUP (should work)
        valid_named_invite = {
            "itemType": "NAMED_INVITE",
            "label": "GA4 Team Access",
            "role": "Viewer",
            "humanIdentityStrategy": "AGENCY_GROUP",
            "agencyGroupEmail": "analytics-team@agency.com"
        }
        
        response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', valid_named_invite)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                item = result['data']['accessItems'][-1]  # Get the last added item
                if (item['humanIdentityStrategy'] == 'AGENCY_GROUP' and 
                    item['agencyGroupEmail'] == 'analytics-team@agency.com'):
                    self.log_test(
                        "1.2 Named Invite with AGENCY_GROUP accepted", 
                        True,
                        f"Successfully created with agencyGroupEmail: {item['agencyGroupEmail']}"
                    )
                else:
                    self.log_test("1.2 Named Invite with AGENCY_GROUP accepted", False, 
                                error=f"Data not stored correctly: {item}")
            else:
                self.log_test("1.2 Named Invite with AGENCY_GROUP accepted", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("1.2 Named Invite with AGENCY_GROUP accepted", False, error=error_msg)

        # Test 1.3: Create valid NAMED_INVITE with INDIVIDUAL_USERS (should work)
        valid_individual_invite = {
            "itemType": "NAMED_INVITE",
            "label": "GA4 Individual Access",
            "role": "Analyst",
            "humanIdentityStrategy": "INDIVIDUAL_USERS"
        }
        
        response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', valid_individual_invite)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                item = result['data']['accessItems'][-1]  # Get the last added item
                if item['humanIdentityStrategy'] == 'INDIVIDUAL_USERS':
                    self.log_test(
                        "1.3 Named Invite with INDIVIDUAL_USERS accepted", 
                        True,
                        f"Successfully created with strategy: {item['humanIdentityStrategy']}"
                    )
                else:
                    self.log_test("1.3 Named Invite with INDIVIDUAL_USERS accepted", False, 
                                error=f"Strategy not set correctly: {item}")
            else:
                self.log_test("1.3 Named Invite with INDIVIDUAL_USERS accepted", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("1.3 Named Invite with INDIVIDUAL_USERS accepted", False, error=error_msg)

    def test_2_pam_client_dedicated_identity(self):
        """Test 2: Verify CLIENT_DEDICATED is correctly placed under PAM"""
        print("🧪 Test 2: PAM Client-Dedicated Identity")
        
        # Test 2.1: Create SHARED_ACCOUNT_PAM with CLIENT_DEDICATED identity strategy
        pam_client_dedicated = {
            "itemType": "SHARED_ACCOUNT_PAM",
            "label": "GA4 PAM Admin Account",
            "role": "Administrator",
            "pamConfig": {
                "ownership": "AGENCY_OWNED",
                "identityStrategy": "CLIENT_DEDICATED",
                "namingTemplate": "{clientSlug}-pam-ga4@agency.com",
                "identityType": "MAILBOX", 
                "roleTemplate": "GA4 Admin Role"
            }
        }
        
        response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', pam_client_dedicated)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                item = result['data']['accessItems'][-1]  # Get the last added item
                pam_config = item.get('pamConfig', {})
                if (pam_config.get('identityStrategy') == 'CLIENT_DEDICATED' and
                    pam_config.get('namingTemplate') == '{clientSlug}-pam-ga4@agency.com' and
                    pam_config.get('identityType') == 'MAILBOX'):
                    self.log_test(
                        "2.1 PAM CLIENT_DEDICATED identity created", 
                        True,
                        f"PAM config stored correctly: identityStrategy={pam_config.get('identityStrategy')}, namingTemplate={pam_config.get('namingTemplate')}"
                    )
                else:
                    self.log_test("2.1 PAM CLIENT_DEDICATED identity created", False, 
                                error=f"PAM config not stored correctly: {pam_config}")
            else:
                self.log_test("2.1 PAM CLIENT_DEDICATED identity created", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("2.1 PAM CLIENT_DEDICATED identity created", False, error=error_msg)

        # Test 2.2: Create access request with PAM CLIENT_DEDICATED and verify resolvedIdentity generation
        access_request_data = {
            "clientId": self.client_id,
            "items": [{
                "platformId": self.google_analytics_platform_id,
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "role": "Administrator", 
                "pamOwnership": "AGENCY_OWNED",
                "pamIdentityStrategy": "CLIENT_DEDICATED",
                "pamNamingTemplate": "{clientSlug}-pam-ga4@agency.com",
                "pamIdentityType": "MAILBOX",
                "pamRoleTemplate": "GA4 Admin Role"
            }]
        }
        
        response = self.make_request('POST', 'access-requests', access_request_data)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                request_item = result['data']['items'][0]
                resolved_identity = request_item.get('resolvedIdentity')
                if resolved_identity and 'test-corporation' in resolved_identity.lower():
                    self.log_test(
                        "2.2 PAM CLIENT_DEDICATED resolvedIdentity generated", 
                        True,
                        f"Generated identity: {resolved_identity}"
                    )
                else:
                    self.log_test("2.2 PAM CLIENT_DEDICATED resolvedIdentity generated", False, 
                                error=f"resolvedIdentity not generated correctly: {resolved_identity}")
            else:
                self.log_test("2.2 PAM CLIENT_DEDICATED resolvedIdentity generated", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("2.2 PAM CLIENT_DEDICATED resolvedIdentity generated", False, error=error_msg)

    def test_3_group_access_with_service_account_sso(self):
        """Test 3: Test Group Access with Service Account/SSO fields"""
        print("🧪 Test 3: Group Access with Service Account/SSO fields")
        
        # Test 3.1: Create GROUP_ACCESS item with agencyData containing serviceAccountEmail and ssoGroupName
        group_access_data = {
            "itemType": "GROUP_ACCESS",
            "label": "Analytics Service Account",
            "role": "Viewer",
            "agencyData": {
                "serviceAccountEmail": "analytics-sa@agency-gcp.iam.gserviceaccount.com",
                "ssoGroupName": "analytics-team-sso-group@agency.com"
            }
        }
        
        response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', group_access_data)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                item = result['data']['accessItems'][-1]  # Get the last added item
                agency_data = item.get('agencyData', {})
                if (agency_data.get('serviceAccountEmail') == 'analytics-sa@agency-gcp.iam.gserviceaccount.com' and
                    agency_data.get('ssoGroupName') == 'analytics-team-sso-group@agency.com'):
                    self.log_test(
                        "3.1 GROUP_ACCESS with service account fields created", 
                        True,
                        f"Agency data stored: serviceAccountEmail={agency_data.get('serviceAccountEmail')}, ssoGroupName={agency_data.get('ssoGroupName')}"
                    )
                else:
                    self.log_test("3.1 GROUP_ACCESS with service account fields created", False, 
                                error=f"Agency data not stored correctly: {agency_data}")
            else:
                self.log_test("3.1 GROUP_ACCESS with service account fields created", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("3.1 GROUP_ACCESS with service account fields created", False, error=error_msg)

        # Test 3.2: Verify fields are returned correctly in subsequent GET request
        response = self.make_request('GET', f'agency/platforms/{self.agency_platform_id}')
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                access_items = result['data']['accessItems']
                group_access_item = next((item for item in access_items if item['itemType'] == 'GROUP_ACCESS'), None)
                
                if group_access_item:
                    agency_data = group_access_item.get('agencyData', {})
                    if (agency_data.get('serviceAccountEmail') == 'analytics-sa@agency-gcp.iam.gserviceaccount.com' and
                        agency_data.get('ssoGroupName') == 'analytics-team-sso-group@agency.com'):
                        self.log_test(
                            "3.2 GROUP_ACCESS service account fields retrieved", 
                            True,
                            f"Agency data correctly retrieved: {agency_data}"
                        )
                    else:
                        self.log_test("3.2 GROUP_ACCESS service account fields retrieved", False, 
                                    error=f"Agency data incorrect on retrieval: {agency_data}")
                else:
                    self.log_test("3.2 GROUP_ACCESS service account fields retrieved", False, 
                                error="GROUP_ACCESS item not found")
            else:
                self.log_test("3.2 GROUP_ACCESS service account fields retrieved", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("3.2 GROUP_ACCESS service account fields retrieved", False, error=error_msg)

    def test_4_access_pattern_derivation(self):
        """Test 4: Verify pattern is derived from itemType"""
        print("🧪 Test 4: Access Pattern Derivation from ItemType")
        
        # Expected mappings
        expected_mappings = {
            'NAMED_INVITE': 'NAMED_INVITE',
            'PARTNER_DELEGATION': 'PARTNER_DELEGATION', 
            'GROUP_ACCESS': 'GROUP_BASED',
            'SHARED_ACCOUNT_PAM': 'PAM'
        }
        
        for item_type, expected_pattern in expected_mappings.items():
            # Test 4.x: Create item with itemType and verify pattern derivation
            test_item = {
                "itemType": item_type,
                "label": f"Test {item_type} Item",
                "role": "Viewer"
            }
            
            # Add required fields based on item type
            if item_type == 'NAMED_INVITE':
                test_item["humanIdentityStrategy"] = "AGENCY_GROUP"
                test_item["agencyGroupEmail"] = "test-group@agency.com"
            elif item_type == 'SHARED_ACCOUNT_PAM':
                test_item["pamConfig"] = {
                    "ownership": "CLIENT_OWNED"
                }
            
            response = self.make_request('POST', f'agency/platforms/{self.agency_platform_id}/items', test_item)
            if response and response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    item = result['data']['accessItems'][-1]  # Get the last added item
                    actual_pattern = item.get('accessPattern')
                    if actual_pattern == expected_pattern:
                        self.log_test(
                            f"4.{len(self.test_results)+1} {item_type} → {expected_pattern} pattern", 
                            True,
                            f"Correct pattern derived: {actual_pattern}"
                        )
                    else:
                        self.log_test(f"4.{len(self.test_results)+1} {item_type} → {expected_pattern} pattern", False, 
                                    error=f"Expected pattern '{expected_pattern}' but got '{actual_pattern}'")
                else:
                    self.log_test(f"4.{len(self.test_results)+1} {item_type} → {expected_pattern} pattern", False, 
                                error=f"API returned error: {result}")
            else:
                error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
                if response:
                    result = response.json()
                    error_msg += f": {result}"
                self.log_test(f"4.{len(self.test_results)+1} {item_type} → {expected_pattern} pattern", False, error=error_msg)

    def test_5_comprehensive_validation(self):
        """Test 5: Comprehensive validation of bug fixes"""
        print("🧪 Test 5: Comprehensive Bug Fix Validation")
        
        # Test 5.1: Verify Google Analytics platform supports required item types
        response = self.make_request('GET', f'platforms/{self.google_analytics_platform_id}')
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                platform = result['data']
                supported_types = platform.get('supportedItemTypes', [])
                required_types = ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT_PAM']
                
                if all(t in supported_types for t in required_types):
                    self.log_test(
                        "5.1 Google Analytics supports required item types", 
                        True,
                        f"Supported types: {supported_types}"
                    )
                else:
                    missing = [t for t in required_types if t not in supported_types]
                    self.log_test("5.1 Google Analytics supports required item types", False, 
                                error=f"Missing support for: {missing}")
            else:
                self.log_test("5.1 Google Analytics supports required item types", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("5.1 Google Analytics supports required item types", False, error=error_msg)

        # Test 5.2: Create a comprehensive access request with mixed item types
        comprehensive_request = {
            "clientId": self.client_id,
            "items": [
                {
                    "platformId": self.google_analytics_platform_id,
                    "itemType": "NAMED_INVITE",
                    "accessPattern": "NAMED_INVITE",
                    "role": "Viewer",
                    "humanIdentityStrategy": "AGENCY_GROUP",
                    "agencyGroupEmail": "analytics-team@agency.com"
                },
                {
                    "platformId": self.google_analytics_platform_id,
                    "itemType": "GROUP_ACCESS", 
                    "accessPattern": "GROUP_BASED",
                    "role": "Editor",
                    "agencyData": {
                        "serviceAccountEmail": "ga4-sa@agency.iam.gserviceaccount.com",
                        "ssoGroupName": "ga4-access-group@agency.com"
                    }
                },
                {
                    "platformId": self.google_analytics_platform_id,
                    "itemType": "SHARED_ACCOUNT_PAM",
                    "accessPattern": "PAM", 
                    "role": "Administrator",
                    "pamOwnership": "AGENCY_OWNED",
                    "pamIdentityStrategy": "CLIENT_DEDICATED",
                    "pamNamingTemplate": "{clientSlug}-ga4-admin@agency.com",
                    "pamIdentityType": "MAILBOX",
                    "pamRoleTemplate": "GA4 Administrator"
                }
            ]
        }
        
        response = self.make_request('POST', 'access-requests', comprehensive_request)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('success'):
                items = result['data']['items']
                if len(items) == 3:
                    # Verify each item type is correct
                    named_invite = next((i for i in items if i['itemType'] == 'NAMED_INVITE'), None)
                    group_access = next((i for i in items if i['itemType'] == 'GROUP_ACCESS'), None)
                    pam_item = next((i for i in items if i['itemType'] == 'SHARED_ACCOUNT_PAM'), None)
                    
                    if named_invite and group_access and pam_item:
                        # Verify resolved identity for PAM item
                        pam_resolved = pam_item.get('resolvedIdentity')
                        if pam_resolved and 'test-corporation' in pam_resolved.lower():
                            self.log_test(
                                "5.2 Comprehensive access request created", 
                                True,
                                f"All 3 item types created successfully with PAM resolvedIdentity: {pam_resolved}"
                            )
                        else:
                            self.log_test("5.2 Comprehensive access request created", False, 
                                        error=f"PAM resolvedIdentity not generated: {pam_resolved}")
                    else:
                        self.log_test("5.2 Comprehensive access request created", False, 
                                    error=f"Not all item types found: named_invite={bool(named_invite)}, group_access={bool(group_access)}, pam_item={bool(pam_item)}")
                else:
                    self.log_test("5.2 Comprehensive access request created", False, 
                                error=f"Expected 3 items but got {len(items)}")
            else:
                self.log_test("5.2 Comprehensive access request created", False, 
                            error=f"API returned error: {result}")
        else:
            error_msg = f"Expected 200 but got {response.status_code if response else 'No response'}"
            if response:
                result = response.json()
                error_msg += f": {result}"
            self.log_test("5.2 Comprehensive access request created", False, error=error_msg)

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Marketing Identity Platform Bug Fix Tests")
        print("=" * 60)
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Test setup failed. Aborting.")
            return False
        
        print("=" * 60)
        
        # Run all test suites
        try:
            self.test_1_named_invite_identity_strategy_restrictions()
            self.test_2_pam_client_dedicated_identity()
            self.test_3_group_access_with_service_account_sso()
            self.test_4_access_pattern_derivation()
            self.test_5_comprehensive_validation()
        except Exception as e:
            print(f"❌ Test execution failed with error: {e}")
            return False
        
        # Print summary
        self.print_summary()
        return True

    def print_summary(self):
        """Print test summary"""
        print("=" * 60)
        print("🎯 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result.get('error', 'Unknown error')}")
        else:
            print("🎉 ALL TESTS PASSED!")
        
        print("=" * 60)

if __name__ == "__main__":
    tester = IdentityPlatformTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)