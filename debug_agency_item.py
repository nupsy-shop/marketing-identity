#!/usr/bin/env python3
"""
Debug agency platform item addition
"""

import requests
import json

BASE_URL = "https://access-mgmt-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def debug_agency_item_addition():
    print("=== Debugging Agency Platform Item Addition ===")
    
    # Get existing agency platform
    response = requests.get(f"{API_BASE}/agency/platforms")
    if response.status_code == 200:
        platforms = response.json()['data']
        if platforms:
            agency_platform_id = platforms[0]['id']
            print(f"Using agency platform ID: {agency_platform_id}")
            
            # Try to add item (without client asset fields)
            item_data = {
                "accessPattern": "Named User Access",
                "label": "Debug GA4 Access",
                "role": "Analyst",
                "notes": "Debug test item"
            }
            
            print(f"Item data: {json.dumps(item_data, indent=2)}")
            
            response = requests.post(f"{API_BASE}/agency/platforms/{agency_platform_id}/items", json=item_data)
            print(f"Response status: {response.status_code}")
            
            if response.status_code != 200:
                try:
                    error_data = response.json()
                    print(f"Error response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Error response text: {response.text}")
            else:
                data = response.json()
                print(f"Success response: {json.dumps(data, indent=2)}")
    else:
        print(f"Failed to get agency platforms: {response.status_code}")

if __name__ == "__main__":
    debug_agency_item_addition()