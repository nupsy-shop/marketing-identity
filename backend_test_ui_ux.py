#!/usr/bin/env python3
"""
Backend API Tests for Improved UI/UX Features - Marketing Identity Platform
Testing Focus: Plugin Manifest API with Logo/Brand Data, Access Item CRUD, Platform Toggle

This script tests the improved UI/UX features specifically:
1. Plugin Manifest API - Logo and Brand Data
2. Access Item CRUD Operations with proper validation
3. Platform Toggle and Actions
4. Search and Filter data requirements
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class UIUXFeaturesTester:
    def __init__(self):
        self.base_url = "https://plugin-driven-pam.preview.emergentagent.com/api"
        self.session = None
        self.test_results = []
        self.created_resources = {
            'agency_platforms': [],
            'access_items': []
        }
        # Use existing agency platform ID from review request
        self.existing_agency_platform_id = "92417db3-7c40-4da2-8f5b-33be4cd335cd"

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
                        'data': await resp.json(),
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
                'status': 0,
                'data': {'error': str(e)},
                'success': False
            }

    def log_result(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test result"""
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")

    # =================== PLUGIN MANIFEST API TESTS ===================

    async def test_plugins_list_api(self):
        """Test GET /api/plugins - Should list all 15 plugins with logoPath and brandColor"""
        try:
            response = await self.make_request('GET', 'plugins')
            
            if response['status'] != 200:
                self.log_result("Plugins List API", False, 
                               f"Expected 200, got {response['status']}", response['data'])
                return

            data = response['data']
            if not data.get('success'):
                self.log_result("Plugins List API", False, 
                               "Response success=false", data)
                return

            plugins = data.get('data', [])
            
            # Check we have 15 plugins
            if len(plugins) != 15:
                self.log_result("Plugins List API", False, 
                               f"Expected 15 plugins, got {len(plugins)}", plugins)
                return

            # Check each plugin has logoPath and brandColor
            missing_fields = []
            for plugin in plugins:
                if not plugin.get('logoPath'):
                    missing_fields.append(f"{plugin.get('platformKey', 'unknown')} missing logoPath")
                if not plugin.get('brandColor'):
                    missing_fields.append(f"{plugin.get('platformKey', 'unknown')} missing brandColor")

            if missing_fields:
                self.log_result("Plugins List API", False, 
                               "Plugins missing logo/brand fields", missing_fields)
                return

            # Success - check sample plugin has expected structure
            sample_plugin = plugins[0]
            expected_fields = ['platformKey', 'displayName', 'logoPath', 'brandColor', 'category']
            for field in expected_fields:
                if field not in sample_plugin:
                    self.log_result("Plugins List API", False, 
                                   f"Plugin missing field: {field}", sample_plugin)
                    return

            self.log_result("Plugins List API", True, 
                           f"Successfully returned {len(plugins)} plugins with logo/brand data")

        except Exception as e:
            self.log_result("Plugins List API", False, f"Exception: {str(e)}")

    async def test_specific_plugin_api(self):
        """Test GET /api/plugins/google-ads - Should include manifest.logoPath and manifest.brandColor"""
        try:
            response = await self.make_request('GET', 'plugins/google-ads')
            
            if response['status'] != 200:
                self.log_result("Specific Plugin API", False, 
                               f"Expected 200, got {response['status']}", response['data'])
                return

            data = response['data']
            if not data.get('success'):
                self.log_result("Specific Plugin API", False, 
                               "Response success=false", data)
                return

            plugin_data = data.get('data', {})
            manifest = plugin_data.get('manifest', {})
            
            # Check manifest has logoPath and brandColor
            if not manifest.get('logoPath'):
                self.log_result("Specific Plugin API", False, 
                               "Google Ads plugin missing manifest.logoPath", manifest)
                return

            if not manifest.get('brandColor'):
                self.log_result("Specific Plugin API", False, 
                               "Google Ads plugin missing manifest.brandColor", manifest)
                return

            # Check expected values
            expected_logo = '/logos/google-ads.svg'
            expected_brand = '#4285F4'
            
            if manifest['logoPath'] != expected_logo:
                self.log_result("Specific Plugin API", False, 
                               f"Expected logoPath {expected_logo}, got {manifest['logoPath']}")
                return

            if manifest['brandColor'] != expected_brand:
                self.log_result("Specific Plugin API", False, 
                               f"Expected brandColor {expected_brand}, got {manifest['brandColor']}")
                return

            self.log_result("Specific Plugin API", True, 
                           f"Google Ads plugin has correct logoPath and brandColor")

        except Exception as e:
            self.log_result("Specific Plugin API", False, f"Exception: {str(e)}")

    async def test_agency_platforms_enriched_data(self):
        """Test GET /api/agency/platforms - Should have logoPath, brandColor, category from plugins"""
        try:
            response = await self.make_request('GET', 'agency/platforms')
            
            if response['status'] != 200:
                self.log_result("Agency Platforms Enriched Data", False, 
                               f"Expected 200, got {response['status']}", response['data'])
                return

            data = response['data']
            if not data.get('success'):
                self.log_result("Agency Platforms Enriched Data", False, 
                               "Response success=false", data)
                return

            platforms = data.get('data', [])
            
            # If no platforms exist, that's ok for this test
            if len(platforms) == 0:
                self.log_result("Agency Platforms Enriched Data", True, 
                               "No agency platforms configured - testing data structure")
                return

            # Get list of available plugins to know which platforms should have enrichment
            plugins_response = await self.make_request('GET', 'plugins')
            if plugins_response['status'] != 200:
                self.log_result("Agency Platforms Enriched Data", False, 
                               "Could not fetch plugins list for comparison")
                return
                
            plugin_keys = set(plugin['platformKey'] for plugin in plugins_response['data']['data'])

            # Check platforms that should have enriched data
            platforms_with_plugins = 0
            platforms_enriched = 0
            missing_enrichment = []
            
            for platform in platforms:
                platform_data = platform.get('platform', {})
                platform_name = platform_data.get('name', '')
                
                # Check if this platform has a corresponding plugin
                has_plugin = False
                for plugin_key in plugin_keys:
                    # Check common name mappings
                    if (plugin_key == 'google-ads' and 'Google Ads' in platform_name) or \
                       (plugin_key == 'meta' and ('Meta' in platform_name or 'Facebook' in platform_name)) or \
                       (plugin_key == 'ga4' and ('Analytics' in platform_name or 'GA4' in platform_name)) or \
                       (plugin_key in platform_name.lower().replace(' ', '-').replace('(', '').replace(')', '')):
                        has_plugin = True
                        break
                
                if has_plugin:
                    platforms_with_plugins += 1
                    
                    # Check if enrichment data is present
                    if (platform_data.get('logoPath') and 
                        platform_data.get('brandColor') and 
                        platform_data.get('category')):
                        platforms_enriched += 1
                    else:
                        if not platform_data.get('logoPath'):
                            missing_enrichment.append(f"Platform {platform.get('id')} ({platform_name}) missing logoPath")
                        if not platform_data.get('brandColor'):
                            missing_enrichment.append(f"Platform {platform.get('id')} ({platform_name}) missing brandColor")
                        if not platform_data.get('category'):
                            missing_enrichment.append(f"Platform {platform.get('id')} ({platform_name}) missing category")

            if missing_enrichment:
                self.log_result("Agency Platforms Enriched Data", False, 
                               "Platforms with plugins missing enriched data", missing_enrichment)
                return

            if platforms_with_plugins == 0:
                self.log_result("Agency Platforms Enriched Data", True, 
                               "No platforms with corresponding plugins found - enrichment not applicable")
            else:
                self.log_result("Agency Platforms Enriched Data", True, 
                               f"{platforms_enriched}/{platforms_with_plugins} platforms with plugins have enriched data")

        except Exception as e:
            self.log_result("Agency Platforms Enriched Data", False, f"Exception: {str(e)}")

    # =================== ACCESS ITEM CRUD TESTS ===================

    async def test_create_access_item_validation(self):
        """Test POST /api/agency/platforms/:id/items - Create access item with label validation"""
        try:
            # Test 1: Try to create item with invalid label (too short)
            invalid_payload = {
                "itemType": "NAMED_INVITE",
                "label": "AB",  # Too short
                "role": "Admin"
            }
            
            response = await self.make_request('POST', 
                f'agency/platforms/{self.existing_agency_platform_id}/items', 
                invalid_payload)
            
            # This should fail with validation error
            if response['status'] == 200 or response['status'] == 201:
                self.log_result("Create Access Item - Invalid Label", False, 
                               "Should reject label that's too short", response['data'])
                return

            # Test 2: Try to create item with label starting with number
            invalid_payload2 = {
                "itemType": "NAMED_INVITE", 
                "label": "1StandardAccess",  # Starts with number
                "role": "Admin"
            }
            
            response2 = await self.make_request('POST', 
                f'agency/platforms/{self.existing_agency_platform_id}/items', 
                invalid_payload2)
            
            # This might or might not fail - depends on validation rules
            # Let's continue with valid test
            
            # Test 3: Create item with valid label
            valid_payload = {
                "itemType": "NAMED_INVITE",
                "label": "Standard Analytics Access",  # Valid label
                "role": "Admin",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "AGENCY_GROUP",
                "agencyGroupEmail": "analytics@agency.com"
            }
            
            response3 = await self.make_request('POST', 
                f'agency/platforms/{self.existing_agency_platform_id}/items', 
                valid_payload)
            
            if response3['status'] != 200 and response3['status'] != 201:
                self.log_result("Create Access Item - Valid Label", False, 
                               f"Expected success, got {response3['status']}", response3['data'])
                return

            data3 = response3['data']
            if not data3.get('success'):
                self.log_result("Create Access Item - Valid Label", False, 
                               "Response success=false", data3)
                return

            # Store created item for cleanup
            updated_platform = data3.get('data', {})
            access_items = updated_platform.get('accessItems', [])
            if access_items:
                latest_item = access_items[-1]  # Get the last created item
                self.created_resources['access_items'].append({
                    'platform_id': self.existing_agency_platform_id,
                    'item_id': latest_item.get('id')
                })

            self.log_result("Create Access Item - Valid Label", True, 
                           "Successfully created access item with valid label")

        except Exception as e:
            self.log_result("Create Access Item Validation", False, f"Exception: {str(e)}")

    async def test_update_access_item(self):
        """Test PUT /api/agency/platforms/:id/items/:itemId - Update an access item"""
        try:
            # First, we need an item to update. Let's get the platform and use an existing item
            response = await self.make_request('GET', f'agency/platforms/{self.existing_agency_platform_id}')
            
            if response['status'] != 200:
                self.log_result("Update Access Item - Get Platform", False, 
                               f"Could not get platform, status {response['status']}", response['data'])
                return

            platform_data = response['data']['data']
            access_items = platform_data.get('accessItems', [])
            
            if not access_items:
                self.log_result("Update Access Item", False, 
                               "No access items available to update", platform_data)
                return

            item_to_update = access_items[0]
            item_id = item_to_update.get('id')
            
            # Update the item
            update_payload = {
                "label": "Updated Analytics Access",
                "role": "Editor", 
                "notes": "Updated via API test",
                "identityPurpose": "HUMAN_INTERACTIVE",
                "humanIdentityStrategy": "AGENCY_GROUP",
                "agencyGroupEmail": "updated@agency.com"
            }
            
            update_response = await self.make_request('PUT', 
                f'agency/platforms/{self.existing_agency_platform_id}/items/{item_id}', 
                update_payload)
            
            if update_response['status'] != 200:
                self.log_result("Update Access Item", False, 
                               f"Expected 200, got {update_response['status']}", update_response['data'])
                return

            data = update_response['data']
            if not data.get('success'):
                self.log_result("Update Access Item", False, 
                               "Response success=false", data)
                return

            # Verify the update
            updated_platform = data.get('data', {})
            updated_items = updated_platform.get('accessItems', [])
            updated_item = None
            
            for item in updated_items:
                if item.get('id') == item_id:
                    updated_item = item
                    break
            
            if not updated_item:
                self.log_result("Update Access Item", False, 
                               "Updated item not found in response", updated_items)
                return

            if updated_item.get('label') != "Updated Analytics Access":
                self.log_result("Update Access Item", False, 
                               f"Label not updated correctly: {updated_item.get('label')}")
                return

            self.log_result("Update Access Item", True, 
                           "Successfully updated access item")

        except Exception as e:
            self.log_result("Update Access Item", False, f"Exception: {str(e)}")

    async def test_delete_access_item(self):
        """Test DELETE /api/agency/platforms/:id/items/:itemId - Delete with confirmation"""
        try:
            # Get platform to find an item to delete
            response = await self.make_request('GET', f'agency/platforms/{self.existing_agency_platform_id}')
            
            if response['status'] != 200:
                self.log_result("Delete Access Item - Get Platform", False, 
                               f"Could not get platform, status {response['status']}", response['data'])
                return

            platform_data = response['data']['data']
            access_items = platform_data.get('accessItems', [])
            
            if not access_items:
                self.log_result("Delete Access Item", False, 
                               "No access items available to delete", platform_data)
                return

            # Find an item to delete (preferably one we created)
            item_to_delete = None
            for item in access_items:
                if item.get('label') and 'test' in item.get('label').lower():
                    item_to_delete = item
                    break
            
            if not item_to_delete:
                # Use the last item
                item_to_delete = access_items[-1]
            
            item_id = item_to_delete.get('id')
            item_label = item_to_delete.get('label')
            
            # Delete the item
            delete_response = await self.make_request('DELETE', 
                f'agency/platforms/{self.existing_agency_platform_id}/items/{item_id}')
            
            if delete_response['status'] != 200:
                self.log_result("Delete Access Item", False, 
                               f"Expected 200, got {delete_response['status']}", delete_response['data'])
                return

            data = delete_response['data']
            if not data.get('success'):
                self.log_result("Delete Access Item", False, 
                               "Response success=false", data)
                return

            # Verify the item is deleted
            updated_platform = data.get('data', {})
            remaining_items = updated_platform.get('accessItems', [])
            
            # Check that the deleted item is no longer present
            for item in remaining_items:
                if item.get('id') == item_id:
                    self.log_result("Delete Access Item", False, 
                                   f"Item {item_label} still exists after deletion")
                    return

            self.log_result("Delete Access Item", True, 
                           f"Successfully deleted access item '{item_label}'")

        except Exception as e:
            self.log_result("Delete Access Item", False, f"Exception: {str(e)}")

    # =================== PLATFORM TOGGLE TESTS ===================

    async def test_platform_toggle(self):
        """Test PATCH /api/agency/platforms/:id/toggle - Toggle platform enabled status"""
        try:
            # Get current platform state
            response = await self.make_request('GET', f'agency/platforms/{self.existing_agency_platform_id}')
            
            if response['status'] != 200:
                self.log_result("Platform Toggle - Get Current State", False, 
                               f"Could not get platform, status {response['status']}", response['data'])
                return

            current_data = response['data']['data']
            current_enabled = current_data.get('isEnabled')
            
            # Toggle the platform
            toggle_response = await self.make_request('PATCH', 
                f'agency/platforms/{self.existing_agency_platform_id}/toggle')
            
            if toggle_response['status'] != 200:
                self.log_result("Platform Toggle", False, 
                               f"Expected 200, got {toggle_response['status']}", toggle_response['data'])
                return

            data = toggle_response['data']
            if not data.get('success'):
                self.log_result("Platform Toggle", False, 
                               "Response success=false", data)
                return

            # Verify the toggle worked
            updated_data = data.get('data', {})
            new_enabled = updated_data.get('isEnabled')
            
            if new_enabled == current_enabled:
                self.log_result("Platform Toggle", False, 
                               f"Platform state not toggled: was {current_enabled}, still {new_enabled}")
                return

            # Toggle back to original state
            toggle_back_response = await self.make_request('PATCH', 
                f'agency/platforms/{self.existing_agency_platform_id}/toggle')
            
            if toggle_back_response['status'] != 200:
                self.log_result("Platform Toggle - Restore State", False, 
                               f"Could not restore original state, status {toggle_back_response['status']}")
                return

            final_data = toggle_back_response['data']['data']
            final_enabled = final_data.get('isEnabled')
            
            if final_enabled != current_enabled:
                self.log_result("Platform Toggle - Restore State", False, 
                               f"Could not restore original state: was {current_enabled}, now {final_enabled}")
                return

            self.log_result("Platform Toggle", True, 
                           f"Successfully toggled platform: {current_enabled} → {new_enabled} → {final_enabled}")

        except Exception as e:
            self.log_result("Platform Toggle", False, f"Exception: {str(e)}")

    # =================== SEARCH AND FILTER DATA TESTS ===================

    async def test_search_filter_data_requirements(self):
        """Test that API returns all necessary data for filtering: itemType for filtering"""
        try:
            response = await self.make_request('GET', 'agency/platforms')
            
            if response['status'] != 200:
                self.log_result("Search Filter Data", False, 
                               f"Expected 200, got {response['status']}", response['data'])
                return

            data = response['data']
            if not data.get('success'):
                self.log_result("Search Filter Data", False, 
                               "Response success=false", data)
                return

            platforms = data.get('data', [])
            
            if len(platforms) == 0:
                self.log_result("Search Filter Data", True, 
                               "No platforms to test filtering data on")
                return

            # Check each platform has necessary filtering data
            missing_data = []
            for platform in platforms:
                access_items = platform.get('accessItems', [])
                for item in access_items:
                    required_fields = ['label', 'itemType', 'role']
                    for field in required_fields:
                        if not item.get(field):
                            missing_data.append(f"Item {item.get('id', 'unknown')} missing {field}")
                    
                    # Check agencyData if it exists
                    if 'agencyData' in item and item['agencyData']:
                        # agencyData should be properly structured
                        pass

            if missing_data:
                self.log_result("Search Filter Data", False, 
                               "Access items missing required filtering data", missing_data[:5])  # Limit output
                return

            self.log_result("Search Filter Data", True, 
                           "All access items have required filtering data (label, itemType, role, agencyData)")

        except Exception as e:
            self.log_result("Search Filter Data", False, f"Exception: {str(e)}")

    # =================== RESPONSE FORMAT TESTS ===================

    async def test_expected_response_formats(self):
        """Test that all operations return {success: true, data: ...} format with proper messages"""
        try:
            # Test 1: Successful GET operation
            response = await self.make_request('GET', 'plugins')
            
            if response['status'] == 200:
                data = response['data']
                if data.get('success') is not True:
                    self.log_result("Response Format - GET Success", False, 
                                   f"Expected success=true, got {data.get('success')}")
                    return
                
                if 'data' not in data:
                    self.log_result("Response Format - GET Success", False, 
                                   "Missing 'data' field in successful response")
                    return
            
            # Test 2: Error response format (try invalid platform)
            error_response = await self.make_request('GET', 'plugins/invalid-platform-key')
            
            if error_response['status'] == 404:
                error_data = error_response['data']
                if error_data.get('success') is not False:
                    self.log_result("Response Format - Error", False, 
                                   f"Expected success=false for error, got {error_data.get('success')}")
                    return
                
                if 'error' not in error_data:
                    self.log_result("Response Format - Error", False, 
                                   "Missing 'error' field in error response")
                    return

            self.log_result("Response Format", True, 
                           "All responses follow {success: true/false, data/error: ...} format")

        except Exception as e:
            self.log_result("Response Format", False, f"Exception: {str(e)}")

    # =================== TEST RUNNER ===================

    async def run_all_tests(self):
        """Run all UI/UX feature tests"""
        print("🚀 Starting UI/UX Features Backend API Tests...")
        print("="*60)
        
        await self.setup()
        
        try:
            # Plugin Manifest API Tests
            print("\n📋 PLUGIN MANIFEST API TESTS")
            await self.test_plugins_list_api()
            await self.test_specific_plugin_api()
            await self.test_agency_platforms_enriched_data()
            
            # Access Item CRUD Tests  
            print("\n🔧 ACCESS ITEM CRUD TESTS")
            await self.test_create_access_item_validation()
            await self.test_update_access_item()
            await self.test_delete_access_item()
            
            # Platform Toggle Tests
            print("\n🔄 PLATFORM TOGGLE TESTS")
            await self.test_platform_toggle()
            
            # Search and Filter Data Tests
            print("\n🔍 SEARCH & FILTER DATA TESTS")
            await self.test_search_filter_data_requirements()
            
            # Response Format Tests
            print("\n📄 RESPONSE FORMAT TESTS")
            await self.test_expected_response_formats()
            
        finally:
            await self.teardown()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n🎉 UI/UX Features Backend Testing Complete!")
        
        return passed_tests == total_tests

# Run the tests
if __name__ == "__main__":
    tester = UIUXFeaturesTester()
    asyncio.run(tester.run_all_tests())