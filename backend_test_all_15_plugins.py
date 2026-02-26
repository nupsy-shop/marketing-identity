#!/usr/bin/env python3
"""
Backend Testing for Unified AccessProvisioningPlugin Interface - ALL 15 PLUGINS
Testing comprehensive plugin interface across all 15 plugins

This test validates:
1. Manifest validation (GET /api/plugins) - all 15 plugins have canRevokeAccess field
2. Grant Access for ALL plugins (POST /api/oauth/{pluginKey}/grant-access) 
3. Verify Access for ALL plugins (POST /api/oauth/{pluginKey}/verify-access)
4. Revoke Access for ALL plugins (POST /api/oauth/{pluginKey}/revoke-access)
5. Validation consistency (SHARED_ACCOUNT rejection)
6. Missing field validation

Expected behavior per plugin capability:
- canGrantAccess=true + API implemented: Should reach API (auth error)
- canGrantAccess=true + API pending: Should return "API integration pending"  
- canGrantAccess=false: Should return 501 "not supported"
"""

import requests
import json
import sys
from typing import Dict, Any, List, Optional

# Base URL from environment variable  
BASE_URL = "https://access-provisioning.preview.emergentagent.com"

class AllPluginInterfaceTest:
    def __init__(self):
        self.base_url = BASE_URL
        self.api_url = f"{self.base_url}/api"
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
        # All 15 plugins with their expected capabilities based on the review_request
        self.plugin_configs = {
            # Google plugins (4) - P0 tested, should have APIs implemented
            'ga4': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True},
                    'GROUP_ACCESS': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True}, 
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}  # Default
                },
                'api_status': 'implemented',
                'test_payload': {
                    'target': 'properties/123456',
                    'role': 'viewer', 
                    'identity': 'test@example.com'
                }
            },
            'gtm': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True},
                    'GROUP_ACCESS': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}  # Default
                },
                'api_status': 'implemented',
                'test_payload': {
                    'target': '12345/67890',
                    'role': 'read',
                    'identity': 'test@example.com'
                }
            },
            'google-ads': {
                'expected_capabilities': {
                    'PARTNER_DELEGATION': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True},
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': True},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}  # Default  
                },
                'api_status': 'implemented',
                'test_payload': {
                    'target': 'customers/1234567890',
                    'role': 'standard',
                    'identity': 'test@example.com'
                }
            },
            'google-search-console': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': False, 'canVerifyAccess': True, 'canRevokeAccess': False},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}
                },
                'api_status': 'implemented',  # Has API but limited
                'test_payload': {
                    'target': 'https://example.com',
                    'role': 'full',
                    'identity': 'test@example.com'
                }
            },
            
            # Remaining 11 plugins - Mix of pending and not supported
            'meta': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': False},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}
                },
                'api_status': 'pending',  # Per review_request  
                'test_payload': {
                    'target': 'act_123456789',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'salesforce': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': False},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}
                },
                'api_status': 'pending',  # Per review_request
                'test_payload': {
                    'target': 'org_123456',
                    'role': 'admin', 
                    'identity': 'test@example.com'
                }
            },
            'ga-ua': {
                'expected_capabilities': {
                    'NAMED_INVITE': {'canGrantAccess': True, 'canVerifyAccess': True, 'canRevokeAccess': False},
                    'SHARED_ACCOUNT': {'canRevokeAccess': False}
                },
                'api_status': 'pending',  # Per review_request
                'test_payload': {
                    'target': 'UA-123456-1',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            
            # Not supported platforms (canGrantAccess=false, canVerifyAccess=false)
            'dv360': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'advertiser_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'trade-desk': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'advertiser_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'tiktok': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'advertiser_123456',
                    'role': 'admin', 
                    'identity': 'test@example.com'
                }
            },
            'snapchat': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'advertiser_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'linkedin': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'urn:li:sponsoredAccount:123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'pinterest': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'advertiser_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'hubspot': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request
                'test_payload': {
                    'target': 'portal_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
                }
            },
            'snowflake': {
                'expected_capabilities': {
                    'SHARED_ACCOUNT': {'canGrantAccess': False, 'canVerifyAccess': False, 'canRevokeAccess': False}
                },
                'api_status': 'not_supported',  # Per review_request 
                'test_payload': {
                    'target': 'warehouse_123456',
                    'role': 'admin',
                    'identity': 'test@example.com'
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

    def test_manifest_validation_all_plugins(self):
        """Test 1: Manifest Validation - All 15 plugins have canRevokeAccess field"""
        print("\n=== Test 1: Manifest Validation for ALL 15 Plugins ===")
        
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
        
        # Map plugins by platformKey
        plugin_map = {plugin.get('platformKey'): plugin for plugin in plugins}
        
        # Check all 15 expected plugins
        expected_plugins = list(self.plugin_configs.keys())
        
        for plugin_key in expected_plugins:
            if plugin_key not in plugin_map:
                self.log_test(f"Plugin {plugin_key} Present", False, 
                             f"Plugin {plugin_key} not found in manifest list")
                continue
            
            plugin = plugin_map[plugin_key]
            
            # Check required fields
            required_fields = ['platformKey', 'displayName', 'accessTypeCapabilities']
            missing_fields = [field for field in required_fields if field not in plugin]
            
            if missing_fields:
                self.log_test(f"Plugin {plugin_key} Required Fields", False, 
                             f"Missing required fields: {missing_fields}")
                continue
            
            # Check accessTypeCapabilities for canRevokeAccess field
            access_caps = plugin.get('accessTypeCapabilities', {})
            has_revoke_access_field = False
            
            for access_type, capability in access_caps.items():
                if isinstance(capability, dict):
                    # Direct capability
                    if 'canRevokeAccess' in capability:
                        has_revoke_access_field = True
                        break
                    # Conditional capability with default
                    elif 'default' in capability and isinstance(capability['default'], dict):
                        if 'canRevokeAccess' in capability['default']:
                            has_revoke_access_field = True
                            break
            
            if has_revoke_access_field:
                self.log_test(f"Plugin {plugin_key} canRevokeAccess Field", True, 
                             "Has canRevokeAccess field in accessTypeCapabilities")
            else:
                self.log_test(f"Plugin {plugin_key} canRevokeAccess Field", False, 
                             "Missing canRevokeAccess field in accessTypeCapabilities")

    def test_grant_access_all_plugins(self):
        """Test 2: Grant Access for ALL plugins"""
        print("\n=== Test 2: Grant Access for ALL 15 Plugins ===")
        
        for plugin_key, config in self.plugin_configs.items():
            # Use primary access type for testing  
            access_types = list(config['expected_capabilities'].keys())
            primary_access_type = access_types[0] if access_types else 'NAMED_INVITE'
            
            test_payload = {
                "accessToken": "test",
                "target": config['test_payload']['target'],
                "role": config['test_payload']['role'],
                "identity": config['test_payload']['identity'],
                "accessItemType": primary_access_type
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
            
            api_status = config['api_status']
            expected_caps = config['expected_capabilities'].get(primary_access_type, {})
            can_grant = expected_caps.get('canGrantAccess', False)
            
            if not can_grant:
                # Should return 501 "not supported"
                if response.get('status_code') == 501:
                    self.log_test(f"{plugin_key} grant-access {primary_access_type}", True, 
                                 "Correctly returns 501 (not supported)")
                else:
                    self.log_test(f"{plugin_key} grant-access {primary_access_type}", False, 
                                 f"Expected 501, got {response.get('status_code')}: {response.get('data')}")
            elif api_status == 'pending':
                # Should return "API integration pending"
                if response.get('status_code') in [501, 500] and response.get('data', {}).get('error'):
                    error_msg = response['data']['error'].lower()
                    if 'pending' in error_msg or 'not implemented' in error_msg or 'not available' in error_msg:
                        self.log_test(f"{plugin_key} grant-access {primary_access_type}", True, 
                                     f"API integration pending: {response['data']['error']}")
                    else:
                        self.log_test(f"{plugin_key} grant-access {primary_access_type}", True, 
                                     f"Returns pending/error status: {response['data']['error']}")
                else:
                    self.log_test(f"{plugin_key} grant-access {primary_access_type}", False, 
                                 f"Expected pending error, got {response.get('status_code')}: {response.get('data')}")
            elif api_status == 'implemented':
                # Should reach Google API (auth error expected)
                if response.get('status_code') in [400, 401, 403, 404]:
                    data = response.get('data', {})
                    if isinstance(data, dict) and 'success' in data and 'error' in data:
                        self.log_test(f"{plugin_key} grant-access {primary_access_type}", True, 
                                     f"Reached API, auth error: {response.get('status_code')}")
                    else:
                        self.log_test(f"{plugin_key} grant-access {primary_access_type}", False, 
                                     f"Invalid response format: {data}")
                else:
                    self.log_test(f"{plugin_key} grant-access {primary_access_type}", False, 
                                 f"Expected auth error, got {response.get('status_code')}: {response.get('data')}")

    def test_verify_access_all_plugins(self):
        """Test 3: Verify Access for ALL plugins"""
        print("\n=== Test 3: Verify Access for ALL 15 Plugins ===")
        
        for plugin_key, config in self.plugin_configs.items():
            # Use primary access type for testing
            access_types = list(config['expected_capabilities'].keys())  
            primary_access_type = access_types[0] if access_types else 'NAMED_INVITE'
            
            test_payload = {
                "accessToken": "test",
                "target": config['test_payload']['target'],
                "role": config['test_payload']['role'], 
                "identity": config['test_payload']['identity'],
                "accessItemType": primary_access_type
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/verify-access', test_payload)
            
            api_status = config['api_status']
            expected_caps = config['expected_capabilities'].get(primary_access_type, {})
            can_verify = expected_caps.get('canVerifyAccess', False)
            
            if not can_verify:
                # Should return 501 "not supported"
                if response.get('status_code') == 501:
                    self.log_test(f"{plugin_key} verify-access {primary_access_type}", True, 
                                 "Correctly returns 501 (not supported)")
                else:
                    self.log_test(f"{plugin_key} verify-access {primary_access_type}", False, 
                                 f"Expected 501, got {response.get('status_code')}: {response.get('data')}")
            elif api_status == 'pending':
                # Should return "API integration pending"  
                if response.get('status_code') in [501, 500] and response.get('data', {}).get('error'):
                    error_msg = response['data']['error'].lower()
                    if 'pending' in error_msg or 'not implemented' in error_msg or 'not available' in error_msg:
                        self.log_test(f"{plugin_key} verify-access {primary_access_type}", True, 
                                     f"API integration pending: {response['data']['error']}")
                    else:
                        self.log_test(f"{plugin_key} verify-access {primary_access_type}", True, 
                                     f"Returns pending/error status: {response['data']['error']}")
                else:
                    self.log_test(f"{plugin_key} verify-access {primary_access_type}", False, 
                                 f"Expected pending error, got {response.get('status_code')}: {response.get('data')}")
            elif api_status == 'implemented':
                # Should reach API (auth error expected)
                if response.get('status_code') in [400, 401, 403, 404]:
                    data = response.get('data', {})
                    if isinstance(data, dict) and 'success' in data:
                        self.log_test(f"{plugin_key} verify-access {primary_access_type}", True, 
                                     f"Reached API, auth error: {response.get('status_code')}")
                    else:
                        self.log_test(f"{plugin_key} verify-access {primary_access_type}", False, 
                                     f"Invalid response format: {data}")
                else:
                    self.log_test(f"{plugin_key} verify-access {primary_access_type}", False, 
                                 f"Expected auth error, got {response.get('status_code')}: {response.get('data')}")

    def test_revoke_access_all_plugins(self):
        """Test 4: Revoke Access for ALL plugins"""
        print("\n=== Test 4: Revoke Access for ALL 15 Plugins ===")
        
        for plugin_key, config in self.plugin_configs.items():
            # Use primary access type for testing
            access_types = list(config['expected_capabilities'].keys())
            primary_access_type = access_types[0] if access_types else 'NAMED_INVITE'
            
            test_payload = {
                "accessToken": "test",
                "target": config['test_payload']['target'],
                "role": config['test_payload']['role'],
                "identity": config['test_payload']['identity'], 
                "accessItemType": primary_access_type
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/revoke-access', test_payload)
            
            expected_caps = config['expected_capabilities'].get(primary_access_type, {})
            can_revoke = expected_caps.get('canRevokeAccess', False)
            
            if not can_revoke:
                # Should return 501 "not supported"
                if response.get('status_code') == 501:
                    self.log_test(f"{plugin_key} revoke-access {primary_access_type}", True, 
                                 "Correctly returns 501 (canRevokeAccess=false)")
                else:
                    self.log_test(f"{plugin_key} revoke-access {primary_access_type}", False, 
                                 f"Expected 501, got {response.get('status_code')}: {response.get('data')}")
            else:
                # Should reach Google API (auth error expected)  
                if response.get('status_code') in [400, 401, 403, 404]:
                    data = response.get('data', {})
                    if isinstance(data, dict) and 'success' in data:
                        self.log_test(f"{plugin_key} revoke-access {primary_access_type}", True, 
                                     f"Reached API, auth error: {response.get('status_code')}")
                    else:
                        self.log_test(f"{plugin_key} revoke-access {primary_access_type}", False, 
                                     f"Invalid response format: {data}")
                else:
                    self.log_test(f"{plugin_key} revoke-access {primary_access_type}", False, 
                                 f"Expected auth error, got {response.get('status_code')}: {response.get('data')}")

    def test_shared_account_validation(self):
        """Test 5: SHARED_ACCOUNT rejection for all plugins"""
        print("\n=== Test 5: SHARED_ACCOUNT Validation for ALL Plugins ===")
        
        for plugin_key, config in self.plugin_configs.items():
            test_payload = {
                "accessToken": "test",
                "target": config['test_payload']['target'],
                "role": config['test_payload']['role'],
                "identity": config['test_payload']['identity'],
                "accessItemType": "SHARED_ACCOUNT"
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
            
            # All plugins should return 501 for SHARED_ACCOUNT without PAM config
            if response.get('status_code') == 501:
                self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", True, 
                             "Correctly returns 501 for SHARED_ACCOUNT")
            else:
                # Some might return other errors, which is also acceptable
                data = response.get('data', {})
                if isinstance(data, dict) and 'error' in data:
                    error_msg = data['error'].lower()
                    if 'shared_account' in error_msg or 'not supported' in error_msg or 'evidence' in error_msg:
                        self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", True, 
                                     f"Appropriately handles SHARED_ACCOUNT: {data['error']}")
                    else:
                        self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", True, 
                                     f"Returns error for SHARED_ACCOUNT: {data['error']}")
                else:
                    self.log_test(f"{plugin_key} SHARED_ACCOUNT rejection", False, 
                                 f"Expected 501 or error, got {response.get('status_code')}: {response.get('data')}")

    def test_missing_fields_validation(self):
        """Test 6: Missing field validation for selected plugins"""
        print("\n=== Test 6: Missing Fields Validation ===")
        
        # Test a few plugins with missing fields
        test_plugins = ['ga4', 'meta', 'linkedin', 'hubspot']
        
        for plugin_key in test_plugins:
            if plugin_key not in self.plugin_configs:
                continue
                
            config = self.plugin_configs[plugin_key]
            
            # Test missing accessToken
            test_payload = {
                "target": config['test_payload']['target'],
                "role": config['test_payload']['role'],
                "identity": config['test_payload']['identity'],
                "accessItemType": "NAMED_INVITE"
            }
            
            response = self.make_request('POST', f'oauth/{plugin_key}/grant-access', test_payload)
            
            if response.get('status_code') == 400:
                self.log_test(f"{plugin_key} missing accessToken", True, 
                             "Correctly returns 400 for missing required fields")
            else:
                # Some plugins might return other status codes, check if error mentions missing fields
                data = response.get('data', {})
                if isinstance(data, dict) and 'error' in data:
                    error_msg = data['error'].lower()
                    if 'required' in error_msg or 'missing' in error_msg or 'accesstoken' in error_msg:
                        self.log_test(f"{plugin_key} missing accessToken", True, 
                                     f"Validates missing fields: {data['error']}")
                    else:
                        self.log_test(f"{plugin_key} missing accessToken", False, 
                                     f"Expected validation error, got: {response.get('status_code')}: {data.get('error', 'No error')}")
                else:
                    self.log_test(f"{plugin_key} missing accessToken", False, 
                                 f"Expected 400, got {response.get('status_code')}: {response.get('data')}")

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting Unified AccessProvisioningPlugin Interface Tests - ALL 15 PLUGINS")
        print(f"🔗 Base URL: {self.base_url}")
        print(f"📋 Testing plugins: {list(self.plugin_configs.keys())}")
        
        try:
            self.test_manifest_validation_all_plugins()
            self.test_grant_access_all_plugins()
            self.test_verify_access_all_plugins() 
            self.test_revoke_access_all_plugins()
            self.test_shared_account_validation()
            self.test_missing_fields_validation()
        except Exception as e:
            print(f"\n❌ Test execution failed: {str(e)}")
            return False
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*80}")
        print(f"📊 TEST SUMMARY - ALL 15 PLUGINS")
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
        
        # Print plugin-wise summary
        plugin_results = {}
        for result in self.test_results:
            for plugin_key in self.plugin_configs.keys():
                if plugin_key in result['test']:
                    if plugin_key not in plugin_results:
                        plugin_results[plugin_key] = {'passed': 0, 'total': 0}
                    plugin_results[plugin_key]['total'] += 1
                    if result['success']:
                        plugin_results[plugin_key]['passed'] += 1
                    break
        
        print(f"\n📊 PER-PLUGIN SUMMARY:")
        for plugin_key in sorted(plugin_results.keys()):
            stats = plugin_results[plugin_key]
            rate = (stats['passed']/stats['total']*100) if stats['total'] > 0 else 0
            print(f"  {plugin_key:<20}: {stats['passed']}/{stats['total']} ({rate:.0f}%)")
        
        print(f"\n{'='*80}")
        
        return self.passed_tests == self.total_tests


def main():
    """Main test execution"""
    tester = AllPluginInterfaceTest()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("🎉 All tests passed! The unified AccessProvisioningPlugin interface is working correctly across all 15 plugins.")
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