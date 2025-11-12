#!/usr/bin/env python3
"""
Migration helper: move leftover subcollections (e.g. transactions) from
`claims/{claim_id}` to `direct_claims/{claim_id}` for IP claims that were already migrated.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def initialize_firestore():
    """Ensure firebase_admin is initialised."""
    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate('ServiceAccountKey.json')
        firebase_admin.initialize_app(cred)
        logger.info("✅ Firestore initialized successfully")
    except Exception as err:
        logger.error("❌ Failed to initialise Firestore: %s", err)
        sys.exit(1)


def migrate_legacy_transactions():
    """
    For every claim in direct_claims, copy any remaining subcollections from
    the old claims/{claim_id} path (even if parent doc no longer exists).
    """
    db = firestore.client()

    direct_claims = list(db.collection('direct_claims').stream())
    logger.info("🔍 Checking %d direct_claims for legacy subcollections", len(direct_claims))

    migrated = 0
    skipped = 0
    cleaned = 0

    for claim_doc in direct_claims:
        claim_id = claim_doc.id

        # Only handle IP claims
        if not claim_id.startswith('CSHLSIP'):
            continue

        legacy_transactions_ref = db.collection('claims').document(claim_id).collection('transactions')
        legacy_transactions = list(legacy_transactions_ref.stream())

        if not legacy_transactions:
            continue

        logger.info("📋 Found %d legacy transactions for claim %s", len(legacy_transactions), claim_id)

        new_transactions_ref = db.collection('direct_claims').document(claim_id).collection('transactions')

        for transaction_doc in legacy_transactions:
            data = transaction_doc.to_dict()
            target_doc = new_transactions_ref.document(transaction_doc.id)

            if target_doc.get().exists:
                skipped += 1
                logger.debug("⏭️  Transaction %s already present under direct_claims/%s", transaction_doc.id, claim_id)
            else:
                target_doc.set(data)
                migrated += 1
                logger.info("✅ Migrated transaction %s for claim %s", transaction_doc.id, claim_id)

            # Delete legacy doc regardless (we already copied or confirmed exists)
            transaction_doc.reference.delete()
            cleaned += 1

    logger.info("=" * 60)
    logger.info("📊 LEGACY SUBCOLLECTION MIGRATION SUMMARY")
    logger.info("=" * 60)
    logger.info("✅ Migrated new docs: %d", migrated)
    logger.info("⏭️  Already present (skipped copy): %d", skipped)
    logger.info("🧹 Legacy docs removed: %d", cleaned)


def main():
    print("🚀 Migrating legacy subcollections for direct_claims")
    print("=" * 60)

    initialize_firestore()
    migrate_legacy_transactions()

    print("\n🎉 Legacy subcollection migration complete!")


if __name__ == "__main__":
    main()

