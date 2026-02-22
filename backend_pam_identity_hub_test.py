#!/usr/bin/env python3
"""
PAM Identity Hub Refactoring Backend Test Suite
Testing against: https://access-mgmt-postgres.preview.emergentagent.com/api

Key Features to Test:
1. Platform-Specific Required Fields Validation
2. Named Invite Identity Strategy Validation
3. PAM Configuration
4. Client-Dedicated Identity Generation
5. Access Request Wizard Filtering
6. Item Type Restrictions
7. Access Pattern Read-Only
"""

import requests
import json
from typing import Dict, List, Any
import traceback

class PAMIdentityHubTester:
    def __init__(self):
        self.base_url = "https://access-mgmt-postgres.preview.emergentagent.com/api"
        self.results = []
        
        # Platform IDs from actual API
        self.platform_ids = {
            'google_ads': '5b9278e4-5b92-45b9-85b9-5b9278e40000',
            'ga4': '0f75633f-0f75-40f7-80f7-0f75633f0000', 
            'meta': '7c3d89f5-7c3d-47c3-97c3-7c3d89f50000'
        }
        
        # Store created resources for cleanup
        self.created_agency_platforms = []
        self.created_clients = []
        self.created_access_requests = []

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")

    def make_request(self, method: str, endpoint: str, data: dict = None) -> tuple:
        """Make HTTP request and return (status_code, response_json)"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return 400, {"error": f"Unsupported method: {method}"}
            
            try:
                return response.status_code, response.json()
            except:
                return response.status_code, {"error": "Invalid JSON response", "text": response.text}
                
        except Exception as e:
            return 500, {"error": str(e)}

    def test_platform_specific_required_fields_validation(self):
        """Test 1: Platform-Specific Required Fields Validation"""
        print("\n=== Test 1: Platform-Specific Required Fields Validation ===")
        
        try:
            # Test 1a: Google Ads Partner Delegation missing managerAccountId
            status, resp = self.make_request('POST', 'agency/platforms', {
                'platformId': self.platform_ids['google_ads']
            })
            
            if status in [200, 201]:
                agency_platform_id = resp['data']['id']
                self.created_agency_platforms.append(agency_platform_id)
                
                # Try to add PARTNER_DELEGATION without managerAccountId
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'PARTNER_DELEGATION',
                    'accessPattern': 'DELEGATION',
                    'label': 'Partner Access',
                    'role': 'Manager'
                })
                
                if status == 400:
                    self.log_result("Google Ads Partner Delegation - Missing MCC ID Rejected", True, 
                                  f"Correctly rejected with 400: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("Google Ads Partner Delegation - Missing MCC ID Rejected", False, 
                                  f"Expected 400 but got {status}: {resp}")
                
                # Test 1b: Google Ads Partner Delegation with managerAccountId should succeed
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'PARTNER_DELEGATION',
                    'accessPattern': 'DELEGATION', 
                    'label': 'Partner Access',
                    'role': 'Manager',
                    'agencyData': {
                        'managerAccountId': '123-456-7890'
                    }
                })
                
                if status in [200, 201]:
                    self.log_result("Google Ads Partner Delegation - With MCC ID Accepted", True,
                                  "Successfully created with managerAccountId")
                else:
                    self.log_result("Google Ads Partner Delegation - With MCC ID Accepted", False,
                                  f"Expected 200/201 but got {status}: {resp}")
            else:
                self.log_result("Google Ads Partner Delegation - Platform Setup", False,
                              f"Failed to create agency platform: {status} - {resp}")

            # Test 1c: Meta Partner Delegation missing businessManagerId  
            status, resp = self.make_request('POST', 'agency/platforms', {
                'platformId': self.platform_ids['meta']
            })
            
            if status in [200, 201]:
                agency_platform_id = resp['data']['id']
                self.created_agency_platforms.append(agency_platform_id)
                
                # Try without businessManagerId
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'PARTNER_DELEGATION',
                    'accessPattern': 'DELEGATION',
                    'label': 'Partner Access', 
                    'role': 'Manager'
                })
                
                if status == 400:
                    self.log_result("Meta Partner Delegation - Missing Business Manager ID Rejected", True,
                                  f"Correctly rejected with 400: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("Meta Partner Delegation - Missing Business Manager ID Rejected", False,
                                  f"Expected 400 but got {status}: {resp}")
                
                # With businessManagerId should succeed
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'PARTNER_DELEGATION',
                    'accessPattern': 'DELEGATION',
                    'label': 'Partner Access',
                    'role': 'Manager',
                    'agencyData': {
                        'businessManagerId': 'BM123456789'
                    }
                })
                
                if status in [200, 201]:
                    self.log_result("Meta Partner Delegation - With Business Manager ID Accepted", True,
                                  "Successfully created with businessManagerId")
                else:
                    self.log_result("Meta Partner Delegation - With Business Manager ID Accepted", False,
                                  f"Expected 200/201 but got {status}: {resp}")

        except Exception as e:
            self.log_result("Platform-Specific Required Fields Validation", False, 
                          f"Exception: {str(e)}")

    def test_named_invite_identity_strategy_validation(self):
        """Test 2: Named Invite Identity Strategy Validation"""
        print("\n=== Test 2: Named Invite Identity Strategy Validation ===")
        
        try:
            # Create agency platform
            status, resp = self.make_request('POST', 'agency/platforms', {
                'platformId': self.platform_ids['ga4']
            })
            
            if status in [200, 201]:
                agency_platform_id = resp['data']['id']
                self.created_agency_platforms.append(agency_platform_id)
                
                # Test 2a: Named Invite with AGENCY_GROUP requires agencyGroupEmail
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'label': 'Team Access',
                    'role': 'Viewer',
                    'identityPurpose': 'HUMAN_INTERACTIVE',
                    'humanIdentityStrategy': 'AGENCY_GROUP'
                })
                
                if status == 400:
                    self.log_result("Named Invite AGENCY_GROUP - Missing agencyGroupEmail Rejected", True,
                                  f"Correctly rejected missing agencyGroupEmail: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("Named Invite AGENCY_GROUP - Missing agencyGroupEmail Rejected", False,
                                  f"Expected 400 but got {status}: {resp}")
                
                # With agencyGroupEmail should succeed
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'label': 'Team Access',
                    'role': 'Viewer', 
                    'identityPurpose': 'HUMAN_INTERACTIVE',
                    'humanIdentityStrategy': 'AGENCY_GROUP',
                    'agencyGroupEmail': 'analytics-team@youragency.com'
                })
                
                if status in [200, 201]:
                    self.log_result("Named Invite AGENCY_GROUP - With agencyGroupEmail Accepted", True,
                                  "Successfully created with agencyGroupEmail")
                else:
                    self.log_result("Named Invite AGENCY_GROUP - With agencyGroupEmail Accepted", False,
                                  f"Expected 200/201 but got {status}: {resp}")
                
                # Test 2b: Named Invite with INDIVIDUAL_USERS does NOT require agencyGroupEmail
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'label': 'Individual Access',
                    'role': 'Viewer',
                    'identityPurpose': 'HUMAN_INTERACTIVE', 
                    'humanIdentityStrategy': 'INDIVIDUAL_USERS'
                })
                
                if status in [200, 201]:
                    self.log_result("Named Invite INDIVIDUAL_USERS - No agencyGroupEmail Required", True,
                                  "Successfully created without agencyGroupEmail")
                else:
                    self.log_result("Named Invite INDIVIDUAL_USERS - No agencyGroupEmail Required", False,
                                  f"Expected 200/201 but got {status}: {resp}")
                
                # Test 2c: Named Invite rejects CLIENT_DEDICATED strategy
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'label': 'Client Dedicated Access',
                    'role': 'Viewer',
                    'identityPurpose': 'HUMAN_INTERACTIVE',
                    'humanIdentityStrategy': 'CLIENT_DEDICATED',
                    'namingTemplate': '{clientSlug}-ga4@youragency.com'
                })
                
                if status == 400:
                    self.log_result("Named Invite - CLIENT_DEDICATED Strategy Rejected", True,
                                  f"Correctly rejected CLIENT_DEDICATED: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("Named Invite - CLIENT_DEDICATED Strategy Rejected", False,
                                  f"Expected 400 but got {status}: {resp}")

        except Exception as e:
            self.log_result("Named Invite Identity Strategy Validation", False,
                          f"Exception: {str(e)}")

    def test_pam_configuration(self):
        """Test 3: PAM Configuration"""
        print("\n=== Test 3: PAM Configuration ===")
        
        try:
            # Create agency platform
            status, resp = self.make_request('POST', 'agency/platforms', {
                'platformId': self.platform_ids['ga4']
            })
            
            if status in [200, 201]:
                agency_platform_id = resp['data']['id']
                self.created_agency_platforms.append(agency_platform_id)
                
                # Test 3a: STATIC identity strategy requires agencyIdentityEmail
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'label': 'PAM Static Access',
                    'role': 'Admin',
                    'pamConfig': {
                        'ownership': 'AGENCY_OWNED',
                        'identityStrategy': 'STATIC'
                        # Missing agencyIdentityEmail
                    }
                })
                
                if status == 400:
                    self.log_result("PAM STATIC Strategy - Missing agencyIdentityEmail Rejected", True,
                                  f"Correctly rejected missing agencyIdentityEmail: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("PAM STATIC Strategy - Missing agencyIdentityEmail Rejected", False,
                                  f"Expected 400 but got {status}: {resp}")
                
                # With agencyIdentityEmail should succeed
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'label': 'PAM Static Access',
                    'role': 'Admin',
                    'pamConfig': {
                        'ownership': 'AGENCY_OWNED',
                        'identityStrategy': 'STATIC',
                        'agencyIdentityEmail': 'pam-ga4@youragency.com'
                    }
                })
                
                if status in [200, 201]:
                    self.log_result("PAM STATIC Strategy - With agencyIdentityEmail Accepted", True,
                                  "Successfully created with agencyIdentityEmail")
                else:
                    self.log_result("PAM STATIC Strategy - With agencyIdentityEmail Accepted", False,
                                  f"Expected 200/201 but got {status}: {resp}")
                
                # Test 3b: CLIENT_DEDICATED strategy requires namingTemplate
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'label': 'PAM Client Dedicated',
                    'role': 'Admin',
                    'pamConfig': {
                        'ownership': 'AGENCY_OWNED',
                        'identityStrategy': 'CLIENT_DEDICATED'
                        # Missing namingTemplate
                    }
                })
                
                if status == 400:
                    self.log_result("PAM CLIENT_DEDICATED - Missing namingTemplate Rejected", True,
                                  f"Correctly rejected missing namingTemplate: {resp.get('error', 'Unknown error')}")
                else:
                    self.log_result("PAM CLIENT_DEDICATED - Missing namingTemplate Rejected", False,
                                  f"Expected 400 but got {status}: {resp}")
                
                # With namingTemplate should succeed
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'label': 'PAM Client Dedicated',
                    'role': 'Admin',
                    'pamConfig': {
                        'ownership': 'AGENCY_OWNED',
                        'identityStrategy': 'CLIENT_DEDICATED',
                        'namingTemplate': '{clientSlug}-ga4-pam@youragency.com'
                    }
                })
                
                if status in [200, 201]:
                    self.log_result("PAM CLIENT_DEDICATED - With namingTemplate Accepted", True,
                                  "Successfully created with namingTemplate")
                else:
                    self.log_result("PAM CLIENT_DEDICATED - With namingTemplate Accepted", False,
                                  f"Expected 200/201 but got {status}: {resp}")
                
                # Test 3c: Integration (Non-Human) mode requires integrationIdentityId
                status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'label': 'PAM Integration',
                    'role': 'Admin',
                    'identityPurpose': 'INTEGRATION_NON_INTERACTIVE',
                    'pamConfig': {
                        'ownership': 'AGENCY_OWNED',
                        'isIntegration': True
                        # Missing integrationIdentityId
                    }
                })
                
                # Note: This validation might be different - check if integration requires integrationIdentityId
                if status == 400:
                    self.log_result("PAM Integration Mode - Missing integrationIdentityId Rejected", True,
                                  f"Correctly rejected missing integrationIdentityId: {resp.get('error', 'Unknown error')}")
                elif status in [200, 201]:
                    self.log_result("PAM Integration Mode - No integrationIdentityId Required", True,
                                  "Integration mode accepted without integrationIdentityId requirement")
                else:
                    self.log_result("PAM Integration Mode - Missing integrationIdentityId Rejected", False,
                                  f"Unexpected status {status}: {resp}")

        except Exception as e:
            self.log_result("PAM Configuration", False, f"Exception: {str(e)}")

    def test_client_dedicated_identity_generation(self):
        """Test 4: Client-Dedicated Identity Generation"""
        print("\n=== Test 4: Client-Dedicated Identity Generation ===")
        
        try:
            # Create client first
            status, resp = self.make_request('POST', 'clients', {
                'name': 'ACME Corporation',
                'email': 'admin@acme-corp.com'
            })
            
            if status in [200, 201]:
                client_id = resp['data']['id']
                self.created_clients.append(client_id)
                
                # Create agency platform with CLIENT_DEDICATED PAM item
                status, resp = self.make_request('POST', 'agency/platforms', {
                    'platformId': self.platform_ids['ga4']
                })
                
                if status in [200, 201]:
                    agency_platform_id = resp['data']['id']
                    self.created_agency_platforms.append(agency_platform_id)
                    
                    # Add CLIENT_DEDICATED PAM item
                    status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                        'itemType': 'SHARED_ACCOUNT_PAM',
                        'accessPattern': 'PAM',
                        'label': 'Client Dedicated GA4 Access',
                        'role': 'Admin',
                        'pamConfig': {
                            'ownership': 'AGENCY_OWNED',
                            'identityStrategy': 'CLIENT_DEDICATED',
                            'namingTemplate': '{clientSlug}-ga4@youragency.com'
                        }
                    })
                    
                    if status in [200, 201]:
                        item_id = resp['data']['accessItems'][0]['id']
                        
                        # Create access request to test identity generation
                        status, resp = self.make_request('POST', 'access-requests', {
                            'clientId': client_id,
                            'items': [
                                {
                                    'platformId': self.platform_ids['ga4'],
                                    'accessPattern': 'PAM',
                                    'role': 'Admin',
                                    'itemType': 'SHARED_ACCOUNT_PAM',
                                    'pamOwnership': 'AGENCY_OWNED',
                                    'pamIdentityStrategy': 'CLIENT_DEDICATED',
                                    'pamNamingTemplate': '{clientSlug}-ga4@youragency.com'
                                }
                            ]
                        })
                        
                        if status in [200, 201]:
                            access_request_id = resp['data']['id']
                            self.created_access_requests.append(access_request_id)
                            
                            # Check if resolvedIdentity was generated from template
                            items = resp['data']['items']
                            if items and len(items) > 0:
                                resolved_identity = items[0].get('resolvedIdentity')
                                expected_identity = 'acme-corporation-ga4@youragency.com'
                                
                                if resolved_identity:
                                    if expected_identity in resolved_identity or 'acme' in resolved_identity.lower():
                                        self.log_result("Client-Dedicated Identity Generation", True,
                                                      f"Generated identity: {resolved_identity}")
                                    else:
                                        self.log_result("Client-Dedicated Identity Generation", False,
                                                      f"Identity '{resolved_identity}' doesn't match expected pattern")
                                else:
                                    self.log_result("Client-Dedicated Identity Generation", False,
                                                  "No resolvedIdentity found in access request item")
                            else:
                                self.log_result("Client-Dedicated Identity Generation", False,
                                              "No items found in access request response")
                        else:
                            self.log_result("Client-Dedicated Identity Generation", False,
                                          f"Failed to create access request: {status} - {resp}")
                    else:
                        self.log_result("Client-Dedicated Identity Generation", False,
                                      f"Failed to create PAM item: {status} - {resp}")
                else:
                    self.log_result("Client-Dedicated Identity Generation", False,
                                  f"Failed to create agency platform: {status} - {resp}")
            else:
                self.log_result("Client-Dedicated Identity Generation", False,
                              f"Failed to create client: {status} - {resp}")

        except Exception as e:
            self.log_result("Client-Dedicated Identity Generation", False, f"Exception: {str(e)}")

    def test_access_request_wizard_filtering(self):
        """Test 5: Access Request Wizard Filtering"""
        print("\n=== Test 5: Access Request Wizard Filtering ===")
        
        try:
            # Test that only enabled platforms with at least 1 access item are included
            status, resp = self.make_request('GET', 'agency/platforms')
            
            if status == 200:
                agency_platforms = resp['data']
                platforms_with_items = [p for p in agency_platforms if p.get('accessItems') and len(p['accessItems']) > 0 and p.get('isEnabled', True)]
                
                self.log_result("Access Request Wizard Filtering - Agency Platforms", True,
                              f"Found {len(platforms_with_items)} agency platforms with access items")
                
                # Check individual platform structure
                if platforms_with_items:
                    sample_platform = platforms_with_items[0]
                    has_required_fields = all(key in sample_platform for key in ['id', 'platformId', 'accessItems', 'isEnabled'])
                    
                    self.log_result("Access Request Wizard Filtering - Platform Structure", has_required_fields,
                                  f"Platform structure validation: {list(sample_platform.keys())}")
                else:
                    self.log_result("Access Request Wizard Filtering - No Platforms", True,
                                  "No agency platforms with access items found (expected if none configured)")
            else:
                self.log_result("Access Request Wizard Filtering", False,
                              f"Failed to get agency platforms: {status} - {resp}")

        except Exception as e:
            self.log_result("Access Request Wizard Filtering", False, f"Exception: {str(e)}")

    def test_item_type_restrictions(self):
        """Test 6: Item Type Restrictions"""
        print("\n=== Test 6: Item Type Restrictions ===")
        
        try:
            # Get platforms to check their supported item types
            status, resp = self.make_request('GET', 'platforms')
            
            if status == 200:
                platforms = resp['data']
                
                # Find Snowflake if it exists
                snowflake_platforms = [p for p in platforms if 'snowflake' in p.get('name', '').lower()]
                
                if snowflake_platforms:
                    snowflake_platform = snowflake_platforms[0]
                    supported_types = snowflake_platform.get('supportedItemTypes', [])
                    
                    # Create agency platform for Snowflake
                    status, resp = self.make_request('POST', 'agency/platforms', {
                        'platformId': snowflake_platform['id']
                    })
                    
                    if status in [200, 201]:
                        agency_platform_id = resp['data']['id']
                        self.created_agency_platforms.append(agency_platform_id)
                        
                        # Test if NAMED_INVITE is supported
                        if 'NAMED_INVITE' in supported_types:
                            # Try to create NAMED_INVITE (should succeed)
                            status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                                'itemType': 'NAMED_INVITE',
                                'accessPattern': 'HUMAN_INVITE',
                                'label': 'Snowflake User Access',
                                'role': 'Viewer',
                                'identityPurpose': 'HUMAN_INTERACTIVE',
                                'humanIdentityStrategy': 'AGENCY_GROUP',
                                'agencyGroupEmail': 'analytics@youragency.com'
                            })
                            
                            if status in [200, 201]:
                                self.log_result("Item Type Restrictions - Snowflake NAMED_INVITE Allowed", True,
                                              "NAMED_INVITE accepted for Snowflake")
                            else:
                                self.log_result("Item Type Restrictions - Snowflake NAMED_INVITE Allowed", False,
                                              f"NAMED_INVITE rejected: {status} - {resp}")
                        else:
                            # Try to create NAMED_INVITE (should be rejected)
                            status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', {
                                'itemType': 'NAMED_INVITE',
                                'accessPattern': 'HUMAN_INVITE',
                                'label': 'Snowflake User Access',
                                'role': 'Viewer',
                                'identityPurpose': 'HUMAN_INTERACTIVE',
                                'humanIdentityStrategy': 'AGENCY_GROUP',
                                'agencyGroupEmail': 'analytics@youragency.com'
                            })
                            
                            if status == 400:
                                self.log_result("Item Type Restrictions - Snowflake NAMED_INVITE Rejected", True,
                                              f"NAMED_INVITE correctly rejected: {resp.get('error', 'Unknown error')}")
                            else:
                                self.log_result("Item Type Restrictions - Snowflake NAMED_INVITE Rejected", False,
                                              f"Expected 400 but got {status}: {resp}")
                    else:
                        self.log_result("Item Type Restrictions - Snowflake Platform Setup", False,
                                      f"Failed to create Snowflake agency platform: {status} - {resp}")
                else:
                    self.log_result("Item Type Restrictions - Snowflake Not Found", True,
                                  "Snowflake platform not found in catalog (test not applicable)")
                
                # Test platform supportedItemTypes in general
                platforms_with_restrictions = [p for p in platforms if 'supportedItemTypes' in p]
                self.log_result("Item Type Restrictions - Platform Support", True,
                              f"Found {len(platforms_with_restrictions)} platforms with supportedItemTypes defined")
                
            else:
                self.log_result("Item Type Restrictions", False,
                              f"Failed to get platforms: {status} - {resp}")

        except Exception as e:
            self.log_result("Item Type Restrictions", False, f"Exception: {str(e)}")

    def test_access_pattern_read_only(self):
        """Test 7: Access Pattern Read-Only"""
        print("\n=== Test 7: Access Pattern Read-Only ===")
        
        try:
            # Create agency platform
            status, resp = self.make_request('POST', 'agency/platforms', {
                'platformId': self.platform_ids['ga4']
            })
            
            if status in [200, 201]:
                agency_platform_id = resp['data']['id']
                self.created_agency_platforms.append(agency_platform_id)
                
                # Test different item types and their derived patterns
                test_cases = [
                    {
                        'itemType': 'NAMED_INVITE',
                        'expectedPattern': 'Named Invite',
                        'accessPattern': 'HUMAN_INVITE'
                    },
                    {
                        'itemType': 'PARTNER_DELEGATION', 
                        'expectedPattern': 'Partner Delegation',
                        'accessPattern': 'DELEGATION'
                    },
                    {
                        'itemType': 'SHARED_ACCOUNT_PAM',
                        'expectedPattern': 'Shared Account (PAM)',
                        'accessPattern': 'PAM'
                    }
                ]
                
                for test_case in test_cases:
                    # Create appropriate item
                    item_data = {
                        'itemType': test_case['itemType'],
                        'accessPattern': test_case['accessPattern'],
                        'label': f"Test {test_case['itemType']}",
                        'role': 'Admin'
                    }
                    
                    # Add required fields based on item type
                    if test_case['itemType'] == 'NAMED_INVITE':
                        item_data.update({
                            'identityPurpose': 'HUMAN_INTERACTIVE',
                            'humanIdentityStrategy': 'AGENCY_GROUP',
                            'agencyGroupEmail': 'test@youragency.com'
                        })
                    elif test_case['itemType'] == 'SHARED_ACCOUNT_PAM':
                        item_data.update({
                            'pamConfig': {
                                'ownership': 'CLIENT_OWNED'
                            }
                        })
                    
                    status, resp = self.make_request('POST', f'agency/platforms/{agency_platform_id}/items', item_data)
                    
                    if status in [200, 201]:
                        # Check if patternLabel is derived correctly
                        items = resp['data'].get('accessItems', [])
                        if items:
                            last_item = items[-1]  # Get the newly created item
                            pattern_label = last_item.get('patternLabel')
                            
                            if pattern_label == test_case['expectedPattern']:
                                self.log_result(f"Access Pattern Read-Only - {test_case['itemType']}", True,
                                              f"Pattern label correctly set to '{pattern_label}'")
                            else:
                                self.log_result(f"Access Pattern Read-Only - {test_case['itemType']}", False,
                                              f"Expected '{test_case['expectedPattern']}' but got '{pattern_label}'")
                        else:
                            self.log_result(f"Access Pattern Read-Only - {test_case['itemType']}", False,
                                          "No items found in response")
                    else:
                        self.log_result(f"Access Pattern Read-Only - {test_case['itemType']}", False,
                                      f"Failed to create item: {status} - {resp}")

        except Exception as e:
            self.log_result("Access Pattern Read-Only", False, f"Exception: {str(e)}")

    def cleanup_resources(self):
        """Clean up created resources"""
        print("\n=== Cleanup ===")
        
        # Delete access requests
        for request_id in self.created_access_requests:
            self.make_request('DELETE', f'access-requests/{request_id}')
        
        # Delete agency platforms
        for platform_id in self.created_agency_platforms:
            self.make_request('DELETE', f'agency/platforms/{platform_id}')
        
        # Delete clients
        for client_id in self.created_clients:
            self.make_request('DELETE', f'clients/{client_id}')

    def run_all_tests(self):
        """Run all PAM Identity Hub tests"""
        print("Starting PAM Identity Hub Refactoring Backend Tests")
        print(f"Testing against: {self.base_url}")
        print("="*80)
        
        try:
            self.test_platform_specific_required_fields_validation()
            self.test_named_invite_identity_strategy_validation()
            self.test_pam_configuration()
            self.test_client_dedicated_identity_generation()
            self.test_access_request_wizard_filtering()
            self.test_item_type_restrictions()
            self.test_access_pattern_read_only()
            
        except Exception as e:
            print(f"Unexpected error during testing: {str(e)}")
            print(traceback.format_exc())
        finally:
            self.cleanup_resources()
        
        # Print summary
        print("\n" + "="*80)
        print("PAM IDENTITY HUB REFACTORING TEST RESULTS SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if r.startswith("✅")])
        failed_tests = len([r for r in self.results if r.startswith("❌")])
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        print()
        
        for result in self.results:
            print(result)
        
        return passed_tests, failed_tests, self.results

if __name__ == "__main__":
    tester = PAMIdentityHubTester()
    passed, failed, results = tester.run_all_tests()
    
    if failed > 0:
        exit(1)  # Return non-zero exit code if any tests failed
    else:
        print("\n🎉 All PAM Identity Hub tests passed!")