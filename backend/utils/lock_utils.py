"""Utility helpers for managing claim processor locks."""

from datetime import datetime

import pytz


def cleanup_expired_locks(db):
    """Clear processor locks that have crossed their expiry time."""
    ist = pytz.timezone('Asia/Kolkata')
    current_time = datetime.now(ist)

    try:
        # Try fetching only claims that have an expiry timestamp
        locked_claims = list(
            db.collection('claims')
            .where('lock_expires_at', '!=', None)
            .limit(1000)
            .stream()
        )
    except Exception as query_error:  # pragma: no cover - logging only
        # Some environments may not have the required composite index
        print(
            "⚠️ cleanup_expired_locks: index-based query failed "
            f"({query_error}); falling back to full scan."
        )
        locked_claims = list(db.collection('claims').stream())

    cleared_count = 0

    for doc in locked_claims:
        claim_data = doc.to_dict() or {}
        lock_expires_at = claim_data.get('lock_expires_at')
        locked_by_processor = claim_data.get('locked_by_processor')

        # Only proceed if there is a lock we might need to clear
        if not lock_expires_at or not locked_by_processor:
            continue

        # Convert Firestore value to timezone-aware datetime
        expires_time = None
        if hasattr(lock_expires_at, 'to_pydatetime'):
            expires_time = lock_expires_at.to_pydatetime()
        elif isinstance(lock_expires_at, str):
            try:
                expires_time = datetime.fromisoformat(
                    lock_expires_at.replace('Z', '+00:00')
                )
            except ValueError:
                print(
                    "⚠️ cleanup_expired_locks: unable to parse lock_expires_at "
                    f"'{lock_expires_at}' for claim {doc.id}"
                )
                continue
        else:
            # Unexpected format — skip
            continue

        if expires_time.tzinfo is None:
            expires_time = ist.localize(expires_time)
        else:
            expires_time = expires_time.astimezone(ist)

        if current_time > expires_time:
            try:
                db.collection('claims').document(doc.id).update(
                    {
                        'locked_by_processor': None,
                        'locked_by_processor_email': None,
                        'locked_by_processor_name': None,
                        'locked_at': None,
                        'lock_expires_at': None,
                    }
                )
                cleared_count += 1
                print(
                    f"🧹 cleanup_expired_locks: Cleared expired lock for claim {doc.id}"
                )
            except Exception as update_error:  # pragma: no cover - logging only
                print(
                    "❌ cleanup_expired_locks: Failed to clear lock for claim "
                    f"{doc.id}: {update_error}"
                )

    if cleared_count:
        print(
            f"✅ cleanup_expired_locks: Cleared {cleared_count} expired lock(s)"
        )

