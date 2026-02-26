#!/usr/bin/env python3
"""
Backend Testing for Unified AccessProvisioningPlugin Interface
Testing all 4 Google plugins (GA4, GTM, Google Ads, GSC)

This test validates the unified interface across all Google plugins
including plugin manifests, grant/verify/revoke access endpoints,
capabilities, effective capabilities, and validation edge cases.
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

# Base URL from environment variable
BASE_URL = "https://plugin-unify.preview.emergentagent.com"

class PluginInterfaceTest:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_url = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        # Test data for each plugin
        self.test_configs = {
            'ga4': {
                'target': 'properties/123456',
                'role': 'viewer',
                'identity': 'test@agency.com',
                'supported_access_types': ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT'],
                'can_revoke_access': {
                    'NAMED_INVITE': True,
                    'GROUP_ACCESS': True,
                    'SHARED_ACCOUNT': False  # Default, true with agency config
                }
            },
            'gtm': {
                'target': '12345/67890',
                'role': 'read',
                'identity': 'test@agency.com', 
                'supported_access_types': ['NAMED_INVITE', 'GROUP_ACCESS', 'SHARED_ACCOUNT'],
                'can_revoke_access': {
                    'NAMED_INVITE': True,
                    'GROUP_ACCESS': True,
                    'SHARED_ACCOUNT': False  # Default, true with agency config
                }
            },
            'google-ads': {
                'target': 'customers/1234567890',
                'role': 'standard',
                'identity': 'test@agency.com',
                'supported_access_types': ['PARTNER_DELEGATION', 'NAMED_INVITE', 'SHARED_ACCOUNT'],
                'can_revoke_access': {
                    'PARTNER_DELEGATION': True,
                    'NAMED_INVITE': True,
                    'SHARED_ACCOUNT': False  # Default, true with agency config
                }
            },
            'google-search-console': {
                'target': 'https://example.com',
                'role': 'full',
                'identity': 'test@agency.com',
                'supported_access_types': ['NAMED_INVITE', 'SHARED_ACCOUNT'],
                'can_revoke_access': {
                    'NAMED_INVITE': False,  # GSC doesn't support programmatic user management
                    'SHARED_ACCOUNT': False
                }
            }
        }

    def log_test(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test results"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
        
        result = {
            'test': test_name,
            'success': success,
            'message': message
        }
        if details:
            result['details'] = details
        
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"    Details: {details}")

    def make_request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.api_url}/{path}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=30)
            else:
                return {'error': f'Unsupported method: {method}', 'status_code': 400}
            
            return {
                'status_code': response.status_code,
                'data': response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                'headers': dict(response.headers)
            }
        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status_code': 0}
        except Exception as e:
            return {'error': f'Unexpected error: {str(e)}', 'status_code': 0}

    def test_plugin_manifest_validation(self):
        """Test 1: Plugin Manifest Validation - GET /api/plugins"""
        print("\n=== Test 1: Plugin Manifest Validation ===")
        
        response = self.make_request('GET', 'plugins')
        
        if response.get('status_code') != 200:
            self.log_test("Plugin Manifests API", False, 
                         f"API returned {response.get('status_code')}: {response.get('data', response.get('error'))}")
            return
        
        plugins_data = response['data']
        if not isinstance(plugins_data, dict) or not plugins_data.get('success'):
            self.log_test("Plugin Manifests Response", False, 
                         f"Invalid response format: {plugins_data}")
            return
        
        plugins = plugins_data.get('data', [])
        if not isinstance(plugins, list):
            self.log_test("Plugin Manifests List", False, 
                         f"Expected list of plugins, got: {type(plugins)}")
            return
        
        # Find Google plugins
        google_plugins = {}
        for plugin in plugins:
            if plugin.get('platformKey') in ['ga4', 'gtm', 'google-ads', 'google-search-console']:
                google_plugins[plugin['platformKey']] = plugin
        
        # Test each Google plugin manifest
        expected_plugins = ['ga4', 'gtm', 'google-ads', 'google-search-console']
        for plugin_key in expected_plugins:
            if plugin_key not in google_plugins:
                self.log_test(f"Plugin {plugin_key} Manifest", False, 
                             f"Plugin {plugin_key} not found in manifest list")
                continue
            
            plugin = google_plugins[plugin_key]
            
            # Check required fields
            required_fields = ['platformKey', 'displayName', 'accessTypeCapabilities']
            missing_fields = [field for field in required_fields if field not in plugin]
            
            if missing_fields:
                self.log_test(f"Plugin {plugin_key} Manifest", False, 
                             f"Missing required fields: {missing_fields}")
                continue
            
            # Check accessTypeCapabilities for canRevokeAccess
            access_caps = plugin.get('accessTypeCapabilities', {})
            config = self.test_configs[plugin_key]
            
            # Validate canRevokeAccess for each supported access type
            manifest_valid = True
            for access_type in config['supported_access_types']:
                if access_type in access_caps:
                    capability = access_caps[access_type]
                    expected_can_revoke = config['can_revoke_access'].get(access_type, False)
                    
                    # For SHARED_ACCOUNT, it might be conditional rules
                    if isinstance(capability, dict) and 'default' in capability:
                        actual_can_revoke = capability['default'].get('canRevokeAccess', False)
                    else:
                        actual_can_revoke = capability.get('canRevokeAccess', False)
                    
                    # Special case for GSC NAMED_INVITE - should be false
                    if plugin_key == 'google-search-console' and access_type == 'NAMED_INVITE':
                        expected_can_revoke = False
                    
                    if actual_can_revoke != expected_can_revoke:
                        self.log_test(f"Plugin {plugin_key} {access_type} canRevokeAccess", False, 
                                     f"Expected {expected_can_revoke}, got {actual_can_revoke}")
                        manifest_valid = False
            
            if manifest_valid:
                self.log_test(f"Plugin {plugin_key} Manifest", True, 
                             "Manifest structure and canRevokeAccess flags are correct")

    def test_grant_access_endpoints(self):
        """Test 2: Grant Access Endpoints - POST /api/oauth/{pluginKey}/grant-access"""
        print("\n=== Test 2: Grant Access Endpoints ===")
        
        for plugin_key, config in self.test_configs.items():
            for access_type in config['supported_access_types']:
                test_payload = {
                    "accessToken": "test-token",
                    "target": config['target'],
                    "role": config['role'],
                    "identity": config['identity'],
                    "accessItemType": access_type
                }
                
                response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
                
                # GSC should return 501 for grant access
                if plugin_key == 'google-search-console':
                    if response.get('status_code') == 501:
                        self.log_test(f"{plugin_key} grant-access {access_type}", True, 
                                     "GSC correctly returns 501 (not supported)")
                    else:
                        self.log_test(f"{plugin_key} grant-access {access_type}", False, 
                                     f"Expected 501, got {response.get('status_code')}")
                else:
                    # Other plugins should reach API and return error (invalid token expected)
                    if response.get('status_code') in [400, 401, 403, 404]:
                        data = response.get('data', {})
                        if isinstance(data, dict) and 'success' in data and 'error' in data:
                            self.log_test(f"{plugin_key} grant-access {access_type}", True, 
                                         f"Reached API, got expected error: {response.get('status_code')}")
                        else:
                            self.log_test(f"{plugin_key} grant-access {access_type}", False, 
                                         f"Invalid response format: {data}")
                    else:
                        self.log_test(f"{plugin_key} grant-access {access_type}", False, 
                                     f"Unexpected status: {response.get('status_code')}: {response.get('data')}")

    def test_verify_access_endpoints(self):
        """Test 3: Verify Access Endpoints - POST /api/oauth/{pluginKey}/verify-access"""
        print("\n=== Test 3: Verify Access Endpoints ===")
        
        for plugin_key, config in self.test_configs.items():
            for access_type in config['supported_access_types']:
                test_payload = {
                    "accessToken": "test-token", 
                    "target": config['target'],
                    "role": config['role'],
                    "identity": config['identity'],
                    "accessItemType": access_type
                }
                
                response = self.make_request('POST', f'oauth/{plugin_key}/verify-access', test_payload)
                
                # All should reach platform API and return standardized VerifyResult format
                if response.get('status_code') in [400, 401, 403, 404]:
                    data = response.get('data', {})
                    if isinstance(data, dict) and 'success' in data:
                        self.log_test(f"{plugin_key} verify-access {access_type}", True, 
                                     f"Reached platform API, got standardized response: {response.get('status_code')}")
                    else:
                        self.log_test(f"{plugin_key} verify-access {access_type}", False, 
                                     f"Response not in VerifyResult format: {data}")
                else:
                    self.log_test(f"{plugin_key} verify-access {access_type}", False, 
                                 f"Unexpected status: {response.get('status_code')}: {response.get('data')}")

    def test_revoke_access_endpoints(self):
        """Test 4: Revoke Access Endpoints - POST /api/oauth/{pluginKey}/revoke-access"""
        print("\n=== Test 4: Revoke Access Endpoints ===")
        
        for plugin_key, config in self.test_configs.items():
            for access_type in config['supported_access_types']:
                test_payload = {
                    "accessToken": "test-token",
                    "target": config['target'], 
                    "role": config['role'],
                    "identity": config['identity'],
                    "accessItemType": access_type
                }
                
                response = self.make_request('POST', f'oauth/{plugin_key}/revoke-access', test_payload)
                
                expected_can_revoke = config['can_revoke_access'].get(access_type, False)
                
                if not expected_can_revoke:
                    # Should return 501 (not supported)
                    if response.get('status_code') == 501:
                        self.log_test(f"{plugin_key} revoke-access {access_type}", True, 
                                     "Correctly returns 501 (canRevokeAccess=false)")
                    else:
                        self.log_test(f"{plugin_key} revoke-access {access_type}", False, 
                                     f"Expected 501, got {response.get('status_code')}")
                else:
                    # Should reach Google API (auth error expected) 
                    if response.get('status_code') in [400, 401, 403, 404]:
                        data = response.get('data', {})
                        if isinstance(data, dict) and 'success' in data:
                            self.log_test(f"{plugin_key} revoke-access {access_type}", True, 
                                         f"Reached Google API, got expected error: {response.get('status_code')}")
                        else:
                            self.log_test(f"{plugin_key} revoke-access {access_type}", False, 
                                         f"Invalid response format: {data}")
                    else:
                        self.log_test(f"{plugin_key} revoke-access {access_type}", False, 
                                     f"Unexpected status: {response.get('status_code')}: {response.get('data')}")

    def test_validation_edge_cases(self):
        """Test 5: Validation Edge Cases"""
        print("\n=== Test 5: Validation Edge Cases ===")
        
        # Test SHARED_ACCOUNT rejection for plugins that don't support it
        for plugin_key in ['ga4', 'gtm', 'google-ads']:
            test_payload = {
                "accessToken": "test-token",
                "target": self.test_configs[plugin_key]['target'],
                "role": self.test_configs[plugin_key]['role'],
                "identity": self.test_configs[plugin_key]['identity'],
                "accessItemType": "SHARED_ACCOUNT"
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
            
            # Check if SHARED_ACCOUNT is properly handled (might need PAM config)
            if response.get('status_code') in [400, 501]:
                data = response.get('data', {})
                if isinstance(data, dict) and 'error' in data:
                    error_msg = data['error']
                    if 'SHARED_ACCOUNT' in error_msg or 'not supported' in error_msg.lower():
                        self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", True, 
                                     "Properly rejects SHARED_ACCOUNT without PAM config")
                    else:
                        self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", True, 
                                     f"Returns appropriate error: {error_msg}")
                else:
                    self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", False, 
                                 f"Invalid error response: {data}")
            else:
                self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", False, 
                             f"Expected 400/501, got {response.get('status_code')}")
        
        # Test missing required fields
        for plugin_key in ['ga4', 'gtm']:
            # Test with missing accessToken
            test_payload = {
                "target": self.test_configs[plugin_key]['target'],
                "role": self.test_configs[plugin_key]['role'],
                "identity": self.test_configs[plugin_key]['identity'],
                "accessItemType": "NAMED_INVITE"
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
            
            if response.get('status_code') == 400:
                self.log_test(f"{plugin_key} missing accessToken", True, 
                             "Correctly returns 400 for missing required fields")
            else:
                self.log_test(f"{plugin_key} missing accessToken", False, 
                             f"Expected 400, got {response.get('status_code')}")

    def test_capabilities_endpoint(self):
        """Test 6: Capabilities Endpoint - GET /api/plugins/{pluginKey}/capabilities"""
        print("\n=== Test 6: Capabilities Endpoint ===")
        
        for plugin_key in self.test_configs.keys():
            response = self.make_request('GET', f'plugins/{plugin_key}/capabilities')
            
            if response.get('status_code') != 200:
                self.log_test(f"{plugin_key} capabilities", False, 
                             f"API returned {response.get('status_code')}: {response.get('data')}")
                continue
            
            data = response.get('data', {})
            if not isinstance(data, dict) or not data.get('success'):
                self.log_test(f"{plugin_key} capabilities", False, 
                             f"Invalid response format: {data}")
                continue
            
            capabilities = data.get('data', {})
            
            # Check if canRevokeAccess field is included in accessTypeCapabilities
            access_caps = capabilities.get('accessTypeCapabilities', {})
            has_revoke_access = False
            
            for access_type, capability in access_caps.items():
                if isinstance(capability, dict):
                    if 'canRevokeAccess' in capability:
                        has_revoke_access = True
                        break
                    elif 'default' in capability and 'canRevokeAccess' in capability['default']:
                        has_revoke_access = True
                        break
            
            if has_revoke_access:
                self.log_test(f"{plugin_key} capabilities", True, 
                             "Capabilities include canRevokeAccess field")
            else:
                self.log_test(f"{plugin_key} capabilities", False, 
                             "canRevokeAccess field missing from capabilities")

    def test_effective_capabilities(self):
        """Test 7: Effective Capabilities - GET /api/plugins/{pluginKey}/effective-capabilities"""
        print("\n=== Test 7: Effective Capabilities ===")
        
        # Test GA4 with SHARED_ACCOUNT and different PAM configurations
        test_cases = [
            {
                'params': {
                    'accessItemType': 'SHARED_ACCOUNT'
                },
                'expected_can_revoke': False,  # Default should require evidence
                'description': 'SHARED_ACCOUNT without PAM config'
            },
            {
                'params': {
                    'accessItemType': 'SHARED_ACCOUNT',
                    'pamOwnership': 'AGENCY_OWNED',
                    'identityPurpose': 'HUMAN_INTERACTIVE'
                },
                'expected_can_revoke': True,  # Should enable OAuth+grant+verify
                'description': 'AGENCY_OWNED + HUMAN_INTERACTIVE'
            },
            {
                'params': {
                    'accessItemType': 'SHARED_ACCOUNT', 
                    'pamOwnership': 'CLIENT_OWNED'
                },
                'expected_can_revoke': False,  # Should require evidence
                'description': 'CLIENT_OWNED'
            },
            {
                'params': {
                    'accessItemType': 'NAMED_INVITE'
                },
                'expected_can_revoke': True,  # Should be unchanged
                'description': 'NAMED_INVITE (unchanged)'
            }
        ]
        
        for test_case in test_cases:
            params = test_case['params']
            query_string = '&'.join([f'{k}={v}' for k, v in params.items()])
            
            response = self.make_request('GET', f'plugins/ga4/effective-capabilities?{query_string}')
            
            if response.get('status_code') != 200:
                self.log_test(f"GA4 effective-capabilities {test_case['description']}", False, 
                             f"API returned {response.get('status_code')}: {response.get('data')}")
                continue
            
            data = response.get('data', {})
            if not isinstance(data, dict) or not data.get('success'):
                self.log_test(f"GA4 effective-capabilities {test_case['description']}", False, 
                             f"Invalid response format: {data}")
                continue
            
            effective_caps = data.get('data', {}).get('effectiveCapabilities', {})
            actual_can_revoke = effective_caps.get('canRevokeAccess', False)
            expected_can_revoke = test_case['expected_can_revoke']
            
            if actual_can_revoke == expected_can_revoke:
                self.log_test(f"GA4 effective-capabilities {test_case['description']}", True, 
                             f"canRevokeAccess correctly set to {actual_can_revoke}")
            else:
                self.log_test(f"GA4 effective-capabilities {test_case['description']}", False, 
                             f"Expected canRevokeAccess={expected_can_revoke}, got {actual_can_revoke}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Unified AccessProvisioningPlugin Interface Tests")
        print(f"🔗 Base URL: {self.base_url}")
        
        try:
            self.test_plugin_manifest_validation()
            self.test_grant_access_endpoints()
            self.test_verify_access_endpoints()
            self.test_revoke_access_endpoints()
            self.test_validation_edge_cases()
            self.test_capabilities_endpoint()
            self.test_effective_capabilities()
        except Exception as e:
            print(f"\n❌ Test execution failed: {str(e)}")
            return False
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*80}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.total_tests - self.passed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests*100):.1f}%" if self.total_tests > 0 else "0%")
        
        # Print failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['test']}: {test['message']}")
        
        print(f"\n{'='*80}")
        
        return self.passed_tests == self.total_tests


def main():
    """Main test execution"""
    tester = PluginInterfaceTest()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("🎉 All tests passed! The unified AccessProvisioningPlugin interface is working correctly.")
            sys.exit(0)
        else:
            print("⚠️ Some tests failed. Check the summary above for details.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()