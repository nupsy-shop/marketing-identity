#!/usr/bin/env python3
"""
Plugin-Based Admin Page for PAM Identity Hub - Backend API Testing
=================================================================

Tests all plugin-based functionality including:
1. Plugin System API (GET /api/plugins, individual plugins)
2. Plugin Schema API (agency-config, client-target schemas)
3. Plugin Validation API (validate configs)
4. Plugin-Based Access Item Creation
5. Plugin-Based Onboarding Enhancement
6. Platform-Specific Constraints

Backend URL: https://access-provisioning.preview.emergentagent.com/api
"""

import requests
import json
import uuid
from typing import Dict, Any, List
import sys

# Configuration
BACKEND_URL = "https://access-provisioning.preview.emergentagent.com/api"
HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

class PluginBasedPAMTester:
    def __init__(self):
        self.test_results = []
        self.client_id = None
        self.google_ads_platform_id = None
        self.access_request_id = None
        
    def log_result(self, test_name: str, success: bool, details: str, response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {json.dumps(response_data, indent=2)[:500]}...")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        print()

    def safe_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request with error handling"""
        try:
            url = f"{BACKEND_URL}/{endpoint}"
            
            if method == 'GET':
                response = requests.get(url, headers=HEADERS, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=HEADERS, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=HEADERS, json=data, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=HEADERS, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, headers=HEADERS, json=data, timeout=30)
            
            return {
                'status_code': response.status_code,
                'success': response.status_code < 400,
                'data': response.json() if response.content else {},
                'text': response.text
            }
        except requests.exceptions.RequestException as e:
            return {
                'status_code': 500,
                'success': False,
                'error': str(e),
                'data': {}
            }
        except Exception as e:
            return {
                'status_code': 500,
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'data': {}
            }

    def test_plugin_system_api(self):
        """Test 1: Plugin System API - GET /api/plugins"""
        print("🔍 Testing Plugin System API - List All Plugins")
        
        response = self.safe_request('GET', 'plugins')
        
        if not response['success']:
            self.log_result("Plugin System API - List All Plugins", False, 
                          f"API request failed: {response.get('error', 'Unknown error')}", response)
            return
            
        data = response['data']
        
        # Should return 15 plugins
        if 'data' in data and isinstance(data['data'], list):
            plugins = data['data']
            plugin_count = len(plugins)
            
            if plugin_count == 15:
                self.log_result("Plugin System API - List All Plugins", True,
                              f"Successfully returned {plugin_count} plugins as expected")
            else:
                self.log_result("Plugin System API - List All Plugins", False,
                              f"Expected 15 plugins, got {plugin_count}", data)
            
            # Verify plugin structure
            if plugins and len(plugins) > 0:
                sample_plugin = plugins[0]
                required_fields = ['platformKey', 'displayName', 'category', 'supportedAccessItemTypes', 'supportedRoleTemplates']
                missing_fields = [field for field in required_fields if field not in sample_plugin]
                
                if not missing_fields:
                    self.log_result("Plugin Manifest Structure", True,
                                  "Plugin manifests contain all required fields")
                else:
                    self.log_result("Plugin Manifest Structure", False,
                                  f"Plugin manifest missing fields: {missing_fields}", sample_plugin)
        else:
            self.log_result("Plugin System API - List All Plugins", False,
                          "Response does not contain expected data array", data)

    def test_individual_plugin_details(self):
        """Test 2: Plugin System API - Individual Plugin Details"""
        print("🔍 Testing Individual Plugin Details - Google Ads")
        
        response = self.safe_request('GET', 'plugins/google-ads')
        
        if not response['success']:
            self.log_result("Individual Plugin Details", False,
                          f"API request failed: {response.get('error', 'Unknown error')}", response)
            return
            
        data = response['data']
        
        if 'data' in data:
            plugin_data = data['data']
            
            # Check manifest
            if 'manifest' in plugin_data:
                manifest = plugin_data['manifest']
                
                # Verify Google Ads specific details
                expected_platform_key = 'google-ads'
                expected_access_types = ['PARTNER_DELEGATION', 'NAMED_INVITE']
                
                if manifest.get('platformKey') == expected_platform_key:
                    self.log_result("Google Ads Platform Key", True,
                                  f"Correct platform key: {expected_platform_key}")
                else:
                    self.log_result("Google Ads Platform Key", False,
                                  f"Expected '{expected_platform_key}', got '{manifest.get('platformKey')}'")
                
                # Check supported access types
                supported_types = plugin_data.get('supportedAccessItemTypes', [])
                if all(access_type in supported_types for access_type in expected_access_types):
                    self.log_result("Google Ads Supported Access Types", True,
                                  f"Supports required access types: {expected_access_types}")
                else:
                    self.log_result("Google Ads Supported Access Types", False,
                                  f"Expected {expected_access_types}, got {supported_types}")
                
                # Check role templates
                role_templates = plugin_data.get('supportedRoleTemplates', [])
                if len(role_templates) >= 2:  # Should have admin, standard, read-only at minimum
                    self.log_result("Google Ads Role Templates", True,
                                  f"Has {len(role_templates)} role templates")
                else:
                    self.log_result("Google Ads Role Templates", False,
                                  f"Expected multiple role templates, got {len(role_templates)}")
            else:
                self.log_result("Individual Plugin Details", False,
                              "Response missing manifest", data)
        else:
            self.log_result("Individual Plugin Details", False,
                          "Response does not contain expected data", data)

    def test_agency_config_schema(self):
        """Test 3: Plugin Schema API - Agency Config Schema"""
        print("🔍 Testing Agency Config Schema - Google Ads Partner Delegation")
        
        response = self.safe_request('GET', 'plugins/google-ads/schema/agency-config', 
                                   params={'accessItemType': 'PARTNER_DELEGATION'})
        
        if not response['success']:
            self.log_result("Agency Config Schema", False,
                          f"API request failed: {response.get('error', 'Unknown error')}", response)
            return
            
        data = response['data']
        
        if 'data' in data:
            schema = data['data']
            
            # Should be a JSON Schema
            if 'type' in schema and schema['type'] == 'object':
                self.log_result("JSON Schema Structure", True,
                              "Response is valid JSON Schema object")
                
                # Check for managerAccountId field
                properties = schema.get('properties', {})
                if 'managerAccountId' in properties:
                    manager_field = properties['managerAccountId']
                    if manager_field.get('type') == 'string':
                        self.log_result("Manager Account ID Field", True,
                                      "managerAccountId field present with correct type")
                    else:
                        self.log_result("Manager Account ID Field", False,
                                      f"managerAccountId has incorrect type: {manager_field.get('type')}")
                else:
                    self.log_result("Manager Account ID Field", False,
                                  "managerAccountId field missing from schema", schema)
            else:
                self.log_result("JSON Schema Structure", False,
                              "Response is not a valid JSON Schema object", schema)
        else:
            self.log_result("Agency Config Schema", False,
                          "Response does not contain expected data", data)

    def test_client_target_schema(self):
        """Test 4: Plugin Schema API - Client Target Schema"""
        print("🔍 Testing Client Target Schema - Google Ads")
        
        response = self.safe_request('GET', 'plugins/google-ads/schema/client-target',
                                   params={'accessItemType': 'PARTNER_DELEGATION'})
        
        if not response['success']:
            self.log_result("Client Target Schema", False,
                          f"API request failed: {response.get('error', 'Unknown error')}", response)
            return
            
        data = response['data']
        
        if 'data' in data:
            schema = data['data']
            
            # Should be a JSON Schema
            if 'type' in schema and schema['type'] == 'object':
                self.log_result("Client Target JSON Schema", True,
                              "Response is valid JSON Schema object")
                
                # Check for client-side fields (adAccountId, etc.)
                properties = schema.get('properties', {})
                if 'adAccountId' in properties:
                    self.log_result("Client Target Fields", True,
                                  "Client target schema contains expected fields")
                else:
                    self.log_result("Client Target Fields", False,
                                  "Client target schema missing expected fields", schema)
            else:
                self.log_result("Client Target JSON Schema", False,
                              "Response is not a valid JSON Schema object", schema)
        else:
            self.log_result("Client Target Schema", False,
                          "Response does not contain expected data", data)

    def test_plugin_validation_api(self):
        """Test 5: Plugin Validation API"""
        print("🔍 Testing Plugin Validation API - Google Ads")
        
        # Test valid config
        valid_config = {
            "accessItemType": "PARTNER_DELEGATION",
            "config": {
                "managerAccountId": "111-222-3333"
            }
        }
        
        response = self.safe_request('POST', 'plugins/google-ads/validate/agency-config', data=valid_config)
        
        if response['success']:
            data = response['data']
            if 'data' in data and data['data'].get('valid'):
                self.log_result("Plugin Validation - Valid Config", True,
                              "Valid managerAccountId accepted")
            else:
                self.log_result("Plugin Validation - Valid Config", False,
                              "Valid config rejected", data)
        else:
            self.log_result("Plugin Validation - Valid Config", False,
                          f"API request failed: {response.get('error', 'Unknown error')}")
        
        # Test invalid config (missing managerAccountId)
        invalid_config = {
            "accessItemType": "PARTNER_DELEGATION",
            "config": {}
        }
        
        response = self.safe_request('POST', 'plugins/google-ads/validate/agency-config', data=invalid_config)
        
        if response['success']:
            data = response['data']
            if 'data' in data and not data['data'].get('valid'):
                self.log_result("Plugin Validation - Invalid Config", True,
                              "Invalid config (missing managerAccountId) correctly rejected")
            else:
                self.log_result("Plugin Validation - Invalid Config", False,
                              "Invalid config incorrectly accepted", data)
        else:
            self.log_result("Plugin Validation - Invalid Config", False,
                          f"API request failed: {response.get('error', 'Unknown error')}")

    def test_snowflake_access_types(self):
        """Test 6: Platform-Specific Constraints - Snowflake Access Types"""
        print("🔍 Testing Snowflake Access Types - Should NOT include NAMED_INVITE")
        
        response = self.safe_request('GET', 'plugins/snowflake/access-types')
        
        if not response['success']:
            self.log_result("Snowflake Access Types", False,
                          f"API request failed: {response.get('error', 'Unknown error')}", response)
            return
            
        data = response['data']
        
        if 'data' in data:
            access_types = data['data']
            
            if isinstance(access_types, list):
                if 'NAMED_INVITE' not in access_types:
                    self.log_result("Snowflake NAMED_INVITE Restriction", True,
                                  f"Snowflake correctly excludes NAMED_INVITE. Supported: {access_types}")
                else:
                    self.log_result("Snowflake NAMED_INVITE Restriction", False,
                                  "Snowflake incorrectly includes NAMED_INVITE", access_types)
            else:
                self.log_result("Snowflake Access Types", False,
                              "Response is not an array", data)
        else:
            self.log_result("Snowflake Access Types", False,
                          "Response does not contain expected data", data)

    def test_plugin_based_access_item_creation(self):
        """Test 7: Plugin-Based Access Item Creation"""
        print("🔍 Testing Plugin-Based Access Item Creation")
        
        # First, create a client for testing
        client_data = {
            "name": "Plugin Test Corp",
            "email": "plugin.test@example.com"
        }
        
        response = self.safe_request('POST', 'clients', data=client_data)
        
        if not response['success']:
            self.log_result("Create Test Client for Plugin Testing", False,
                          f"Failed to create client: {response.get('error', 'Unknown error')}")
            return
            
        self.client_id = response['data']['data']['id']
        self.log_result("Create Test Client for Plugin Testing", True,
                      f"Created client: {self.client_id}")
        
        # Get Google Ads platform ID
        response = self.safe_request('GET', 'platforms')
        if response['success']:
            platforms = response['data'].get('data', [])
            google_ads_platform = next((p for p in platforms if 'Google Ads' in p.get('name', '')), None)
            if google_ads_platform:
                self.google_ads_platform_id = google_ads_platform['id']
                self.log_result("Find Google Ads Platform", True,
                              f"Found Google Ads platform: {self.google_ads_platform_id}")
            else:
                self.log_result("Find Google Ads Platform", False,
                              "Google Ads platform not found in catalog")
                return
        else:
            self.log_result("Find Google Ads Platform", False,
                          "Failed to retrieve platforms")
            return
        
        # Create agency platform
        agency_platform_data = {
            "platformId": self.google_ads_platform_id
        }
        
        response = self.safe_request('POST', 'agency/platforms', data=agency_platform_data)
        
        if not response['success']:
            self.log_result("Create Agency Platform", False,
                          f"Failed to create agency platform: {response.get('error', 'Unknown error')}")
            return
            
        agency_platform = response['data']['data']
        agency_platform_id = agency_platform['id']
        self.log_result("Create Agency Platform", True,
                      f"Created agency platform: {agency_platform_id}")
        
        # Create Partner Delegation item with plugin-based validation
        partner_delegation_item = {
            "itemType": "PARTNER_DELEGATION",
            "label": "Test Plugin Item",
            "role": "admin",
            "agencyConfigJson": {
                "managerAccountId": "111-222-3333"
            },
            "agencyData": {
                "managerAccountId": "111-222-3333"
            }
        }
        
        response = self.safe_request('POST', f'agency/platforms/{agency_platform_id}/items', 
                                   data=partner_delegation_item)
        
        if response['success']:
            self.log_result("Create Partner Delegation Item", True,
                          "Successfully created Partner Delegation item with plugin validation")
        else:
            self.log_result("Create Partner Delegation Item", False,
                          f"Failed to create item: {response.get('error', 'Unknown error')}", response['data'])

    def test_plugin_based_onboarding_enhancement(self):
        """Test 8: Plugin-Based Onboarding Enhancement"""
        print("🔍 Testing Plugin-Based Onboarding Enhancement")
        
        if not self.client_id or not self.google_ads_platform_id:
            self.log_result("Plugin-Based Onboarding Enhancement", False,
                          "Prerequisites not met (missing client or platform)")
            return
        
        # Create an access request with plugin-based data
        access_request_data = {
            "clientId": self.client_id,
            "items": [
                {
                    "platformId": self.google_ads_platform_id,
                    "itemType": "PARTNER_DELEGATION",
                    "accessPattern": "PARTNER_DELEGATION",
                    "patternLabel": "Partner Delegation",
                    "role": "admin",
                    "assetName": "Test Google Ads Account",
                    "agencyData": {
                        "managerAccountId": "111-222-3333"
                    }
                }
            ]
        }
        
        response = self.safe_request('POST', 'access-requests', data=access_request_data)
        
        if not response['success']:
            self.log_result("Create Access Request for Onboarding", False,
                          f"Failed to create access request: {response.get('error', 'Unknown error')}")
            return
            
        access_request = response['data']['data']
        self.access_request_id = access_request['id']
        onboarding_token = access_request['token']
        
        self.log_result("Create Access Request for Onboarding", True,
                      f"Created access request with token: {onboarding_token}")
        
        # Test enhanced onboarding API with plugin data
        response = self.safe_request('GET', f'onboarding/{onboarding_token}')
        
        if not response['success']:
            self.log_result("Enhanced Onboarding API", False,
                          f"Failed to retrieve onboarding data: {response.get('error', 'Unknown error')}")
            return
            
        onboarding_data = response['data']['data']
        
        # Check for plugin enhancements
        if 'items' in onboarding_data and len(onboarding_data['items']) > 0:
            item = onboarding_data['items'][0]
            
            enhanced_fields = ['clientTargetSchema', 'pluginInstructions', 'verificationMode']
            found_fields = [field for field in enhanced_fields if field in item]
            
            if len(found_fields) == len(enhanced_fields):
                self.log_result("Plugin Enhancement Fields", True,
                              f"All plugin enhancement fields present: {found_fields}")
                
                # Check clientTargetSchema structure
                if isinstance(item.get('clientTargetSchema'), dict):
                    schema = item['clientTargetSchema']
                    if 'type' in schema and 'properties' in schema:
                        self.log_result("Client Target Schema Structure", True,
                                      "clientTargetSchema is valid JSON Schema")
                    else:
                        self.log_result("Client Target Schema Structure", False,
                                      "clientTargetSchema missing required JSON Schema fields")
                
                # Check pluginInstructions
                if isinstance(item.get('pluginInstructions'), list):
                    instructions = item['pluginInstructions']
                    if len(instructions) > 0 and 'step' in instructions[0]:
                        self.log_result("Plugin Instructions", True,
                                      f"Plugin instructions contain {len(instructions)} steps")
                    else:
                        self.log_result("Plugin Instructions", False,
                                      "Plugin instructions missing step structure")
                
                # Check verificationMode
                verification_mode = item.get('verificationMode')
                valid_modes = ['ATTESTATION_ONLY', 'AUTO', 'MANUAL']
                if verification_mode in valid_modes:
                    self.log_result("Verification Mode", True,
                                  f"Valid verification mode: {verification_mode}")
                else:
                    self.log_result("Verification Mode", False,
                                  f"Invalid verification mode: {verification_mode}")
                    
            else:
                self.log_result("Plugin Enhancement Fields", False,
                              f"Missing plugin enhancement fields. Found: {found_fields}, Expected: {enhanced_fields}")
        else:
            self.log_result("Enhanced Onboarding API", False,
                          "Onboarding response missing items or items empty")

    def test_platform_specific_constraints(self):
        """Test 9: Platform-Specific Constraints"""
        print("🔍 Testing Platform-Specific Constraints")
        
        # Test that Snowflake rejects NAMED_INVITE
        
        # First, get Snowflake platform ID
        response = self.safe_request('GET', 'platforms')
        if not response['success']:
            self.log_result("Get Platforms for Constraints Test", False,
                          "Failed to retrieve platforms")
            return
            
        platforms = response['data'].get('data', [])
        snowflake_platform = next((p for p in platforms if 'Snowflake' in p.get('name', '')), None)
        
        if not snowflake_platform:
            self.log_result("Find Snowflake Platform", False,
                          "Snowflake platform not found in catalog")
            return
            
        snowflake_platform_id = snowflake_platform['id']
        self.log_result("Find Snowflake Platform", True,
                      f"Found Snowflake platform: {snowflake_platform_id}")
        
        # Create Snowflake agency platform
        agency_platform_data = {
            "platformId": snowflake_platform_id
        }
        
        response = self.safe_request('POST', 'agency/platforms', data=agency_platform_data)
        
        if not response['success']:
            # May already exist, try to get existing
            response = self.safe_request('GET', 'agency/platforms')
            if response['success']:
                agency_platforms = response['data'].get('data', [])
                snowflake_agency = next((ap for ap in agency_platforms 
                                      if ap.get('platform', {}).get('name', '').startswith('Snowflake')), None)
                if snowflake_agency:
                    snowflake_agency_platform_id = snowflake_agency['id']
                    self.log_result("Get Existing Snowflake Agency Platform", True,
                                  f"Using existing agency platform: {snowflake_agency_platform_id}")
                else:
                    self.log_result("Create/Get Snowflake Agency Platform", False,
                                  "Cannot create or find Snowflake agency platform")
                    return
            else:
                self.log_result("Create Snowflake Agency Platform", False,
                              f"Failed to create agency platform: {response.get('error', 'Unknown error')}")
                return
        else:
            snowflake_agency_platform_id = response['data']['data']['id']
            self.log_result("Create Snowflake Agency Platform", True,
                          f"Created Snowflake agency platform: {snowflake_agency_platform_id}")
        
        # Try to create NAMED_INVITE item for Snowflake (should fail)
        named_invite_item = {
            "itemType": "NAMED_INVITE",
            "label": "Invalid Named Invite",
            "role": "analyst",
            "humanIdentityStrategy": "AGENCY_GROUP",
            "agencyGroupEmail": "analytics@agency.com"
        }
        
        response = self.safe_request('POST', f'agency/platforms/{snowflake_agency_platform_id}/items',
                                   data=named_invite_item)
        
        if not response['success'] and response['status_code'] == 400:
            error_message = response['data'].get('error', '')
            if 'not supported' in error_message.lower() and 'named_invite' in error_message.lower():
                self.log_result("Snowflake NAMED_INVITE Constraint", True,
                              f"Snowflake correctly rejects NAMED_INVITE: {error_message}")
            else:
                self.log_result("Snowflake NAMED_INVITE Constraint", False,
                              f"Wrong error message: {error_message}")
        else:
            self.log_result("Snowflake NAMED_INVITE Constraint", False,
                          "Snowflake incorrectly accepts NAMED_INVITE or unexpected response", response['data'])

    def run_all_tests(self):
        """Run all plugin-based tests"""
        print("=" * 80)
        print("Plugin-Based Admin Page for PAM Identity Hub - Backend Testing")
        print("=" * 80)
        print(f"Backend URL: {BACKEND_URL}")
        print()
        
        try:
            # Run all tests
            self.test_plugin_system_api()
            self.test_individual_plugin_details()
            self.test_agency_config_schema()
            self.test_client_target_schema()
            self.test_plugin_validation_api()
            self.test_snowflake_access_types()
            self.test_plugin_based_access_item_creation()
            self.test_plugin_based_onboarding_enhancement()
            self.test_platform_specific_constraints()
            
        except KeyboardInterrupt:
            print("\n⚠️  Testing interrupted by user")
            return False
        except Exception as e:
            print(f"\n❌ Unexpected error during testing: {str(e)}")
            return False
        
        # Print summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        print("\n" + "=" * 80)
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = PluginBasedPAMTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 All tests passed! Plugin-Based Admin Page for PAM Identity Hub is working correctly.")
        sys.exit(0)
    else:
        print("⚠️  Some tests failed. Please check the results above.")
        sys.exit(1)