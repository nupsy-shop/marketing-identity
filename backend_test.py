#!/usr/bin/env python3
"""
PAM Governance and Plugin-Based Structural Alignment Test Suite
Testing against: https://plugin-onboard.preview.emergentagent.com/api

This test suite covers:
1. Plugin Manifest Structure - Security Capabilities
2. Access Item Type Metadata (New Format)  
3. Item Type Validation
4. Role Template Validation
5. Asset Separation (Agency vs Client)
6. PAM Configuration Persistence
"""

import requests
import json
import sys
import uuid
from typing import Dict, Any, List

# Base configuration
BASE_URL = "https://plugin-onboard.preview.emergentagent.com/api"
GOOGLE_ADS_PLATFORM_ID = "92417db3-7c40-4da2-8f5b-33be4cd335cd"

class PAMGovernanceTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })

    def test_plugin_manifest_security_capabilities(self):
        """Test 1: Plugin Manifest Structure - Security Capabilities"""
        print("\n=== TEST 1: Plugin Manifest Security Capabilities ===")
        
        try:
            # Test Google Ads plugin manifest
            response = self.session.get(f"{BASE_URL}/plugins/google-ads")
            
            if response.status_code != 200:
                self.log_test("Plugin manifest retrieval", False, f"Status: {response.status_code}")
                return
                
            data = response.json()
            manifest = data.get('data', {}).get('manifest', {})
            
            # Check for securityCapabilities object
            security_caps = manifest.get('securityCapabilities')
            if not security_caps:
                self.log_test("Security capabilities presence", False, "securityCapabilities object missing")
                return
                
            self.log_test("Security capabilities presence", True, "securityCapabilities object found")
            
            # Test required fields
            required_fields = [
                'supportsDelegation', 'supportsGroupAccess', 'supportsOAuth', 
                'supportsCredentialLogin', 'pamRecommendation', 'pamRationale'
            ]
            
            for field in required_fields:
                if field in security_caps:
                    self.log_test(f"Security capability field: {field}", True, f"Value: {security_caps[field]}")
                else:
                    self.log_test(f"Security capability field: {field}", False, "Field missing")
            
            # Test pamRecommendation values
            pam_recommendation = security_caps.get('pamRecommendation')
            valid_recommendations = ['recommended', 'not_recommended', 'break_glass_only']
            if pam_recommendation in valid_recommendations:
                self.log_test("PAM recommendation validation", True, f"Valid value: {pam_recommendation}")
            else:
                self.log_test("PAM recommendation validation", False, f"Invalid value: {pam_recommendation}")
                
        except Exception as e:
            self.log_test("Plugin manifest security capabilities", False, f"Exception: {str(e)}")

    def test_access_item_type_metadata_format(self):
        """Test 2: Access Item Type Metadata (New Format)"""
        print("\n=== TEST 2: Access Item Type Metadata (New Format) ===")
        
        try:
            # Test Google Ads plugin supportedAccessItemTypes
            response = self.session.get(f"{BASE_URL}/plugins/google-ads")
            
            if response.status_code != 200:
                self.log_test("Plugin retrieval for access types", False, f"Status: {response.status_code}")
                return
                
            data = response.json()
            manifest = data.get('data', {}).get('manifest', {})
            supported_types = manifest.get('supportedAccessItemTypes', [])
            
            if not supported_types:
                self.log_test("Supported access item types presence", False, "No supported types found")
                return
                
            self.log_test("Supported access item types presence", True, f"Found {len(supported_types)} types")
            
            # Test new format structure (objects with type, label, description, icon, roleTemplates)
            for item_type in supported_types:
                if not isinstance(item_type, dict):
                    self.log_test("Access item type object format", False, f"Not an object: {item_type}")
                    continue
                    
                # Check required fields in new format
                required_fields = ['type', 'label', 'description', 'icon', 'roleTemplates']
                type_name = item_type.get('type', 'unknown')
                
                for field in required_fields:
                    if field in item_type:
                        self.log_test(f"Access type {type_name} field: {field}", True, f"Value present")
                        
                        # Test roleTemplates structure
                        if field == 'roleTemplates' and isinstance(item_type[field], list):
                            for role in item_type[field]:
                                if isinstance(role, dict) and 'key' in role and 'label' in role:
                                    self.log_test(f"Role template structure for {type_name}", True, f"Role: {role.get('key')}")
                                else:
                                    self.log_test(f"Role template structure for {type_name}", False, f"Invalid role: {role}")
                    else:
                        self.log_test(f"Access type {type_name} field: {field}", False, "Field missing")
                        
        except Exception as e:
            self.log_test("Access item type metadata format", False, f"Exception: {str(e)}")

    def test_item_type_validation(self):
        """Test 3: Item Type Validation"""
        print("\n=== TEST 3: Item Type Validation ===")
        
        try:
            # First, create a test agency platform with Google Ads
            agency_platform_data = {"platformId": GOOGLE_ADS_PLATFORM_ID}
            response = self.session.post(f"{BASE_URL}/agency/platforms", json=agency_platform_data)
            
            if response.status_code not in [200, 409]:  # 409 = already exists
                self.log_test("Agency platform creation", False, f"Status: {response.status_code}")
                return
                
            # Get the agency platform to get its ID
            platforms_response = self.session.get(f"{BASE_URL}/agency/platforms")
            if platforms_response.status_code != 200:
                self.log_test("Agency platforms retrieval", False, f"Status: {platforms_response.status_code}")
                return
                
            platforms = platforms_response.json().get('data', [])
            google_ads_platform = None
            for platform in platforms:
                if platform.get('platformId') == GOOGLE_ADS_PLATFORM_ID:
                    google_ads_platform = platform
                    break
                    
            if not google_ads_platform:
                self.log_test("Google Ads agency platform found", False, "Platform not found")
                return
                
            agency_platform_id = google_ads_platform['id']
            self.log_test("Google Ads agency platform found", True, f"Platform ID: {agency_platform_id}")
            
            # Test valid item type (PARTNER_DELEGATION should be supported by Google Ads)
            valid_item = {
                "itemType": "PARTNER_DELEGATION",
                "label": "Test Partner Delegation",
                "role": "admin",
                "agencyConfigJson": {
                    "managerAccountId": "123-456-7890"
                }
            }
            
            response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=valid_item)
            if response.status_code == 200:
                self.log_test("Valid item type creation (PARTNER_DELEGATION)", True, "Item created successfully")
            else:
                response_data = response.json()
                self.log_test("Valid item type creation (PARTNER_DELEGATION)", False, f"Status: {response.status_code}, Error: {response_data.get('error', 'Unknown')}")
            
            # Test invalid/unsupported item type for Google Ads
            invalid_item = {
                "itemType": "UNSUPPORTED_TYPE",
                "label": "Test Unsupported Type",  
                "role": "admin"
            }
            
            response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=invalid_item)
            if response.status_code == 400:
                error_msg = response.json().get('error', '')
                if 'not supported' in error_msg.lower():
                    self.log_test("Invalid item type rejection", True, f"Correctly rejected: {error_msg}")
                else:
                    self.log_test("Invalid item type rejection", False, f"Wrong error message: {error_msg}")
            else:
                self.log_test("Invalid item type rejection", False, f"Should have returned 400, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Item type validation", False, f"Exception: {str(e)}")

    def test_role_template_validation(self):
        """Test 4: Role Template Validation"""
        print("\n=== TEST 4: Role Template Validation ===")
        
        try:
            # Get Google Ads plugin details to check role templates
            response = self.session.get(f"{BASE_URL}/plugins/google-ads")
            
            if response.status_code != 200:
                self.log_test("Plugin retrieval for roles", False, f"Status: {response.status_code}")
                return
                
            data = response.json()
            manifest = data.get('data', {}).get('manifest', {})
            supported_types = manifest.get('supportedAccessItemTypes', [])
            
            # Find PARTNER_DELEGATION type and its role templates
            partner_delegation_type = None
            for item_type in supported_types:
                if item_type.get('type') == 'PARTNER_DELEGATION':
                    partner_delegation_type = item_type
                    break
                    
            if not partner_delegation_type:
                self.log_test("PARTNER_DELEGATION type found", False, "Type not found")
                return
                
            role_templates = partner_delegation_type.get('roleTemplates', [])
            if not role_templates:
                self.log_test("Role templates present", False, "No role templates found")
                return
                
            self.log_test("Role templates present", True, f"Found {len(role_templates)} role templates")
            
            # Extract valid role keys
            valid_roles = [role.get('key') for role in role_templates if role.get('key')]
            self.log_test("Valid role keys extracted", True, f"Roles: {valid_roles}")
            
            # Get agency platform for testing
            platforms_response = self.session.get(f"{BASE_URL}/agency/platforms")
            if platforms_response.status_code != 200:
                self.log_test("Agency platforms for role test", False, f"Status: {platforms_response.status_code}")
                return
                
            platforms = platforms_response.json().get('data', [])
            google_ads_platform = None
            for platform in platforms:
                if platform.get('platformId') == GOOGLE_ADS_PLATFORM_ID:
                    google_ads_platform = platform
                    break
                    
            if not google_ads_platform:
                self.log_test("Agency platform for role test", False, "Google Ads platform not found")
                return
                
            agency_platform_id = google_ads_platform['id']
            
            # Test valid role from role templates
            if valid_roles:
                valid_role_item = {
                    "itemType": "PARTNER_DELEGATION",
                    "label": "Test Valid Role",
                    "role": valid_roles[0],  # Use first valid role
                    "agencyConfigJson": {
                        "managerAccountId": "123-456-7890"
                    }
                }
                
                response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=valid_role_item)
                if response.status_code == 200:
                    self.log_test(f"Valid role acceptance ({valid_roles[0]})", True, "Role accepted")
                else:
                    response_data = response.json()
                    self.log_test(f"Valid role acceptance ({valid_roles[0]})", False, f"Status: {response.status_code}, Error: {response_data.get('error', 'Unknown')}")
            
            # Test invalid role not in role templates
            invalid_role_item = {
                "itemType": "PARTNER_DELEGATION",
                "label": "Test Invalid Role",
                "role": "invalid_role_not_in_templates",
                "agencyConfigJson": {
                    "managerAccountId": "123-456-7890"
                }
            }
            
            response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=invalid_role_item)
            # Note: Currently the system may not validate roles against templates, so we'll check for either acceptance or rejection
            if response.status_code == 400:
                error_msg = response.json().get('error', '')
                self.log_test("Invalid role rejection", True, f"Role validation working: {error_msg}")
            elif response.status_code == 200:
                self.log_test("Invalid role rejection", False, "Role validation not implemented - should reject invalid roles")
            else:
                self.log_test("Invalid role rejection", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Role template validation", False, f"Exception: {str(e)}")

    def test_asset_separation_agency_vs_client(self):
        """Test 5: Asset Separation (Agency vs Client)"""
        print("\n=== TEST 5: Asset Separation (Agency vs Client) ===")
        
        try:
            # Test agency config schema - should NOT include client asset fields like adAccountId
            response = self.session.get(f"{BASE_URL}/plugins/google-ads/schema/agency-config?accessItemType=PARTNER_DELEGATION")
            
            if response.status_code != 200:
                self.log_test("Agency config schema retrieval", False, f"Status: {response.status_code}")
                return
                
            agency_schema = response.json().get('data', {})
            agency_properties = agency_schema.get('properties', {})
            
            # Agency schema should have managerAccountId but NOT adAccountId
            if 'managerAccountId' in agency_properties:
                self.log_test("Agency config has agency fields (managerAccountId)", True, "managerAccountId present")
            else:
                self.log_test("Agency config has agency fields (managerAccountId)", False, "managerAccountId missing")
                
            if 'adAccountId' not in agency_properties:
                self.log_test("Agency config excludes client fields (adAccountId)", True, "adAccountId correctly excluded")
            else:
                self.log_test("Agency config excludes client fields (adAccountId)", False, "adAccountId should not be in agency config")
            
            # Test client target schema - should INCLUDE client asset fields like adAccountId
            response = self.session.get(f"{BASE_URL}/plugins/google-ads/schema/client-target?accessItemType=PARTNER_DELEGATION")
            
            if response.status_code != 200:
                self.log_test("Client target schema retrieval", False, f"Status: {response.status_code}")
                return
                
            client_schema = response.json().get('data', {})
            client_properties = client_schema.get('properties', {})
            
            # Client schema should have adAccountId but NOT managerAccountId
            if 'adAccountId' in client_properties:
                self.log_test("Client target has client fields (adAccountId)", True, "adAccountId present")
            else:
                self.log_test("Client target has client fields (adAccountId)", False, "adAccountId missing")
                
            if 'managerAccountId' not in client_properties:
                self.log_test("Client target excludes agency fields (managerAccountId)", True, "managerAccountId correctly excluded")
            else:
                self.log_test("Client target excludes agency fields (managerAccountId)", False, "managerAccountId should not be in client target")
                
        except Exception as e:
            self.log_test("Asset separation (agency vs client)", False, f"Exception: {str(e)}")

    def test_pam_configuration_persistence(self):
        """Test 6: PAM Configuration Persistence"""
        print("\n=== TEST 6: PAM Configuration Persistence ===")
        
        try:
            # Get agency platform for PAM testing
            platforms_response = self.session.get(f"{BASE_URL}/agency/platforms")
            if platforms_response.status_code != 200:
                self.log_test("Agency platforms for PAM test", False, f"Status: {platforms_response.status_code}")
                return
                
            platforms = platforms_response.json().get('data', [])
            google_ads_platform = None
            for platform in platforms:
                if platform.get('platformId') == GOOGLE_ADS_PLATFORM_ID:
                    google_ads_platform = platform
                    break
                    
            if not google_ads_platform:
                self.log_test("Agency platform for PAM test", False, "Google Ads platform not found")
                return
                
            agency_platform_id = google_ads_platform['id']
            
            # Create SHARED_ACCOUNT item with PAM confirmation and settings
            pam_item = {
                "itemType": "SHARED_ACCOUNT",
                "label": "Test PAM Shared Account",
                "role": "admin",
                "agencyConfigJson": {
                    "pamOwnership": "AGENCY_OWNED",
                    "identityPurpose": "HUMAN_INTERACTIVE", 
                    "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY",
                    "pamIdentityType": "MAILBOX",
                    "pamNamingTemplate": "{client}-googleads@agency.com",
                    "pamCheckoutDurationMinutes": 60,
                    "pamApprovalRequired": False,
                    "pamRotationPolicy": "AFTER_EACH_CHECKOUT",
                    "pamConfirmation": True  # Required for not_recommended
                }
            }
            
            response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=pam_item)
            if response.status_code == 200:
                self.log_test("PAM item creation with confirmation", True, "SHARED_ACCOUNT item created")
                
                # Verify the data was saved correctly
                item_response = self.session.get(f"{BASE_URL}/agency/platforms/{agency_platform_id}")
                if item_response.status_code == 200:
                    platform_data = item_response.json().get('data', {})
                    access_items = platform_data.get('accessItems', [])
                    
                    # Find our PAM item
                    pam_item_found = None
                    for item in access_items:
                        if item.get('itemType') == 'SHARED_ACCOUNT' and item.get('label') == 'Test PAM Shared Account':
                            pam_item_found = item
                            break
                    
                    if pam_item_found:
                        self.log_test("PAM item persistence", True, "PAM item found in saved data")
                        
                        # Check if agencyConfigJson fields are preserved
                        saved_config = pam_item_found.get('agencyConfigJson', {})
                        expected_fields = ['pamOwnership', 'pamConfirmation', 'pamIdentityStrategy', 'pamNamingTemplate']
                        
                        for field in expected_fields:
                            if field in saved_config:
                                self.log_test(f"PAM config field persistence: {field}", True, f"Value: {saved_config[field]}")
                            else:
                                self.log_test(f"PAM config field persistence: {field}", False, "Field not saved")
                    else:
                        self.log_test("PAM item persistence", False, "PAM item not found in saved data")
                else:
                    self.log_test("PAM item retrieval", False, f"Status: {item_response.status_code}")
            else:
                response_data = response.json()
                self.log_test("PAM item creation with confirmation", False, f"Status: {response.status_code}, Error: {response_data.get('error', 'Unknown')}")
            
            # Test PAM creation without required confirmation (should fail for not_recommended)
            pam_item_no_confirmation = {
                "itemType": "SHARED_ACCOUNT",
                "label": "Test PAM No Confirmation",
                "role": "admin",
                "agencyConfigJson": {
                    "pamOwnership": "AGENCY_OWNED",
                    "identityPurpose": "HUMAN_INTERACTIVE",
                    "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY"
                    # Missing pamConfirmation: true
                }
            }
            
            response = self.session.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", json=pam_item_no_confirmation)
            if response.status_code == 400:
                error_msg = response.json().get('error', '')
                if 'confirmation' in error_msg.lower() or 'acknowledge' in error_msg.lower():
                    self.log_test("PAM confirmation requirement", True, f"Correctly requires confirmation: {error_msg}")
                else:
                    self.log_test("PAM confirmation requirement", False, f"Wrong error message: {error_msg}")
            else:
                self.log_test("PAM confirmation requirement", False, f"Should require confirmation for not_recommended PAM, got status: {response.status_code}")
                
        except Exception as e:
            self.log_test("PAM configuration persistence", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all PAM governance and plugin structural alignment tests"""
        print("🚀 Starting PAM Governance and Plugin-Based Structural Alignment Tests")
        print(f"Testing against: {BASE_URL}")
        print(f"Google Ads Platform ID: {GOOGLE_ADS_PLATFORM_ID}")
        
        # Run all test suites
        self.test_plugin_manifest_security_capabilities()
        self.test_access_item_type_metadata_format()
        self.test_item_type_validation()
        self.test_role_template_validation()
        self.test_asset_separation_agency_vs_client()
        self.test_pam_configuration_persistence()
        
        # Summary
        print(f"\n{'='*60}")
        print("🎯 PAM GOVERNANCE & PLUGIN STRUCTURAL ALIGNMENT TEST SUMMARY")
        print(f"{'='*60}")
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return success_rate >= 80  # 80% pass rate threshold

if __name__ == "__main__":
    try:
        test_suite = PAMGovernanceTestSuite()
        success = test_suite.run_all_tests()
        
        if success:
            print(f"\n🎉 PAM Governance and Plugin Structural Alignment tests completed successfully!")
            sys.exit(0)
        else:
            print(f"\n⚠️  Some PAM Governance and Plugin Structural Alignment tests failed. Check the details above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print(f"\n⏹️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test suite failed with exception: {str(e)}")
        sys.exit(1)