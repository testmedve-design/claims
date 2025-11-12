#!/usr/bin/env python3
"""
Firestore Indexes Verification Script
Tests that all required composite indexes are working properly.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

# Configuration
BACKEND_BASE_URL = "http://localhost:5000"  # Adjust if your backend runs on different port
TIMEOUT = 30  # seconds

def test_endpoint(name, url, method='GET', data=None, headers=None):
    """Test an endpoint and return result"""
    print(f"\n🔍 Testing {name}...")
    print(f"   URL: {url}")
    print(f"   Method: {method}")

    try:
        if method == 'GET':
            response = requests.get(url, timeout=TIMEOUT, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=TIMEOUT, headers=headers)
        else:
            print(f"   ❌ Unsupported method: {method}")
            return False

        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            try:
                data = response.json()
                if data.get('success'):
                    print(f"   ✅ SUCCESS - {data.get('message', 'OK')}")
                    return True
                else:
                    print(f"   ❌ FAILED - {data.get('error', 'Unknown error')}")
                    return False
            except:
                print(f"   ✅ SUCCESS - Non-JSON response")
                return True
        else:
            print(f"   ❌ FAILED - HTTP {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:200]}...")
            return False

    except requests.exceptions.Timeout:
        print(f"   ❌ TIMEOUT - Request took longer than {TIMEOUT} seconds")
        return False
    except requests.exceptions.ConnectionError:
        print(f"   ❌ CONNECTION ERROR - Cannot connect to {url}")
        return False
    except Exception as e:
        print(f"   ❌ ERROR - {str(e)}")
        return False

def verify_migration():
    """Verify that IP claims migration was successful"""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        # Initialize Firestore
        try:
            firebase_admin.get_app()
        except ValueError:
            cred = credentials.Certificate('ServiceAccountKey.json')
            firebase_admin.initialize_app(cred)

        db = firestore.client()

        # Check direct_claims collection
        direct_claims_ref = db.collection('direct_claims')
        direct_claims_count = len(list(direct_claims_ref.stream()))
        print(f"📊 Direct claims collection: {direct_claims_count} documents")

        # Check remaining claims collection (for drafts and other claim types)
        claims_ref = db.collection('claims')
        claims_count = len(list(claims_ref.stream()))
        print(f"📊 Claims collection: {claims_count} documents")

        # Verify all CSHLSIP claims are in direct_claims collection
        ip_claims_in_direct = 0
        for doc in direct_claims_ref.stream():
            if doc.to_dict().get('claim_id', '').startswith('CSHLSIP'):
                ip_claims_in_direct += 1

        # Verify no CSHLSIP claims remain in claims collection
        ip_claims_remaining = 0
        for doc in claims_ref.stream():
            if doc.to_dict().get('claim_id', '').startswith('CSHLSIP'):
                ip_claims_remaining += 1

        print(f"📊 IP claims in direct_claims: {ip_claims_in_direct}")
        print(f"📊 IP claims remaining in claims: {ip_claims_remaining}")

        if ip_claims_remaining == 0 and ip_claims_in_direct > 0:
            print("✅ Migration verification passed: All IP claims in direct_claims collection")
            return True
        else:
            print(f"❌ Migration verification failed")
            return False

    except Exception as e:
        print(f"❌ Migration verification error: {e}")
        return False

def main():
    print("🚀 Firestore Indexes Verification & Migration Check")
    print("=" * 60)

    # First verify migration
    print("🔄 Checking IP claims migration status...")
    migration_ok = verify_migration()

    if not migration_ok:
        print("\n⚠️  IP claims migration may not be complete.")
        print("   Run the migration script first: python migrate_ip_claims.py")
        print("   Then redeploy Firestore indexes.")
        print()

    # Check if backend is running
    try:
        response = requests.get(f"{BACKEND_BASE_URL}/api/test-simple", timeout=5)
        if response.status_code != 200:
            print("❌ Backend is not responding properly")
            print("   Please start the backend first: python start_backend.py")
            sys.exit(1)
    except:
        print("❌ Cannot connect to backend")
        print("   Please start the backend first: python start_backend.py")
        sys.exit(1)

    print("✅ Backend is running, starting index verification...")

    # Test endpoints that use composite indexes
    test_cases = [
        # Processor routes - use claim_status + created_at indexes
        {
            'name': 'Processor Inbox (Unprocessed)',
            'url': f"{BACKEND_BASE_URL}/api/processor/get-claims-to-process?tab=unprocessed&limit=5",
            'method': 'GET'
        },
        {
            'name': 'Processor Inbox (Processed)',
            'url': f"{BACKEND_BASE_URL}/api/processor/get-claims-to-process?tab=processed&limit=5",
            'method': 'GET'
        },

        # Hospital routes - use hospital_id + is_draft + claim_status indexes
        {
            'name': 'Hospital Claims',
            'url': f"{BACKEND_BASE_URL}/api/claims/get-my-claims?limit=5",
            'method': 'GET'
        },

        # RM routes - use rm_status + created_at indexes
        {
            'name': 'RM Dashboard (Active)',
            'url': f"{BACKEND_BASE_URL}/api/rm/get-claims?tab=active&limit=5",
            'method': 'GET'
        },

        # Stats routes - use claim_status + is_draft indexes
        {
            'name': 'Claims Statistics',
            'url': f"{BACKEND_BASE_URL}/api/claims/get-claims-stats",
            'method': 'GET'
        },

        # Notifications - use created_at index (TTL cleanup)
        {
            'name': 'Notifications List',
            'url': f"{BACKEND_BASE_URL}/api/notifications/?limit=5",
            'method': 'GET'
        },

        # Checklist routes - use payer_name + specialty indexes
        {
            'name': 'Document Checklist',
            'url': f"{BACKEND_BASE_URL}/api/checklist/get-checklist?payer_name=test&specialty=general",
            'method': 'GET'
        },

        # Doctor routes - use hospital_id + specialty_name indexes
        {
            'name': 'Doctors List',
            'url': f"{BACKEND_BASE_URL}/api/resources/doctors?hospital_id=test&limit=5",
            'method': 'GET'
        }
    ]

    passed = 0
    failed = 0

    for test_case in test_cases:
        if test_endpoint(**test_case):
            passed += 1
        else:
            failed += 1

    print("\n" + "=" * 50)
    print("📊 VERIFICATION RESULTS")
    print("=" * 50)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")

    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Firestore indexes are working correctly.")
        print("   The application should now run smoothly without index errors.")
    else:
        print(f"\n⚠️  {failed} test(s) failed. This may indicate:")
        print("   - Indexes are still building (check Firebase Console → Firestore → Indexes)")
        print("   - Backend authentication issues")
        print("   - Missing test data")
        print("   - Network connectivity problems")
        print("\n   Please check the Firebase Console for index build status.")

    print("\n🔍 To monitor indexes in Firebase Console:")
    print("   1. Go to Firebase Console → Firestore Database → Indexes")
    print("   2. Look for 'Building' status - wait until all show 'Enabled'")
    print("   3. Re-run this verification script after indexes are built")

if __name__ == "__main__":
    main()
