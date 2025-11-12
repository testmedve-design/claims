#!/usr/bin/env python3
"""
Script to migrate transactions for claims that were already moved to direct_claims collection.
This handles the case where the initial migration moved claims but not their subcollections.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def initialize_firestore():
    """Initialize Firestore connection"""
    try:
        # Check if already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize with service account
        cred = credentials.Certificate('ServiceAccountKey.json')
        firebase_admin.initialize_app(cred)
        logger.info("✅ Firestore initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Firestore: {e}")
        sys.exit(1)

def migrate_remaining_transactions():
    """Migrate transactions for claims that are now in direct_claims but may have transactions elsewhere"""
    try:
        db = firestore.client()
        logger.info("🔄 Starting transaction migration...")

        # Check for transactions in the global transactions collection
        transactions_ref = db.collection('transactions')
        all_transactions = list(transactions_ref.stream())

        logger.info(f"📊 Found {len(all_transactions)} transactions in global collection")

        migrated_count = 0
        skipped_count = 0

        for transaction_doc in all_transactions:
            try:
                transaction_data = transaction_doc.to_dict()
                claim_id = transaction_data.get('claim_id', '')

                if not claim_id:
                    logger.warning(f"⚠️  Transaction {transaction_doc.id} has no claim_id")
                    continue

                # Check if this claim exists in direct_claims
                direct_claim_doc = db.collection('direct_claims').document(claim_id).get()

                if direct_claim_doc.exists:
                    logger.info(f"📋 Migrating transaction for claim: {claim_id}")

                    # Move transaction to the claim's subcollection
                    claim_ref = db.collection('direct_claims').document(claim_id)
                    new_transaction_ref = claim_ref.collection('transactions').document(transaction_doc.id)
                    new_transaction_ref.set(transaction_data)

                    # Delete from global collection
                    transaction_doc.reference.delete()

                    migrated_count += 1
                    logger.info(f"✅ Migrated transaction: {transaction_doc.id}")
                else:
                    # Check if claim exists in regular claims collection
                    regular_claim_doc = db.collection('claims').document(claim_id).get()
                    if regular_claim_doc.exists:
                        logger.debug(f"⏭️  Skipped transaction for regular claim: {claim_id}")
                        skipped_count += 1
                    else:
                        logger.warning(f"⚠️  Transaction {transaction_doc.id} references non-existent claim: {claim_id}")

            except Exception as e:
                logger.error(f"❌ Error migrating transaction {transaction_doc.id}: {e}")

        # Summary
        logger.info("=" * 60)
        logger.info("📊 TRANSACTION MIGRATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"✅ Migrated transactions: {migrated_count}")
        logger.info(f"⏭️  Skipped transactions: {skipped_count}")
        logger.info(f"🏁 Transaction migration completed")

        if migrated_count > 0:
            logger.info("🎉 Transaction migration completed successfully!")
        else:
            logger.info("ℹ️  No transactions needed migration")

        return True

    except Exception as e:
        logger.error(f"❌ Transaction migration failed: {e}")
        return False

def main():
    print("🚀 Transaction Migration for Direct Claims")
    print("=" * 50)

    # Initialize Firestore
    initialize_firestore()

    # Run transaction migration
    success = migrate_remaining_transactions()

    if success:
        print("\n🎉 TRANSACTION MIGRATION COMPLETED!")
        print("   All transactions for direct_claims have been properly located.")
    else:
        print("\n❌ TRANSACTION MIGRATION FAILED!")
        print("   Please check the logs for errors.")
        sys.exit(1)

if __name__ == "__main__":
    main()
