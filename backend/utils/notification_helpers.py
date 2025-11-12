"""
Helper functions for notification system
Provides utilities to get hospital users and processors for notifications
"""
from firebase_config import get_firestore
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

def get_hospital_users(hospital_id: str) -> List[Dict]:
    """Get all hospital users for a hospital"""
    try:
        db = get_firestore()
        users_ref = db.collection('users')
        
        # Query users by hospital_id in entity_assignments
        all_users = users_ref.where('role', '==', 'hospital_user').get()
        
        hospital_users = []
        for doc in all_users:
            user_data = doc.to_dict()
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            # Check if user is assigned to this hospital
            for hospital in hospitals:
                if hospital.get('id') == hospital_id:
                    # Use uid field if available, otherwise use doc.id
                    user_id = user_data.get('uid') or doc.id
                    hospital_users.append({
                        'user_id': user_id,
                        'user_role': 'hospital_user',
                        'name': user_data.get('name') or user_data.get('display_name') or user_data.get('full_name') or 'Unknown',
                        'email': user_data.get('email', ''),
                        'hospital_name': hospital.get('name', 'Unknown Hospital')
                    })
                    break
        
        return hospital_users
    except Exception as e:
        logger.error(f"Error getting hospital users for {hospital_id}: {str(e)}")
        return []

def get_processors_for_claim(claim_id: str, claim_data: Optional[Dict] = None) -> List[Dict]:
    """Get processors assigned to a claim"""
    try:
        db = get_firestore()
        
        # If claim_data not provided, fetch it
        if not claim_data:
            claim_doc = db.collection('direct_claims').document(claim_id).get()
            if not claim_doc.exists:
                # Try searching by claim_id field
                claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
                claims_docs = claims_query.get()
                if claims_docs:
                    claim_doc = claims_docs[0]
                else:
                    return []
            
            claim_data = claim_doc.to_dict() or {}
        
        processors = []
        seen_ids = set()
        
        # Check processed_by (the processor who last processed it)
        processed_by = claim_data.get('processed_by')
        if processed_by and processed_by not in seen_ids:
            seen_ids.add(processed_by)
            processed_by_name = claim_data.get('processed_by_name', '')
            processed_by_email = claim_data.get('processed_by_email', '')
            processed_by_role = claim_data.get('processed_by_role', 'claim_processor')
            
            # Try to get full user data
            try:
                user_doc = db.collection('users').document(processed_by).get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    # Use uid field if available, otherwise use processed_by
                    user_id = user_data.get('uid') or processed_by
                    processors.append({
                        'user_id': user_id,
                        'user_role': processed_by_role,
                        'name': user_data.get('name') or user_data.get('display_name') or processed_by_name or 'Unknown',
                        'email': user_data.get('email') or processed_by_email or ''
                    })
                else:
                    # Fallback to claim data - use processed_by as-is
                    processors.append({
                        'user_id': processed_by,
                        'user_role': processed_by_role,
                        'name': processed_by_name or 'Unknown',
                        'email': processed_by_email or ''
                    })
            except Exception:
                # Fallback to claim data
                processors.append({
                    'user_id': processed_by,
                    'user_role': processed_by_role,
                    'name': processed_by_name or 'Unknown',
                    'email': processed_by_email or ''
                })
        
        # Check assigned_processors or assigned_processor_ids
        assigned = claim_data.get('assigned_processors') or claim_data.get('assigned_processor_ids', [])
        if isinstance(assigned, list):
            for proc_id in assigned:
                if isinstance(proc_id, str) and proc_id and proc_id not in seen_ids:
                    seen_ids.add(proc_id)
                    try:
                        user_doc = db.collection('users').document(proc_id).get()
                        if user_doc.exists:
                            user_data = user_doc.to_dict() or {}
                            # Use uid field if available, otherwise use proc_id
                            user_id = user_data.get('uid') or proc_id
                            processors.append({
                                'user_id': user_id,
                                'user_role': user_data.get('role', 'claim_processor'),
                                'name': user_data.get('name') or user_data.get('display_name') or user_data.get('full_name') or 'Unknown',
                                'email': user_data.get('email', '')
                            })
                        else:
                            processors.append({
                                'user_id': proc_id,
                                'user_role': 'claim_processor',
                                'name': 'Unknown',
                                'email': ''
                            })
                    except Exception:
                        processors.append({
                            'user_id': proc_id,
                            'user_role': 'claim_processor',
                            'name': 'Unknown',
                            'email': ''
                        })
        
        # If no processors found, get all processors assigned to the hospital
        if not processors:
            hospital_id = claim_data.get('hospital_id')
            if hospital_id:
                processors = get_processors_for_hospital(hospital_id)
        
        return processors
    except Exception as e:
        logger.error(f"Error getting processors for claim {claim_id}: {str(e)}")
        return []

def get_processors_for_hospital(hospital_id: str) -> List[Dict]:
    """Get all processors assigned to a hospital"""
    try:
        db = get_firestore()
        users_ref = db.collection('users')
        
        # Query for processor roles
        processor_roles = ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4']
        all_processors = []
        
        for role in processor_roles:
            users = users_ref.where('role', '==', role).get()
            all_processors.extend(users)
        
        processors = []
        for doc in all_processors:
            user_data = doc.to_dict() or {}
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            # Check if processor is assigned to this hospital
            for hospital in hospitals:
                if hospital.get('id') == hospital_id:
                    # Use uid field if available, otherwise use doc.id
                    user_id = user_data.get('uid') or doc.id
                    processors.append({
                        'user_id': user_id,
                        'user_role': user_data.get('role', 'claim_processor'),
                        'name': user_data.get('name') or user_data.get('display_name') or user_data.get('full_name') or 'Unknown',
                        'email': user_data.get('email', '')
                    })
                    break
        
        return processors
    except Exception as e:
        logger.error(f"Error getting processors for hospital {hospital_id}: {str(e)}")
        return []

