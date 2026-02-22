#!/usr/bin/env python3

import requests
import json
import uuid
import time
from typing import Dict, Any, Optional, List

# Base URL from environment
BASE_URL = "https://pam-identity-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class PAMIdentityStrategyTester:
    def __init__(self):
        self.client_id = None
        self.agency_platform_id = None
        self.access_request_id = None
        self.onboarding_token = None
        self.pam_item_ids = {}  # Store different PAM item IDs
        self.test_results = []

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        message = f"{status} - {test_name}"
        if details:
            message += f": {details}"
        print(message)
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expect_status: int = 200) -> Optional[Dict]:
        """Make HTTP request with error handling"""
        url = f"{API_BASE}/{endpoint.lstrip('/')}"
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, timeout=10)
            elif method == "PATCH":
                response = requests.patch(url, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            if response.status_code != expect_status:
                print(f"❌ Request failed: {method} {endpoint} -> {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return None
                
            return response.json() if response.content else {}
            
        except Exception as e:
            print(f"❌ Request error: {method} {endpoint} -> {str(e)}")
            return None

    def setup_test_data(self):
        """Setup client and agency platform for PAM testing"""
        print("\n🧪 Setting up test data...")
        
        # Create test client
        try:
            client_data = {
                "name": "Test Corp PAM",
                "email": "admin@testcorppam.com"
            }
            
            result = self.make_request("POST", "clients", client_data)
            if result and result.get("success"):
                self.client_id = result.get("data", {}).get("id")
                self.log_result("Setup - Create test client", True, f"Client ID: {self.client_id}")
            else:
                self.log_result("Setup - Create test client", False, "Failed to create client")
                return False
        except Exception as e:
            self.log_result("Setup - Create test client", False, str(e))
            return False

        # Create/Use agency platform for Google Analytics (supports SHARED_ACCOUNT_PAM)
        try:
            platform_data = {"platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000"}  # Google Analytics / GA4
            
            # Use special handling since POST might return 409 if platform already exists
            url = f"{API_BASE}/agency/platforms"
            response = requests.post(url, json=platform_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.agency_platform_id = result.get("data", {}).get("id")
                self.log_result("Setup - Create agency platform", True, f"Agency platform ID: {self.agency_platform_id}")
                return True
            elif response.status_code == 409:
                result = response.json()
                self.agency_platform_id = result.get("data", {}).get("id")
                self.log_result("Setup - Use existing agency platform", True, f"Agency platform ID: {self.agency_platform_id}")
                return True
            else:
                self.log_result("Setup - Create agency platform", False, f"Failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Setup - Create agency platform", False, str(e))
            return False

    def test_agency_platform_pam_item_creation(self):
        """Test 1: Agency Platform PAM Item Creation with Identity Strategies"""
        print("\n🧪 Testing Agency Platform PAM Item Creation...")
        
        if not self.agency_platform_id:
            self.log_result("PAM Item Creation", False, "No agency platform available")
            return

        # Test 1.1: AGENCY_OWNED with STATIC Identity Strategy
        try:
            static_pam_data = {
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "label": "GA4 Admin PAM - Static Agency Identity",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "AGENCY_OWNED",
                    "identityStrategy": "STATIC",
                    "agencyIdentityEmail": "shared-ga4@agency.com",
                    "roleTemplate": "Administrator"
                }
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", static_pam_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                # Find the STATIC item
                static_item = None
                for item in items:
                    if (item.get("pamConfig", {}).get("identityStrategy") == "STATIC" and 
                        item.get("itemType") == "SHARED_ACCOUNT_PAM"):
                        static_item = item
                        self.pam_item_ids["static"] = item.get("id")
                        break
                
                if static_item:
                    pam_config = static_item.get("pamConfig", {})
                    if (pam_config.get("ownership") == "AGENCY_OWNED" and
                        pam_config.get("identityStrategy") == "STATIC" and
                        pam_config.get("agencyIdentityEmail") == "shared-ga4@agency.com" and
                        pam_config.get("roleTemplate") == "Administrator"):
                        self.log_result("AGENCY_OWNED PAM with STATIC identity strategy", True, "PAM config stored correctly")
                    else:
                        self.log_result("AGENCY_OWNED PAM with STATIC identity strategy", False, f"PAM config incorrect: {pam_config}")
                else:
                    self.log_result("AGENCY_OWNED PAM with STATIC identity strategy", False, "STATIC PAM item not found")
            else:
                self.log_result("AGENCY_OWNED PAM with STATIC identity strategy", False, "Failed to create STATIC PAM item")
        except Exception as e:
            self.log_result("AGENCY_OWNED PAM with STATIC identity strategy", False, str(e))

        # Test 1.2: AGENCY_OWNED with CLIENT_DEDICATED Identity Strategy
        try:
            client_dedicated_pam_data = {
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "label": "GA4 Admin PAM - Client Dedicated",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "AGENCY_OWNED",
                    "identityStrategy": "CLIENT_DEDICATED",
                    "identityType": "GROUP",
                    "namingTemplate": "{clientSlug}-ga4-admin@agency.com",
                    "roleTemplate": "Administrator"
                }
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", client_dedicated_pam_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                # Find the CLIENT_DEDICATED item
                client_dedicated_item = None
                for item in items:
                    if (item.get("pamConfig", {}).get("identityStrategy") == "CLIENT_DEDICATED" and 
                        item.get("itemType") == "SHARED_ACCOUNT_PAM"):
                        client_dedicated_item = item
                        self.pam_item_ids["client_dedicated"] = item.get("id")
                        break
                
                if client_dedicated_item:
                    pam_config = client_dedicated_item.get("pamConfig", {})
                    if (pam_config.get("ownership") == "AGENCY_OWNED" and
                        pam_config.get("identityStrategy") == "CLIENT_DEDICATED" and
                        pam_config.get("identityType") == "GROUP" and
                        pam_config.get("namingTemplate") == "{clientSlug}-ga4-admin@agency.com" and
                        pam_config.get("roleTemplate") == "Administrator"):
                        self.log_result("AGENCY_OWNED PAM with CLIENT_DEDICATED identity strategy", True, "PAM config with naming template stored correctly")
                    else:
                        self.log_result("AGENCY_OWNED PAM with CLIENT_DEDICATED identity strategy", False, f"PAM config incorrect: {pam_config}")
                else:
                    self.log_result("AGENCY_OWNED PAM with CLIENT_DEDICATED identity strategy", False, "CLIENT_DEDICATED PAM item not found")
            else:
                self.log_result("AGENCY_OWNED PAM with CLIENT_DEDICATED identity strategy", False, "Failed to create CLIENT_DEDICATED PAM item")
        except Exception as e:
            self.log_result("AGENCY_OWNED PAM with CLIENT_DEDICATED identity strategy", False, str(e))

        # Test 1.3: CLIENT_OWNED PAM (no agency identity fields needed)
        try:
            client_owned_pam_data = {
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "label": "GA4 Admin PAM - Client Owned",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "CLIENT_OWNED",
                    "requiresDedicatedAgencyLogin": True
                }
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", client_owned_pam_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                # Find the CLIENT_OWNED item
                client_owned_item = None
                for item in items:
                    if (item.get("pamConfig", {}).get("ownership") == "CLIENT_OWNED" and 
                        item.get("itemType") == "SHARED_ACCOUNT_PAM"):
                        client_owned_item = item
                        self.pam_item_ids["client_owned"] = item.get("id")
                        break
                
                if client_owned_item:
                    pam_config = client_owned_item.get("pamConfig", {})
                    if (pam_config.get("ownership") == "CLIENT_OWNED" and
                        pam_config.get("grantMethod") == "CREDENTIAL_HANDOFF" and
                        # Verify no agency identity fields are set
                        not pam_config.get("agencyIdentityEmail") and
                        not pam_config.get("identityStrategy")):
                        self.log_result("CLIENT_OWNED PAM (no agency identity fields)", True, "CLIENT_OWNED PAM created without agency fields")
                    else:
                        self.log_result("CLIENT_OWNED PAM (no agency identity fields)", False, f"CLIENT_OWNED PAM config incorrect: {pam_config}")
                else:
                    self.log_result("CLIENT_OWNED PAM (no agency identity fields)", False, "CLIENT_OWNED PAM item not found")
            else:
                self.log_result("CLIENT_OWNED PAM (no agency identity fields)", False, "Failed to create CLIENT_OWNED PAM item")
        except Exception as e:
            self.log_result("CLIENT_OWNED PAM (no agency identity fields)", False, str(e))

        # Test 1.4: Verify supportedItemTypes validation
        try:
            # Try to add SHARED_ACCOUNT_PAM to a platform that doesn't support it
            # First, create an agency platform with a platform that doesn't support PAM
            unsupported_platform_data = {"platformId": "apple-search-ads"}  # Apple Search Ads doesn't support PAM
            
            url = f"{API_BASE}/agency/platforms"
            response = requests.post(url, json=unsupported_platform_data, timeout=10)
            
            unsupported_platform_id = None
            if response.status_code == 200 or response.status_code == 409:
                result = response.json()
                unsupported_platform_id = result.get("data", {}).get("id")
            
            if unsupported_platform_id:
                # Try to add PAM item to unsupported platform
                unsupported_pam_data = {
                    "itemType": "SHARED_ACCOUNT_PAM",
                    "accessPattern": "PAM",
                    "label": "Invalid PAM Item",
                    "role": "Admin",
                    "pamConfig": {
                        "ownership": "CLIENT_OWNED"
                    }
                }
                
                url = f"{API_BASE}/agency/platforms/{unsupported_platform_id}/items"
                response = requests.post(url, json=unsupported_pam_data, timeout=10)
                
                if response.status_code == 400:
                    result = response.json()
                    error_msg = result.get("error", "")
                    if "not supported" in error_msg and "SHARED_ACCOUNT_PAM" in error_msg:
                        self.log_result("supportedItemTypes validation", True, "Correctly rejected PAM item for unsupported platform")
                    else:
                        self.log_result("supportedItemTypes validation", False, f"Wrong error message: {error_msg}")
                else:
                    self.log_result("supportedItemTypes validation", False, f"Expected 400 but got {response.status_code}")
            else:
                self.log_result("supportedItemTypes validation", False, "Could not create unsupported platform for test")
        except Exception as e:
            self.log_result("supportedItemTypes validation", False, str(e))

    def test_access_request_pam_identity_generation(self):
        """Test 2: Access Request with PAM Identity Generation"""
        print("\n🧪 Testing Access Request with PAM Identity Generation...")
        
        if not self.client_id or not self.agency_platform_id:
            self.log_result("PAM Identity Generation", False, "Missing client or agency platform")
            return

        # Get the agency platform to get PAM items
        try:
            result = self.make_request("GET", f"agency/platforms/{self.agency_platform_id}")
            if not (result and result.get("success")):
                self.log_result("Get agency platform for PAM test", False, "Failed to get agency platform")
                return
            
            agency_platform = result.get("data", {})
            access_items = agency_platform.get("accessItems", [])
            
            static_item = None
            client_dedicated_item = None
            client_owned_item = None
            
            for item in access_items:
                if item.get("itemType") == "SHARED_ACCOUNT_PAM":
                    pam_config = item.get("pamConfig", {})
                    if pam_config.get("identityStrategy") == "STATIC":
                        static_item = item
                    elif pam_config.get("identityStrategy") == "CLIENT_DEDICATED":
                        client_dedicated_item = item
                    elif pam_config.get("ownership") == "CLIENT_OWNED":
                        client_owned_item = item

        except Exception as e:
            self.log_result("Get PAM items for testing", False, str(e))
            return

        # Test 2.1: CLIENT_DEDICATED strategy - verify resolvedIdentity is generated
        if client_dedicated_item:
            try:
                access_request_data = {
                    "clientId": self.client_id,
                    "items": [{
                        "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                        "accessPattern": "PAM",
                        "role": "Administrator",
                        "itemType": "SHARED_ACCOUNT_PAM",
                        "pamOwnership": "AGENCY_OWNED",
                        "pamIdentityStrategy": "CLIENT_DEDICATED",
                        "pamIdentityType": "GROUP",
                        "pamNamingTemplate": "{clientSlug}-ga4-admin@agency.com",
                        "pamRoleTemplate": "Administrator"
                    }]
                }
                
                result = self.make_request("POST", "access-requests", access_request_data)
                if result and result.get("success"):
                    access_request = result.get("data", {})
                    self.access_request_id = access_request.get("id")
                    self.onboarding_token = access_request.get("token")
                    
                    items = access_request.get("items", [])
                    if items and len(items) > 0:
                        item = items[0]
                        resolved_identity = item.get("resolvedIdentity")
                        pam_config = item.get("pamConfig", {})
                        
                        # Should generate identity like "test-corp-pam-ga4-admin@agency.com"
                        if (resolved_identity and 
                            "test-corp-pam" in resolved_identity.lower() and
                            "ga4-admin@agency.com" in resolved_identity and
                            pam_config.get("identityStrategy") == "CLIENT_DEDICATED"):
                            self.log_result("CLIENT_DEDICATED resolvedIdentity generation", True, f"Generated identity: {resolved_identity}")
                        else:
                            self.log_result("CLIENT_DEDICATED resolvedIdentity generation", False, f"Unexpected resolved identity: {resolved_identity}")
                    else:
                        self.log_result("CLIENT_DEDICATED resolvedIdentity generation", False, "No items in access request")
                else:
                    self.log_result("CLIENT_DEDICATED resolvedIdentity generation", False, "Failed to create access request")
            except Exception as e:
                self.log_result("CLIENT_DEDICATED resolvedIdentity generation", False, str(e))

        # Test 2.2: STATIC strategy - verify resolvedIdentity equals pamAgencyIdentityEmail
        if static_item:
            try:
                access_request_data = {
                    "clientId": self.client_id,
                    "items": [{
                        "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                        "accessPattern": "PAM",
                        "role": "Administrator",
                        "itemType": "SHARED_ACCOUNT_PAM",
                        "pamOwnership": "AGENCY_OWNED",
                        "pamIdentityStrategy": "STATIC",
                        "pamAgencyIdentityEmail": "shared-ga4@agency.com",
                        "pamRoleTemplate": "Administrator"
                    }]
                }
                
                result = self.make_request("POST", "access-requests", access_request_data)
                if result and result.get("success"):
                    access_request = result.get("data", {})
                    items = access_request.get("items", [])
                    
                    if items and len(items) > 0:
                        item = items[0]
                        resolved_identity = item.get("resolvedIdentity")
                        pam_config = item.get("pamConfig", {})
                        
                        if (resolved_identity == "shared-ga4@agency.com" and
                            pam_config.get("identityStrategy") == "STATIC"):
                            self.log_result("STATIC resolvedIdentity equals pamAgencyIdentityEmail", True, f"Resolved identity: {resolved_identity}")
                        else:
                            self.log_result("STATIC resolvedIdentity equals pamAgencyIdentityEmail", False, f"Expected shared-ga4@agency.com, got: {resolved_identity}")
                    else:
                        self.log_result("STATIC resolvedIdentity equals pamAgencyIdentityEmail", False, "No items in access request")
                else:
                    self.log_result("STATIC resolvedIdentity equals pamAgencyIdentityEmail", False, "Failed to create STATIC access request")
            except Exception as e:
                self.log_result("STATIC resolvedIdentity equals pamAgencyIdentityEmail", False, str(e))

        # Test 2.3: CLIENT_OWNED - verify no resolvedIdentity is set
        if client_owned_item:
            try:
                access_request_data = {
                    "clientId": self.client_id,
                    "items": [{
                        "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                        "accessPattern": "PAM",
                        "role": "Administrator",
                        "itemType": "SHARED_ACCOUNT_PAM",
                        "pamOwnership": "CLIENT_OWNED"
                    }]
                }
                
                result = self.make_request("POST", "access-requests", access_request_data)
                if result and result.get("success"):
                    access_request = result.get("data", {})
                    items = access_request.get("items", [])
                    
                    if items and len(items) > 0:
                        item = items[0]
                        resolved_identity = item.get("resolvedIdentity")
                        pam_config = item.get("pamConfig", {})
                        
                        if (not resolved_identity and
                            pam_config.get("ownership") == "CLIENT_OWNED"):
                            self.log_result("CLIENT_OWNED no resolvedIdentity", True, "No resolvedIdentity set for CLIENT_OWNED")
                        else:
                            self.log_result("CLIENT_OWNED no resolvedIdentity", False, f"Unexpected resolvedIdentity for CLIENT_OWNED: {resolved_identity}")
                    else:
                        self.log_result("CLIENT_OWNED no resolvedIdentity", False, "No items in access request")
                else:
                    self.log_result("CLIENT_OWNED no resolvedIdentity", False, "Failed to create CLIENT_OWNED access request")
            except Exception as e:
                self.log_result("CLIENT_OWNED no resolvedIdentity", False, str(e))

        # Test 2.4: Verify pamConfig is stored correctly on access request items
        if self.access_request_id:
            try:
                result = self.make_request("GET", f"access-requests/{self.access_request_id}")
                if result and result.get("success"):
                    access_request = result.get("data", {})
                    items = access_request.get("items", [])
                    
                    if items and len(items) > 0:
                        item = items[0]
                        pam_config = item.get("pamConfig", {})
                        
                        # Check that pamConfig has the required fields
                        required_fields = ["ownership", "identityStrategy", "grantMethod"]
                        has_all_fields = all(pam_config.get(field) for field in required_fields)
                        
                        if has_all_fields:
                            self.log_result("pamConfig stored correctly on access request", True, f"pamConfig: {pam_config}")
                        else:
                            self.log_result("pamConfig stored correctly on access request", False, f"Missing pamConfig fields: {pam_config}")
                    else:
                        self.log_result("pamConfig stored correctly on access request", False, "No items in stored access request")
                else:
                    self.log_result("pamConfig stored correctly on access request", False, "Failed to retrieve access request")
            except Exception as e:
                self.log_result("pamConfig stored correctly on access request", False, str(e))

    def test_put_access_item_update(self):
        """Test 3: PUT Access Item Update with pamConfig changes"""
        print("\n🧪 Testing PUT Access Item Update...")
        
        if not self.agency_platform_id or not self.pam_item_ids.get("client_dedicated"):
            self.log_result("PUT Access Item Update", False, "Missing agency platform or CLIENT_DEDICATED item")
            return

        # Test updating pamConfig.identityStrategy from CLIENT_DEDICATED to STATIC
        try:
            updated_pam_data = {
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "label": "GA4 Admin PAM - Updated to Static",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "AGENCY_OWNED",
                    "identityStrategy": "STATIC",
                    "agencyIdentityEmail": "updated-shared-ga4@agency.com",
                    "roleTemplate": "Administrator"
                }
            }
            
            item_id = self.pam_item_ids["client_dedicated"]
            result = self.make_request("PUT", f"agency/platforms/{self.agency_platform_id}/items/{item_id}", updated_pam_data)
            
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                # Find the updated item
                updated_item = None
                for item in items:
                    if item.get("id") == item_id:
                        updated_item = item
                        break
                
                if updated_item:
                    pam_config = updated_item.get("pamConfig", {})
                    if (pam_config.get("identityStrategy") == "STATIC" and
                        pam_config.get("agencyIdentityEmail") == "updated-shared-ga4@agency.com" and
                        updated_item.get("label") == "GA4 Admin PAM - Updated to Static"):
                        self.log_result("PUT pamConfig.identityStrategy update", True, "pamConfig updated from CLIENT_DEDICATED to STATIC")
                    else:
                        self.log_result("PUT pamConfig.identityStrategy update", False, f"Update not applied correctly: {pam_config}")
                else:
                    self.log_result("PUT pamConfig.identityStrategy update", False, "Updated item not found")
            else:
                self.log_result("PUT pamConfig.identityStrategy update", False, "Failed to update access item")
        except Exception as e:
            self.log_result("PUT pamConfig.identityStrategy update", False, str(e))

    def test_end_to_end_pam_flow(self):
        """Test 4: End-to-End PAM Identity Strategy Flow"""
        print("\n🧪 Testing End-to-End PAM Identity Strategy Flow...")
        
        try:
            # Step 1: Create fresh client for E2E test
            client_data = {"name": "E2E PAM Corp", "email": "admin@e2epam.com"}
            result = self.make_request("POST", "clients", client_data)
            if not (result and result.get("success")):
                self.log_result("E2E PAM - Create client", False, "Failed to create client")
                return
            
            e2e_client_id = result.get("data", {}).get("id")
            self.log_result("E2E PAM - Create client", True, "E2E PAM Corp created")

            # Step 2: Find Google Analytics / GA4 platform that supports SHARED_ACCOUNT_PAM
            result = self.make_request("GET", f"platforms/0f75633f-0f75-40f7-80f7-0f75633f0000")
            if result and result.get("success"):
                platform = result.get("data", {})
                supported_types = platform.get("supportedItemTypes", [])
                
                if "SHARED_ACCOUNT_PAM" in supported_types:
                    self.log_result("E2E PAM - Verify platform supports PAM", True, f"Google Analytics supports: {supported_types}")
                else:
                    self.log_result("E2E PAM - Verify platform supports PAM", False, f"Google Analytics doesn't support PAM: {supported_types}")
                    return
            else:
                self.log_result("E2E PAM - Verify platform supports PAM", False, "Failed to get platform info")
                return

            # Step 3: Add agency platform (reuse existing if available)
            if not self.agency_platform_id:
                platform_data = {"platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000"}
                
                url = f"{API_BASE}/agency/platforms"
                response = requests.post(url, json=platform_data, timeout=10)
                
                if response.status_code == 200 or response.status_code == 409:
                    result = response.json()
                    self.agency_platform_id = result.get("data", {}).get("id")
                    self.log_result("E2E PAM - Add agency platform", True, "Agency platform ready")
                else:
                    self.log_result("E2E PAM - Add agency platform", False, f"Failed with status {response.status_code}")
                    return

            # Step 4: Create PAM access item with CLIENT_DEDICATED strategy
            pam_item_data = {
                "itemType": "SHARED_ACCOUNT_PAM",
                "accessPattern": "PAM",
                "label": "E2E GA4 PAM - Client Dedicated",
                "role": "Administrator",
                "pamConfig": {
                    "ownership": "AGENCY_OWNED",
                    "identityStrategy": "CLIENT_DEDICATED",
                    "identityType": "GROUP",
                    "namingTemplate": "{clientSlug}-ga4-admin@agency.com",
                    "roleTemplate": "Administrator"
                }
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", pam_item_data)
            if not (result and result.get("success")):
                self.log_result("E2E PAM - Create PAM access item", False, "Failed to create PAM item")
                return
                
            self.log_result("E2E PAM - Create PAM access item", True, "PAM item with CLIENT_DEDICATED created")

            # Step 5: Create access request for client
            access_request_data = {
                "clientId": e2e_client_id,
                "items": [{
                    "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                    "accessPattern": "PAM",
                    "role": "Administrator",
                    "itemType": "SHARED_ACCOUNT_PAM",
                    "pamOwnership": "AGENCY_OWNED",
                    "pamIdentityStrategy": "CLIENT_DEDICATED",
                    "pamIdentityType": "GROUP",
                    "pamNamingTemplate": "{clientSlug}-ga4-admin@agency.com",
                    "pamRoleTemplate": "Administrator"
                }]
            }
            
            result = self.make_request("POST", "access-requests", access_request_data)
            if not (result and result.get("success")):
                self.log_result("E2E PAM - Create access request", False, "Failed to create access request")
                return
                
            access_request = result.get("data", {})
            e2e_token = access_request.get("token")
            items = access_request.get("items", [])
            
            if items and e2e_token:
                resolved_identity = items[0].get("resolvedIdentity")
                # Should generate "e2e-pam-corp-ga4-admin@agency.com"
                if resolved_identity == "e2e-pam-corp-ga4-admin@agency.com":
                    self.log_result("E2E PAM - Verify resolvedIdentity generation", True, f"Generated: {resolved_identity}")
                else:
                    self.log_result("E2E PAM - Verify resolvedIdentity generation", False, f"Expected e2e-pam-corp-ga4-admin@agency.com, got: {resolved_identity}")
                    return
            else:
                self.log_result("E2E PAM - Create access request", False, "No items or token in response")
                return

            # Step 6: Verify onboarding contains correct PAM fields
            result = self.make_request("GET", f"onboarding/{e2e_token}")
            if result and result.get("success"):
                onboarding_data = result.get("data", {})
                onboarding_items = onboarding_data.get("items", [])
                
                if onboarding_items:
                    item = onboarding_items[0]
                    resolved_identity = item.get("resolvedIdentity")
                    pam_config = item.get("pamConfig", {})
                    
                    if (resolved_identity == "e2e-pam-corp-ga4-admin@agency.com" and
                        pam_config.get("identityStrategy") == "CLIENT_DEDICATED" and
                        pam_config.get("ownership") == "AGENCY_OWNED"):
                        self.log_result("E2E PAM - Onboarding PAM fields", True, "All PAM fields present in onboarding")
                    else:
                        self.log_result("E2E PAM - Onboarding PAM fields", False, f"Missing PAM fields: resolvedIdentity={resolved_identity}, pamConfig={pam_config}")
                else:
                    self.log_result("E2E PAM - Onboarding PAM fields", False, "No items in onboarding data")
            else:
                self.log_result("E2E PAM - Onboarding PAM fields", False, "Failed to get onboarding data")

            self.log_result("E2E PAM - Complete flow", True, "End-to-end PAM identity strategy flow successful")

        except Exception as e:
            self.log_result("E2E PAM - Complete flow", False, str(e))

    def run_all_tests(self):
        """Run all PAM Identity Strategy tests"""
        print("🚀 Starting PAM Identity Strategy Backend API Testing...")
        print("=" * 80)
        
        start_time = time.time()
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Failed to setup test data. Aborting tests.")
            return False
        
        # Run PAM tests
        self.test_agency_platform_pam_item_creation()
        self.test_access_request_pam_identity_generation()
        self.test_put_access_item_update()
        self.test_end_to_end_pam_flow()
        
        end_time = time.time()
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 PAM IDENTITY STRATEGY TESTING SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"🎯 Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print(f"⏱️  Duration: {(end_time-start_time):.2f}s")
        
        if failed_tests > 0:
            print(f"\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = PAMIdentityStrategyTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)