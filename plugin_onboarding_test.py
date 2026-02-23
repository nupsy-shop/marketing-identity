#!/usr/bin/env python3
"""
Plugin-Based Onboarding Flow Test
Marketing Identity Platform - Testing Plugin-Driven Schema and Instructions

This script tests the plugin-based onboarding architecture where:
1. Each platform plugin defines its own schemas and instructions
2. clientTargetSchema defines what fields the client needs to provide
3. pluginInstructions provide step-by-step guidance from the plugin
4. The onboarding page dynamically renders forms from these schemas
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class PluginOnboardingTester:
    def __init__(self):
        self.base_url = "https://plugin-onboard.preview.emergentagent.com/api"
        self.session = None
        self.test_results = []
        self.test_token = "dbd4784e-c97d-4787-8cd5-4f2b9e1afec6"  # Pre-validated token

    async def setup(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()

    async def teardown(self):
        """Close HTTP session"""
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
            print(f"   Details: {json.dumps(details, indent=2)}")

    # ========================================================================
    # PLUGIN API ENDPOINT TESTS
    # ========================================================================
    
    async def test_plugins_list_all(self):
        """Test GET /api/plugins - List all registered plugins"""
        try:
            resp = await self.make_request('GET', 'plugins')
            
            if resp['status'] != 200:
                self.log_result("Plugin API - List All Plugins", False, 
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            data = resp['data']['data']
            if not isinstance(data, list):
                self.log_result("Plugin API - List All Plugins", False,
                              "Expected array of plugins", {'received_type': type(data)})
                return False
                
            expected_plugin_count = 15  # Based on loader.js
            if len(data) != expected_plugin_count:
                self.log_result("Plugin API - List All Plugins", False,
                              f"Expected {expected_plugin_count} plugins, got {len(data)}")
                return False
            
            # Verify plugin structure
            if data and not all('platformKey' in plugin and 'manifest' in plugin for plugin in data):
                self.log_result("Plugin API - List All Plugins", False,
                              "Plugin structure missing required fields")
                return False
            
            self.log_result("Plugin API - List All Plugins", True,
                          f"Retrieved {len(data)} plugins successfully")
            return True
            
        except Exception as e:
            self.log_result("Plugin API - List All Plugins", False, f"Exception: {str(e)}")
            return False

    async def test_plugin_get_specific(self):
        """Test GET /api/plugins/:platformKey - Get specific plugin"""
        try:
            test_platforms = ['google-ads', 'meta', 'ga4']
            
            for platform_key in test_platforms:
                resp = await self.make_request('GET', f'plugins/{platform_key}')
                
                if resp['status'] != 200:
                    self.log_result(f"Plugin API - Get {platform_key}", False,
                                  f"Expected status 200, got {resp['status']}", resp['data'])
                    return False
                
                plugin_data = resp['data']['data']
                required_fields = ['manifest', 'supportedAccessItemTypes', 'supportedRoleTemplates']
                if not all(field in plugin_data for field in required_fields):
                    self.log_result(f"Plugin API - Get {platform_key}", False,
                                  f"Missing required fields in plugin data")
                    return False
            
            # Test 404 for invalid platform
            resp = await self.make_request('GET', 'plugins/invalid-platform')
            if resp['status'] != 404:
                self.log_result("Plugin API - Invalid Platform", False,
                              f"Expected 404 for invalid platform, got {resp['status']}")
                return False
            
            self.log_result("Plugin API - Get Specific Plugin", True,
                          f"Successfully retrieved {len(test_platforms)} specific plugins")
            return True
            
        except Exception as e:
            self.log_result("Plugin API - Get Specific Plugin", False, f"Exception: {str(e)}")
            return False

    async def test_plugin_schema_endpoints(self):
        """Test plugin schema endpoints"""
        try:
            platform_key = 'google-ads'
            access_item_type = 'NAMED_INVITE'
            
            # Test client-target schema
            resp = await self.make_request('GET', f'plugins/{platform_key}/schema/client-target?accessItemType={access_item_type}')
            if resp['status'] != 200:
                self.log_result("Plugin Schema - Client Target", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            client_schema = resp['data']['data']
            if not isinstance(client_schema, dict) or 'type' not in client_schema:
                self.log_result("Plugin Schema - Client Target", False,
                              "Invalid JSON Schema format for client target")
                return False
            
            # Test agency-config schema
            resp = await self.make_request('GET', f'plugins/{platform_key}/schema/agency-config?accessItemType={access_item_type}')
            if resp['status'] != 200:
                self.log_result("Plugin Schema - Agency Config", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            agency_schema = resp['data']['data']
            if not isinstance(agency_schema, dict):
                self.log_result("Plugin Schema - Agency Config", False,
                              "Invalid JSON Schema format for agency config")
                return False
            
            # Test request-options schema (optional)
            resp = await self.make_request('GET', f'plugins/{platform_key}/schema/request-options?accessItemType={access_item_type}')
            if resp['status'] != 200:
                self.log_result("Plugin Schema - Request Options", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            # Test missing accessItemType parameter
            resp = await self.make_request('GET', f'plugins/{platform_key}/schema/client-target')
            if resp['status'] != 400:
                self.log_result("Plugin Schema - Missing Parameter", False,
                              f"Expected 400 for missing accessItemType, got {resp['status']}")
                return False
            
            self.log_result("Plugin Schema Endpoints", True,
                          f"All schema endpoints working for {platform_key}")
            return True
            
        except Exception as e:
            self.log_result("Plugin Schema Endpoints", False, f"Exception: {str(e)}")
            return False

    async def test_plugin_roles_and_access_types(self):
        """Test plugin roles and access types endpoints"""
        try:
            platform_key = 'google-ads'
            
            # Test roles endpoint
            resp = await self.make_request('GET', f'plugins/{platform_key}/roles')
            if resp['status'] != 200:
                self.log_result("Plugin Roles", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            roles = resp['data']['data']
            if not isinstance(roles, list):
                self.log_result("Plugin Roles", False,
                              "Expected array of roles")
                return False
            
            # Test access-types endpoint  
            resp = await self.make_request('GET', f'plugins/{platform_key}/access-types')
            if resp['status'] != 200:
                self.log_result("Plugin Access Types", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            access_types = resp['data']['data']
            if not isinstance(access_types, list):
                self.log_result("Plugin Access Types", False,
                              "Expected array of access types")
                return False
            
            self.log_result("Plugin Roles and Access Types", True,
                          f"Retrieved {len(roles)} roles and {len(access_types)} access types")
            return True
            
        except Exception as e:
            self.log_result("Plugin Roles and Access Types", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # ENHANCED ONBOARDING API TESTS
    # ========================================================================
    
    async def test_onboarding_enhanced_plugin_data(self):
        """Test GET /api/onboarding/:token - Enhanced Plugin Data"""
        try:
            # First create a fresh access request with multiple platforms
            client_data = {'name': 'Plugin Test Client', 'email': 'plugin@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            if resp['status'] != 200:
                self.log_result("Setup - Create Client", False, "Failed to create test client")
                return False
            
            client_id = resp['data']['data']['id']
            
            # Get Google Ads and Meta platforms
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platforms = resp['data']['data']
            google_ads = next((p for p in platforms if 'Google Ads' in p['name']), None)
            meta = next((p for p in platforms if 'Meta' in p['name'] or 'Facebook' in p['name']), None)
            
            if not google_ads or not meta:
                self.log_result("Setup - Find Platforms", False, "Could not find Google Ads or Meta platforms")
                return False
            
            # Create access request with both platforms
            ar_data = {
                'clientId': client_id,
                'items': [
                    {
                        'platformId': google_ads['id'],
                        'itemType': 'NAMED_INVITE',
                        'accessPattern': 'HUMAN_INVITE',
                        'role': 'Admin',
                        'assetName': 'Test Google Ads Account'
                    },
                    {
                        'platformId': meta['id'],
                        'itemType': 'NAMED_INVITE', 
                        'accessPattern': 'HUMAN_INVITE',
                        'role': 'Admin',
                        'assetName': 'Test Meta Business Manager'
                    }
                ]
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            if resp['status'] != 200:
                self.log_result("Setup - Create Access Request", False, "Failed to create access request")
                return False
            
            token = resp['data']['data']['token']
            
            # Test enhanced onboarding data
            resp = await self.make_request('GET', f'onboarding/{token}')
            if resp['status'] != 200:
                self.log_result("Enhanced Onboarding - Get Token Data", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            onboarding_data = resp['data']['data']
            
            # Verify structure
            required_fields = ['client', 'items', 'id', 'token']
            if not all(field in onboarding_data for field in required_fields):
                self.log_result("Enhanced Onboarding - Data Structure", False,
                              f"Missing required fields in onboarding data")
                return False
            
            items = onboarding_data['items']
            if len(items) != 2:
                self.log_result("Enhanced Onboarding - Items Count", False,
                              f"Expected 2 items, got {len(items)}")
                return False
            
            # Verify each item has plugin enhancement
            plugin_enhanced_count = 0
            for item in items:
                # Check for plugin-specific fields
                plugin_fields = ['clientTargetSchema', 'pluginInstructions', 'verificationMode']
                has_plugin_fields = any(field in item for field in plugin_fields)
                
                if has_plugin_fields:
                    plugin_enhanced_count += 1
                    
                    # Verify clientTargetSchema format
                    if 'clientTargetSchema' in item:
                        schema = item['clientTargetSchema']
                        if not isinstance(schema, dict) or 'type' not in schema:
                            self.log_result("Enhanced Onboarding - Schema Format", False,
                                          "clientTargetSchema is not valid JSON Schema format")
                            return False
                    
                    # Verify pluginInstructions format
                    if 'pluginInstructions' in item:
                        instructions = item['pluginInstructions']
                        if not (isinstance(instructions, list) or isinstance(instructions, str)):
                            self.log_result("Enhanced Onboarding - Instructions Format", False,
                                          "pluginInstructions should be array or string")
                            return False
                    
                    # Verify verificationMode
                    if 'verificationMode' in item:
                        valid_modes = ['ATTESTATION_ONLY', 'EVIDENCE_REQUIRED', 'AUTO']
                        if item['verificationMode'] not in valid_modes:
                            self.log_result("Enhanced Onboarding - Verification Mode", False,
                                          f"Invalid verificationMode: {item['verificationMode']}")
                            return False
            
            if plugin_enhanced_count == 0:
                self.log_result("Enhanced Onboarding - Plugin Enhancement", False,
                              "No items were enhanced with plugin data")
                return False
            
            self.log_result("Enhanced Onboarding - Plugin Data", True,
                          f"Successfully retrieved enhanced plugin data for {plugin_enhanced_count} items")
            return True
            
        except Exception as e:
            self.log_result("Enhanced Onboarding - Plugin Data", False, f"Exception: {str(e)}")
            return False

    async def test_schema_driven_submission(self):
        """Test POST /api/onboarding/:token/items/:itemId/attest - Schema-Driven Submission"""
        try:
            # Create test access request
            client_data = {'name': 'Schema Test Client', 'email': 'schema@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
            # Get Google Ads platform
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            platforms = resp['data']['data']
            google_ads = next((p for p in platforms if 'Google Ads' in p['name']), None)
            
            if not google_ads:
                self.log_result("Schema Submission - Setup", False, "Could not find Google Ads platform")
                return False
            
            # Create access request
            ar_data = {
                'clientId': client_id,
                'items': [{
                    'platformId': google_ads['id'],
                    'itemType': 'NAMED_INVITE',
                    'accessPattern': 'HUMAN_INVITE', 
                    'role': 'Admin',
                    'assetName': 'Test Google Ads Account'
                }]
            }
            
            resp = await self.make_request('POST', 'access-requests', ar_data)
            access_request = resp['data']['data']
            token = access_request['token']
            
            # Get onboarding data to find item with schema
            resp = await self.make_request('GET', f'onboarding/{token}')
            onboarding_data = resp['data']['data']
            items = onboarding_data['items']
            
            if not items or len(items) == 0:
                self.log_result("Schema Submission - Get Items", False, "No items found in onboarding")
                return False
            
            item = items[0]
            item_id = item['id']
            
            # Test schema-driven submission with clientProvidedTarget matching expected schema
            client_provided_target = {
                'adAccountId': 'xxxx-xxxx-xxxx',
                'adAccountName': 'Test Google Ads Account'
            }
            
            # If item has Meta platform, use Meta-specific fields
            if 'Meta' in item.get('platform', {}).get('name', ''):
                client_provided_target = {
                    'adAccountId': 'act_123456789',
                    'businessManagerId': 'bm_987654321',
                    'adAccountName': 'Test Meta Account'
                }
            
            attest_data = {
                'attestationText': 'I have granted access as requested',
                'clientProvidedTarget': client_provided_target
            }
            
            resp = await self.make_request('POST', f'onboarding/{token}/items/{item_id}/attest', attest_data)
            if resp['status'] != 200:
                self.log_result("Schema Submission - Attest", False,
                              f"Expected status 200, got {resp['status']}", resp['data'])
                return False
            
            # Verify the item was updated
            updated_request = resp['data']['data']
            updated_item = next((i for i in updated_request['items'] if i['id'] == item_id), None)
            
            if not updated_item:
                self.log_result("Schema Submission - Item Update", False, "Could not find updated item")
                return False
            
            if updated_item['status'] != 'validated':
                self.log_result("Schema Submission - Status Change", False,
                              f"Expected status 'validated', got {updated_item['status']}")
                return False
            
            # Verify clientProvidedTarget was saved
            if 'clientProvidedTarget' not in updated_item:
                self.log_result("Schema Submission - Target Saved", False,
                              "clientProvidedTarget was not saved to item")
                return False
            
            saved_target = updated_item['clientProvidedTarget']
            if saved_target != client_provided_target:
                self.log_result("Schema Submission - Target Match", False,
                              "Saved clientProvidedTarget doesn't match submitted data")
                return False
            
            self.log_result("Schema-Driven Submission", True,
                          "clientProvidedTarget saved correctly and item status updated to validated")
            return True
            
        except Exception as e:
            self.log_result("Schema-Driven Submission", False, f"Exception: {str(e)}")
            return False

    async def test_different_platforms(self):
        """Test plugin behavior with different platforms (Google Ads vs Meta)"""
        try:
            platforms_to_test = [
                {'name_filter': 'Google Ads', 'expected_fields': ['adAccountId', 'adAccountName']},
                {'name_filter': 'Meta', 'expected_fields': ['adAccountId', 'businessManagerId']}
            ]
            
            client_data = {'name': 'Platform Test Client', 'email': 'platforms@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
            resp = await self.make_request('GET', 'platforms?clientFacing=true')
            all_platforms = resp['data']['data']
            
            platform_results = []
            
            for test_config in platforms_to_test:
                platform = next((p for p in all_platforms if test_config['name_filter'] in p['name']), None)
                if not platform:
                    continue
                
                # Create access request for this platform
                ar_data = {
                    'clientId': client_id,
                    'items': [{
                        'platformId': platform['id'],
                        'itemType': 'NAMED_INVITE',
                        'accessPattern': 'HUMAN_INVITE',
                        'role': 'Admin'
                    }]
                }
                
                resp = await self.make_request('POST', 'access-requests', ar_data)
                if resp['status'] != 200:
                    continue
                
                token = resp['data']['data']['token']
                
                # Get onboarding data to check schemas
                resp = await self.make_request('GET', f'onboarding/{token}')
                if resp['status'] != 200:
                    continue
                
                onboarding_data = resp['data']['data']
                if not onboarding_data['items']:
                    continue
                
                item = onboarding_data['items'][0]
                
                # Check if item has clientTargetSchema
                if 'clientTargetSchema' in item:
                    schema = item['clientTargetSchema']
                    if 'properties' in schema:
                        schema_fields = list(schema['properties'].keys())
                        
                        # Check if expected fields are present
                        has_expected_fields = any(field in schema_fields for field in test_config['expected_fields'])
                        
                        platform_results.append({
                            'platform': platform['name'],
                            'schema_fields': schema_fields,
                            'has_expected_fields': has_expected_fields,
                            'has_instructions': 'pluginInstructions' in item,
                            'verification_mode': item.get('verificationMode', 'UNKNOWN')
                        })
            
            if len(platform_results) < 2:
                self.log_result("Different Platforms", False,
                              f"Could only test {len(platform_results)} platforms, expected at least 2")
                return False
            
            # Verify different platforms have different schemas
            all_fields = set()
            for result in platform_results:
                all_fields.update(result['schema_fields'])
            
            if len(all_fields) < 3:  # Should have more variety across platforms
                self.log_result("Different Platforms - Schema Isolation", False,
                              "Platforms don't seem to have isolated schemas")
                return False
            
            success_count = sum(1 for r in platform_results if r['has_expected_fields'] and r['has_instructions'])
            
            self.log_result("Different Platforms", True,
                          f"Successfully tested {len(platform_results)} platforms with plugin isolation, {success_count} with complete data")
            
            # Log details for debugging
            for result in platform_results:
                print(f"   - {result['platform']}: {len(result['schema_fields'])} schema fields, " +
                      f"Instructions: {result['has_instructions']}, Mode: {result['verification_mode']}")
            
            return True
            
        except Exception as e:
            self.log_result("Different Platforms", False, f"Exception: {str(e)}")
            return False

    async def test_error_handling(self):
        """Test error handling for plugin-based onboarding"""
        try:
            # Test invalid platform key in plugin endpoints
            resp = await self.make_request('GET', 'plugins/invalid-platform-key')
            if resp['status'] != 404:
                self.log_result("Error Handling - Invalid Platform", False,
                              f"Expected 404 for invalid platform, got {resp['status']}")
                return False
            
            # Test missing accessItemType parameter
            resp = await self.make_request('GET', 'plugins/google-ads/schema/client-target')
            if resp['status'] != 400:
                self.log_result("Error Handling - Missing Parameter", False,
                              f"Expected 400 for missing parameter, got {resp['status']}")
                return False
            
            # Test invalid onboarding token  
            resp = await self.make_request('GET', 'onboarding/invalid-token-12345')
            if resp['status'] != 404:
                self.log_result("Error Handling - Invalid Token", False,
                              f"Expected 404 for invalid token, got {resp['status']}")
                return False
            
            # Test missing required fields in attestation
            # First create a valid access request
            client_data = {'name': 'Error Test Client', 'email': 'error@test.com'}
            resp = await self.make_request('POST', 'clients', client_data)
            client_id = resp['data']['data']['id']
            
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
            item_id = resp['data']['data']['items'][0]['id']
            
            # Test attestation with invalid item ID
            resp = await self.make_request('POST', f'onboarding/{token}/items/invalid-item-id/attest', {
                'attestationText': 'Test'
            })
            if resp['status'] != 404:
                self.log_result("Error Handling - Invalid Item ID", False,
                              f"Expected 404 for invalid item ID, got {resp['status']}")
                return False
            
            self.log_result("Error Handling", True, "All error scenarios handled correctly")
            return True
            
        except Exception as e:
            self.log_result("Error Handling", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # VALIDATION ENDPOINTS TESTS
    # ========================================================================
    
    async def test_plugin_validation_endpoints(self):
        """Test plugin validation endpoints"""
        try:
            platform_key = 'google-ads'
            
            # Test agency config validation
            agency_config_data = {
                'accessItemType': 'NAMED_INVITE',
                'config': {
                    'managerAccountId': '123-456-7890',
                    'agencyEmail': 'agency@example.com'
                }
            }
            
            resp = await self.make_request('POST', f'plugins/{platform_key}/validate/agency-config', agency_config_data)
            if resp['status'] != 200:
                self.log_result("Plugin Validation - Agency Config", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            validation_result = resp['data']['data']
            if 'valid' not in validation_result:
                self.log_result("Plugin Validation - Agency Config Result", False,
                              "Validation result should contain 'valid' field")
                return False
            
            # Test client target validation
            client_target_data = {
                'accessItemType': 'NAMED_INVITE',
                'target': {
                    'adAccountId': 'xxx-xxx-xxx',
                    'adAccountName': 'Test Account'
                }
            }
            
            resp = await self.make_request('POST', f'plugins/{platform_key}/validate/client-target', client_target_data)
            if resp['status'] != 200:
                self.log_result("Plugin Validation - Client Target", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            validation_result = resp['data']['data']
            if 'valid' not in validation_result:
                self.log_result("Plugin Validation - Client Target Result", False,
                              "Validation result should contain 'valid' field")
                return False
            
            # Test instruction building
            instruction_data = {
                'accessItemType': 'NAMED_INVITE',
                'agencyConfig': {'managerAccountId': '123-456-7890'},
                'roleTemplate': 'Admin',
                'clientName': 'Test Client'
            }
            
            resp = await self.make_request('POST', f'plugins/{platform_key}/instructions', instruction_data)
            if resp['status'] != 200:
                self.log_result("Plugin Validation - Instructions", False,
                              f"Expected status 200, got {resp['status']}")
                return False
            
            instructions = resp['data']['data']
            if not (isinstance(instructions, list) or isinstance(instructions, str)):
                self.log_result("Plugin Validation - Instructions Format", False,
                              "Instructions should be array or string")
                return False
            
            self.log_result("Plugin Validation Endpoints", True,
                          "All validation endpoints working correctly")
            return True
            
        except Exception as e:
            self.log_result("Plugin Validation Endpoints", False, f"Exception: {str(e)}")
            return False

    # ========================================================================
    # MAIN TEST RUNNER
    # ========================================================================
    
    async def run_all_tests(self):
        """Run all plugin-based onboarding tests"""
        print("🚀 Starting Plugin-Based Onboarding Flow Tests")
        print(f"🌐 Testing backend API at: {self.base_url}")
        print("=" * 80)
        
        # Test categories and their corresponding test methods
        test_categories = [
            ("Plugin API Endpoints", [
                self.test_plugins_list_all,
                self.test_plugin_get_specific,
                self.test_plugin_schema_endpoints,
                self.test_plugin_roles_and_access_types
            ]),
            ("Enhanced Onboarding API", [
                self.test_onboarding_enhanced_plugin_data,
                self.test_schema_driven_submission
            ]),
            ("Platform Plugin Isolation", [
                self.test_different_platforms
            ]),
            ("Plugin Validation Endpoints", [
                self.test_plugin_validation_endpoints
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
        print("🏁 PLUGIN-BASED ONBOARDING FLOW TEST SUMMARY")
        print("=" * 80)
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        status_emoji = "✅" if success_rate >= 90 else "⚠️" if success_rate >= 70 else "❌"
        
        print(f"{status_emoji} Overall Result: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("🎉 Plugin-based onboarding system is working excellently!")
        elif success_rate >= 70:
            print("⚠️  Plugin-based onboarding system is mostly working with some issues.")
        else:
            print("❌ Plugin-based onboarding system has significant issues that need attention.")
        
        # Show detailed failures if any
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n📊 Plugin Architecture: Schema-driven forms with dynamic instructions")
        print(f"🔗 Backend URL: {self.base_url}")
        print(f"⏰ Test completed at: {datetime.now().isoformat()}")
        
        return success_rate >= 90

async def main():
    """Main test execution function"""
    tester = PluginOnboardingTester()
    
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