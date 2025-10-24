#!/usr/bin/env python3
"""
Test script to check if the backend API is working properly
"""
import requests
import json
import sys

def test_endpoint(url, method="GET", data=None, headers=None):
    """Test a single endpoint"""
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        print(f"🔍 Testing: {method} {url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   ✅ SUCCESS")
            try:
                json_data = response.json()
                print(f"   Response: {json.dumps(json_data, indent=2)[:200]}...")
            except:
                print(f"   Response: {response.text[:200]}...")
        else:
            print(f"   ❌ FAILED")
            print(f"   Error: {response.text[:200]}...")
        
        print()
        return response.status_code == 200
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ CONNECTION ERROR: {e}")
        print()
        return False

def main():
    print("🚀 Testing Hospital Claims Management System Backend")
    print("=" * 60)
    
    # Get the backend URL from user
    backend_url = input("Enter your backend URL (e.g., https://your-service.onrender.com): ").strip()
    if not backend_url:
        print("❌ No URL provided. Exiting.")
        return
    
    if not backend_url.startswith('http'):
        backend_url = f"https://{backend_url}"
    
    print(f"🔍 Testing backend at: {backend_url}")
    print()
    
    # Test endpoints
    endpoints = [
        # Health check
        ("/api/firebase/health", "GET"),
        
        # Authentication
        ("/api/auth/login", "POST", {
            "email": "test@example.com",
            "password": "testpassword"
        }),
        
        # Claims endpoints
        ("/api/v1/claims/list", "GET"),
        ("/api/v1/claims/submit", "POST", {
            "patient_name": "Test Patient",
            "age": 30,
            "gender": "Male"
        }),
        
        # Resources endpoints
        ("/api/v1/resources/specialties", "GET"),
        ("/api/v1/resources/doctors", "GET"),
        ("/api/v1/resources/treatment-lines", "GET"),
        
        # Documents endpoints
        ("/api/v1/documents/upload", "POST"),
        
        # Drafts endpoints
        ("/api/v1/drafts/save-draft", "POST", {
            "patient_name": "Test Patient",
            "age": 30
        }),
    ]
    
    success_count = 0
    total_count = len(endpoints)
    
    for endpoint in endpoints:
        url = f"{backend_url}{endpoint[0]}"
        method = endpoint[1] if len(endpoint) > 1 else "GET"
        data = endpoint[2] if len(endpoint) > 2 else None
        
        if test_endpoint(url, method, data):
            success_count += 1
    
    print("=" * 60)
    print(f"📊 Test Results: {success_count}/{total_count} endpoints working")
    
    if success_count == total_count:
        print("🎉 ALL TESTS PASSED! Backend is working perfectly!")
    elif success_count > 0:
        print("⚠️  Some endpoints are working, but there may be issues.")
    else:
        print("❌ No endpoints are working. Check your backend deployment.")
    
    print()
    print("🔍 Manual Tests You Can Try:")
    print(f"   Health Check: {backend_url}/api/firebase/health")
    print(f"   Login: {backend_url}/api/auth/login")
    print(f"   Claims List: {backend_url}/api/v1/claims/list")

if __name__ == "__main__":
    main()
