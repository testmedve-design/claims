"""
Notification Client for Claims Module
Handles all notification calls to the external notification service
"""
import requests
import logging
from typing import Dict, Optional, List
from config import Config
from firebase_config import get_firestore
from firebase_admin import firestore as firebase_firestore
from utils.notification_cleanup import cleanup_expired_notifications, DEFAULT_NOTIFICATION_TTL_HOURS
from utils.notification_helpers import get_hospital_users, get_processors_for_claim

logger = logging.getLogger(__name__)

class ClaimsNotificationClient:
    """Client for sending claim status notifications"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or getattr(Config, 'NOTIFICATION_SERVICE_URL', '')
        if not self.base_url:
            logger.warning("NOTIFICATION_SERVICE_URL not configured. Notifications will be skipped.")
    
    def _send_notification(self, endpoint: str, payload: Dict) -> bool:
        """Internal method to send notification request"""
        if not self.base_url:
            logger.debug(f"Skipping notification to {endpoint} - service URL not configured")
            return False
        
        try:
            url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
            response = requests.post(
                url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=5  # 5 second timeout
            )
            
            if response.status_code == 200:
                logger.info(f"Notification sent successfully to {endpoint} for claim {payload.get('claim_id')}")
                return True
            else:
                logger.warning(
                    f"Notification failed for {endpoint}: "
                    f"Status {response.status_code}, Response: {response.text}"
                )
                return False
                
        except requests.exceptions.Timeout:
            logger.error(f"Notification timeout for {endpoint} - service may be down")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Notification request failed for {endpoint}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending notification to {endpoint}: {str(e)}")
            return False
    
    def _store_notification(
        self,
        event_type: str,
        claim_id: str,
        title: str,
        message: str,
        recipients: List[Dict],
        metadata: Optional[Dict] = None,
        triggered_by: Optional[Dict] = None,
        delivery_success: bool = False
    ) -> None:
        """Persist notification in Firestore for in-app display"""
        if not recipients:
            logger.debug(f"Skipping notification store for {event_type} - no recipients")
            return

        try:
            db = get_firestore()
            recipient_ids = [r.get('user_id') for r in recipients if r.get('user_id')]
            recipient_roles = sorted({r.get('user_role') for r in recipients if r.get('user_role')})

            try:
                cleanup_expired_notifications(ttl_hours=DEFAULT_NOTIFICATION_TTL_HOURS, db_override=db)
            except Exception as cleanup_err:  # pragma: no cover - defensive logging
                logger.error("Failed to cleanup expired notifications: %s", cleanup_err)

            notification_doc = {
                'claim_id': claim_id,
                'event_type': event_type,
                'title': title,
                'message': message,
                'recipients': recipients,
                'recipient_ids': recipient_ids,
                'recipient_roles': recipient_roles,
                'metadata': metadata or {},
                'triggered_by': triggered_by or {},
                'delivery_success': delivery_success,
                'status': (metadata or {}).get('status'),
                'read_by': [],
                'created_at': firebase_firestore.SERVER_TIMESTAMP,
                'updated_at': firebase_firestore.SERVER_TIMESTAMP
            }

            db.collection('claims_notifications').add(notification_doc)
        except Exception as e:
            logger.error(f"Failed to store notification {event_type} for claim {claim_id}: {str(e)}")

    def _build_base_payload(
        self,
        claim_id: str,
        claim_data: Dict,
        actor_id: str,
        actor_role: str,
        actor_name: str,
        actor_email: str
    ) -> Dict:
        """Build base notification payload"""
        return {
            'claim_id': claim_id,
            'hospital_name': claim_data.get('hospital_name', ''),
            'hospital_id': claim_data.get('hospital_id', ''),
            'patient_name': claim_data.get('form_data', {}).get('patient_name', ''),
            'claimed_amount': claim_data.get('form_data', {}).get('claimed_amount', 0),
            'payer_name': claim_data.get('form_data', {}).get('payer_name', ''),
            'actor_id': actor_id,
            'actor_role': actor_role,
            'actor_name': actor_name,
            'actor_email': actor_email
        }
    
    def notify_pending(self, claim_id: str, claim_data: Dict, actor_id: str, actor_name: str, actor_email: str) -> bool:
        """Notify when claim is submitted (qc_pending)"""
        # Get processors who should be notified
        processors = get_processors_for_claim(claim_id, claim_data)
        
        payload = {
            'claim_id': claim_id,
            'processors': processors,
            'hospital_name': claim_data.get('hospital_name', '')
        }
        success = self._send_notification('api/notifications/claims/pending', payload)

        title = 'Claim Submitted'
        message = f"{claim_data.get('hospital_name', 'Hospital')} submitted claim {claim_id}."
        metadata = {
            'status': 'qc_pending'
        }

        self._store_notification(
            event_type='claim_pending',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=processors,
            metadata=metadata,
            triggered_by={
                'actor_id': actor_id,
                'actor_role': 'hospital_user',
                'actor_name': actor_name,
                'actor_email': actor_email
            },
            delivery_success=success
        )

        return success
    
    def notify_qc_query(
        self,
        claim_id: str,
        claim_data: Dict,
        processor_id: str,
        processor_name: str,
        processor_email: str,
        remarks: str,
        qc_query_details: Optional[Dict] = None
    ) -> bool:
        """Notify when processor raises QC query"""
        # Get hospital users who should be notified
        hospital_id = claim_data.get('hospital_id', '')
        hospital_users = get_hospital_users(hospital_id) if hospital_id else []
        
        payload = {
            'claim_id': claim_id,
            'hospital_users': hospital_users,
            'processor_name': processor_name,
            'qc_query_details': qc_query_details or {}
        }
        success = self._send_notification('api/notifications/claims/qc-query', payload)

        title = 'QC Query Raised'
        message = f"{processor_name or 'Processor'} raised a QC query on claim {claim_id}."
        metadata = {
            'status': 'qc_query',
            'remarks': remarks,
            'qc_query_details': qc_query_details or {}
        }

        self._store_notification(
            event_type='claim_qc_query',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=hospital_users,
            metadata=metadata,
            triggered_by={
                'actor_id': processor_id,
                'actor_role': 'processor',
                'actor_name': processor_name,
                'actor_email': processor_email
            },
            delivery_success=success
        )

        return success
    
    def notify_qc_answered(
        self,
        claim_id: str,
        claim_data: Dict,
        hospital_user_id: str,
        hospital_user_name: str,
        hospital_user_email: str,
        query_response: str,
        uploaded_files: Optional[List[str]] = None
    ) -> bool:
        """Notify when hospital answers QC query"""
        # Get processors who should be notified
        processors = get_processors_for_claim(claim_id, claim_data)
        
        payload = {
            'claim_id': claim_id,
            'processors': processors,
            'hospital_name': claim_data.get('hospital_name', ''),
            'query_response': query_response,
            'uploaded_files': uploaded_files or []
        }
        success = self._send_notification('api/notifications/claims/qc-answered', payload)

        title = 'QC Query Answered'
        message = f"{hospital_user_name or 'Hospital user'} responded to the QC query for claim {claim_id}."
        metadata = {
            'status': 'qc_answered',
            'query_response': query_response,
            'uploaded_files': uploaded_files or []
        }

        self._store_notification(
            event_type='claim_qc_answered',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=processors,
            metadata=metadata,
            triggered_by={
                'actor_id': hospital_user_id,
                'actor_role': 'hospital_user',
                'actor_name': hospital_user_name,
                'actor_email': hospital_user_email
            },
            delivery_success=success
        )

        return success
    
    def notify_need_more_info(
        self,
        claim_id: str,
        claim_data: Dict,
        processor_id: str,
        processor_name: str,
        processor_email: str,
        remarks: str
    ) -> bool:
        """Notify when processor requests more info"""
        # Get hospital users who should be notified
        hospital_id = claim_data.get('hospital_id', '')
        hospital_users = get_hospital_users(hospital_id) if hospital_id else []
        
        payload = {
            'claim_id': claim_id,
            'hospital_users': hospital_users,
            'processor_name': processor_name,
            'need_more_info_reason': remarks
        }
        success = self._send_notification('api/notifications/claims/need-more-info', payload)

        title = 'Additional Information Requested'
        message = f"{processor_name or 'Processor'} requested more information for claim {claim_id}."
        metadata = {
            'status': 'need_more_info',
            'remarks': remarks
        }

        self._store_notification(
            event_type='claim_need_more_info',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=hospital_users,
            metadata=metadata,
            triggered_by={
                'actor_id': processor_id,
                'actor_role': 'processor',
                'actor_name': processor_name,
                'actor_email': processor_email
            },
            delivery_success=success
        )

        return success
    
    def notify_need_more_info_response(
        self,
        claim_id: str,
        claim_data: Dict,
        hospital_user_id: str,
        hospital_user_name: str,
        hospital_user_email: str,
        response: str,
        uploaded_files: Optional[List[str]] = None
    ) -> bool:
        """Notify processors when hospital provides additional information"""
        processors = get_processors_for_claim(claim_id, claim_data)
        
        payload = self._build_base_payload(
            claim_id=claim_id,
            claim_data=claim_data,
            actor_id=hospital_user_id,
            actor_role='hospital_user',
            actor_name=hospital_user_name,
            actor_email=hospital_user_email
        )
        payload.update({
            'processors': processors,
            'response': response,
            'uploaded_files_count': len(uploaded_files or [])
        })
        
        success = self._send_notification('api/notifications/claims/need-more-info-response', payload)

        title = 'Additional Information Submitted'
        message = f"{hospital_user_name or 'Hospital user'} submitted additional information for claim {claim_id}."
        metadata = {
            'status': 'need_more_info_submitted',
            'response': response,
            'uploaded_files_count': len(uploaded_files or [])
        }

        self._store_notification(
            event_type='claim_need_more_info_response',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=processors,
            metadata=metadata,
            triggered_by={
                'actor_id': hospital_user_id,
                'actor_role': 'hospital_user',
                'actor_name': hospital_user_name,
                'actor_email': hospital_user_email
            },
            delivery_success=success
        )

        return success
    
    def notify_claim_contested(
        self,
        claim_id: str,
        claim_data: Dict,
        hospital_user_id: str,
        hospital_user_name: str,
        hospital_user_email: str,
        contest_reason: str,
        uploaded_files: Optional[List[str]] = None
    ) -> bool:
        """Notify processors when a hospital contests a denied claim"""
        processors = get_processors_for_claim(claim_id, claim_data)

        payload = self._build_base_payload(
            claim_id=claim_id,
            claim_data=claim_data,
            actor_id=hospital_user_id,
            actor_role='hospital_user',
            actor_name=hospital_user_name,
            actor_email=hospital_user_email
        )
        payload.update({
            'processors': processors,
            'contest_reason': contest_reason,
            'uploaded_files_count': len(uploaded_files or [])
        })

        success = self._send_notification('api/notifications/claims/contest', payload)

        title = 'Claim Contested'
        message = f"{hospital_user_name or 'Hospital user'} contested the denial for claim {claim_id}."
        metadata = {
            'status': 'claim_contested',
            'contest_reason': contest_reason,
            'uploaded_files_count': len(uploaded_files or [])
        }

        self._store_notification(
            event_type='claim_contested',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=processors,
            metadata=metadata,
            triggered_by={
                'actor_id': hospital_user_id,
                'actor_role': 'hospital_user',
                'actor_name': hospital_user_name,
                'actor_email': hospital_user_email
            },
            delivery_success=success
        )

        return success
    
    def notify_qc_clear(
        self,
        claim_id: str,
        claim_data: Dict,
        processor_id: str,
        processor_name: str,
        processor_email: str,
        remarks: str
    ) -> bool:
        """Notify when claim is QC cleared"""
        # Get hospital users who should be notified
        hospital_id = claim_data.get('hospital_id', '')
        hospital_users = get_hospital_users(hospital_id) if hospital_id else []
        
        payload = {
            'claim_id': claim_id,
            'hospital_users': hospital_users,
            'processor_name': processor_name
        }
        success = self._send_notification('api/notifications/claims/qc-clear', payload)

        title = 'Claim Cleared in QC'
        message = f"{processor_name or 'Processor'} cleared claim {claim_id} in QC."
        metadata = {
            'status': 'qc_clear',
            'remarks': remarks
        }

        self._store_notification(
            event_type='claim_qc_clear',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=hospital_users,
            metadata=metadata,
            triggered_by={
                'actor_id': processor_id,
                'actor_role': 'processor',
                'actor_name': processor_name,
                'actor_email': processor_email
            },
            delivery_success=success
        )

        return success
    
    def notify_approved(
        self,
        claim_id: str,
        claim_data: Dict,
        processor_id: str,
        processor_name: str,
        processor_email: str,
        remarks: str
    ) -> bool:
        """Notify when claim is approved"""
        # Get hospital users who should be notified
        hospital_id = claim_data.get('hospital_id', '')
        hospital_users = get_hospital_users(hospital_id) if hospital_id else []
        
        payload = {
            'claim_id': claim_id,
            'hospital_users': hospital_users,
            'processor_name': processor_name
        }
        success = self._send_notification('api/notifications/claims/approved', payload)

        title = 'Claim Approved'
        message = f"{processor_name or 'Processor'} approved claim {claim_id}."
        metadata = {
            'status': 'claim_approved',
            'remarks': remarks
        }

        self._store_notification(
            event_type='claim_approved',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=hospital_users,
            metadata=metadata,
            triggered_by={
                'actor_id': processor_id,
                'actor_role': 'processor',
                'actor_name': processor_name,
                'actor_email': processor_email
            },
            delivery_success=success
        )

        return success
    
    def notify_denial(
        self,
        claim_id: str,
        claim_data: Dict,
        processor_id: str,
        processor_name: str,
        processor_email: str,
        remarks: str,
        rejection_reason: Optional[str] = None
    ) -> bool:
        """Notify when claim is denied"""
        # Get hospital users who should be notified
        hospital_id = claim_data.get('hospital_id', '')
        hospital_users = get_hospital_users(hospital_id) if hospital_id else []
        
        payload = {
            'claim_id': claim_id,
            'hospital_users': hospital_users,
            'processor_name': processor_name,
            'rejection_reason': rejection_reason or remarks
        }
        success = self._send_notification('api/notifications/claims/denial', payload)

        title = 'Claim Denied'
        message = f"{processor_name or 'Processor'} denied claim {claim_id}."
        metadata = {
            'status': 'claim_denial',
            'remarks': remarks,
            'rejection_reason': rejection_reason or remarks
        }

        self._store_notification(
            event_type='claim_denied',
            claim_id=claim_id,
            title=title,
            message=message,
            recipients=hospital_users,
            metadata=metadata,
            triggered_by={
                'actor_id': processor_id,
                'actor_role': 'processor',
                'actor_name': processor_name,
                'actor_email': processor_email
            },
            delivery_success=success
        )

        return success


# Singleton instance
_notification_client = None

def get_notification_client() -> ClaimsNotificationClient:
    """Get singleton notification client instance"""
    global _notification_client
    if _notification_client is None:
        _notification_client = ClaimsNotificationClient()
    return _notification_client

