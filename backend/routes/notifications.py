"""
Notification Routes - In-app notifications API
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from firebase_admin import firestore as firebase_firestore
from middleware import require_claims_access
from datetime import datetime, timedelta
import pytz
from utils.notification_cleanup import cleanup_expired_notifications, DEFAULT_NOTIFICATION_TTL_HOURS

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET', 'OPTIONS'])
@notifications_bp.route('', methods=['GET', 'OPTIONS'])  # Handle both with and without trailing slash
@require_claims_access
def list_notifications():
    """List notifications for the current user"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    try:
        db = get_firestore()
        user_id = getattr(request, 'user_id', '')
        user_email = getattr(request, 'user_email', '')
        limit = int(request.args.get('limit', 100))
        unread_only = request.args.get('unread', 'false').lower() == 'true'

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Fetching notifications for user_id: {user_id}, email: {user_email}")

        cleaned_count = cleanup_expired_notifications(
            ttl_hours=DEFAULT_NOTIFICATION_TTL_HOURS,
            db_override=db
        )
        if cleaned_count:
            logger.debug("Auto-deleted %d expired notifications before fetch", cleaned_count)

        # Get all notifications and filter client-side to avoid Firestore index requirement
        # Firestore requires composite index for where + order_by on different fields
        all_notifications = db.collection('claims_notifications').limit(500).get()
        
        # Filter and sort in memory
        user_notifications = []
        for doc in all_notifications:
            data = doc.to_dict() or {}
            recipient_ids = data.get('recipient_ids', []) or []
            
            # Also check recipients array for user_id or email match
            recipients = data.get('recipients', []) or []
            recipient_emails = [r.get('email', '') for r in recipients if r.get('email')]
            
            # Check if user is a recipient by ID or email
            is_recipient = (
                user_id in recipient_ids or
                user_email in recipient_emails or
                any(r.get('user_id') == user_id for r in recipients)
            )
            
            if is_recipient:
                user_notifications.append((doc, data))
        
        # Sort by created_at descending
        # Handle Firestore timestamps and None values
        def get_sort_key(item):
            created_at = item[1].get('created_at')
            if created_at is None:
                return datetime.min
            # If it's a Firestore timestamp, convert to datetime
            if hasattr(created_at, 'to_pydatetime'):
                return created_at.to_pydatetime()
            # If it's already a datetime, use it
            if isinstance(created_at, datetime):
                return created_at
            # Otherwise return min datetime
            return datetime.min
        
        user_notifications.sort(key=get_sort_key, reverse=True)
        
        # Apply limit
        user_notifications = user_notifications[:limit]

        notifications = []
        for doc, data in user_notifications:
            read_by = data.get('read_by', []) or []
            is_read = user_id in read_by

            if unread_only and is_read:
                continue

            created_at = data.get('created_at')
            if created_at and hasattr(created_at, 'isoformat'):
                created_at = created_at.isoformat()
            elif created_at:
                created_at = str(created_at)

            updated_at = data.get('updated_at')
            if updated_at and hasattr(updated_at, 'isoformat'):
                updated_at = updated_at.isoformat()
            elif updated_at:
                updated_at = str(updated_at)

            notifications.append({
                'id': doc.id,
                'claim_id': data.get('claim_id'),
                'event_type': data.get('event_type'),
                'title': data.get('title'),
                'message': data.get('message'),
                'metadata': data.get('metadata', {}),
                'status': data.get('status'),
                'triggered_by': data.get('triggered_by', {}),
                'delivery_success': data.get('delivery_success', False),
                'created_at': created_at,
                'updated_at': updated_at,
                'read': is_read
            })

        return jsonify({
            'success': True,
            'notifications': notifications
        }), 200
    except Exception as err:
        return jsonify({
            'success': False,
            'error': str(err)
        }), 500


@notifications_bp.route('/mark-read', methods=['POST'])
@require_claims_access
def mark_notifications_read():
    """Mark one or more notifications as read"""
    try:
        data = request.get_json() or {}
        notification_ids = data.get('notification_ids', [])
        user_id = getattr(request, 'user_id', '')

        if not notification_ids:
            return jsonify({
                'success': False,
                'error': 'notification_ids is required'
            }), 400

        db = get_firestore()
        batch = db.batch()

        for notification_id in notification_ids:
            doc_ref = db.collection('claims_notifications').document(notification_id)
            batch.update(doc_ref, {
                'read_by': firebase_firestore.ArrayUnion([user_id]),
                'updated_at': firebase_firestore.SERVER_TIMESTAMP
            })

        batch.commit()

        return jsonify({
            'success': True,
            'message': 'Notifications marked as read'
        }), 200
    except Exception as err:
        return jsonify({
            'success': False,
            'error': str(err)
        }), 500


@notifications_bp.route('/delete', methods=['POST', 'OPTIONS'])
@require_claims_access
def delete_notifications():
    """Delete one or more notifications for the current user"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json() or {}
        notification_ids = data.get('notification_ids', [])
        user_id = getattr(request, 'user_id', '')
        user_email = getattr(request, 'user_email', '')

        if not notification_ids:
            return jsonify({
                'success': False,
                'error': 'notification_ids is required'
            }), 400

        db = get_firestore()
        deleted_count = 0
        not_found_count = 0

        for notification_id in notification_ids:
            doc_ref = db.collection('claims_notifications').document(notification_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                not_found_count += 1
                continue
            
            # Verify user is a recipient before allowing deletion
            doc_data = doc.to_dict() or {}
            recipient_ids = doc_data.get('recipient_ids', []) or []
            recipients = doc_data.get('recipients', []) or []
            recipient_emails = [r.get('email', '') for r in recipients if r.get('email')]
            
            is_recipient = (
                user_id in recipient_ids or
                user_email in recipient_emails or
                any(r.get('user_id') == user_id for r in recipients)
            )
            
            if is_recipient:
                doc_ref.delete()
                deleted_count += 1
            else:
                not_found_count += 1

        return jsonify({
            'success': True,
            'message': f'Deleted {deleted_count} notification(s)',
            'deleted_count': deleted_count,
            'not_found_count': not_found_count
        }), 200
    except Exception as err:
        return jsonify({
            'success': False,
            'error': str(err)
        }), 500


@notifications_bp.route('/cleanup-old', methods=['POST', 'OPTIONS'])
@require_claims_access
def cleanup_old_notifications():
    """Auto-delete old read notifications (older than specified days, default 30)"""
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        data = request.get_json() or {}
        days_old = int(data.get('days', 1))  # Default: delete read notifications older than 1 day
        user_id = getattr(request, 'user_id', '')
        user_email = getattr(request, 'user_email', '')
        
        if days_old < 1:
            return jsonify({
                'success': False,
                'error': 'days must be at least 1'
            }), 400

        db = get_firestore()
        ist = pytz.timezone('Asia/Kolkata')
        cutoff_date = datetime.now(ist) - timedelta(days=days_old)
        
        # Get all notifications
        all_notifications = db.collection('claims_notifications').limit(1000).get()
        
        deleted_count = 0
        for doc in all_notifications:
            doc_data = doc.to_dict() or {}
            
            # Check if user is a recipient
            recipient_ids = doc_data.get('recipient_ids', []) or []
            recipients = doc_data.get('recipients', []) or []
            recipient_emails = [r.get('email', '') for r in recipients if r.get('email')]
            
            is_recipient = (
                user_id in recipient_ids or
                user_email in recipient_emails or
                any(r.get('user_id') == user_id for r in recipients)
            )
            
            if not is_recipient:
                continue
            
            # Check if notification is read by this user
            read_by = doc_data.get('read_by', []) or []
            is_read = user_id in read_by
            
            if not is_read:
                continue  # Don't delete unread notifications
            
            # Check if notification is older than cutoff date
            created_at = doc_data.get('created_at')
            if created_at:
                if hasattr(created_at, 'to_pydatetime'):
                    created_at_dt = created_at.to_pydatetime()
                elif isinstance(created_at, datetime):
                    created_at_dt = created_at
                else:
                    continue
                
                # Ensure timezone awareness
                if created_at_dt.tzinfo is None:
                    created_at_dt = ist.localize(created_at_dt)
                else:
                    created_at_dt = created_at_dt.astimezone(ist)
                
                if created_at_dt < cutoff_date:
                    doc.reference.delete()
                    deleted_count += 1

        return jsonify({
            'success': True,
            'message': f'Deleted {deleted_count} old read notification(s)',
            'deleted_count': deleted_count,
            'days_old': days_old
        }), 200
    except Exception as err:
        return jsonify({
            'success': False,
            'error': str(err)
        }), 500

