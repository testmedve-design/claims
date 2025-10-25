#!/usr/bin/env python3
"""
Quick backend test - no user input required
"""
import requests
import json
import sys

def test_backend_url(url):
    """Test if a backend URL is working"""
    print(f"🔍 Testing backend URL: {url}")
    print("=" * 60)
    
    # Test health check endpoint
    health_url = f"{url}/api/firebase/health"
    print(f"🔍 Testing health check: {health_url}")
    
    try:
        response = requests.get(health_url, timeout=10)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ SUCCESS - Backend is working!")
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
            return True
        else:
            print(f"   ❌ FAILED - Status: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ CONNECTION ERROR: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 quick_backend_test.py <backend-url>")
        print("Example: python3 quick_backend_test.py https://your-service.onrender.com")
        sys.exit(1)
    
    url = sys.argv[1]
    if not url.startswith('http'):
        url = f"https://{url}"
    
    success = test_backend_url(url)
    
    if success:
        print("\n🎉 BACKEND IS WORKING PERFECTLY!")
        print("✅ Your Hospital Claims Management System backend is live and functional!")
    else:
        print("\n❌ BACKEND HAS ISSUES")
        print("🔧 Check your Render service logs for errors")
        print("🔧 Verify environment variables are set correctly")
        print("🔧 Make sure Firebase credentials are configured")

if __name__ == "__main__":
    main()
