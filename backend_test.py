#!/usr/bin/env python3
"""
Backend API Tests for PostgreSQL Database Migration to Neon Cloud
Marketing Identity Platform - Comprehensive PostgreSQL Integration Testing

This script tests all API endpoints to verify PostgreSQL database integration
is working correctly with the Neon cloud database.
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class PostgreSQLDatabaseMigrationTester:
    def __init__(self):
        self.base_url = "https://plugin-onboard.preview.emergentagent.com/api"
        self.session = None
        self.test_results = []
        self.created_resources = {
            'clients': [],
            'agency_platforms': [],
            'access_requests': [],
            'integration_identities': []
        }

    async def setup(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()

    async def teardown(self):
        """Close HTTP session and cleanup resources"""
        if self.session:
            await self.session.close()

    async def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make HTTP request and return response"""
        url = f"{self.base_url}/{endpoint}"
        
        try:
            if method.upper() == 'GET':
                async with self.session.get(url) as resp:
                    return {
                        'status': resp.status,
                        'data': await resp.json(),
                        'success': True
                    }
            elif method.upper() == 'POST':
                async with self.session.post(url, json=data) as resp:
                    return {
                        'status': resp.status,
                        'data': await resp.json(),
                        'success': True
                    }
            elif method.upper() == 'PUT':
                async with self.session.put(url, json=data) as resp:
                    return {
                        'status': resp.status,
                        'data': await resp.json(),
                        'success': True
                    }
            elif method.upper() == 'DELETE':
                async with self.session.delete(url) as resp:
                    return {
                        'status': resp.status,
                        'data': await resp.json() if resp.content_type == 'application/json' else {},
                        'success': True
                    }
            elif method.upper() == 'PATCH':
                async with self.session.patch(url, json=data) as resp:
                    return {
                        'status': resp.status,
                        'data': await resp.json(),
                        'success': True
                    }
        except Exception as e:
            return {
                'status': 500,
                'data': {'error': str(e)},
                'success': False
            }

    def log_result(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        self.test_results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")

    # ========================================================================
    # PLATFORM CATALOG TESTS
    # ========================================================================
    
    async def test_platform_catalog_list_all(self):
        """Test GET /api/platforms - List all catalog platforms"""
        try:
            resp = await self.make_request('GET', 'platforms')
            
            if resp['status'] != 200:
                self.log_result("Platform Catalog - List All", False, 
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            data = resp['data']['data']
            if not isinstance(data, list) or len(data) < 15:
                self.log_result("Platform Catalog - List All", False,
                              f"Expected 15+ platforms, got {len(data)}")
                return False
                
            # Verify platform structure
            if data and not all(key in data[0] for key in ['id', 'name', 'domain', 'tier']):
                self.log_result("Platform Catalog - List All", False,
                              "Platform structure missing required fields")
                return False
            
            self.log_result("Platform Catalog - List All", True,
                          f"Retrieved {len(data)} platforms successfully")
            return True
            
        except Exception as e:
            self.log_result("Platform Catalog - List All", False, f"Exception: {str(e)}")
            return False

    async def test_platform_catalog_filtering(self):
        """Test GET /api/platforms with filters"""
        try:
            # Test client-facing filter
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            if resp['status'] != 200:
                self.log_result("Platform Catalog - Client Facing Filter", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            client_facing = resp['data']['data']
            
            # Test tier filter
            resp = await self.make_request('GET', 'platforms?tier=1')
            if resp['status'] != 200:
                self.log_result("Platform Catalog - Tier Filter", False,
                              f"Expected status 200, got {resp['status']}")
                return False
                
            tier_1 = resp['data']['data']
            
            # Test tier 2 filter
            resp = await self.make_request('GET', 'platforms?tier=2')
            if resp['status'] != 200:
                self.log_result("Platform Catalog - Tier 2 Filter", False,
                              f"Expected status 200, got {resp['status']}")
                return False
                
            tier_2 = resp['data']['data']
            
            self.log_result("Platform Catalog - Filtering", True,
                          f"Client-facing: {len(client_facing)}, Tier 1: {len(tier_1)}, Tier 2: {len(tier_2)}")
            return True
            
        except Exception as e:
            self.log_result("Platform Catalog - Filtering", False, f"Exception: {str(e)}")
            return False

    async def test_platform_catalog_single(self):
        """Test GET /api/platforms/:id - Get single platform"""
        try:
            # First get all platforms to get a valid ID
            resp = await self.make_request('GET', 'platforms')
            if resp['status'] != 200 or not resp['data']['data']:
                self.log_result("Platform Catalog - Single Platform", False,
                              "Could not get platforms list for test")
                return False
            
            platform_id = resp['data']['data'][0]['id']
            
            # Test single platform retrieval
            resp = await self.make_request('GET', f'platforms/{platform_id}')
            if resp['status'] != 200:
                self.log_result("Platform Catalog - Single Platform", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            platform = resp['data']['data']
            if platform['id'] != platform_id:
                self.log_result("Platform Catalog - Single Platform", False,
                              "Returned platform ID doesn't match requested")
                return False
            
            # Test 404 for invalid ID
            resp = await self.make_request('GET', 'platforms/invalid-id')
            if resp['status'] != 404:
                self.log_result("Platform Catalog - Single Platform", False,
                              f"Expected 404 for invalid ID, got {resp['status']}")
                return False
            
            self.log_result("Platform Catalog - Single Platform", True,
                          f"Retrieved platform {platform['name']} successfully")
            return True
            
        except Exception as e:
            self.log_result("Platform Catalog - Single Platform", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # CLIENT CRUD TESTS
    # ========================================================================
    
    async def test_clients_crud(self):
        """Test full CRUD operations for clients"""
        try:
            # CREATE - POST /api/clients
            client_data = {
                'name': 'Test Corporation',
                'email': 'test@testcorp.com'
            }
            
            resp = await self.make_request('POST', 'clients', client_data)
            if resp['status'] != 200:
                self.log_result("Clients CRUD - Create", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            client = resp['data']['data']
            client_id = client['id']
            self.created_resources['clients'].append(client_id)
            
            # READ - GET /api/clients (list)
            resp = await self.make_request('GET', 'clients')
            if resp['status'] != 200:
                self.log_result("Clients CRUD - List", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            clients = resp['data']['data']
            if not any(c['id'] == client_id for c in clients):
                self.log_result("Clients CRUD - List", False,
                              "Created client not found in list")
                return False
            
            # READ - GET /api/clients/:id (single)
            resp = await self.make_request('GET', f'clients/{client_id}')
            if resp['status'] != 200:
                self.log_result("Clients CRUD - Get Single", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            retrieved_client = resp['data']['data']
            if retrieved_client['id'] != client_id:
                self.log_result("Clients CRUD - Get Single", False,
                              "Retrieved client ID doesn't match")
                return False
            
            # UPDATE - PUT /api/clients/:id
            update_data = {
                'name': 'Updated Test Corporation',
                'email': 'updated@testcorp.com'
            }
            
            resp = await self.make_request('PUT', f'clients/{client_id}', update_data)
            if resp['status'] != 200:
                self.log_result("Clients CRUD - Update", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # DELETE - DELETE /api/clients/:id  
            resp = await self.make_request('DELETE', f'clients/{client_id}')
            if resp['status'] != 200:
                self.log_result("Clients CRUD - Delete", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # Verify deletion
            resp = await self.make_request('GET', f'clients/{client_id}')
            if resp['status'] != 404:
                self.log_result("Clients CRUD - Verify Delete", False,
                              f"Expected 404 after deletion, got {resp['status']}")
                return False
            
            self.log_result("Clients CRUD", True, "All CRUD operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("Clients CRUD", False, f"Exception: {str(e)}")
            return False

    async def test_client_validation(self):
        """Test client creation validation"""
        try:
            # Test missing name
            resp = await self.make_request('POST', 'clients', {'email': 'test@test.com'})
            if resp['status'] != 400:
                self.log_result("Client Validation - Missing Name", False,
                              f"Expected 400, got {resp['status']}")
                return False
            
            # Test missing email
            resp = await self.make_request('POST', 'clients', {'name': 'Test Client'})
            if resp['status'] != 400:
                self.log_result("Client Validation - Missing Email", False,
                              f"Expected 400, got {resp['status']}")
                return False
            
            self.log_result("Client Validation", True, "Validation working correctly")
            return True
            
        except Exception as e:
            self.log_result("Client Validation", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # AGENCY PLATFORM TESTS
    # ========================================================================
    
    async def test_agency_platforms_crud(self):
        """Test Agency Platform CRUD operations"""
        try:
            # First get a valid platform ID
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            if resp['status'] != 200 or not resp['data']['data']:
                self.log_result("Agency Platforms - Setup", False,
                              "Could not get platforms for test")
                return False
            
            platform_id = resp['data']['data'][0]['id']
            
            # CREATE - POST /api/agency/platforms
            agency_platform_data = {'platformId': platform_id}
            
            resp = await self.make_request('POST', 'agency/platforms', agency_platform_data)
            if resp['status'] != 200:
                self.log_result("Agency Platforms - Create", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            agency_platform = resp['data']['data']
            ap_id = agency_platform['id']
            self.created_resources['agency_platforms'].append(ap_id)
            
            # READ - GET /api/agency/platforms
            resp = await self.make_request('GET', 'agency/platforms')
            if resp['status'] != 200:
                self.log_result("Agency Platforms - List", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # READ - GET /api/agency/platforms/:id
            resp = await self.make_request('GET', f'agency/platforms/{ap_id}')
            if resp['status'] != 200:
                self.log_result("Agency Platforms - Get Single", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # Toggle enabled status - PATCH /api/agency/platforms/:id/toggle
            resp = await self.make_request('PATCH', f'agency/platforms/{ap_id}/toggle')
            if resp['status'] != 200:
                self.log_result("Agency Platforms - Toggle", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            self.log_result("Agency Platforms CRUD", True, "All operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("Agency Platforms CRUD", False, f"Exception: {str(e)}")
            return False

    async def test_access_items_crud(self):
        """Test Access Items CRUD operations"""
        try:
            # Create agency platform first
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            if resp['status'] != 200 or not resp['data']['data']:
                return False
            
            platform_id = resp['data']['data'][0]['id']
            
            resp = await self.make_request('POST', 'agency/platforms', {'platformId': platform_id})
            if resp['status'] != 200:
                return False
            
            ap_id = resp['data']['data']['id']
            
            # CREATE ACCESS ITEM - POST /api/agency/platforms/:id/items
            item_data = {
                'itemType': 'NAMED_INVITE',
                'accessPattern': 'HUMAN_INVITE',
                'label': 'Test Access Item',
                'role': 'Admin',
                'notes': 'Test access item for PostgreSQL testing'
            }
            
            resp = await self.make_request('POST', f'agency/platforms/{ap_id}/items', item_data)
            if resp['status'] != 200:
                self.log_result("Access Items - Create", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            updated_ap = resp['data']['data']
            if not updated_ap.get('accessItems') or len(updated_ap['accessItems']) == 0:
                self.log_result("Access Items - Create", False,
                              "Access item not found in response")
                return False
            
            item_id = updated_ap['accessItems'][0]['id']
            
            # UPDATE ACCESS ITEM - PUT /api/agency/platforms/:id/items/:itemId
            update_data = {
                'label': 'Updated Test Access Item',
                'role': 'Editor'
            }
            
            resp = await self.make_request('PUT', f'agency/platforms/{ap_id}/items/{item_id}', update_data)
            if resp['status'] != 200:
                self.log_result("Access Items - Update", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # DELETE ACCESS ITEM - DELETE /api/agency/platforms/:id/items/:itemId
            resp = await self.make_request('DELETE', f'agency/platforms/{ap_id}/items/{item_id}')
            if resp['status'] != 200:
                self.log_result("Access Items - Delete", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            self.log_result("Access Items CRUD", True, "All operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("Access Items CRUD", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # ACCESS REQUEST TESTS
    # ========================================================================
    
    async def test_access_requests_lifecycle(self):
        """Test complete access request lifecycle"""
        try:
            # Create client first
            client_data = {
                'name': 'Test Client for AR',
                'email': 'test-ar@testcorp.com'
            }
            
            resp = await self.make_request('POST', 'clients', client_data)
            if resp['status'] != 200:
                return False
            
            client_id = resp['data']['data']['id']
            
            # Create agency platform with access item
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platform_id = resp['data']['data'][0]['id']
            
            resp = await self.make_request('POST', 'agency/platforms', {'platformId': platform_id})
            ap_id = resp['data']['data']['id']
            
            item_data = {
                'itemType': 'NAMED_INVITE',
                'accessPattern': 'HUMAN_INVITE',
                'label': 'Test Access',
                'role': 'Admin'
            }
            resp = await self.make_request('POST', f'agency/platforms/{ap_id}/items', item_data)
            
            # CREATE ACCESS REQUEST - POST /api/access-requests
            ar_data = {
                'clientId': client_id,
                'items': [{
                    'platformId': platform_id,
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'role': 'Admin',
                    'assetName': 'Test Asset'
                }],
                'notes': 'Test access request'
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            if resp['status'] != 200:
                self.log_result("Access Requests - Create", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            access_request = resp['data']['data']
            ar_id = access_request['id']
            token = access_request['token']
            self.created_resources['access_requests'].append(ar_id)
            
            # READ - GET /api/access-requests
            resp = await self.make_request('GET', 'access-requests')
            if resp['status'] != 200:
                self.log_result("Access Requests - List", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # READ - GET /api/access-requests/:id
            resp = await self.make_request('GET', f'access-requests/{ar_id}')
            if resp['status'] != 200:
                self.log_result("Access Requests - Get Single", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # READ - GET /api/clients/:id/requests
            resp = await self.make_request('GET', f'clients/{client_id}/requests')
            if resp['status'] != 200:
                self.log_result("Access Requests - Client Requests", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            self.log_result("Access Requests Lifecycle", True, "All operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("Access Requests Lifecycle", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # ONBOARDING TESTS
    # ========================================================================
    
    async def test_onboarding_flow(self):
        """Test onboarding API endpoints"""
        try:
            # Create access request with token first
            client_data = {'name': 'Onboarding Test Client', 'email': 'onboarding@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
            # Get platform and create AR
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platform_id = resp['data']['data'][0]['id']
            
            ar_data = {
                'clientId': client_id,
                'items': [{
                    'platformId': platform_id,
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'role': 'Admin'
                }]
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            token = resp['data']['data']['token']
            
            # TEST ONBOARDING - GET /api/onboarding/:token
            resp = await self.make_request('GET', f'onboarding/{token}')
            if resp['status'] != 200:
                self.log_result("Onboarding Flow - Get Token", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            onboarding_data = resp['data']['data']
            if not onboarding_data.get('client') or not onboarding_data.get('items'):
                self.log_result("Onboarding Flow - Data Structure", False,
                              "Missing client or items in onboarding data")
                return False
            
            # Test invalid token
            resp = await self.make_request('GET', 'onboarding/invalid-token')
            if resp['status'] != 404:
                self.log_result("Onboarding Flow - Invalid Token", False,
                              f"Expected 404 for invalid token, got {resp['status']}")
                return False
            
            # Test attestation endpoint
            if onboarding_data['items']:
                item_id = onboarding_data['items'][0]['id']
                attest_data = {
                    'attestationText': 'I have granted access as requested',
                    'clientProvidedTarget': {
                        'assetType': 'Ad Account',
                        'assetId': '123456789',
                        'assetName': 'Test Ad Account'
                    }
                }
                
                resp = await self.make_request('POST', f'onboarding/{token}/items/{item_id}/attest', attest_data)
                if resp['status'] != 200:
                    self.log_result("Onboarding Flow - Attestation", False,
                                  f"Expected status 200, got {resp['status']}")
                    return False
            
            self.log_result("Onboarding Flow", True, "All onboarding endpoints working correctly")
            return True
            
        except Exception as e:
            self.log_result("Onboarding Flow", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # INTEGRATION IDENTITY TESTS
    # ========================================================================
    
    async def test_integration_identities_crud(self):
        """Test Integration Identities CRUD operations"""
        try:
            # CREATE - POST /api/integration-identities
            identity_data = {
                'name': 'Test Service Account',
                'type': 'SERVICE_ACCOUNT',
                'identifier': 'test-sa@project.iam.gserviceaccount.com',
                'description': 'Test service account for PostgreSQL testing'
            }
            
            resp = await self.make_request('POST', 'integration-identities', identity_data)
            if resp['status'] != 200:
                self.log_result("Integration Identities - Create", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            identity = resp['data']['data']
            identity_id = identity['id']
            self.created_resources['integration_identities'].append(identity_id)
            
            # READ - GET /api/integration-identities
            resp = await self.make_request('GET', 'integration-identities')
            if resp['status'] != 200:
                self.log_result("Integration Identities - List", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            identities = resp['data']['data']
            if not any(i['id'] == identity_id for i in identities):
                self.log_result("Integration Identities - List", False,
                              "Created identity not found in list")
                return False
            
            # UPDATE - PUT /api/integration-identities/:id
            update_data = {
                'name': 'Updated Test Service Account',
                'description': 'Updated description'
            }
            
            resp = await self.make_request('PUT', f'integration-identities/{identity_id}', update_data)
            if resp['status'] != 200:
                self.log_result("Integration Identities - Update", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # TOGGLE - PATCH /api/integration-identities/:id/toggle
            resp = await self.make_request('PATCH', f'integration-identities/{identity_id}/toggle')
            if resp['status'] != 200:
                self.log_result("Integration Identities - Toggle", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # DELETE - DELETE /api/integration-identities/:id
            resp = await self.make_request('DELETE', f'integration-identities/{identity_id}')
            if resp['status'] != 200:
                self.log_result("Integration Identities - Delete", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            self.log_result("Integration Identities CRUD", True, "All CRUD operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("Integration Identities CRUD", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # PAM TESTS
    # ========================================================================
    
    async def test_pam_functionality(self):
        """Test PAM (Privileged Access Management) functionality"""
        try:
            # Create access request with PAM item
            client_data = {'name': 'PAM Test Client', 'email': 'pam@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
            # Get platform for PAM
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platform_id = resp['data']['data'][0]['id']
            
            # Create agency platform with PAM access item
            resp = await self.make_request('POST', 'agency/platforms', {'platformId': platform_id})
            ap_id = resp['data']['data']['id']
            
            pam_item_data = {
                'itemType': 'SHARED_ACCOUNT_PAM',
                'accessPattern': 'PAM',
                'label': 'PAM Access Item',
                'role': 'Admin',
                'pamConfig': {
                    'ownership': 'CLIENT_OWNED',
                    'grantMethod': 'CREDENTIAL_HANDOFF'
                }
            }
            
            resp = await self.make_request('POST', f'agency/platforms/{ap_id}/items', pam_item_data)
            if resp['status'] != 200:
                self.log_result("PAM - Create PAM Item", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # Create access request with PAM
            ar_data = {
                'clientId': client_id,
                'items': [{
                    'platformId': platform_id,
                    'itemType': 'SHARED_ACCOUNT_PAM',
                    'accessPattern': 'PAM',
                    'role': 'Admin',
                    'pamOwnership': 'CLIENT_OWNED'
                }]
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            if resp['status'] != 200:
                self.log_result("PAM - Create Access Request", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            access_request = resp['data']['data']
            token = access_request['token']
            item_id = access_request['items'][0]['id']
            
            # Test credential submission
            cred_data = {
                'username': 'testuser@example.com',
                'password': 'securepassword123'
            }
            
            resp = await self.make_request('POST', f'onboarding/{token}/items/{item_id}/submit-credentials', cred_data)
            if resp['status'] != 200:
                self.log_result("PAM - Credential Submission", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # Test PAM sessions endpoint
            resp = await self.make_request('GET', 'pam/sessions')
            if resp['status'] != 200:
                self.log_result("PAM - Sessions List", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            self.log_result("PAM Functionality", True, "All PAM operations completed successfully")
            return True
            
        except Exception as e:
            self.log_result("PAM Functionality", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # AUDIT LOG TESTS
    # ========================================================================
    
    async def test_audit_logs(self):
        """Test audit log functionality"""
        try:
            resp = await self.make_request('GET', 'audit-logs')
            if resp['status'] != 200:
                self.log_result("Audit Logs", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            logs = resp['data']['data']
            if not isinstance(logs, list):
                self.log_result("Audit Logs", False,
                              "Expected list of audit logs")
                return False
            
            self.log_result("Audit Logs", True, f"Retrieved {len(logs)} audit log entries")
            return True
            
        except Exception as e:
            self.log_result("Audit Logs", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # END-TO-END WORKFLOW TESTS
    # ========================================================================
    
    async def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        try:
            print("\n🔄 Starting End-to-End Workflow Test...")
            
            # 1. Create a client
            client_data = {
                'name': 'E2E Test Corporation',
                'email': 'e2e@testcorp.com'
            }
            
            resp = await self.make_request('POST', 'clients', client_data)
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 1 (Create Client)", False,
                              f"Failed to create client: {resp['status']}")
                return False
            
            client_id = resp['data']['data']['id']
            print(f"   ✅ Step 1: Created client {client_id}")
            
            # 2. Add a platform to agency
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platform_id = resp['data']['data'][0]['id']
            platform_name = resp['data']['data'][0]['name']
            
            resp = await self.make_request('POST', 'agency/platforms', {'platformId': platform_id})
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 2 (Add Platform)", False,
                              f"Failed to add platform: {resp['status']}")
                return False
            
            ap_id = resp['data']['data']['id']
            print(f"   ✅ Step 2: Added platform {platform_name} to agency")
            
            # 3. Add access item to agency platform
            item_data = {
                'itemType': 'NAMED_INVITE',
                'accessPattern': 'HUMAN_INVITE',
                'label': 'E2E Test Access',
                'role': 'Admin',
                'notes': 'End-to-end test access item'
            }
            
            resp = await self.make_request('POST', f'agency/platforms/{ap_id}/items', item_data)
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 3 (Add Access Item)", False,
                              f"Failed to add access item: {resp['status']}")
                return False
            
            print("   ✅ Step 3: Added access item to agency platform")
            
            # 4. Create access request with items
            ar_data = {
                'clientId': client_id,
                'items': [{
                    'platformId': platform_id,
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE',
                    'role': 'Admin',
                    'assetName': 'E2E Test Asset'
                }],
                'notes': 'End-to-end test access request'
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 4 (Create Access Request)", False,
                              f"Failed to create access request: {resp['status']}")
                return False
            
            access_request = resp['data']['data']
            token = access_request['token']
            print("   ✅ Step 4: Created access request with onboarding token")
            
            # 5. Use onboarding token to attest
            resp = await self.make_request('GET', f'onboarding/{token}')
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 5 (Get Onboarding Data)", False,
                              f"Failed to get onboarding data: {resp['status']}")
                return False
            
            onboarding_data = resp['data']['data']
            item_id = onboarding_data['items'][0]['id']
            
            attest_data = {
                'attestationText': 'I have granted the requested access',
                'clientProvidedTarget': {
                    'assetType': 'Ad Account',
                    'assetId': '987654321',
                    'assetName': 'E2E Test Ad Account'
                }
            }
            
            resp = await self.make_request('POST', f'onboarding/{token}/items/{item_id}/attest', attest_data)
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 5 (Attest)", False,
                              f"Failed to attest: {resp['status']}")
                return False
            
            print("   ✅ Step 5: Client attestation completed")
            
            # 6. Verify audit logs created
            resp = await self.make_request('GET', 'audit-logs')
            if resp['status'] != 200:
                self.log_result("E2E Workflow - Step 6 (Verify Audit)", False,
                              f"Failed to get audit logs: {resp['status']}")
                return False
            
            print("   ✅ Step 6: Verified audit logs created")
            
            self.log_result("End-to-End Workflow", True, 
                          "Complete workflow from client creation to attestation successful")
            return True
            
        except Exception as e:
            self.log_result("End-to-End Workflow", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # DATA PERSISTENCE AND INTEGRITY TESTS
    # ========================================================================
    
    async def test_data_persistence(self):
        """Test data persistence across multiple requests"""
        try:
            # Create test data
            client_data = {'name': 'Persistence Test Client', 'email': 'persist@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
            # Wait a moment to simulate time passing
            await asyncio.sleep(1)
            
            # Retrieve data and verify it persists
            resp = await self.make_request('GET', f'clients/{client_id}')
            if resp['status'] != 200:
                self.log_result("Data Persistence", False,
                              "Created client not found after time delay")
                return False
            
            retrieved_client = resp['data']['data']
            if (retrieved_client['name'] != client_data['name'] or 
                retrieved_client['email'] != client_data['email']):
                self.log_result("Data Persistence", False,
                              "Client data modified between creation and retrieval")
                return False
            
            # Test relationship integrity
            ar_data = {
                'clientId': client_id,
                'items': []  # Empty items for simple test
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            if resp['status'] != 200:
                self.log_result("Data Persistence", False,
                              "Failed to create access request for persistence test")
                return False
            
            # Verify client-request relationship
            resp = await self.make_request('GET', f'clients/{client_id}/requests')
            if resp['status'] != 200:
                self.log_result("Data Persistence", False,
                              "Failed to retrieve client requests")
                return False
            
            requests = resp['data']['data']
            if len(requests) == 0:
                self.log_result("Data Persistence", False,
                              "Access request not linked to client")
                return False
            
            self.log_result("Data Persistence", True,
                          "Data persists correctly across requests and relationships maintained")
            return True
            
        except Exception as e:
            self.log_result("Data Persistence", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # ERROR HANDLING TESTS
    # ========================================================================
    
    async def test_error_handling(self):
        """Test proper error handling for various scenarios"""
        try:
            error_tests = [
                # Test 404 for non-existent resources
                ('GET', 'clients/non-existent-id', None, 404, "Non-existent client"),
                ('GET', 'platforms/non-existent-id', None, 404, "Non-existent platform"),
                ('GET', 'access-requests/non-existent-id', None, 404, "Non-existent access request"),
                ('GET', 'onboarding/invalid-token', None, 404, "Invalid onboarding token"),
                
                # Test 400 for invalid data
                ('POST', 'clients', {'name': 'Test'}, 400, "Missing email in client creation"),
                ('POST', 'clients', {'email': 'test@test.com'}, 400, "Missing name in client creation"),
                ('POST', 'agency/platforms', {}, 400, "Missing platformId"),
                ('POST', 'access-requests', {'clientId': str(uuid.uuid4())}, 400, "Invalid access request data"),
            ]
            
            failed_tests = []
            
            for method, endpoint, data, expected_status, description in error_tests:
                resp = await self.make_request(method, endpoint, data)
                if resp['status'] != expected_status:
                    failed_tests.append(f"{description}: expected {expected_status}, got {resp['status']}")
            
            if failed_tests:
                self.log_result("Error Handling", False,
                              f"Failed tests: {'; '.join(failed_tests)}")
                return False
            
            self.log_result("Error Handling", True,
                          f"All {len(error_tests)} error handling tests passed")
            return True
            
        except Exception as e:
            self.log_result("Error Handling", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # MAIN TEST RUNNER
    # ========================================================================
    
    async def run_all_tests(self):
        """Run all PostgreSQL database migration tests"""
        print("🚀 Starting PostgreSQL Database Migration Tests for Marketing Identity Platform")
        print(f"🌐 Testing backend API at: {self.base_url}")
        print("=" * 80)
        
        # Test categories and their corresponding test methods
        test_categories = [
            ("Platform Catalog APIs", [
                self.test_platform_catalog_list_all,
                self.test_platform_catalog_filtering,
                self.test_platform_catalog_single
            ]),
            ("Client APIs", [
                self.test_clients_crud,
                self.test_client_validation
            ]),
            ("Agency Platform APIs", [
                self.test_agency_platforms_crud,
                self.test_access_items_crud
            ]),
            ("Access Request APIs", [
                self.test_access_requests_lifecycle
            ]),
            ("Onboarding APIs", [
                self.test_onboarding_flow
            ]),
            ("Integration Identity APIs", [
                self.test_integration_identities_crud
            ]),
            ("PAM APIs", [
                self.test_pam_functionality
            ]),
            ("Audit Log APIs", [
                self.test_audit_logs
            ]),
            ("End-to-End Flow", [
                self.test_end_to_end_workflow
            ]),
            ("Data Persistence & Integrity", [
                self.test_data_persistence
            ]),
            ("Error Handling", [
                self.test_error_handling
            ])
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for category_name, test_methods in test_categories:
            print(f"\n📂 {category_name}")
            print("-" * 60)
            
            category_passed = 0
            category_total = len(test_methods)
            
            for test_method in test_methods:
                total_tests += 1
                try:
                    result = await test_method()
                    if result:
                        passed_tests += 1
                        category_passed += 1
                except Exception as e:
                    self.log_result(test_method.__name__, False, f"Test method exception: {str(e)}")
            
            print(f"   📊 Category Summary: {category_passed}/{category_total} tests passed")
        
        # Final summary
        print("\n" + "=" * 80)
        print("🏁 POSTGRESQL DATABASE MIGRATION TEST SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        status_emoji = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
        
        print(f"{status_emoji} Overall Result: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("🎉 PostgreSQL database integration is working excellently!")
        elif success_rate >= 70:
            print("⚠️  PostgreSQL database integration is mostly working with some issues.")
        else:
            print("❌ PostgreSQL database integration has significant issues that need attention.")
        
        # Show detailed failures if any
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n📊 Database Connection: PostgreSQL via Neon Cloud")
        print(f"🔗 Backend URL: {self.base_url}")
        print(f"⏰ Test completed at: {datetime.now().isoformat()}")
        
        return success_rate >= 90

async def main():
    """Main test execution function"""
    tester = PostgreSQLDatabaseMigrationTester()
    
    try:
        await tester.setup()
        success = await tester.run_all_tests()
        return success
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return False
    finally:
        await tester.teardown()

if __name__ == "__main__":
    asyncio.run(main())