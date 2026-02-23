#!/usr/bin/env python3
"""
Backend testing for Plugin-Driven PAM Governance Server-side Validation
Testing the validateAgainstPluginRules() function in the API route
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Base URL from environment
BASE_URL = "https://identity-platform-8.preview.emergentagent.com"

class PluginValidationTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def run_test(self, test_name: str, test_func):
        """Run a single test and report results"""
        try:
            print(f"\n🧪 Testing: {test_name}")
            result = test_func()
            if result:
                print(f"✅ PASS: {test_name}")
                return True
            else:
                print(f"❌ FAIL: {test_name}")
                return False
        except Exception as e:
            print(f"💥 ERROR in {test_name}: {str(e)}")
            return False
    
    def get_meta_platform_id(self) -> Optional[str]:
        """Get a Meta platform ID for testing"""
        try:
            response = self.session.get(f"{self.base_url}/api/agency/platforms")
            if response.status_code == 200:
                platforms = response.json().get('data', [])
                for platform in platforms:
                    if platform.get('platform', {}).get('name', '').lower() in ['meta', 'facebook', 'meta business manager']:
                        return platform['id']
            
            # If no existing Meta platform, create one
            # First get Meta platform from catalog
            catalog_response = self.session.get(f"{self.base_url}/api/platforms")
            if catalog_response.status_code != 200:
                print(f"Failed to get platforms catalog: {catalog_response.status_code}")
                return None
                
            catalog_platforms = catalog_response.json().get('data', [])
            meta_platform = None
            for platform in catalog_platforms:
                if 'meta' in platform.get('name', '').lower() or 'facebook' in platform.get('name', '').lower():
                    meta_platform = platform
                    break
            
            if not meta_platform:
                print("Meta platform not found in catalog")
                return None
            
            # Create agency platform
            create_response = self.session.post(f"{self.base_url}/api/agency/platforms", json={
                'platformId': meta_platform['id']
            })
            
            if create_response.status_code == 200:
                return create_response.json()['data']['id']
            else:
                print(f"Failed to create agency platform: {create_response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error getting Meta platform ID: {e}")
            return None
    
    def test_1_plugin_driven_item_type_validation(self) -> bool:
        """
        Test Case 1: Plugin-Driven Item Type Validation
        - Find a Meta platform ID
        - POST to /api/agency/platforms/{id}/items with itemType: "PROXY_TOKEN" (which Meta doesn't support)
        - Expected: 400 error with message about unsupported item type
        - Meta only supports: PARTNER_DELEGATION, NAMED_INVITE, SHARED_ACCOUNT
        """
        meta_platform_id = self.get_meta_platform_id()
        if not meta_platform_id:
            print("Could not get Meta platform ID")
            return False
        
        print(f"Using Meta platform ID: {meta_platform_id}")
        
        # Try to create PROXY_TOKEN item (unsupported by Meta)
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{meta_platform_id}/items",
            json={
                "itemType": "PROXY_TOKEN",
                "label": "Test Proxy Token",
                "role": "admin",
                "agencyConfigJson": {
                    "businessManagerId": "123456789"
                }
            }
        )
        
        if response.status_code != 400:
            print(f"Expected 400, got {response.status_code}: {response.text}")
            return False
        
        error_data = response.json()
        error_message = error_data.get('error', '')
        
        if 'not supported' not in error_message.lower() and 'proxy_token' in error_message.lower():
            print(f"Expected error about unsupported item type, got: {error_message}")
            return False
        
        print(f"✅ Correctly rejected PROXY_TOKEN for Meta: {error_message}")
        return True
    
    def test_2_plugin_driven_role_template_validation(self) -> bool:
        """
        Test Case 2: Plugin-Driven Role Template Validation
        - POST to /api/agency/platforms/{id}/items with itemType: "PARTNER_DELEGATION" and role: "superuser"
        - Expected: 400 error about invalid role
        - Meta PARTNER_DELEGATION only allows: 'admin', 'analyst'
        """
        meta_platform_id = self.get_meta_platform_id()
        if not meta_platform_id:
            print("Could not get Meta platform ID")
            return False
        
        # Try to create PARTNER_DELEGATION with invalid role
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{meta_platform_id}/items",
            json={
                "itemType": "PARTNER_DELEGATION",
                "label": "Test Partner Delegation",
                "role": "superuser",  # Invalid role for Meta
                "agencyConfigJson": {
                    "businessManagerId": "123456789012345"  # Use a longer ID that might pass validation
                }
            }
        )
        
        if response.status_code != 400:
            print(f"Expected 400, got {response.status_code}: {response.text}")
            return False
        
        error_data = response.json()
        error_message = error_data.get('error', '')
        
        if 'role' not in error_message.lower() or 'not allowed' not in error_message.lower():
            print(f"Expected error about invalid role, got: {error_message}")
            return False
        
        print(f"✅ Correctly rejected invalid role 'superuser': {error_message}")
        return True
    
    def test_3_pam_confirmation_validation(self) -> bool:
        """
        Test Case 3: PAM Confirmation Validation (for SHARED_ACCOUNT)
        - POST to /api/agency/platforms/{id}/items with:
          - itemType: "SHARED_ACCOUNT" 
          - agencyConfigJson: { pamOwnership: "AGENCY_OWNED" } (missing pamConfirmation)
        - Expected: 400 error requiring PAM confirmation
        """
        meta_platform_id = self.get_meta_platform_id()
        if not meta_platform_id:
            print("Could not get Meta platform ID")
            return False
        
        # Try to create SHARED_ACCOUNT without PAM confirmation
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{meta_platform_id}/items",
            json={
                "itemType": "SHARED_ACCOUNT",
                "label": "Test Shared Account",
                "role": "admin",
                "agencyConfigJson": {
                    "pamOwnership": "AGENCY_OWNED"
                    # Missing pamConfirmation
                }
            }
        )
        
        if response.status_code != 400:
            print(f"Expected 400, got {response.status_code}: {response.text}")
            return False
        
        error_data = response.json()
        error_message = error_data.get('error', '')
        
        if 'pam confirmation' not in error_message.lower():
            print(f"Expected error about PAM confirmation, got: {error_message}")
            return False
        
        print(f"✅ Correctly required PAM confirmation: {error_message}")
        return True
    
    def test_4_agency_config_asset_separation(self) -> bool:
        """
        Test Case 4: Agency Config Asset Separation
        - POST to /api/agency/platforms/{id}/items with:
          - agencyConfigJson containing "clientAccountId" or similar client asset fields
        - Expected: 400 error about client-side asset IDs not allowed
        """
        meta_platform_id = self.get_meta_platform_id()
        if not meta_platform_id:
            print("Could not get Meta platform ID")
            return False
        
        # Try to create item with client asset ID in agency config
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{meta_platform_id}/items",
            json={
                "itemType": "PARTNER_DELEGATION",
                "label": "Test Asset Separation",
                "role": "admin",
                "agencyConfigJson": {
                    "businessManagerId": "123456789",
                    "clientAccountId": "client-account-123"  # This should be rejected
                }
            }
        )
        
        if response.status_code != 400:
            print(f"Expected 400, got {response.status_code}: {response.text}")
            return False
        
        error_data = response.json()
        error_message = error_data.get('error', '')
        
        if 'client-side asset' not in error_message.lower() and 'clientaccountid' not in error_message.lower():
            print(f"Expected error about client-side assets, got: {error_message}")
            return False
        
        print(f"✅ Correctly rejected client asset ID in agency config: {error_message}")
        return True
    
    def test_5_valid_creation_control_test(self) -> bool:
        """
        Test Case 5: Valid Creation (Control Test)
        - POST to /api/agency/platforms/{id}/items with valid data:
          - itemType: "PARTNER_DELEGATION"
          - label: "Test Partner Access"
          - role: "admin"
          - agencyConfigJson: { businessManagerId: "123456789" }
        - Expected: 200 success
        """
        meta_platform_id = self.get_meta_platform_id()
        if not meta_platform_id:
            print("Could not get Meta platform ID")
            return False
        
        # Try to create valid item
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{meta_platform_id}/items",
            json={
                "itemType": "PARTNER_DELEGATION",
                "label": "Test Partner Access",
                "role": "admin",  # Valid role
                "agencyConfigJson": {
                    "businessManagerId": "123456789"  # Valid agency config
                }
            }
        )
        
        if response.status_code not in [200, 201]:
            print(f"Expected 200/201, got {response.status_code}: {response.text}")
            return False
        
        response_data = response.json()
        if not response_data.get('success'):
            print(f"Response indicated failure: {response_data}")
            return False
        
        print(f"✅ Successfully created valid item: {response_data.get('data', {}).get('id', 'unknown')}")
        return True

def main():
    print("🚀 Starting Plugin-Driven PAM Governance Server-side Validation Testing")
    print(f"Base URL: {BASE_URL}")
    
    tester = PluginValidationTester(BASE_URL)
    
    test_results = []
    
    # Run all test cases
    tests = [
        ("Plugin-Driven Item Type Validation", tester.test_1_plugin_driven_item_type_validation),
        ("Plugin-Driven Role Template Validation", tester.test_2_plugin_driven_role_template_validation),
        ("PAM Confirmation Validation", tester.test_3_pam_confirmation_validation),
        ("Agency Config Asset Separation", tester.test_4_agency_config_asset_separation),
        ("Valid Creation (Control Test)", tester.test_5_valid_creation_control_test),
    ]
    
    for test_name, test_func in tests:
        result = tester.run_test(test_name, test_func)
        test_results.append((test_name, result))
    
    # Summary
    print(f"\n{'='*60}")
    print("🏁 PLUGIN-DRIVEN PAM GOVERNANCE VALIDATION TEST SUMMARY")
    print(f"{'='*60}")
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n📊 RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Plugin-driven PAM governance validation is working correctly.")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED! Please review the validation logic.")
        return 1

if __name__ == "__main__":
    sys.exit(main())