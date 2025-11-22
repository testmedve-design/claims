#!/usr/bin/env python3
"""
Quick script to check claim status for a specific claim ID
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from firebase_config import get_firestore

def check_claim_status(claim_id: str):
    """Check the claim_status for a given claim_id"""
    try:
        db = get_firestore()
        
        # First try to get the claim by document ID
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        
        if not claim_doc.exists:
            # If not found by document ID, search by claim_id field
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            
            if not claims_docs:
                print(f"❌ Claim '{claim_id}' not found in Firestore")
                return None
            
            # Get the first matching claim
            claim_doc = claims_docs[0]
        
        claim_data = claim_doc.to_dict() or {}
        
        # Get status information
        claim_status = claim_data.get('claim_status', 'NOT SET')
        review_status = claim_data.get('review_status', 'NOT SET (field does not exist)')
        claim_id_field = claim_data.get('claim_id', 'NOT SET')
        document_id = claim_doc.id
        
        print(f"\n{'='*80}")
        print(f"📋 CLAIM STATUS CHECK")
        print(f"{'='*80}")
        print(f"Claim ID (parameter): {claim_id}")
        print(f"Claim ID (field):     {claim_id_field}")
        print(f"Document ID:          {document_id}")
        print(f"{'='*80}")
        print(f"✅ claim_status:      {claim_status}")
        print(f"⚠️  review_status:     {review_status}")
        print(f"{'='*80}")
        
        # Additional info
        reviewed_by = claim_data.get('reviewed_by', 'NOT SET')
        reviewed_at = claim_data.get('reviewed_at', 'NOT SET')
        processed_by = claim_data.get('processed_by', 'NOT SET')
        processed_at = claim_data.get('processed_at', 'NOT SET')
        
        if reviewed_by != 'NOT SET':
            print(f"\nReview Information:")
            print(f"  - reviewed_by: {reviewed_by}")
            print(f"  - reviewed_by_email: {claim_data.get('reviewed_by_email', 'NOT SET')}")
            print(f"  - reviewed_by_name: {claim_data.get('reviewed_by_name', 'NOT SET')}")
            print(f"  - reviewed_at: {reviewed_at}")
        
        if processed_by != 'NOT SET':
            print(f"\nProcessing Information:")
            print(f"  - processed_by: {processed_by}")
            print(f"  - processed_by_email: {claim_data.get('processed_by_email', 'NOT SET')}")
            print(f"  - processed_at: {processed_at}")
        
        print(f"\n{'='*80}\n")
        
        return {
            'claim_id': claim_id,
            'document_id': document_id,
            'claim_status': claim_status,
            'review_status': review_status,
            'claim_data': claim_data
        }
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    claim_id = sys.argv[1] if len(sys.argv) > 1 else 'CSHLSIP-20251112-1'
    check_claim_status(claim_id)

