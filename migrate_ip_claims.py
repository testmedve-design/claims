#!/usr/bin/env python3
"""
Migration Script: Move IP Claims to Direct Claims Collection

This script migrates all claims with claim_id starting with 'CSHLSIP' from the 'claims' collection
to a new 'direct_claims' collection. This is a one-time migration to separate IP claims from other claim types.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import logging
import sys
from datetime import datetime

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

def migrate_ip_claims():
    """Migrate IP claims from 'claims' to 'direct_claims' collection"""
    try:
        db = firestore.client()
        logger.info("🔄 Starting IP claims migration...")

        # Get all claims
        claims_ref = db.collection('claims')
        all_claims = claims_ref.stream()

        migrated_count = 0
        skipped_count = 0
        error_count = 0

        for claim_doc in all_claims:
            try:
                claim_data = claim_doc.to_dict()
                claim_id = claim_data.get('claim_id', '')

                # Check if this is an IP claim (starts with CSHLSIP)
                if claim_id.startswith('CSHLSIP'):
                    logger.info(f"📋 Migrating IP claim: {claim_id}")

                    # Create document in direct_claims collection with same ID
                    direct_claims_ref = db.collection('direct_claims')
                    new_claim_doc = direct_claims_ref.document(claim_doc.id)
                    new_claim_doc.set(claim_data)

                    # Migrate subcollections (transactions)
                    try:
                        # Get all subcollections from the original claim
                        subcollections = claim_doc.reference.collections()

                        for subcollection in subcollections:
                            logger.info(f"  📋 Migrating subcollection: {subcollection.id}")

                            # Copy all documents from this subcollection
                            subcollection_docs = subcollection.stream()
                            for sub_doc in subcollection_docs:
                                sub_data = sub_doc.to_dict()
                                # Create the document in the new location
                                new_sub_doc = new_claim_doc.collection(subcollection.id).document(sub_doc.id)
                                new_sub_doc.set(sub_data)
                                logger.info(f"    ✅ Migrated {subcollection.id}/{sub_doc.id}")

                    except Exception as sub_error:
                        logger.warning(f"  ⚠️  Error migrating subcollections for claim {claim_id}: {sub_error}")

                    # Delete from original claims collection (this will also delete subcollections)
                    claim_doc.reference.delete()

                    migrated_count += 1
                    logger.info(f"✅ Migrated: {claim_id} (with subcollections)")
                else:
                    skipped_count += 1
                    logger.debug(f"⏭️  Skipped non-IP claim: {claim_id}")

            except Exception as e:
                error_count += 1
                logger.error(f"❌ Error migrating claim {claim_doc.id}: {e}")

        # Summary
        logger.info("=" * 60)
        logger.info("📊 MIGRATION SUMMARY")
        logger.info("=" * 60)
        logger.info(f"✅ Migrated IP claims: {migrated_count}")
        logger.info(f"⏭️  Skipped non-IP claims: {skipped_count}")
        logger.info(f"❌ Errors: {error_count}")
        logger.info(f"🏁 Migration completed at: {datetime.now()}")

        if error_count == 0:
            logger.info("🎉 Migration completed successfully!")
        else:
            logger.warning(f"⚠️  Migration completed with {error_count} errors. Please review the logs.")

        return True

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

def verify_migration():
    """Verify that migration was successful"""
    try:
        db = firestore.client()
        logger.info("🔍 Verifying migration...")

        # Check direct_claims collection
        direct_claims_ref = db.collection('direct_claims')
        direct_claims_count = len(list(direct_claims_ref.stream()))
        logger.info(f"📊 Direct claims collection: {direct_claims_count} documents")

        # Check remaining claims collection
        claims_ref = db.collection('claims')
        claims_count = len(list(claims_ref.stream()))
        logger.info(f"📊 Claims collection: {claims_count} documents")

        # Verify no CSHLSIP claims remain in claims collection
        ip_claims_remaining = 0
        for doc in claims_ref.stream():
            if doc.to_dict().get('claim_id', '').startswith('CSHLSIP'):
                ip_claims_remaining += 1

        if ip_claims_remaining == 0:
            logger.info("✅ Verification passed: No IP claims remain in claims collection")
            return True
        else:
            logger.error(f"❌ Verification failed: {ip_claims_remaining} IP claims still in claims collection")
            return False

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False

def main():
    print("🚀 IP Claims Migration to Direct Claims Collection")
    print("=" * 60)

    # Initialize Firestore
    initialize_firestore()

    # Run migration
    success = migrate_ip_claims()

    if success:
        # Verify migration
        print("\n" + "=" * 60)
        verification_success = verify_migration()

        if verification_success:
            print("\n🎉 MIGRATION COMPLETED SUCCESSFULLY!")
            print("   All IP claims (CSHLSIP-*) have been moved to 'direct_claims' collection.")
            print("   You can now proceed with updating the application code.")
        else:
            print("\n⚠️  MIGRATION COMPLETED BUT VERIFICATION FAILED!")
            print("   Please check the logs and verify data manually.")
            sys.exit(1)
    else:
        print("\n❌ MIGRATION FAILED!")
        print("   Please check the logs for errors and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()
