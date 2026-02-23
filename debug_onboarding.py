#!/usr/bin/env python3
"""
Debug script to investigate onboarding test failures
"""

import requests
import json

BASE_URL = "https://plugin-oauth-setup.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def calculate_google_analytics_id():
    """Calculate the stable ID for Google Analytics platform"""
    slug = "google-analytics-ga4"
    hash_val = 0
    for char in slug:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val = hash_val & hash_val
    hex_str = format(abs(hash_val), '08x')
    platform_id = f"{hex_str}-{hex_str[:4]}-4{hex_str[:3]}-8{hex_str[:3]}-{hex_str.ljust(12, '0')}"
    return platform_id

def debug_platforms():
    """Debug platform lookup"""
    print("=== Debugging Platforms ===")
    
    # Get all platforms
    response = requests.get(f"{API_BASE}/platforms?clientFacing=true")
    if response.status_code == 200:
        platforms = response.json()['data']
        print(f"Found {len(platforms)} client-facing platforms")
        
        ga_platform_id = calculate_google_analytics_id()
        print(f"Calculated GA ID: {ga_platform_id}")
        
        # Find Google Analytics
        ga_platform = next((p for p in platforms if 'analytics' in p['name'].lower() or 'ga4' in p['name'].lower()), None)
        
        if ga_platform:
            print(f"Found GA platform: {ga_platform['name']} - ID: {ga_platform['id']}")
            print(f"Does calculated ID match? {ga_platform['id'] == ga_platform_id}")
            return ga_platform['id']
        else:
            print("❌ Google Analytics platform not found")
            # Show first few platforms for reference
            for p in platforms[:5]:
                print(f"  - {p['name']} ({p['id']})")
    else:
        print(f"❌ Failed to get platforms: {response.status_code}")
    
    return None

def debug_access_request(client_id, platform_id):
    """Debug access request creation"""
    print("\n=== Debugging Access Request ===")
    
    access_request_data = {
        "clientId": client_id,
        "items": [{
            "platformId": platform_id,
            "accessPattern": "Named User Access", 
            "role": "Analyst",
            "assetType": "GA4 Property",
            "assetId": "123456789",
            "assetName": "Main Website Property"
        }]
    }
    
    print(f"Request payload: {json.dumps(access_request_data, indent=2)}")
    
    response = requests.post(f"{API_BASE}/access-requests", json=access_request_data)
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

def debug_agency_platform(platform_id):
    """Debug agency platform creation"""
    print("\n=== Debugging Agency Platform ===")
    
    agency_platform_data = {
        "platformId": platform_id
    }
    
    print(f"Request payload: {json.dumps(agency_platform_data, indent=2)}")
    
    response = requests.post(f"{API_BASE}/agency/platforms", json=agency_platform_data)
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

def main():
    print("🔍 DEBUGGING ONBOARDING TEST FAILURES")
    
    # Create a test client first
    client_data = {"name": "Debug Client", "email": "debug@example.com"}
    response = requests.post(f"{API_BASE}/clients", json=client_data)
    
    if response.status_code == 200:
        client = response.json()['data']
        client_id = client['id']
        print(f"✅ Created test client: {client_id}")
        
        # Debug platforms
        platform_id = debug_platforms()
        
        if platform_id:
            # Debug access request
            debug_access_request(client_id, platform_id)
            
            # Debug agency platform
            debug_agency_platform(platform_id)
        
    else:
        print(f"❌ Failed to create test client: {response.status_code}")

if __name__ == "__main__":
    main()