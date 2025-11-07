"""
Notification Client for Claims Module
Handles all notification calls to the external notification service
"""
import requests
import logging
from typing import Dict, Optional, List
from config import Config

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
        payload = self._build_base_payload(claim_id, claim_data, actor_id, 'hospital_user', actor_name, actor_email)
        return self._send_notification('api/notifications/claims/pending', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, processor_id, 'processor', processor_name, processor_email)
        payload.update({
            'remarks': remarks,
            'qc_query_details': qc_query_details or {}
        })
        return self._send_notification('api/notifications/claims/qc-query', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, hospital_user_id, 'hospital_user', hospital_user_name, hospital_user_email)
        payload.update({
            'query_response': query_response,
            'uploaded_files': uploaded_files or [],
            'processor_id': claim_data.get('processed_by', ''),
            'processor_email': claim_data.get('processed_by_email', ''),
            'processor_name': claim_data.get('processed_by_name', '')
        })
        return self._send_notification('api/notifications/claims/qc-answered', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, processor_id, 'processor', processor_name, processor_email)
        payload.update({
            'remarks': remarks,
            'need_more_info_reason': remarks
        })
        return self._send_notification('api/notifications/claims/need-more-info', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, processor_id, 'processor', processor_name, processor_email)
        payload.update({
            'remarks': remarks
        })
        return self._send_notification('api/notifications/claims/qc-clear', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, processor_id, 'processor', processor_name, processor_email)
        payload.update({
            'remarks': remarks
        })
        return self._send_notification('api/notifications/claims/approved', payload)
    
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
        payload = self._build_base_payload(claim_id, claim_data, processor_id, 'processor', processor_name, processor_email)
        payload.update({
            'remarks': remarks,
            'rejection_reason': rejection_reason or remarks
        })
        return self._send_notification('api/notifications/claims/denial', payload)


# Singleton instance
_notification_client = None

def get_notification_client() -> ClaimsNotificationClient:
    """Get singleton notification client instance"""
    global _notification_client
    if _notification_client is None:
        _notification_client = ClaimsNotificationClient()
    return _notification_client

