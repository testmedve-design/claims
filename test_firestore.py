#!/usr/bin/env python3
"""
Test Firestore connection
"""

import firebase_admin
from firebase_admin import credentials, firestore
import logging
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_firestore():
    try:
        logger.info("🔄 Testing Firestore connection...")

        # Initialize Firestore
        cred = credentials.Certificate('ServiceAccountKey.json')
        firebase_admin.initialize_app(cred)

        db = firestore.client()
        logger.info("✅ Firestore initialized successfully")

        # Test basic read
        try:
            collections = list(db.collections())
            logger.info(f"📊 Available collections: {[c.id for c in collections]}")

            # Check claims collection
            claims_ref = db.collection('claims')
            claims_count = len(list(claims_ref.limit(1).stream()))
            logger.info(f"📊 Claims collection accessible, found at least {claims_count} documents")

            return True

        except Exception as e:
            logger.error(f"❌ Error accessing collections: {e}")
            return False

    except Exception as e:
        logger.error(f"❌ Firestore initialization failed: {e}")
        return False

if __name__ == "__main__":
    success = test_firestore()
    sys.exit(0 if success else 1)
