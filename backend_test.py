#!/usr/bin/env python3

import requests
import json
import sys
from time import sleep

BASE_URL = "https://platform-access-3.preview.emergentagent.com/api"

def test_new_agency_architecture():
    """
    Test the new agency-scoped architecture for the Marketing Identity Platform
    """
    print("🚀 Starting New Agency-Scoped Architecture Testing")
    print("=" * 70)
    
    all_tests_passed = True
    test_results = []

    try:
        # Test 1: GET /api/agency/platforms - Should return empty array initially
        print("\n1️⃣ Testing GET /api/agency/platforms (initial empty state)")
        try:
            response = requests.get(f"{BASE_URL}/agency/platforms", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and isinstance(data.get("data"), list) and len(data["data"]) == 0:
                    print("✅ GET /api/agency/platforms returns empty array initially")
                    test_results.append("✅ Agency platforms initial empty state")
                else:
                    print(f"❌ GET /api/agency/platforms - Expected empty array, got: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Agency platforms initial state failed")
            else:
                print(f"❌ GET /api/agency/platforms failed - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Agency platforms GET failed")
        except Exception as e:
            print(f"❌ GET /api/agency/platforms error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Agency platforms GET error")

        # Test 2: Get a real platformId first
        print("\n2️⃣ Getting real platform ID from /api/platforms?clientFacing=true")
        real_platform_id = None
        try:
            response = requests.get(f"{BASE_URL}/platforms?clientFacing=true", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and len(data.get("data", [])) > 0:
                    # Get Google Analytics GA4 or first available platform
                    for platform in data["data"]:
                        if "google-analytics-ga4" in platform.get("id", "").lower():
                            real_platform_id = platform["id"]
                            print(f"✅ Found Google Analytics GA4: {real_platform_id}")
                            break
                    if not real_platform_id:
                        real_platform_id = data["data"][0]["id"]
                        print(f"✅ Using first available platform: {real_platform_id}")
                    test_results.append("✅ Platform selection successful")
                else:
                    print("❌ No client-facing platforms available")
                    all_tests_passed = False
                    test_results.append("❌ No platforms available")
            else:
                print(f"❌ Failed to get platforms - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Platform retrieval failed")
        except Exception as e:
            print(f"❌ Error getting platforms: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Platform retrieval error")

        if not real_platform_id:
            print("❌ Cannot continue without a valid platform ID")
            return False

        # Test 3: POST /api/agency/platforms - Create agency platform
        print(f"\n3️⃣ Testing POST /api/agency/platforms with platformId: {real_platform_id}")
        agency_platform_id = None
        try:
            payload = {"platformId": real_platform_id}
            response = requests.post(f"{BASE_URL}/agency/platforms", 
                                   json=payload, timeout=10)
            if response.status_code in [200, 201]:
                data = response.json()
                if data.get("success"):
                    agency_platform = data.get("data")
                    agency_platform_id = agency_platform.get("id")
                    if (agency_platform.get("platformId") == real_platform_id and 
                        agency_platform.get("isEnabled") == True and 
                        isinstance(agency_platform.get("accessItems"), list) and 
                        len(agency_platform.get("accessItems")) == 0 and
                        "platform" in agency_platform):
                        print("✅ POST /api/agency/platforms created successfully")
                        print(f"   - Agency Platform ID: {agency_platform_id}")
                        print(f"   - Platform ID: {agency_platform.get('platformId')}")
                        print(f"   - Is Enabled: {agency_platform.get('isEnabled')}")
                        print(f"   - Access Items: {len(agency_platform.get('accessItems'))}")
                        test_results.append("✅ Agency platform creation successful")
                    else:
                        print(f"❌ POST /api/agency/platforms - Invalid response structure: {data}")
                        all_tests_passed = False
                        test_results.append("❌ Agency platform creation - invalid structure")
                else:
                    print(f"❌ POST /api/agency/platforms failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Agency platform creation failed")
            else:
                print(f"❌ POST /api/agency/platforms - Status: {response.status_code}, Body: {response.text}")
                all_tests_passed = False
                test_results.append("❌ Agency platform creation - HTTP error")
        except Exception as e:
            print(f"❌ POST /api/agency/platforms error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Agency platform creation error")

        if not agency_platform_id:
            print("❌ Cannot continue without agency platform ID")
            return False

        # Test 4: Test duplicate prevention
        print(f"\n4️⃣ Testing duplicate prevention - POST same platformId again")
        try:
            payload = {"platformId": real_platform_id}
            response = requests.post(f"{BASE_URL}/agency/platforms", 
                                   json=payload, timeout=10)
            if response.status_code == 409:
                data = response.json()
                if not data.get("success") and "already added" in data.get("error", "").lower():
                    print("✅ POST /api/agency/platforms correctly prevents duplicates (409)")
                    test_results.append("✅ Duplicate prevention working")
                else:
                    print(f"❌ Duplicate prevention - Wrong error message: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Duplicate prevention - wrong message")
            else:
                print(f"❌ Duplicate prevention - Expected 409, got: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Duplicate prevention failed")
        except Exception as e:
            print(f"❌ Duplicate prevention error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Duplicate prevention error")

        # Test 5: Test invalid platformId
        print(f"\n5️⃣ Testing invalid platformId")
        try:
            payload = {"platformId": "invalid-platform-id"}
            response = requests.post(f"{BASE_URL}/agency/platforms", 
                                   json=payload, timeout=10)
            if response.status_code == 404:
                data = response.json()
                if not data.get("success") and "not found" in data.get("error", "").lower():
                    print("✅ POST /api/agency/platforms correctly handles invalid platformId (404)")
                    test_results.append("✅ Invalid platform validation working")
                else:
                    print(f"❌ Invalid platform validation - Wrong error message: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Invalid platform validation - wrong message")
            else:
                print(f"❌ Invalid platform validation - Expected 404, got: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Invalid platform validation failed")
        except Exception as e:
            print(f"❌ Invalid platform validation error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Invalid platform validation error")

        # Test 6: GET /api/agency/platforms/:id - Get the platform we just created
        print(f"\n6️⃣ Testing GET /api/agency/platforms/{agency_platform_id}")
        try:
            response = requests.get(f"{BASE_URL}/agency/platforms/{agency_platform_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    agency_platform = data.get("data")
                    if (agency_platform.get("id") == agency_platform_id and 
                        agency_platform.get("platformId") == real_platform_id and
                        "platform" in agency_platform):
                        print("✅ GET /api/agency/platforms/:id working correctly")
                        print(f"   - Retrieved agency platform with ID: {agency_platform.get('id')}")
                        test_results.append("✅ Agency platform retrieval successful")
                    else:
                        print(f"❌ GET /api/agency/platforms/:id - Invalid structure: {data}")
                        all_tests_passed = False
                        test_results.append("❌ Agency platform retrieval - invalid structure")
                else:
                    print(f"❌ GET /api/agency/platforms/:id failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Agency platform retrieval failed")
            else:
                print(f"❌ GET /api/agency/platforms/:id - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Agency platform retrieval - HTTP error")
        except Exception as e:
            print(f"❌ GET /api/agency/platforms/:id error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Agency platform retrieval error")

        # Test 7: POST /api/agency/platforms/:id/items - Add access items
        print(f"\n7️⃣ Testing POST /api/agency/platforms/{agency_platform_id}/items - Adding first item")
        item1_id = None
        try:
            payload = {
                "accessPattern": "2 (Named Invites)",
                "patternLabel": "Named User Access",
                "label": "GA4 - Main Property (Analyst)",
                "role": "Analyst",
                "assetType": "GA4 Property",
                "assetId": "123456"
            }
            response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", 
                                   json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    updated_platform = data.get("data")
                    items = updated_platform.get("accessItems", [])
                    if len(items) == 1:
                        item1 = items[0]
                        item1_id = item1.get("id")
                        if (item1.get("accessPattern") == "2 (Named Invites)" and 
                            item1.get("label") == "GA4 - Main Property (Analyst)" and
                            item1.get("role") == "Analyst" and
                            item1.get("assetType") == "GA4 Property" and
                            item1.get("assetId") == "123456"):
                            print("✅ First access item added successfully")
                            print(f"   - Item ID: {item1_id}")
                            print(f"   - Pattern: {item1.get('accessPattern')}")
                            print(f"   - Label: {item1.get('label')}")
                            print(f"   - Role: {item1.get('role')}")
                            test_results.append("✅ First access item creation successful")
                        else:
                            print(f"❌ First access item - Invalid data: {item1}")
                            all_tests_passed = False
                            test_results.append("❌ First access item - invalid data")
                    else:
                        print(f"❌ Expected 1 access item, got {len(items)}")
                        all_tests_passed = False
                        test_results.append("❌ First access item - wrong count")
                else:
                    print(f"❌ First access item creation failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ First access item creation failed")
            else:
                print(f"❌ First access item - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ First access item - HTTP error")
        except Exception as e:
            print(f"❌ First access item error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ First access item error")

        # Test 8: Add second access item (same platform, different role)
        print(f"\n8️⃣ Testing POST /api/agency/platforms/{agency_platform_id}/items - Adding second item")
        try:
            payload = {
                "accessPattern": "2 (Named Invites)",
                "patternLabel": "Named User Access",
                "label": "GA4 - Dev Property (Viewer)",
                "role": "Viewer",
                "assetType": "GA4 Property",
                "assetId": "789012"
            }
            response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", 
                                   json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    updated_platform = data.get("data")
                    items = updated_platform.get("accessItems", [])
                    if len(items) == 2:
                        print("✅ Second access item added successfully")
                        print(f"   - Total items now: {len(items)}")
                        test_results.append("✅ Second access item creation successful")
                    else:
                        print(f"❌ Expected 2 access items, got {len(items)}")
                        all_tests_passed = False
                        test_results.append("❌ Second access item - wrong count")
                else:
                    print(f"❌ Second access item creation failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Second access item creation failed")
            else:
                print(f"❌ Second access item - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Second access item - HTTP error")
        except Exception as e:
            print(f"❌ Second access item error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Second access item error")

        # Test 9: Add third access item (different pattern)
        print(f"\n9️⃣ Testing POST /api/agency/platforms/{agency_platform_id}/items - Adding third item")
        try:
            payload = {
                "accessPattern": "3 (Group Access)",
                "patternLabel": "Group / Service Account",
                "label": "Agency Group Access",
                "role": "Editor"
            }
            response = requests.post(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items", 
                                   json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    updated_platform = data.get("data")
                    items = updated_platform.get("accessItems", [])
                    if len(items) == 3:
                        print("✅ Third access item added successfully")
                        print(f"   - Total items now: {len(items)}")
                        test_results.append("✅ Third access item creation successful")
                    else:
                        print(f"❌ Expected 3 access items, got {len(items)}")
                        all_tests_passed = False
                        test_results.append("❌ Third access item - wrong count")
                else:
                    print(f"❌ Third access item creation failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Third access item creation failed")
            else:
                print(f"❌ Third access item - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Third access item - HTTP error")
        except Exception as e:
            print(f"❌ Third access item error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Third access item error")

        # Test 10: PUT /api/agency/platforms/:id/items/:itemId - Update an access item
        print(f"\n🔟 Testing PUT /api/agency/platforms/{agency_platform_id}/items/{item1_id} - Update first item")
        if item1_id:
            try:
                payload = {
                    "accessPattern": "2 (Named Invites)",
                    "patternLabel": "Named User Access",
                    "label": "GA4 - Main Property (Analyst) [UPDATED]",
                    "role": "Analyst",
                    "assetType": "GA4 Property",
                    "assetId": "123456"
                }
                response = requests.put(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items/{item1_id}", 
                                      json=payload, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        updated_platform = data.get("data")
                        items = updated_platform.get("accessItems", [])
                        updated_item = next((item for item in items if item.get("id") == item1_id), None)
                        if updated_item and "[UPDATED]" in updated_item.get("label", ""):
                            print("✅ Access item updated successfully")
                            print(f"   - Updated label: {updated_item.get('label')}")
                            test_results.append("✅ Access item update successful")
                        else:
                            print(f"❌ Access item update - Label not updated: {updated_item}")
                            all_tests_passed = False
                            test_results.append("❌ Access item update - label not updated")
                    else:
                        print(f"❌ Access item update failed: {data}")
                        all_tests_passed = False
                        test_results.append("❌ Access item update failed")
                else:
                    print(f"❌ Access item update - Status: {response.status_code}")
                    all_tests_passed = False
                    test_results.append("❌ Access item update - HTTP error")
            except Exception as e:
                print(f"❌ Access item update error: {str(e)}")
                all_tests_passed = False
                test_results.append("❌ Access item update error")
        else:
            print("⚠️ Skipping item update - no item1_id available")
            test_results.append("⚠️ Access item update skipped")

        # Test 11: PATCH /api/agency/platforms/:id/toggle - Toggle isEnabled
        print(f"\n1️⃣1️⃣ Testing PATCH /api/agency/platforms/{agency_platform_id}/toggle - Toggle to false")
        try:
            response = requests.patch(f"{BASE_URL}/agency/platforms/{agency_platform_id}/toggle", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    updated_platform = data.get("data")
                    if updated_platform.get("isEnabled") == False:
                        print("✅ Agency platform toggled to disabled")
                        test_results.append("✅ Platform toggle to disabled successful")
                    else:
                        print(f"❌ Platform still enabled: {updated_platform.get('isEnabled')}")
                        all_tests_passed = False
                        test_results.append("❌ Platform toggle to disabled failed")
                else:
                    print(f"❌ Platform toggle failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Platform toggle failed")
            else:
                print(f"❌ Platform toggle - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Platform toggle - HTTP error")
        except Exception as e:
            print(f"❌ Platform toggle error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Platform toggle error")

        # Test 12: Toggle back to enabled
        print(f"\n1️⃣2️⃣ Testing PATCH /api/agency/platforms/{agency_platform_id}/toggle - Toggle back to true")
        try:
            response = requests.patch(f"{BASE_URL}/agency/platforms/{agency_platform_id}/toggle", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    updated_platform = data.get("data")
                    if updated_platform.get("isEnabled") == True:
                        print("✅ Agency platform toggled back to enabled")
                        test_results.append("✅ Platform toggle to enabled successful")
                    else:
                        print(f"❌ Platform not enabled: {updated_platform.get('isEnabled')}")
                        all_tests_passed = False
                        test_results.append("❌ Platform toggle to enabled failed")
                else:
                    print(f"❌ Platform toggle back failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Platform toggle back failed")
            else:
                print(f"❌ Platform toggle back - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Platform toggle back - HTTP error")
        except Exception as e:
            print(f"❌ Platform toggle back error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Platform toggle back error")

        # Test 13: GET /api/agency/platforms - Should now show the platform with 3 items
        print(f"\n1️⃣3️⃣ Testing GET /api/agency/platforms - Verify platform with 3 items")
        try:
            response = requests.get(f"{BASE_URL}/agency/platforms", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    platforms = data.get("data", [])
                    if len(platforms) == 1:
                        platform = platforms[0]
                        items = platform.get("accessItems", [])
                        if (len(items) == 3 and 
                            platform.get("isEnabled") == True and 
                            platform.get("id") == agency_platform_id):
                            print("✅ Agency platforms list shows 1 platform with 3 items, enabled")
                            print(f"   - Platform ID: {platform.get('id')}")
                            print(f"   - Items count: {len(items)}")
                            print(f"   - Is enabled: {platform.get('isEnabled')}")
                            test_results.append("✅ Agency platforms list verification successful")
                        else:
                            print(f"❌ Platform state incorrect - Items: {len(items)}, Enabled: {platform.get('isEnabled')}")
                            all_tests_passed = False
                            test_results.append("❌ Agency platforms list verification failed")
                    else:
                        print(f"❌ Expected 1 platform, got {len(platforms)}")
                        all_tests_passed = False
                        test_results.append("❌ Agency platforms count incorrect")
                else:
                    print(f"❌ Agency platforms list failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Agency platforms list failed")
            else:
                print(f"❌ Agency platforms list - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Agency platforms list - HTTP error")
        except Exception as e:
            print(f"❌ Agency platforms list error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Agency platforms list error")

        # Test 14: Full end-to-end access request flow
        print(f"\n1️⃣4️⃣ Testing full end-to-end access request flow")
        
        # Create a client first
        print("   Creating test client...")
        client_id = None
        try:
            payload = {"name": "Test Corp", "email": "test@corp.com"}
            response = requests.post(f"{BASE_URL}/clients", json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    client_id = data.get("data", {}).get("id")
                    print(f"   ✅ Client created: {client_id}")
                else:
                    print(f"   ❌ Client creation failed: {data}")
                    all_tests_passed = False
            else:
                print(f"   ❌ Client creation - Status: {response.status_code}")
                all_tests_passed = False
        except Exception as e:
            print(f"   ❌ Client creation error: {str(e)}")
            all_tests_passed = False

        # Create access request using agency items
        if client_id:
            print("   Creating access request with agency items...")
            access_request_token = None
            try:
                payload = {
                    "clientId": client_id,
                    "items": [
                        {
                            "platformId": real_platform_id,
                            "accessPattern": "2 (Named Invites)",
                            "role": "Analyst",
                            "assetType": "GA4 Property",
                            "assetId": "123456",
                            "assetName": "GA4 - Main Property (Analyst)"
                        },
                        {
                            "platformId": real_platform_id,
                            "accessPattern": "3 (Group Access)",
                            "role": "Editor",
                            "assetName": "Agency Group Access"
                        }
                    ]
                }
                response = requests.post(f"{BASE_URL}/access-requests", json=payload, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        access_request = data.get("data")
                        access_request_token = access_request.get("token")
                        items = access_request.get("items", [])
                        if len(items) == 2 and access_request_token:
                            print(f"   ✅ Access request created with token: {access_request_token[:8]}...")
                            print(f"   ✅ Access request has {len(items)} items")
                            test_results.append("✅ End-to-end access request creation successful")
                        else:
                            print(f"   ❌ Access request missing token or items: {access_request}")
                            all_tests_passed = False
                            test_results.append("❌ End-to-end access request creation failed")
                    else:
                        print(f"   ❌ Access request creation failed: {data}")
                        all_tests_passed = False
                        test_results.append("❌ End-to-end access request creation failed")
                else:
                    print(f"   ❌ Access request creation - Status: {response.status_code}")
                    all_tests_passed = False
                    test_results.append("❌ End-to-end access request creation - HTTP error")
            except Exception as e:
                print(f"   ❌ Access request creation error: {str(e)}")
                all_tests_passed = False
                test_results.append("❌ End-to-end access request creation error")

            # Test onboarding link
            if access_request_token:
                print("   Testing onboarding link...")
                try:
                    response = requests.get(f"{BASE_URL}/onboarding/{access_request_token}", timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("success"):
                            onboarding_data = data.get("data")
                            client = onboarding_data.get("client")
                            items = onboarding_data.get("items", [])
                            if (client and client.get("id") == client_id and 
                                len(items) == 2 and 
                                all("platform" in item for item in items)):
                                print("   ✅ Onboarding link returns enriched data")
                                print(f"   ✅ Client: {client.get('name')}")
                                print(f"   ✅ Items with platforms: {len(items)}")
                                test_results.append("✅ End-to-end onboarding link successful")
                            else:
                                print(f"   ❌ Onboarding data incomplete: client={bool(client)}, items={len(items)}")
                                all_tests_passed = False
                                test_results.append("❌ End-to-end onboarding link - incomplete data")
                        else:
                            print(f"   ❌ Onboarding link failed: {data}")
                            all_tests_passed = False
                            test_results.append("❌ End-to-end onboarding link failed")
                    else:
                        print(f"   ❌ Onboarding link - Status: {response.status_code}")
                        all_tests_passed = False
                        test_results.append("❌ End-to-end onboarding link - HTTP error")
                except Exception as e:
                    print(f"   ❌ Onboarding link error: {str(e)}")
                    all_tests_passed = False
                    test_results.append("❌ End-to-end onboarding link error")

        # Test 15: DELETE /api/agency/platforms/:id/items/:itemId - Delete an item
        print(f"\n1️⃣5️⃣ Testing DELETE /api/agency/platforms/{agency_platform_id}/items/{item1_id} - Delete first item")
        if item1_id:
            try:
                response = requests.delete(f"{BASE_URL}/agency/platforms/{agency_platform_id}/items/{item1_id}", timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        updated_platform = data.get("data")
                        items = updated_platform.get("accessItems", [])
                        if len(items) == 2:
                            print("✅ Access item deleted successfully")
                            print(f"   - Remaining items: {len(items)}")
                            test_results.append("✅ Access item deletion successful")
                        else:
                            print(f"❌ Expected 2 items after deletion, got {len(items)}")
                            all_tests_passed = False
                            test_results.append("❌ Access item deletion - wrong count")
                    else:
                        print(f"❌ Access item deletion failed: {data}")
                        all_tests_passed = False
                        test_results.append("❌ Access item deletion failed")
                else:
                    print(f"❌ Access item deletion - Status: {response.status_code}")
                    all_tests_passed = False
                    test_results.append("❌ Access item deletion - HTTP error")
            except Exception as e:
                print(f"❌ Access item deletion error: {str(e)}")
                all_tests_passed = False
                test_results.append("❌ Access item deletion error")
        else:
            print("⚠️ Skipping item deletion - no item1_id available")
            test_results.append("⚠️ Access item deletion skipped")

        # Test 16: DELETE /api/agency/platforms/:id - Remove platform from agency
        print(f"\n1️⃣6️⃣ Testing DELETE /api/agency/platforms/{agency_platform_id} - Remove platform from agency")
        try:
            response = requests.delete(f"{BASE_URL}/agency/platforms/{agency_platform_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print("✅ Agency platform deleted successfully")
                    test_results.append("✅ Agency platform deletion successful")
                else:
                    print(f"❌ Agency platform deletion failed: {data}")
                    all_tests_passed = False
                    test_results.append("❌ Agency platform deletion failed")
            else:
                print(f"❌ Agency platform deletion - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Agency platform deletion - HTTP error")
        except Exception as e:
            print(f"❌ Agency platform deletion error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Agency platform deletion error")

        # Test 17: Verify old routes no longer exist
        print(f"\n1️⃣7️⃣ Testing old client-scoped routes should return 404")
        
        # Test GET /api/clients/:id/configured-apps
        if client_id:
            print("   Testing GET /api/clients/:id/configured-apps...")
            try:
                response = requests.get(f"{BASE_URL}/clients/{client_id}/configured-apps", timeout=10)
                if response.status_code == 404:
                    print("   ✅ GET /api/clients/:id/configured-apps returns 404 (removed)")
                    test_results.append("✅ Old GET configured-apps route properly removed")
                else:
                    print(f"   ❌ GET configured-apps should return 404, got {response.status_code}")
                    all_tests_passed = False
                    test_results.append("❌ Old GET configured-apps route still exists")
            except Exception as e:
                print(f"   ❌ Error testing old GET route: {str(e)}")
                all_tests_passed = False
                test_results.append("❌ Error testing old GET route")

            # Test POST /api/clients/:id/configured-apps
            print("   Testing POST /api/clients/:id/configured-apps...")
            try:
                payload = {"platformId": real_platform_id, "items": []}
                response = requests.post(f"{BASE_URL}/clients/{client_id}/configured-apps", 
                                       json=payload, timeout=10)
                if response.status_code == 404:
                    print("   ✅ POST /api/clients/:id/configured-apps returns 404 (removed)")
                    test_results.append("✅ Old POST configured-apps route properly removed")
                else:
                    print(f"   ❌ POST configured-apps should return 404, got {response.status_code}")
                    all_tests_passed = False
                    test_results.append("❌ Old POST configured-apps route still exists")
            except Exception as e:
                print(f"   ❌ Error testing old POST route: {str(e)}")
                all_tests_passed = False
                test_results.append("❌ Error testing old POST route")

        # Final verification: GET /api/agency/platforms should be empty again
        print(f"\n1️⃣8️⃣ Final verification: GET /api/agency/platforms should be empty")
        try:
            response = requests.get(f"{BASE_URL}/agency/platforms", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and len(data.get("data", [])) == 0:
                    print("✅ Agency platforms back to empty state after deletion")
                    test_results.append("✅ Final state verification successful")
                else:
                    print(f"❌ Agency platforms not empty: {len(data.get('data', []))}")
                    all_tests_passed = False
                    test_results.append("❌ Final state verification failed")
            else:
                print(f"❌ Final verification - Status: {response.status_code}")
                all_tests_passed = False
                test_results.append("❌ Final state verification - HTTP error")
        except Exception as e:
            print(f"❌ Final verification error: {str(e)}")
            all_tests_passed = False
            test_results.append("❌ Final state verification error")

        # Print final summary
        print("\n" + "=" * 70)
        print("🏁 NEW AGENCY-SCOPED ARCHITECTURE TEST RESULTS")
        print("=" * 70)
        
        passed_count = len([r for r in test_results if r.startswith("✅")])
        total_count = len([r for r in test_results if not r.startswith("⚠️")])
        
        print(f"📊 TOTAL TESTS: {total_count}")
        print(f"✅ PASSED: {passed_count}")
        print(f"❌ FAILED: {total_count - passed_count}")
        
        if all_tests_passed:
            print("🎉 ALL TESTS PASSED! New agency-scoped architecture is working perfectly!")
        else:
            print("⚠️  Some tests failed. Review the failures above.")
        
        print("\n📋 Detailed Results:")
        for result in test_results:
            print(f"  {result}")
        
        return all_tests_passed

    except Exception as e:
        print(f"❌ CRITICAL ERROR during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔥 New Agency-Scoped Architecture Backend Testing")
    print("Testing agency platforms, access items, and end-to-end flows")
    print(f"Base URL: {BASE_URL}")
    print()
    
    success = test_new_agency_architecture()
    
    if success:
        print("\n🎉 All agency-scoped architecture tests completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Some agency architecture tests failed!")
        sys.exit(1)