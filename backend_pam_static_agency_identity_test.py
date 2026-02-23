#!/usr/bin/env python3
"""
Backend testing for PAM Static Agency Identity Implementation
Testing according to review_request requirements:

1. Agency Identities API (GET /api/agency-identities)
2. Integration Identities API Updates 
3. STRICT PAM Server Validation
4. End-to-End Flow Test

This tests the new PAM Static Agency Identity implementation with strict server validation.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional, List
import uuid

# Base URL from environment
BASE_URL = "https://agent-onboarding-hub.preview.emergentagent.com"

class PAMStaticAgencyIdentityTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_platform_id = None
        self.test_client_id = None
        self.test_integration_identity_id = None
        self.test_agency_identity_id = None
        self.test_agency_platform_id = None
        
    def log(self, message: str):
        """Log test progress"""
        print(f"🔍 {message}")
        
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
            import traceback
            traceback.print_exc()
            return False

    def setup_test_data(self) -> bool:
        """Set up required test data"""
        try:
            # 1. Get a platform that supports SHARED_ACCOUNT (required for PAM validation tests)
            platforms_response = self.session.get(f"{self.base_url}/api/platforms?clientFacing=true")
            if platforms_response.status_code != 200:
                print("Failed to get platforms")
                return False
                
            platforms = platforms_response.json().get('data', [])
            # Find a platform that supports SHARED_ACCOUNT (required for PAM validation tests)
            pam_platform = None
            for platform in platforms:
                supported_types = platform.get('supportedItemTypes', [])
                if 'SHARED_ACCOUNT' in supported_types:
                    pam_platform = platform
                    break
                    
            if not pam_platform:
                # Fallback: look for Google Analytics / GA4 specifically
                for platform in platforms:
                    if 'google analytics' in platform.get('name', '').lower() or 'ga4' in platform.get('name', '').lower():
                        pam_platform = platform
                        break
                        
            if not pam_platform:
                print("No platform supporting SHARED_ACCOUNT found for testing")
                return False
                
            self.test_platform_id = pam_platform['id']
            self.log(f"Using PAM-capable platform: {pam_platform['name']} ({pam_platform['id']})")
            self.log(f"Platform supports: {pam_platform.get('supportedItemTypes', [])}")
                
            # 2. Create test client
            client_data = {
                "name": "Test PAM Corporation",
                "email": "test-pam@example.com"
            }
            
            client_response = self.session.post(f"{self.base_url}/api/clients", json=client_data)
            if client_response.status_code == 200:
                self.test_client_id = client_response.json().get('data', {}).get('id')
                self.log(f"Created test client: {self.test_client_id}")
            else:
                print(f"Failed to create test client: {client_response.text}")
                return False
                
            return True
            
        except Exception as e:
            print(f"Setup failed: {e}")
            return False

    # ═══════════════════════════════════════════════════════════════════════════════
    # 1. AGENCY IDENTITIES API TESTS
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def test_agency_identities_api_basic(self) -> bool:
        """Test GET /api/agency-identities returns SHARED_CREDENTIAL and SERVICE_ACCOUNT types"""
        response = self.session.get(f"{self.base_url}/api/agency-identities")
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"Response not successful: {data}")
            return False
            
        identities = data.get('data', [])
        self.log(f"Found {len(identities)} agency identities")
        
        # Verify structure and types
        for identity in identities:
            if identity.get('type') not in ['SHARED_CREDENTIAL', 'SERVICE_ACCOUNT']:
                print(f"Invalid identity type: {identity.get('type')}")
                return False
                
            # Verify required fields
            required_fields = ['id', 'name', 'type', 'identifier']
            for field in required_fields:
                if field not in identity:
                    print(f"Missing required field '{field}' in identity: {identity}")
                    return False
                    
        return True

    def test_agency_identities_api_platform_filtering(self) -> bool:
        """Test GET /api/agency-identities with platformId filter"""
        # Test with valid platformId
        response = self.session.get(f"{self.base_url}/api/agency-identities?platformId={self.test_platform_id}")
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"Response not successful: {data}")
            return False
            
        identities = data.get('data', [])
        self.log(f"Found {len(identities)} platform-specific agency identities")
        
        # Verify platform relationship
        for identity in identities:
            platform_id = identity.get('platformId')
            if platform_id and platform_id != self.test_platform_id:
                print(f"Identity has wrong platformId: expected {self.test_platform_id}, got {platform_id}")
                return False
                
        return True

    def test_agency_identities_api_active_filtering(self) -> bool:
        """Test GET /api/agency-identities with isActive filter"""
        # Test active identities (default)
        response = self.session.get(f"{self.base_url}/api/agency-identities")
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        active_identities = data.get('data', [])
        
        # Test including inactive identities
        response = self.session.get(f"{self.base_url}/api/agency-identities?isActive=false")
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        inactive_identities = data.get('data', [])
        
        self.log(f"Active identities: {len(active_identities)}, Inactive identities: {len(inactive_identities)}")
        
        # Verify isActive filtering works
        for identity in active_identities:
            if not identity.get('isActive', True):
                print(f"Active filter returned inactive identity: {identity}")
                return False
                
        return True

    # ═══════════════════════════════════════════════════════════════════════════════
    # 2. INTEGRATION IDENTITIES API UPDATES
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def test_integration_identities_with_platform_id(self) -> bool:
        """Test POST /api/integration-identities with platformId field"""
        identity_data = {
            "name": "Test GA4 Service Account",
            "type": "SERVICE_ACCOUNT", 
            "identifier": "test-ga4-service@agency.com",
            "description": "Test service account for GA4",
            "platformId": self.test_platform_id,
            "metadata": {
                "scopes": ["analytics.readonly"],
                "rotationPolicy": "90days"
            }
        }
        
        response = self.session.post(f"{self.base_url}/api/integration-identities", json=identity_data)
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"Response not successful: {data}")
            return False
            
        created_identity = data.get('data', {})
        self.test_integration_identity_id = created_identity.get('id')
        
        # Verify platformId is set correctly
        if created_identity.get('platformId') != self.test_platform_id:
            print(f"platformId mismatch: expected {self.test_platform_id}, got {created_identity.get('platformId')}")
            return False
            
        self.log(f"Created integration identity with platformId: {self.test_integration_identity_id}")
        return True

    def test_integration_identities_platform_filtering(self) -> bool:
        """Test filtering by platformId in GET /api/integration-identities"""
        # Test with platformId filter
        response = self.session.get(f"{self.base_url}/api/integration-identities?platformId={self.test_platform_id}")
        
        if response.status_code != 200:
            print(f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"Response not successful: {data}")
            return False
            
        identities = data.get('data', [])
        self.log(f"Found {len(identities)} integration identities for platform {self.test_platform_id}")
        
        # Verify all returned identities have the correct platformId or null (global)
        for identity in identities:
            platform_id = identity.get('platformId')
            if platform_id is not None and platform_id != self.test_platform_id:
                print(f"Wrong platformId in results: expected {self.test_platform_id}, got {platform_id}")
                return False
                
        return True

    def test_integration_identities_invalid_platform_id(self) -> bool:
        """Test POST /api/integration-identities rejects invalid platformId"""
        identity_data = {
            "name": "Test Invalid Platform Identity",
            "type": "SERVICE_ACCOUNT",
            "identifier": "test-invalid@agency.com", 
            "platformId": "invalid-platform-id-12345"
        }
        
        response = self.session.post(f"{self.base_url}/api/integration-identities", json=identity_data)
        
        # Should reject with 400 error
        if response.status_code != 400:
            print(f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if data.get('success'):
            print(f"Request should have failed but succeeded: {data}")
            return False
            
        self.log("Correctly rejected invalid platformId")
        return True

    # ═══════════════════════════════════════════════════════════════════════════════
    # 3. STRICT PAM SERVER VALIDATION
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def setup_agency_platform(self) -> bool:
        """Set up agency platform for PAM validation tests"""
        try:
            # Create agency platform
            agency_platform_data = {"platformId": self.test_platform_id}
            response = self.session.post(f"{self.base_url}/api/agency/platforms", json=agency_platform_data)
            
            if response.status_code != 200:
                print(f"Failed to create agency platform: {response.text}")
                return False
                
            data = response.json()
            if not data.get('success'):
                print(f"Agency platform creation not successful: {data}")
                return False
                
            self.test_agency_platform_id = data.get('data', {}).get('id')
            self.log(f"Created agency platform: {self.test_agency_platform_id}")
            return True
            
        except Exception as e:
            print(f"Failed to setup agency platform: {e}")
            return False

    def test_pam_validation_rule_a_client_owned(self) -> bool:
        """Test RULE A - CLIENT_OWNED: Should reject identity generation fields"""
        if not self.test_agency_platform_id:
            if not self.setup_agency_platform():
                return False
        
        # Test 1: CLIENT_OWNED with forbidden identityPurpose field - should be REJECTED
        item_data_forbidden = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test CLIENT_OWNED PAM Access",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "CLIENT_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE"  # FORBIDDEN for CLIENT_OWNED
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_forbidden
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection), got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if data.get('success'):
            print(f"Should have been rejected but succeeded: {data}")
            return False
            
        error_message = data.get('error', '').lower()
        if 'client_owned' not in error_message or 'identity' not in error_message:
            print(f"Error message doesn't match expected CLIENT_OWNED rejection: {data.get('error')}")
            return False
            
        self.log("✅ RULE A: CLIENT_OWNED correctly rejected identity generation fields")
        
        # Test 2: CLIENT_OWNED with pamNamingTemplate - should be REJECTED  
        item_data_forbidden2 = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test CLIENT_OWNED PAM Access",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "CLIENT_OWNED",
                "pamNamingTemplate": "{clientSlug}-test@agency.com"  # FORBIDDEN for CLIENT_OWNED
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_forbidden2
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection) for naming template, got {response.status_code}: {response.text}")
            return False
            
        # Test 3: Clean CLIENT_OWNED payload (only pamOwnership) - should be ACCEPTED
        item_data_clean = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Clean CLIENT_OWNED PAM Access",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "CLIENT_OWNED"  # Only allowed field
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_clean
        )
        
        if response.status_code != 200:
            print(f"Clean CLIENT_OWNED should be accepted, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"Clean CLIENT_OWNED creation not successful: {data}")
            return False
            
        self.log("✅ RULE A: Clean CLIENT_OWNED payload correctly accepted")
        return True

    def test_pam_validation_rule_b1_integration_non_human(self) -> bool:
        """Test RULE B1 - INTEGRATION_NON_HUMAN: Requires integrationIdentityId"""
        if not self.test_agency_platform_id:
            if not self.setup_agency_platform():
                return False
        
        # Test 1: INTEGRATION_NON_HUMAN without integrationIdentityId - should be REJECTED
        item_data_no_identity = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Integration Non-Human Access",
            "role": "administrator", 
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "INTEGRATION_NON_HUMAN"
                # Missing integrationIdentityId - should be rejected
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_no_identity
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection), got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if data.get('success'):
            print(f"Should have been rejected but succeeded: {data}")
            return False
            
        error_message = data.get('error', '').lower()
        if 'integration' not in error_message or 'identity' not in error_message:
            print(f"Error message doesn't match expected INTEGRATION_NON_HUMAN rejection: {data.get('error')}")
            return False
            
        self.log("✅ RULE B1: INTEGRATION_NON_HUMAN correctly rejected without integrationIdentityId")
        
        # Test 2: INTEGRATION_NON_HUMAN with integrationIdentityId - should be ACCEPTED
        if not self.test_integration_identity_id:
            self.log("Skipping integration identity test - no test identity available")
            return True
            
        item_data_with_identity = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Integration Non-Human Access",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "INTEGRATION_NON_HUMAN",
                "integrationIdentityId": self.test_integration_identity_id,
                "pamConfirmation": True
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_with_identity
        )
        
        if response.status_code != 200:
            print(f"INTEGRATION_NON_HUMAN with identity should be accepted, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"INTEGRATION_NON_HUMAN creation not successful: {data}")
            return False
            
        self.log("✅ RULE B1: INTEGRATION_NON_HUMAN correctly accepted with integrationIdentityId")
        return True

    def test_pam_validation_rule_b2a_static_agency_identity(self) -> bool:
        """Test RULE B2a - STATIC_AGENCY_IDENTITY: Requires agencyIdentityId, forbids naming template"""
        if not self.test_agency_platform_id:
            if not self.setup_agency_platform():
                return False
        
        # Test 1: STATIC_AGENCY_IDENTITY without agencyIdentityId - should be REJECTED
        item_data_no_identity = {
            "itemType": "SHARED_ACCOUNT", 
            "label": "Test Static Agency Identity Access",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "pamIdentityStrategy": "STATIC_AGENCY_IDENTITY"
                # Missing agencyIdentityId - should be rejected
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_no_identity
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection), got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        error_message = data.get('error', '').lower()
        if 'static' not in error_message or 'identity' not in error_message:
            print(f"Error message doesn't match expected STATIC_AGENCY_IDENTITY rejection: {data.get('error')}")
            return False
            
        self.log("✅ RULE B2a: STATIC_AGENCY_IDENTITY correctly rejected without agencyIdentityId")
        
        # Create a test agency identity for the second test
        agency_identity_data = {
            "name": "Test Shared GA4 Account",
            "type": "SHARED_CREDENTIAL",
            "identifier": "shared-ga4@agency.com",
            "description": "Shared GA4 account for client access",
            "platformId": self.test_platform_id
        }
        
        identity_response = self.session.post(f"{self.base_url}/api/integration-identities", json=agency_identity_data)
        if identity_response.status_code == 200:
            self.test_agency_identity_id = identity_response.json().get('data', {}).get('id')
            
        if not self.test_agency_identity_id:
            self.log("Skipping agency identity test - could not create test identity")
            return True
            
        # Test 2: STATIC_AGENCY_IDENTITY with agencyIdentityId - should be ACCEPTED
        item_data_with_identity = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Static Agency Identity Access", 
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE", 
                "pamIdentityStrategy": "STATIC_AGENCY_IDENTITY",
                "agencyIdentityId": self.test_agency_identity_id,
                "pamConfirmation": True
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_with_identity
        )
        
        if response.status_code != 200:
            print(f"STATIC_AGENCY_IDENTITY with identity should be accepted, got {response.status_code}: {response.text}")
            return False
            
        # Test 3: STATIC_AGENCY_IDENTITY with forbidden pamNamingTemplate - should be REJECTED
        item_data_with_template = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Static Agency Identity with Template",
            "role": "administrator", 
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "pamIdentityStrategy": "STATIC_AGENCY_IDENTITY",
                "agencyIdentityId": self.test_agency_identity_id,
                "pamNamingTemplate": "{clientSlug}-test@agency.com"  # FORBIDDEN for STATIC
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_with_template
        )
        
        if response.status_code != 400:
            print(f"STATIC_AGENCY_IDENTITY with naming template should be rejected, got {response.status_code}: {response.text}")
            return False
            
        self.log("✅ RULE B2a: STATIC_AGENCY_IDENTITY correctly accepted with identity and rejected naming template")
        return True

    def test_pam_validation_rule_b2b_client_dedicated_identity(self) -> bool:
        """Test RULE B2b - CLIENT_DEDICATED_IDENTITY: Complex validation rules"""
        if not self.test_agency_platform_id:
            if not self.setup_agency_platform():
                return False
        
        # Test 1: CLIENT_DEDICATED_IDENTITY without pamIdentityType - should be REJECTED
        item_data_no_type = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Client Dedicated Identity",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE", 
                "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY",
                "pamNamingTemplate": "{clientSlug}-ga4@agency.com"
                # Missing pamIdentityType - should be rejected
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_no_type
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection), got {response.status_code}: {response.text}")
            return False
            
        # Test 2: CLIENT_DEDICATED_IDENTITY without pamNamingTemplate - should be REJECTED  
        item_data_no_template = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Client Dedicated Identity", 
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY", 
                "pamIdentityType": "MAILBOX"
                # Missing pamNamingTemplate - should be rejected
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_no_template
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection) for missing template, got {response.status_code}: {response.text}")
            return False
            
        # Test 3: GROUP type with checkout duration - should be REJECTED
        item_data_group_checkout = {
            "itemType": "SHARED_ACCOUNT", 
            "label": "Test Client Dedicated Group",
            "role": "administrator",
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY",
                "pamIdentityType": "GROUP",
                "pamNamingTemplate": "{clientSlug}-group@agency.com",
                "pamCheckoutDurationMinutes": 60  # FORBIDDEN for GROUP type
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items",
            json=item_data_group_checkout
        )
        
        if response.status_code != 400:
            print(f"Expected 400 (rejection) for GROUP with checkout, got {response.status_code}: {response.text}")
            return False
            
        # Test 4: MAILBOX type with checkout duration - should be ACCEPTED
        item_data_mailbox_checkout = {
            "itemType": "SHARED_ACCOUNT",
            "label": "Test Client Dedicated Mailbox",
            "role": "administrator", 
            "agencyConfigJson": {
                "pamOwnership": "AGENCY_OWNED",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "pamIdentityStrategy": "CLIENT_DEDICATED_IDENTITY",
                "pamIdentityType": "MAILBOX",
                "pamNamingTemplate": "{clientSlug}-mailbox@agency.com",
                "pamCheckoutDurationMinutes": 120,  # ALLOWED for MAILBOX type
                "pamConfirmation": True
            }
        }
        
        response = self.session.post(
            f"{self.base_url}/api/agency/platforms/{self.test_agency_platform_id}/items", 
            json=item_data_mailbox_checkout
        )
        
        if response.status_code != 200:
            print(f"MAILBOX with checkout should be accepted, got {response.status_code}: {response.text}")
            return False
            
        data = response.json()
        if not data.get('success'):
            print(f"MAILBOX creation not successful: {data}")
            return False
            
        self.log("✅ RULE B2b: CLIENT_DEDICATED_IDENTITY validation working correctly")
        return True

    # ═══════════════════════════════════════════════════════════════════════════════
    # 4. END-TO-END FLOW TEST 
    # ═══════════════════════════════════════════════════════════════════════════════
    
    def test_end_to_end_static_agency_identity_flow(self) -> bool:
        """Test complete end-to-end flow with STATIC_AGENCY_IDENTITY"""
        try:
            # Step 1: Create agency identity (SHARED_CREDENTIAL type)
            agency_identity_data = {
                "name": "E2E Shared GA4 Account", 
                "type": "SHARED_CREDENTIAL",
                "identifier": "e2e-shared-ga4@agency.com",
                "description": "End-to-end test shared GA4 account",
                "platformId": self.test_platform_id
            }
            
            identity_response = self.session.post(f"{self.base_url}/api/integration-identities", json=agency_identity_data)
            if identity_response.status_code != 200:
                print(f"Failed to create agency identity: {identity_response.text}")
                return False
                
            agency_identity_id = identity_response.json().get('data', {}).get('id')
            self.log(f"Step 1: Created agency identity {agency_identity_id}")
            
            # Step 2: Add agency platform (find a platform that supports SHARED_ACCOUNT)
            platforms_response = self.session.get(f"{self.base_url}/api/platforms?clientFacing=true")
            if platforms_response.status_code != 200:
                print("Failed to get platforms for e2e test")
                return False
                
            platforms = platforms_response.json().get('data', [])
            suitable_platform = None
            
            # Look for a platform that likely supports SHARED_ACCOUNT (GA4, Google Ads, etc.)
            for platform in platforms:
                supported_types = platform.get('supportedItemTypes', [])
                if 'SHARED_ACCOUNT' in supported_types:
                    suitable_platform = platform
                    break
                    
            if not suitable_platform:
                # Fallback: look for Google Analytics / GA4 specifically  
                for platform in platforms:
                    if 'google analytics' in platform.get('name', '').lower() or 'ga4' in platform.get('name', '').lower():
                        suitable_platform = platform
                        break
                    
            if not suitable_platform:
                suitable_platform = platforms[0] if platforms else None
                
            if not suitable_platform:
                print("No suitable platform found for e2e test")
                return False
                
            # Create agency platform if not exists
            agency_platform_data = {"platformId": suitable_platform['id']}
            ap_response = self.session.post(f"{self.base_url}/api/agency/platforms", json=agency_platform_data)
            
            if ap_response.status_code == 200:
                agency_platform_id = ap_response.json().get('data', {}).get('id')
            else:
                # Might already exist, try to get existing one
                ap_list_response = self.session.get(f"{self.base_url}/api/agency/platforms")
                if ap_list_response.status_code == 200:
                    existing_platforms = ap_list_response.json().get('data', [])
                    agency_platform_id = None
                    for ap in existing_platforms:
                        if ap.get('platformId') == suitable_platform['id']:
                            agency_platform_id = ap['id']
                            break
                    if not agency_platform_id:
                        print("Could not create or find agency platform")
                        return False
                else:
                    print(f"Failed to create agency platform: {ap_response.text}")
                    return False
                    
            self.log(f"Step 2: Using agency platform {agency_platform_id}")
            
            # Step 3: Create access item using STATIC_AGENCY_IDENTITY strategy
            access_item_data = {
                "itemType": "SHARED_ACCOUNT",
                "label": "E2E Static Agency Identity Access",
                "role": "administrator",
                "agencyConfigJson": {
                    "pamOwnership": "AGENCY_OWNED",
                    "identityPurpose": "HUMAN_INTERACTIVE",
                    "pamIdentityStrategy": "STATIC_AGENCY_IDENTITY", 
                    "agencyIdentityId": agency_identity_id,
                    "pamConfirmation": True
                }
            }
            
            item_response = self.session.post(
                f"{self.base_url}/api/agency/platforms/{agency_platform_id}/items",
                json=access_item_data
            )
            
            if item_response.status_code != 200:
                print(f"Failed to create access item: {item_response.text}")
                return False
                
            item_data = item_response.json().get('data', {})
            access_items = item_data.get('accessItems', [])
            if not access_items:
                print("No access items returned after creation")
                return False
                
            created_item = access_items[-1]  # Get the last (newest) item
            self.log(f"Step 3: Created access item with STATIC_AGENCY_IDENTITY strategy")
            
            # Step 4: Create access request using this configuration
            if not self.test_client_id:
                print("No test client available for e2e test")
                return False
                
            access_request_data = {
                "clientId": self.test_client_id,
                "items": [{
                    "platformId": suitable_platform['id'],
                    "itemType": "SHARED_ACCOUNT",
                    "accessPattern": "PAM",
                    "role": "administrator",
                    "pamOwnership": "AGENCY_OWNED",
                    "pamIdentityStrategy": "STATIC_AGENCY_IDENTITY",
                    "pamAgencyIdentityEmail": "e2e-shared-ga4@agency.com"
                }],
                "notes": "E2E test access request"
            }
            
            request_response = self.session.post(f"{self.base_url}/api/access-requests", json=access_request_data)
            if request_response.status_code != 200:
                print(f"Failed to create access request: {request_response.text}")
                return False
                
            request_data = request_response.json().get('data', {})
            request_id = request_data.get('id')
            token = request_data.get('token')
            
            self.log(f"Step 4: Created access request {request_id} with token {token}")
            
            # Step 5: Verify the access item is created with correct configuration
            onboarding_response = self.session.get(f"{self.base_url}/api/onboarding/{token}")
            if onboarding_response.status_code != 200:
                print(f"Failed to get onboarding data: {onboarding_response.text}")
                return False
                
            onboarding_data = onboarding_response.json().get('data', {})
            onboarding_items = onboarding_data.get('items', [])
            
            if not onboarding_items:
                print("No items in onboarding response")
                return False
                
            pam_item = onboarding_items[0]
            
            # Verify PAM configuration
            if pam_item.get('itemType') != 'SHARED_ACCOUNT':
                print(f"Wrong item type: expected SHARED_ACCOUNT, got {pam_item.get('itemType')}")
                return False
                
            if pam_item.get('pamOwnership') != 'AGENCY_OWNED':
                print(f"Wrong PAM ownership: expected AGENCY_OWNED, got {pam_item.get('pamOwnership')}")
                return False
                
            pam_config = pam_item.get('pamConfig', {})
            if pam_config.get('identityStrategy') != 'STATIC':
                print(f"Wrong identity strategy: expected STATIC, got {pam_config.get('identityStrategy')}")
                return False
                
            self.log("✅ Step 5: Access item created with correct STATIC_AGENCY_IDENTITY configuration")
            
            # Verify resolved identity matches agency identity
            resolved_identity = pam_item.get('resolvedIdentity')
            if resolved_identity != "e2e-shared-ga4@agency.com":
                print(f"Wrong resolved identity: expected e2e-shared-ga4@agency.com, got {resolved_identity}")
                return False
                
            self.log(f"✅ E2E Flow Complete: Static agency identity correctly resolved to {resolved_identity}")
            return True
            
        except Exception as e:
            print(f"E2E test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all PAM Static Agency Identity tests"""
        print("🚀 Starting PAM Static Agency Identity Backend Tests")
        print("=" * 80)
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Failed to setup test data")
            return {}
        
        tests = [
            # 1. Agency Identities API Tests
            ("Agency Identities API - Basic Functionality", self.test_agency_identities_api_basic),
            ("Agency Identities API - Platform Filtering", self.test_agency_identities_api_platform_filtering),
            ("Agency Identities API - Active Status Filtering", self.test_agency_identities_api_active_filtering),
            
            # 2. Integration Identities API Updates  
            ("Integration Identities - POST with platformId", self.test_integration_identities_with_platform_id),
            ("Integration Identities - GET Platform Filtering", self.test_integration_identities_platform_filtering),
            ("Integration Identities - Invalid platformId Rejection", self.test_integration_identities_invalid_platform_id),
            
            # 3. STRICT PAM Server Validation
            ("PAM Validation - RULE A: CLIENT_OWNED", self.test_pam_validation_rule_a_client_owned),
            ("PAM Validation - RULE B1: INTEGRATION_NON_HUMAN", self.test_pam_validation_rule_b1_integration_non_human),
            ("PAM Validation - RULE B2a: STATIC_AGENCY_IDENTITY", self.test_pam_validation_rule_b2a_static_agency_identity),
            ("PAM Validation - RULE B2b: CLIENT_DEDICATED_IDENTITY", self.test_pam_validation_rule_b2b_client_dedicated_identity),
            
            # 4. End-to-End Flow
            ("End-to-End Static Agency Identity Flow", self.test_end_to_end_static_agency_identity_flow),
        ]
        
        results = {}
        passed = 0
        
        for test_name, test_func in tests:
            success = self.run_test(test_name, test_func)
            results[test_name] = success
            if success:
                passed += 1
        
        print("\n" + "=" * 80)
        print(f"🎯 PAM Static Agency Identity Test Results: {passed}/{len(tests)} tests passed")
        print(f"Success Rate: {(passed/len(tests)*100):.1f}%")
        
        if passed == len(tests):
            print("🎉 ALL PAM STATIC AGENCY IDENTITY TESTS PASSED!")
        else:
            print(f"⚠️  {len(tests)-passed} tests failed")
            for test_name, success in results.items():
                if not success:
                    print(f"   ❌ {test_name}")
        
        return results

if __name__ == "__main__":
    tester = PAMStaticAgencyIdentityTester(BASE_URL)
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        sys.exit(1)