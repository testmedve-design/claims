#!/usr/bin/env python3
"""
Quick script to check what's in the claims collection
"""

import firebase_admin
from firebase_admin import credentials, firestore
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_claims():
    """Check what's in the claims collection"""
    try:
        # Initialize Firestore
        cred = credentials.Certificate('ServiceAccountKey.json')
        firebase_admin.initialize_app(cred)

        db = firestore.client()
        logger.info("✅ Firestore initialized successfully")

        # Check claims collection
        claims_ref = db.collection('claims')
        all_claims = list(claims_ref.stream())

        logger.info(f"📊 Found {len(all_claims)} documents in claims collection")

        # Count IP claims
        ip_claims = 0
        non_ip_claims = 0

        for i, claim_doc in enumerate(all_claims[:10]):  # Check first 10
            claim_data = claim_doc.to_dict()
            claim_id = claim_data.get('claim_id', '')
            is_draft = claim_data.get('is_draft', False)

            if claim_id.startswith('CSHLSIP'):
                ip_claims += 1
                logger.info(f"📋 IP Claim {i+1}: {claim_id} (draft: {is_draft})")
            else:
                non_ip_claims += 1
                logger.info(f"📋 Other Claim {i+1}: {claim_id} (draft: {is_draft})")

        logger.info(f"📊 Summary: {ip_claims} IP claims, {non_ip_claims} other claims in first 10")

        if len(all_claims) > 10:
            logger.info(f"📊 Total claims in collection: {len(all_claims)}")

        return len(all_claims) > 0

    except Exception as e:
        logger.error(f"❌ Error checking claims: {e}")
        return False

if __name__ == "__main__":
    check_claims()
