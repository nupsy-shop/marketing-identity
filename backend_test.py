#!/usr/bin/env python3
"""
Backend Test Suite for GA4 grantAccess Functionality
Tests the newly implemented GA4 plugin's ability to programmatically grant access 
to GA4 properties using the GA4 Admin API.
"""

import json
import requests
import sys
from typing import Dict, Any

# Base URL from environment
BASE_URL = "https://oauth-refactor.preview.emergentagent.com"

class GA4GrantAccessTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.passed = 0
        self.failed = 0
    
    def log_result(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details
        })
        
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return (response, success)"""
        url = f"{self.base_url}/api{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers={'Content-Type': 'application/json'})
            elif method.upper() == 'PATCH':
                response = requests.patch(url, json=data, headers={'Content-Type': 'application/json'})
            else:
                return None, False
            
            success = response.status_code == expected_status
            return response, success
            
        except Exception as e:
            print(f"Request failed: {e}")
            return None, False
    
    def test_ga4_capabilities_named_invite(self):
        """Test 1: GA4 NAMED_INVITE capabilities endpoint returns canGrantAccess: true"""
        try:
            response, success = self.make_request('GET', '/plugins/ga4/capabilities/NAMED_INVITE')
            
            if not success:
                self.log_result(
                    "GA4 Capabilities NAMED_INVITE", 
                    False, 
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            capabilities = data.get('data', {}).get('capabilities', {})
            can_grant_access = capabilities.get('canGrantAccess')
            can_verify_access = capabilities.get('canVerifyAccess')
            client_oauth_supported = capabilities.get('clientOAuthSupported')
            
            if can_grant_access is True and can_verify_access is True and client_oauth_supported is True:
                self.log_result(
                    "GA4 Capabilities NAMED_INVITE",
                    True,
                    f"canGrantAccess: {can_grant_access}, canVerifyAccess: {can_verify_access}, clientOAuthSupported: {client_oauth_supported}"
                )
            else:
                self.log_result(
                    "GA4 Capabilities NAMED_INVITE",
                    False,
                    f"Expected canGrantAccess=true, canVerifyAccess=true, clientOAuthSupported=true, got {capabilities}"
                )
                
        except Exception as e:
            self.log_result("GA4 Capabilities NAMED_INVITE", False, f"Exception: {e}")
    
    def test_ga4_capabilities_group_access(self):
        """Test 2: GA4 GROUP_ACCESS capabilities endpoint returns canGrantAccess: true"""
        try:
            response, success = self.make_request('GET', '/plugins/ga4/capabilities/GROUP_ACCESS')
            
            if not success:
                self.log_result(
                    "GA4 Capabilities GROUP_ACCESS", 
                    False, 
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            capabilities = data.get('data', {}).get('capabilities', {})
            can_grant_access = capabilities.get('canGrantAccess')
            can_verify_access = capabilities.get('canVerifyAccess')
            client_oauth_supported = capabilities.get('clientOAuthSupported')
            
            if can_grant_access is True and can_verify_access is True and client_oauth_supported is True:
                self.log_result(
                    "GA4 Capabilities GROUP_ACCESS",
                    True,
                    f"canGrantAccess: {can_grant_access}, canVerifyAccess: {can_verify_access}, clientOAuthSupported: {client_oauth_supported}"
                )
            else:
                self.log_result(
                    "GA4 Capabilities GROUP_ACCESS",
                    False,
                    f"Expected canGrantAccess=true, canVerifyAccess=true, clientOAuthSupported=true, got {capabilities}"
                )
                
        except Exception as e:
            self.log_result("GA4 Capabilities GROUP_ACCESS", False, f"Exception: {e}")
    
    def test_ga4_capabilities_shared_account(self):
        """Test 3: GA4 SHARED_ACCOUNT capabilities should have canGrantAccess: false"""
        try:
            response, success = self.make_request('GET', '/plugins/ga4/capabilities/SHARED_ACCOUNT')
            
            if not success:
                self.log_result(
                    "GA4 Capabilities SHARED_ACCOUNT", 
                    False, 
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            capabilities = data.get('data', {}).get('capabilities', {})
            can_grant_access = capabilities.get('canGrantAccess')
            can_verify_access = capabilities.get('canVerifyAccess')
            requires_evidence = capabilities.get('requiresEvidenceUpload')
            
            if can_grant_access is False and can_verify_access is False and requires_evidence is True:
                self.log_result(
                    "GA4 Capabilities SHARED_ACCOUNT",
                    True,
                    f"canGrantAccess: {can_grant_access}, canVerifyAccess: {can_verify_access}, requiresEvidenceUpload: {requires_evidence}"
                )
            else:
                self.log_result(
                    "GA4 Capabilities SHARED_ACCOUNT",
                    False,
                    f"Expected canGrantAccess=false, canVerifyAccess=false, requiresEvidenceUpload=true, got {capabilities}"
                )
                
        except Exception as e:
            self.log_result("GA4 Capabilities SHARED_ACCOUNT", False, f"Exception: {e}")
    
    def test_ga4_grant_access_missing_fields(self):
        """Test 4: GA4 Grant Access with missing required fields (should return 400)"""
        try:
            # Test with missing accessToken
            payload = {
                "target": "123456789",
                "role": "viewer", 
                "identity": "test@example.com",
                "accessItemType": "NAMED_INVITE"
            }
            
            response, success = self.make_request('POST', '/oauth/ga4/grant-access', payload, expected_status=400)
            
            if success:
                data = response.json()
                error_msg = data.get('error', '')
                if 'accessToken' in error_msg or 'required' in error_msg.lower():
                    self.log_result(
                        "GA4 Grant Access Missing Fields",
                        True,
                        f"Correctly returned 400 with error: {error_msg}"
                    )
                else:
                    self.log_result(
                        "GA4 Grant Access Missing Fields",
                        False,
                        f"400 status but unexpected error message: {error_msg}"
                    )
            else:
                self.log_result(
                    "GA4 Grant Access Missing Fields",
                    False,
                    f"Expected 400 status, got {response.status_code if response else 'No response'}"
                )
                
        except Exception as e:
            self.log_result("GA4 Grant Access Missing Fields", False, f"Exception: {e}")
    
    def test_ga4_grant_access_fake_token(self):
        """Test 5: GA4 Grant Access with fake access token (should return appropriate error)"""
        try:
            payload = {
                "accessToken": "fake_access_token_12345",
                "target": "123456789",
                "role": "viewer",
                "identity": "test@example.com", 
                "accessItemType": "NAMED_INVITE"
            }
            
            response, success = self.make_request('POST', '/oauth/ga4/grant-access', payload, expected_status=401)
            
            # Accept 401, 403, or 400 as valid error responses from Google API
            if response and response.status_code in [400, 401, 403]:
                data = response.json()
                error_msg = data.get('error', '')
                self.log_result(
                    "GA4 Grant Access Fake Token",
                    True,
                    f"Correctly returned {response.status_code} with error: {error_msg}"
                )
            else:
                self.log_result(
                    "GA4 Grant Access Fake Token",
                    False,
                    f"Expected 400/401/403 status, got {response.status_code if response else 'No response'}"
                )
                
        except Exception as e:
            self.log_result("GA4 Grant Access Fake Token", False, f"Exception: {e}")
    
    def test_ga4_grant_access_shared_account(self):
        """Test 6: GA4 Grant Access SHARED_ACCOUNT type (should return 501/error)"""
        try:
            payload = {
                "accessToken": "fake_access_token_12345",
                "target": "123456789",
                "role": "viewer",
                "identity": "test@example.com",
                "accessItemType": "SHARED_ACCOUNT"
            }
            
            response, success = self.make_request('POST', '/oauth/ga4/grant-access', payload, expected_status=400)
            
            if response and response.status_code in [400, 501]:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'shared account' in error_msg or 'pam' in error_msg or 'cannot be granted' in error_msg:
                    self.log_result(
                        "GA4 Grant Access SHARED_ACCOUNT",
                        True,
                        f"Correctly rejected SHARED_ACCOUNT with status {response.status_code}: {data.get('error', '')}"
                    )
                else:
                    self.log_result(
                        "GA4 Grant Access SHARED_ACCOUNT", 
                        False,
                        f"Status {response.status_code} but unexpected error: {data.get('error', '')}"
                    )
            else:
                self.log_result(
                    "GA4 Grant Access SHARED_ACCOUNT",
                    False,
                    f"Expected 400/501 status, got {response.status_code if response else 'No response'}"
                )
                
        except Exception as e:
            self.log_result("GA4 Grant Access SHARED_ACCOUNT", False, f"Exception: {e}")
    
    def test_ga4_oauth_status_regression(self):
        """Test 7: GA4 OAuth Status (regression test)"""
        try:
            response, success = self.make_request('GET', '/oauth/ga4/status')
            
            if not success:
                self.log_result(
                    "GA4 OAuth Status Regression",
                    False,
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            oauth_data = data.get('data', {})
            platform_key = oauth_data.get('platformKey')
            oauth_supported = oauth_data.get('oauthSupported')
            
            if platform_key == 'ga4' and oauth_supported is True:
                self.log_result(
                    "GA4 OAuth Status Regression",
                    True,
                    f"platformKey: {platform_key}, oauthSupported: {oauth_supported}"
                )
            else:
                self.log_result(
                    "GA4 OAuth Status Regression",
                    False,
                    f"Expected platformKey=ga4, oauthSupported=true, got {oauth_data}"
                )
                
        except Exception as e:
            self.log_result("GA4 OAuth Status Regression", False, f"Exception: {e}")
    
    def test_ga4_oauth_start_regression(self):
        """Test 8: GA4 OAuth Start (regression test)"""
        try:
            payload = {
                "redirectUri": f"{self.base_url}/api/oauth/callback",
                "scope": "AGENCY"
            }
            
            response, success = self.make_request('POST', '/oauth/ga4/start', payload)
            
            if not success:
                self.log_result(
                    "GA4 OAuth Start Regression",
                    False,
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            oauth_data = data.get('data', {})
            auth_url = oauth_data.get('authUrl')
            state = oauth_data.get('state')
            
            if auth_url and 'accounts.google.com/oauth' in auth_url and state:
                self.log_result(
                    "GA4 OAuth Start Regression",
                    True,
                    f"Generated OAuth URL with state: {len(state)} characters"
                )
            else:
                self.log_result(
                    "GA4 OAuth Start Regression",
                    False,
                    f"Invalid OAuth response: {oauth_data}"
                )
                
        except Exception as e:
            self.log_result("GA4 OAuth Start Regression", False, f"Exception: {e}")
    
    def test_ga4_verify_access_regression(self):
        """Test 9: GA4 Verify Access (regression test)"""
        try:
            payload = {
                "accessToken": "fake_access_token_12345",
                "target": "123456789",
                "role": "viewer",
                "identity": "test@example.com",
                "accessItemType": "NAMED_INVITE"
            }
            
            response, success = self.make_request('POST', '/oauth/ga4/verify-access', payload, expected_status=401)
            
            # Accept 401, 403, or 400 as valid responses for fake token
            if response and response.status_code in [400, 401, 403]:
                data = response.json()
                error_msg = data.get('error', '')
                self.log_result(
                    "GA4 Verify Access Regression",
                    True,
                    f"Correctly returned {response.status_code} with error: {error_msg}"
                )
            else:
                self.log_result(
                    "GA4 Verify Access Regression",
                    False,
                    f"Expected 400/401/403 status, got {response.status_code if response else 'No response'}"
                )
                
        except Exception as e:
            self.log_result("GA4 Verify Access Regression", False, f"Exception: {e}")
    
    def test_ga4_capability_consistency(self):
        """Test 10: GA4 Overall Capability Consistency"""
        try:
            response, success = self.make_request('GET', '/plugins/ga4/capabilities')
            
            if not success:
                self.log_result(
                    "GA4 Capability Consistency",
                    False,
                    f"HTTP {response.status_code if response else 'No response'}"
                )
                return
            
            data = response.json()
            access_type_caps = data.get('data', {}).get('accessTypeCapabilities', {})
            
            # Check NAMED_INVITE
            named_invite = access_type_caps.get('NAMED_INVITE', {})
            # Check GROUP_ACCESS  
            group_access = access_type_caps.get('GROUP_ACCESS', {})
            # Check SHARED_ACCOUNT
            shared_account = access_type_caps.get('SHARED_ACCOUNT', {})
            
            expected_named_invite = {
                'canGrantAccess': True,
                'canVerifyAccess': True,
                'clientOAuthSupported': True
            }
            
            expected_group_access = {
                'canGrantAccess': True, 
                'canVerifyAccess': True,
                'clientOAuthSupported': True
            }
            
            expected_shared_account = {
                'canGrantAccess': False,
                'canVerifyAccess': False,
                'requiresEvidenceUpload': True
            }
            
            issues = []
            
            # Validate NAMED_INVITE
            for key, expected_val in expected_named_invite.items():
                if named_invite.get(key) != expected_val:
                    issues.append(f"NAMED_INVITE.{key}: expected {expected_val}, got {named_invite.get(key)}")
            
            # Validate GROUP_ACCESS
            for key, expected_val in expected_group_access.items():
                if group_access.get(key) != expected_val:
                    issues.append(f"GROUP_ACCESS.{key}: expected {expected_val}, got {group_access.get(key)}")
            
            # Validate SHARED_ACCOUNT
            for key, expected_val in expected_shared_account.items():
                if shared_account.get(key) != expected_val:
                    issues.append(f"SHARED_ACCOUNT.{key}: expected {expected_val}, got {shared_account.get(key)}")
            
            if not issues:
                self.log_result(
                    "GA4 Capability Consistency",
                    True,
                    "All access type capabilities match expected values"
                )
            else:
                self.log_result(
                    "GA4 Capability Consistency", 
                    False,
                    f"Capability mismatches: {'; '.join(issues)}"
                )
                
        except Exception as e:
            self.log_result("GA4 Capability Consistency", False, f"Exception: {e}")
    
    def test_ga4_grant_access_endpoint_exists(self):
        """Test 11: GA4 Grant Access endpoint exists and handles requests"""
        try:
            # Try with completely missing body to see if endpoint exists
            response, success = self.make_request('POST', '/oauth/ga4/grant-access', {}, expected_status=400)
            
            if response and response.status_code == 400:
                data = response.json()
                error_msg = data.get('error', '').lower()
                # Should get a validation error about missing fields, not a 404
                if 'required' in error_msg or 'missing' in error_msg or 'accesstoken' in error_msg:
                    self.log_result(
                        "GA4 Grant Access Endpoint Exists",
                        True,
                        f"Endpoint exists and validates input: {data.get('error', '')}"
                    )
                else:
                    self.log_result(
                        "GA4 Grant Access Endpoint Exists",
                        False,
                        f"Endpoint exists but unexpected error: {data.get('error', '')}"
                    )
            elif response and response.status_code == 404:
                self.log_result(
                    "GA4 Grant Access Endpoint Exists",
                    False,
                    "Grant access endpoint not found (404)"
                )
            else:
                self.log_result(
                    "GA4 Grant Access Endpoint Exists",
                    False,
                    f"Unexpected response: {response.status_code if response else 'No response'}"
                )
                
        except Exception as e:
            self.log_result("GA4 Grant Access Endpoint Exists", False, f"Exception: {e}")
    
    def run_all_tests(self):
        """Run all GA4 grantAccess tests"""
        print("🚀 Starting GA4 Grant Access Functionality Tests")
        print(f"🌍 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Test GA4 capabilities endpoints
        print("\n📊 Testing GA4 Capabilities Endpoints:")
        self.test_ga4_capabilities_named_invite()
        self.test_ga4_capabilities_group_access()
        self.test_ga4_capabilities_shared_account()
        
        # Test GA4 grant access endpoint
        print("\n🔐 Testing GA4 Grant Access Endpoint:")
        self.test_ga4_grant_access_endpoint_exists()
        self.test_ga4_grant_access_missing_fields()
        self.test_ga4_grant_access_fake_token()
        self.test_ga4_grant_access_shared_account()
        
        # Test regression scenarios
        print("\n🔄 Testing GA4 Regression Scenarios:")
        self.test_ga4_oauth_status_regression()
        self.test_ga4_oauth_start_regression()
        self.test_ga4_verify_access_regression()
        
        # Test overall capability consistency
        print("\n✅ Testing GA4 Capability Consistency:")
        self.test_ga4_capability_consistency()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 GA4 GRANT ACCESS TEST SUMMARY")
        print("=" * 80)
        
        total_tests = self.passed + self.failed
        success_rate = (self.passed / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📈 Success Rate: {success_rate:.1f}% ({self.passed}/{total_tests} tests passed)")
        
        if self.failed > 0:
            print(f"\n❌ FAILED TESTS ({self.failed}):")
            for result in self.test_results:
                if not result['passed']:
                    print(f"   • {result['test']}: {result['details']}")
        
        if self.passed == total_tests:
            print("\n🎉 ALL GA4 GRANT ACCESS TESTS PASSED! 🎉")
            print("✅ The GA4 plugin grantAccess functionality is working correctly.")
        else:
            print(f"\n⚠️  {self.failed} tests failed. Please review the implementation.")
        
        return self.failed == 0

if __name__ == '__main__':
    tester = GA4GrantAccessTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)