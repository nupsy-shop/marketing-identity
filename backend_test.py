#!/usr/bin/env python3

import requests
import json
import uuid
import time
from typing import Dict, Any, Optional, List

# Base URL from environment
BASE_URL = "https://agency-pam.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class IdentityTaxonomyTester:
    def __init__(self):
        self.client_id = None
        self.agency_platform_id = None
        self.access_request_id = None
        self.onboarding_token = None
        self.integration_identity_id = None
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

    def test_integration_identities_crud(self):
        """Test 1: Integration Identities API CRUD operations"""
        print("\n🧪 Testing Integration Identities API CRUD...")
        
        # Test GET /api/integration-identities - Should return seeded data
        try:
            result = self.make_request("GET", "integration-identities")
            if result and result.get("success"):
                identities = result.get("data", [])
                seeded_names = [i.get("name", "") for i in identities]
                
                expected_seeds = ["GA4 Data Export Service Account", "GTM API Service Account", "Fivetran Connector API"]
                found_seeds = [name for name in expected_seeds if any(name in sn for sn in seeded_names)]
                
                if len(found_seeds) >= 2:  # At least 2 seeded identities
                    self.log_result("GET /api/integration-identities - Seeded data", True, f"Found {len(identities)} identities including seeded data")
                else:
                    self.log_result("GET /api/integration-identities - Seeded data", False, f"Expected seeded data not found. Got: {seeded_names}")
            else:
                self.log_result("GET /api/integration-identities - Seeded data", False, "Failed to get identities")
        except Exception as e:
            self.log_result("GET /api/integration-identities - Seeded data", False, str(e))

        # Test POST /api/integration-identities - Create new identity
        try:
            new_identity_data = {
                "type": "SERVICE_ACCOUNT",
                "name": "Test Analytics Service Account",
                "description": "Test service account for analytics platforms",
                "email": "test-analytics@agency-project.iam.gserviceaccount.com",
                "scopes": ["https://www.googleapis.com/auth/analytics.readonly"],
                "rotationPolicy": "QUARTERLY",
                "allowedPlatforms": ["google-analytics-ga4"]
            }
            
            result = self.make_request("POST", "integration-identities", new_identity_data)
            if result and result.get("success"):
                identity = result.get("data", {})
                self.integration_identity_id = identity.get("id")
                
                if (identity.get("name") == new_identity_data["name"] and 
                    identity.get("type") == new_identity_data["type"] and
                    identity.get("email") == new_identity_data["email"]):
                    self.log_result("POST /api/integration-identities - Create", True, f"Created identity with ID {self.integration_identity_id}")
                else:
                    self.log_result("POST /api/integration-identities - Create", False, "Created but data doesn't match")
            else:
                self.log_result("POST /api/integration-identities - Create", False, "Failed to create identity")
        except Exception as e:
            self.log_result("POST /api/integration-identities - Create", False, str(e))

        # Test GET /api/integration-identities/:id
        if self.integration_identity_id:
            try:
                result = self.make_request("GET", f"integration-identities/{self.integration_identity_id}")
                if result and result.get("success"):
                    identity = result.get("data", {})
                    if identity.get("id") == self.integration_identity_id:
                        self.log_result("GET /api/integration-identities/:id", True, "Retrieved identity by ID")
                    else:
                        self.log_result("GET /api/integration-identities/:id", False, "ID mismatch")
                else:
                    self.log_result("GET /api/integration-identities/:id", False, "Failed to get identity by ID")
            except Exception as e:
                self.log_result("GET /api/integration-identities/:id", False, str(e))

        # Test PUT /api/integration-identities/:id
        if self.integration_identity_id:
            try:
                update_data = {
                    "name": "Updated Test Analytics Service Account",
                    "description": "Updated description for test service account"
                }
                
                result = self.make_request("PUT", f"integration-identities/{self.integration_identity_id}", update_data)
                if result and result.get("success"):
                    identity = result.get("data", {})
                    if identity.get("name") == update_data["name"]:
                        self.log_result("PUT /api/integration-identities/:id", True, "Updated identity")
                    else:
                        self.log_result("PUT /api/integration-identities/:id", False, "Update didn't apply")
                else:
                    self.log_result("PUT /api/integration-identities/:id", False, "Failed to update identity")
            except Exception as e:
                self.log_result("PUT /api/integration-identities/:id", False, str(e))

        # Test PATCH /api/integration-identities/:id/toggle
        if self.integration_identity_id:
            try:
                result = self.make_request("PATCH", f"integration-identities/{self.integration_identity_id}/toggle")
                if result and result.get("success"):
                    identity = result.get("data", {})
                    if "isActive" in identity:
                        self.log_result("PATCH /api/integration-identities/:id/toggle", True, f"Toggled active status to {identity.get('isActive')}")
                    else:
                        self.log_result("PATCH /api/integration-identities/:id/toggle", False, "No isActive field in response")
                else:
                    self.log_result("PATCH /api/integration-identities/:id/toggle", False, "Failed to toggle status")
            except Exception as e:
                self.log_result("PATCH /api/integration-identities/:id/toggle", False, str(e))

        # Test DELETE /api/integration-identities/:id
        if self.integration_identity_id:
            try:
                result = self.make_request("DELETE", f"integration-identities/{self.integration_identity_id}")
                if result and result.get("success"):
                    self.log_result("DELETE /api/integration-identities/:id", True, "Deleted identity")
                else:
                    self.log_result("DELETE /api/integration-identities/:id", False, "Failed to delete identity")
            except Exception as e:
                self.log_result("DELETE /api/integration-identities/:id", False, str(e))

    def test_access_items_identity_taxonomy(self):
        """Test 2: Access Items with Identity Taxonomy Fields"""
        print("\n🧪 Testing Access Items with Identity Taxonomy Fields...")
        
        # First create an agency platform
        try:
            platform_data = {"platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000"}  # Google Analytics / GA4
            result = self.make_request("POST", "agency/platforms", platform_data)
            if result and result.get("success"):
                self.agency_platform_id = result.get("data", {}).get("id")
                self.log_result("Create agency platform for testing", True, f"Agency platform ID: {self.agency_platform_id}")
            else:
                self.log_result("Create agency platform for testing", False, "Failed to create agency platform")
                return
        except Exception as e:
            self.log_result("Create agency platform for testing", False, str(e))
            return

        # Test POST /api/agency/platforms/:id/items with CLIENT_DEDICATED strategy
        try:
            item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Admin Access",
                "label": "GA4 Admin Access - Client Dedicated",
                "role": "Administrator",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "CLIENT_DEDICATED",
                "clientDedicatedIdentityType": "GROUP",
                "namingTemplate": "{clientSlug}-ga4-admin@youragency.com",
                "validationMethod": "ATTESTATION",
                "notes": "Test client dedicated identity strategy"
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", item_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                if items and len(items) > 0:
                    item = items[0]
                    if (item.get("identityPurpose") == "HUMAN_INTERACTIVE" and
                        item.get("humanIdentityStrategy") == "CLIENT_DEDICATED" and
                        item.get("namingTemplate") == "{clientSlug}-ga4-admin@youragency.com"):
                        self.log_result("POST access item with CLIENT_DEDICATED", True, "Identity taxonomy fields stored correctly")
                    else:
                        self.log_result("POST access item with CLIENT_DEDICATED", False, "Identity taxonomy fields not stored correctly")
                else:
                    self.log_result("POST access item with CLIENT_DEDICATED", False, "No access items returned")
            else:
                self.log_result("POST access item with CLIENT_DEDICATED", False, "Failed to create access item")
        except Exception as e:
            self.log_result("POST access item with CLIENT_DEDICATED", False, str(e))

        # Test POST with AGENCY_GROUP strategy
        try:
            item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Standard Access", 
                "label": "GA4 Standard Access - Agency Group",
                "role": "Editor",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "AGENCY_GROUP",
                "agencyGroupEmail": "analytics-team@youragency.com",
                "validationMethod": "ATTESTATION"
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", item_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                if len(items) >= 2:
                    # Find the agency group item
                    agency_group_item = None
                    for item in items:
                        if item.get("humanIdentityStrategy") == "AGENCY_GROUP":
                            agency_group_item = item
                            break
                    
                    if (agency_group_item and
                        agency_group_item.get("agencyGroupEmail") == "analytics-team@youragency.com"):
                        self.log_result("POST access item with AGENCY_GROUP", True, "Agency group email stored correctly")
                    else:
                        self.log_result("POST access item with AGENCY_GROUP", False, "Agency group email not stored correctly")
                else:
                    self.log_result("POST access item with AGENCY_GROUP", False, "Expected 2 access items")
            else:
                self.log_result("POST access item with AGENCY_GROUP", False, "Failed to create agency group access item")
        except Exception as e:
            self.log_result("POST access item with AGENCY_GROUP", False, str(e))

        # Test POST with INDIVIDUAL_USERS strategy
        try:
            item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Read Only Access",
                "label": "GA4 Read Access - Individual Users", 
                "role": "Viewer",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "INDIVIDUAL_USERS",
                "validationMethod": "ATTESTATION"
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", item_data)
            if result and result.get("success"):
                agency_platform = result.get("data", {})
                items = agency_platform.get("accessItems", [])
                
                if len(items) >= 3:
                    # Find the individual users item
                    individual_item = None
                    for item in items:
                        if item.get("humanIdentityStrategy") == "INDIVIDUAL_USERS":
                            individual_item = item
                            break
                    
                    if individual_item:
                        self.log_result("POST access item with INDIVIDUAL_USERS", True, "Individual users strategy created")
                    else:
                        self.log_result("POST access item with INDIVIDUAL_USERS", False, "Individual users item not found")
                else:
                    self.log_result("POST access item with INDIVIDUAL_USERS", False, "Expected 3 access items")
            else:
                self.log_result("POST access item with INDIVIDUAL_USERS", False, "Failed to create individual users access item")
        except Exception as e:
            self.log_result("POST access item with INDIVIDUAL_USERS", False, str(e))

        # Test Field Policy Engine validation - Invalid payload
        try:
            invalid_item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Admin Access",
                "label": "Invalid Item",
                "role": "Administrator",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "CLIENT_DEDICATED",
                # Missing required namingTemplate for CLIENT_DEDICATED
                "validationMethod": "ATTESTATION"
            }
            
            result = self.make_request("POST", f"agency/platforms/{self.agency_platform_id}/items", invalid_item_data, expect_status=400)
            if result is None:  # expect_status=400 means we expected failure
                self.log_result("Field Policy Engine validation", True, "Correctly rejected invalid payload (missing namingTemplate)")
            else:
                self.log_result("Field Policy Engine validation", False, "Should have rejected invalid payload")
        except Exception as e:
            self.log_result("Field Policy Engine validation", False, str(e))

    def test_access_request_identity_generation(self):
        """Test 3: Access Request with Identity Generation"""
        print("\n🧪 Testing Access Request with Identity Generation...")
        
        # First create a client
        try:
            client_data = {
                "name": "Acme Corporation", 
                "email": "admin@acmecorp.com"
            }
            
            result = self.make_request("POST", "clients", client_data)
            if result and result.get("success"):
                self.client_id = result.get("data", {}).get("id")
                self.log_result("Create test client", True, f"Client ID: {self.client_id}")
            else:
                self.log_result("Create test client", False, "Failed to create client")
                return
        except Exception as e:
            self.log_result("Create test client", False, str(e))
            return

        # Test access request creation with CLIENT_DEDICATED strategy
        if self.agency_platform_id and self.client_id:
            try:
                # First get the agency platform to get the access items
                result = self.make_request("GET", f"agency/platforms/{self.agency_platform_id}")
                if result and result.get("success"):
                    agency_platform = result.get("data", {})
                    access_items = agency_platform.get("accessItems", [])
                    
                    # Find CLIENT_DEDICATED item
                    client_dedicated_item = None
                    agency_group_item = None
                    individual_users_item = None
                    
                    for item in access_items:
                        if item.get("humanIdentityStrategy") == "CLIENT_DEDICATED":
                            client_dedicated_item = item
                        elif item.get("humanIdentityStrategy") == "AGENCY_GROUP":
                            agency_group_item = item
                        elif item.get("humanIdentityStrategy") == "INDIVIDUAL_USERS":
                            individual_users_item = item
                    
                    if client_dedicated_item:
                        # Create access request using CLIENT_DEDICATED item
                        access_request_data = {
                            "clientId": self.client_id,
                            "items": [{
                                "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",  # Google Analytics / GA4
                                "accessPattern": client_dedicated_item.get("accessPattern"),
                                "role": client_dedicated_item.get("role"),
                                "identityPurpose": client_dedicated_item.get("identityPurpose"),
                                "humanIdentityStrategy": client_dedicated_item.get("humanIdentityStrategy"),
                                "namingTemplate": client_dedicated_item.get("namingTemplate"),
                                "validationMethod": client_dedicated_item.get("validationMethod")
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
                                
                                # Should generate identity like "acme-corporation-google-analytics@youragency.com" 
                                if (resolved_identity and 
                                    "acme-corporation" in resolved_identity.lower() and
                                    "youragency.com" in resolved_identity):
                                    self.log_result("Access request with CLIENT_DEDICATED identity generation", True, f"Generated identity: {resolved_identity}")
                                else:
                                    self.log_result("Access request with CLIENT_DEDICATED identity generation", False, f"Unexpected resolved identity: {resolved_identity}")
                            else:
                                self.log_result("Access request with CLIENT_DEDICATED identity generation", False, "No items in access request")
                        else:
                            self.log_result("Access request with CLIENT_DEDICATED identity generation", False, "Failed to create access request")
                    else:
                        self.log_result("Access request with CLIENT_DEDICATED identity generation", False, "No CLIENT_DEDICATED item found")
                        
                    # Test AGENCY_GROUP resolvedIdentity
                    if agency_group_item:
                        access_request_data = {
                            "clientId": self.client_id,
                            "items": [{
                                "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",  # Google Analytics / GA4
                                "accessPattern": agency_group_item.get("accessPattern"),
                                "role": agency_group_item.get("role"),
                                "identityPurpose": agency_group_item.get("identityPurpose"),
                                "humanIdentityStrategy": agency_group_item.get("humanIdentityStrategy"),
                                "agencyGroupEmail": agency_group_item.get("agencyGroupEmail"),
                                "validationMethod": agency_group_item.get("validationMethod")
                            }]
                        }
                        
                        result = self.make_request("POST", "access-requests", access_request_data)
                        if result and result.get("success"):
                            access_request = result.get("data", {})
                            items = access_request.get("items", [])
                            if items and len(items) > 0:
                                item = items[0]
                                resolved_identity = item.get("resolvedIdentity")
                                
                                if resolved_identity == "analytics-team@youragency.com":
                                    self.log_result("Access request with AGENCY_GROUP resolvedIdentity", True, f"Resolved to: {resolved_identity}")
                                else:
                                    self.log_result("Access request with AGENCY_GROUP resolvedIdentity", False, f"Expected analytics-team@youragency.com, got: {resolved_identity}")
                            else:
                                self.log_result("Access request with AGENCY_GROUP resolvedIdentity", False, "No items in access request")
                        else:
                            self.log_result("Access request with AGENCY_GROUP resolvedIdentity", False, "Failed to create AGENCY_GROUP access request")
                    
                    # Test INDIVIDUAL_USERS with inviteeEmails
                    if individual_users_item:
                        access_request_data = {
                            "clientId": self.client_id,
                            "items": [{
                                "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                                "accessPattern": individual_users_item.get("accessPattern"),
                                "role": individual_users_item.get("role"),
                                "identityPurpose": individual_users_item.get("identityPurpose"),
                                "humanIdentityStrategy": individual_users_item.get("humanIdentityStrategy"),
                                "inviteeEmails": ["analyst1@youragency.com", "analyst2@youragency.com"],
                                "validationMethod": individual_users_item.get("validationMethod")
                            }]
                        }
                        
                        result = self.make_request("POST", "access-requests", access_request_data)
                        if result and result.get("success"):
                            access_request = result.get("data", {})
                            items = access_request.get("items", [])
                            if items and len(items) > 0:
                                item = items[0]
                                resolved_identity = item.get("resolvedIdentity")
                                invitee_emails = item.get("inviteeEmails")
                                
                                if (invitee_emails and len(invitee_emails) == 2 and
                                    "analyst1@youragency.com" in invitee_emails and
                                    resolved_identity and "analyst1@youragency.com" in resolved_identity):
                                    self.log_result("Access request with INDIVIDUAL_USERS inviteeEmails", True, f"InviteeEmails: {invitee_emails}")
                                else:
                                    self.log_result("Access request with INDIVIDUAL_USERS inviteeEmails", False, f"inviteeEmails: {invitee_emails}, resolvedIdentity: {resolved_identity}")
                            else:
                                self.log_result("Access request with INDIVIDUAL_USERS inviteeEmails", False, "No items in access request")
                        else:
                            self.log_result("Access request with INDIVIDUAL_USERS inviteeEmails", False, "Failed to create INDIVIDUAL_USERS access request")
                        
                else:
                    self.log_result("Get agency platform for access request test", False, "Failed to get agency platform")
            except Exception as e:
                self.log_result("Access request identity generation tests", False, str(e))

    def test_onboarding_client_provided_target(self):
        """Test 4: Onboarding with clientProvidedTarget"""
        print("\n🧪 Testing Onboarding with clientProvidedTarget...")
        
        if not self.onboarding_token:
            self.log_result("Onboarding tests", False, "No onboarding token available")
            return
            
        # Test GET /api/onboarding/:token - Verify resolvedIdentity is included
        try:
            result = self.make_request("GET", f"onboarding/{self.onboarding_token}")
            if result and result.get("success"):
                onboarding_data = result.get("data", {})
                items = onboarding_data.get("items", [])
                
                if items and len(items) > 0:
                    item = items[0]
                    resolved_identity = item.get("resolvedIdentity")
                    
                    if resolved_identity and "acme-corporation" in resolved_identity.lower():
                        self.log_result("GET /api/onboarding/:token - resolvedIdentity included", True, f"Resolved identity: {resolved_identity}")
                    else:
                        self.log_result("GET /api/onboarding/:token - resolvedIdentity included", False, f"Missing or invalid resolvedIdentity: {resolved_identity}")
                else:
                    self.log_result("GET /api/onboarding/:token - resolvedIdentity included", False, "No items in onboarding data")
            else:
                self.log_result("GET /api/onboarding/:token - resolvedIdentity included", False, "Failed to get onboarding data")
        except Exception as e:
            self.log_result("GET /api/onboarding/:token - resolvedIdentity included", False, str(e))

        # Test POST /api/onboarding/:token/items/:itemId/attest with clientProvidedTarget
        if self.onboarding_token:
            try:
                # First get the onboarding data to get item ID
                result = self.make_request("GET", f"onboarding/{self.onboarding_token}")
                if result and result.get("success"):
                    onboarding_data = result.get("data", {})
                    items = onboarding_data.get("items", [])
                    
                    if items and len(items) > 0:
                        item_id = items[0].get("id")
                        
                        # Test with clientProvidedTarget object
                        attestation_data = {
                            "attestationText": "I have granted access to the specified GA4 property",
                            "clientProvidedTarget": {
                                "propertyId": "properties/123456789",
                                "propertyName": "Acme Corp Website",
                                "assetType": "GA4 Property"
                            }
                        }
                        
                        result = self.make_request("POST", f"onboarding/{self.onboarding_token}/items/{item_id}/attest", attestation_data)
                        if result and result.get("success"):
                            updated_request = result.get("data", {})
                            updated_items = updated_request.get("items", [])
                            
                            if updated_items and len(updated_items) > 0:
                                updated_item = updated_items[0]
                                client_provided_target = updated_item.get("clientProvidedTarget")
                                validation_result = updated_item.get("validationResult", {})
                                
                                if (client_provided_target and 
                                    client_provided_target.get("propertyId") == "properties/123456789" and
                                    validation_result.get("clientProvidedTarget")):
                                    self.log_result("POST attestation with clientProvidedTarget", True, f"clientProvidedTarget: {client_provided_target}")
                                else:
                                    self.log_result("POST attestation with clientProvidedTarget", False, f"clientProvidedTarget not stored correctly: {client_provided_target}")
                            else:
                                self.log_result("POST attestation with clientProvidedTarget", False, "No updated items returned")
                        else:
                            self.log_result("POST attestation with clientProvidedTarget", False, "Failed to attest with clientProvidedTarget")
                    else:
                        self.log_result("POST attestation with clientProvidedTarget", False, "No items found for attestation")
                else:
                    self.log_result("POST attestation with clientProvidedTarget", False, "Failed to get onboarding data for attestation")
            except Exception as e:
                self.log_result("POST attestation with clientProvidedTarget", False, str(e))

        # Test backward compatibility with assetType/assetId
        if self.onboarding_token:
            try:
                # Create another access request to test backward compatibility
                if self.client_id and self.agency_platform_id:
                    # Get agency platform items again
                    result = self.make_request("GET", f"agency/platforms/{self.agency_platform_id}")
                    if result and result.get("success"):
                        agency_platform = result.get("data", {})
                        access_items = agency_platform.get("accessItems", [])
                        
                        if access_items:
                            item = access_items[0]  # Use first item
                            
                            # Create another access request
                            access_request_data = {
                                "clientId": self.client_id,
                                "items": [{
                                    "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",
                                    "accessPattern": item.get("accessPattern"),
                                    "role": item.get("role"),
                                    "identityPurpose": item.get("identityPurpose"),
                                    "humanIdentityStrategy": item.get("humanIdentityStrategy"),
                                    "namingTemplate": item.get("namingTemplate"),
                                    "validationMethod": item.get("validationMethod")
                                }]
                            }
                            
                            result = self.make_request("POST", "access-requests", access_request_data)
                            if result and result.get("success"):
                                access_request = result.get("data", {})
                                backward_compat_token = access_request.get("token")
                                items = access_request.get("items", [])
                                
                                if items and backward_compat_token:
                                    item_id = items[0].get("id")
                                    
                                    # Test backward compatibility with assetType/assetId
                                    attestation_data = {
                                        "attestationText": "I have granted access to the GA4 account",
                                        "assetType": "GA4 Property", 
                                        "assetId": "987654321"
                                    }
                                    
                                    result = self.make_request("POST", f"onboarding/{backward_compat_token}/items/{item_id}/attest", attestation_data)
                                    if result and result.get("success"):
                                        updated_request = result.get("data", {})
                                        updated_items = updated_request.get("items", [])
                                        
                                        if updated_items:
                                            updated_item = updated_items[0]
                                            # Should create clientProvidedTarget from assetType/assetId
                                            client_provided_target = updated_item.get("clientProvidedTarget")
                                            
                                            if (client_provided_target and
                                                client_provided_target.get("assetType") == "GA4 Property" and
                                                client_provided_target.get("assetId") == "987654321"):
                                                self.log_result("Backward compatibility assetType/assetId", True, "assetType/assetId converted to clientProvidedTarget")
                                            else:
                                                self.log_result("Backward compatibility assetType/assetId", False, f"clientProvidedTarget not created from assetType/assetId: {client_provided_target}")
                                        else:
                                            self.log_result("Backward compatibility assetType/assetId", False, "No items in backward compat response")
                                    else:
                                        self.log_result("Backward compatibility assetType/assetId", False, "Failed to attest with assetType/assetId")
                                else:
                                    self.log_result("Backward compatibility assetType/assetId", False, "Failed to create backward compat access request")
                            else:
                                self.log_result("Backward compatibility assetType/assetId", False, "Failed to create backward compat access request")
                        else:
                            self.log_result("Backward compatibility assetType/assetId", False, "No access items for backward compat test")
                    else:
                        self.log_result("Backward compatibility assetType/assetId", False, "Failed to get agency platform for backward compat")
            except Exception as e:
                self.log_result("Backward compatibility assetType/assetId", False, str(e))

    def test_end_to_end_flow(self):
        """Test 5: Complete End-to-End Identity Taxonomy Flow"""
        print("\n🧪 Testing End-to-End Identity Taxonomy Flow...")
        
        try:
            # Step 1: Create client "TechCorp Solutions"
            client_data = {"name": "TechCorp Solutions", "email": "admin@techcorp.com"}
            result = self.make_request("POST", "clients", client_data)
            if not (result and result.get("success")):
                self.log_result("E2E Flow - Create client", False, "Failed to create client")
                return
            
            e2e_client_id = result.get("data", {}).get("id")
            self.log_result("E2E Flow - Create client", True, "TechCorp Solutions created")

            # Step 2: Create agency platform with Google Analytics
            platform_data = {"platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000"}  # Google Analytics / GA4
            result = self.make_request("POST", "agency/platforms", platform_data)
            if not (result and result.get("success")):
                self.log_result("E2E Flow - Create agency platform", False, "Failed to create agency platform")
                return
                
            e2e_agency_platform_id = result.get("data", {}).get("id")
            self.log_result("E2E Flow - Create agency platform", True, "Google Analytics agency platform created")

            # Step 3: Add access item with CLIENT_DEDICATED strategy and naming template
            item_data = {
                "itemType": "NAMED_INVITE",
                "accessPattern": "Admin Access",
                "label": "GA4 Admin Access",
                "role": "Administrator",
                "identityPurpose": "HUMAN_INTERACTIVE", 
                "humanIdentityStrategy": "CLIENT_DEDICATED",
                "namingTemplate": "{clientSlug}-ga4@youragency.com",
                "validationMethod": "ATTESTATION"
            }
            
            result = self.make_request("POST", f"agency/platforms/{e2e_agency_platform_id}/items", item_data)
            if not (result and result.get("success")):
                self.log_result("E2E Flow - Add access item", False, "Failed to add access item")
                return
                
            self.log_result("E2E Flow - Add access item", True, "Access item with CLIENT_DEDICATED strategy added")

            # Step 4: Create access request
            access_request_data = {
                "clientId": e2e_client_id,
                "items": [{
                    "platformId": "0f75633f-0f75-40f7-80f7-0f75633f0000",  # Google Analytics / GA4
                    "accessPattern": "Admin Access",
                    "role": "Administrator",
                    "identityPurpose": "HUMAN_INTERACTIVE",
                    "humanIdentityStrategy": "CLIENT_DEDICATED",
                    "namingTemplate": "{clientSlug}-ga4@youragency.com",
                    "validationMethod": "ATTESTATION"
                }]
            }
            
            result = self.make_request("POST", "access-requests", access_request_data)
            if not (result and result.get("success")):
                self.log_result("E2E Flow - Create access request", False, "Failed to create access request")
                return
                
            access_request = result.get("data", {})
            e2e_token = access_request.get("token")
            items = access_request.get("items", [])
            
            if items and e2e_token:
                resolved_identity = items[0].get("resolvedIdentity")
                if resolved_identity == "techcorp-solutions-ga4@youragency.com":
                    self.log_result("E2E Flow - Access request with resolvedIdentity", True, f"Generated identity: {resolved_identity}")
                else:
                    self.log_result("E2E Flow - Access request with resolvedIdentity", False, f"Expected techcorp-solutions-ga4@youragency.com, got: {resolved_identity}")
            else:
                self.log_result("E2E Flow - Create access request", False, "No items or token in response")
                return

            # Step 5: Verify onboarding shows resolvedIdentity
            result = self.make_request("GET", f"onboarding/{e2e_token}")
            if result and result.get("success"):
                onboarding_data = result.get("data", {})
                items = onboarding_data.get("items", [])
                
                if items and items[0].get("resolvedIdentity") == "techcorp-solutions-ga4@youragency.com":
                    self.log_result("E2E Flow - Onboarding resolvedIdentity", True, "resolvedIdentity correctly shown in onboarding")
                else:
                    self.log_result("E2E Flow - Onboarding resolvedIdentity", False, f"Incorrect resolvedIdentity in onboarding: {items[0].get('resolvedIdentity') if items else 'No items'}")
            else:
                self.log_result("E2E Flow - Onboarding resolvedIdentity", False, "Failed to get onboarding data")
                return

            # Step 6: Complete attestation with clientProvidedTarget
            if items:
                item_id = items[0].get("id")
                attestation_data = {
                    "attestationText": "I have granted access to TechCorp's GA4 property",
                    "clientProvidedTarget": {
                        "propertyId": "properties/123456789",
                        "propertyName": "TechCorp Website Analytics",
                        "accountId": "12345678"
                    }
                }
                
                result = self.make_request("POST", f"onboarding/{e2e_token}/items/{item_id}/attest", attestation_data)
                if result and result.get("success"):
                    updated_request = result.get("data", {})
                    updated_items = updated_request.get("items", [])
                    
                    if updated_items:
                        updated_item = updated_items[0]
                        client_provided_target = updated_item.get("clientProvidedTarget")
                        status = updated_item.get("status")
                        
                        if (status == "validated" and
                            client_provided_target and 
                            client_provided_target.get("propertyId") == "properties/123456789"):
                            self.log_result("E2E Flow - Complete attestation", True, "Attestation completed with clientProvidedTarget")
                        else:
                            self.log_result("E2E Flow - Complete attestation", False, f"Status: {status}, clientProvidedTarget: {client_provided_target}")
                    else:
                        self.log_result("E2E Flow - Complete attestation", False, "No updated items returned")
                else:
                    self.log_result("E2E Flow - Complete attestation", False, "Failed to complete attestation")

            # Step 7: Verify complete data flow
            result = self.make_request("GET", f"access-requests/{access_request.get('id')}")
            if result and result.get("success"):
                final_request = result.get("data", {})
                final_items = final_request.get("items", [])
                
                if final_items:
                    final_item = final_items[0]
                    
                    # Check all fields are preserved
                    checks = [
                        (final_item.get("resolvedIdentity") == "techcorp-solutions-ga4@youragency.com", "resolvedIdentity"),
                        (final_item.get("status") == "validated", "status"),
                        (final_item.get("clientProvidedTarget", {}).get("propertyId") == "properties/123456789", "clientProvidedTarget"),
                        (final_item.get("humanIdentityStrategy") == "CLIENT_DEDICATED", "humanIdentityStrategy"),
                        (final_item.get("identityPurpose") == "HUMAN_INTERACTIVE", "identityPurpose")
                    ]
                    
                    passed_checks = [check[1] for check in checks if check[0]]
                    
                    if len(passed_checks) == len(checks):
                        self.log_result("E2E Flow - Verify complete data flow", True, "All identity taxonomy data preserved")
                    else:
                        failed_checks = [check[1] for check in checks if not check[0]]
                        self.log_result("E2E Flow - Verify complete data flow", False, f"Failed checks: {failed_checks}")
                else:
                    self.log_result("E2E Flow - Verify complete data flow", False, "No items in final request")
            else:
                self.log_result("E2E Flow - Verify complete data flow", False, "Failed to get final request data")
                
        except Exception as e:
            self.log_result("E2E Flow - Complete test", False, str(e))

    def run_all_tests(self):
        """Run all Identity Taxonomy tests"""
        print("🚀 Starting Identity Taxonomy Backend API Testing...")
        print("=" * 80)
        
        start_time = time.time()
        
        self.test_integration_identities_crud()
        self.test_access_items_identity_taxonomy()  
        self.test_access_request_identity_generation()
        self.test_onboarding_client_provided_target()
        self.test_end_to_end_flow()
        
        end_time = time.time()
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 IDENTITY TAXONOMY TESTING SUMMARY")
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
    tester = IdentityTaxonomyTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)