"""
Utility helpers for managing lifecycle of in-app notifications.
"""
import logging
from datetime import datetime, timedelta, timezone

from firebase_config import get_firestore

logger = logging.getLogger(__name__)

DEFAULT_NOTIFICATION_TTL_HOURS = 6


def cleanup_expired_notifications(
    ttl_hours: int = DEFAULT_NOTIFICATION_TTL_HOURS,
    batch_size: int = 200,
    db_override=None
) -> int:
    """
    Remove notifications whose created_at timestamp is older than ttl_hours.

    Args:
        ttl_hours: Age threshold in hours. Must be positive.
        batch_size: Maximum documents deleted per Firestore batch write.
        db_override: Optional Firestore client instance (useful for testing).

    Returns:
        The total number of notifications deleted.
    """
    if ttl_hours <= 0:
        logger.warning("cleanup_expired_notifications: ttl_hours must be positive, skipping cleanup")
        return 0

    try:
        db = db_override or get_firestore()
    except Exception as err:  # pragma: no cover - defensive logging
        logger.error("cleanup_expired_notifications: Unable to get Firestore client: %s", err)
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    total_deleted = 0

    try:
        while True:
            expired_docs = (
                db.collection('claims_notifications')
                .where('created_at', '<', cutoff)
                .limit(batch_size)
                .get()
            )

            if not expired_docs:
                break

            batch = db.batch()
            for doc in expired_docs:
                batch.delete(doc.reference)

            batch.commit()
            deleted_count = len(expired_docs)
            total_deleted += deleted_count

            logger.debug(
                "cleanup_expired_notifications: Deleted %d expired notification(s), total so far %d",
                deleted_count,
                total_deleted,
            )

            if deleted_count < batch_size:
                break
    except Exception as err:
        logger.error("cleanup_expired_notifications: Failed to delete expired notifications: %s", err)

    return total_deleted


