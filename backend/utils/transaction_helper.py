"""
Transaction Helper for Claim Audit Trail
Records all claim-related transactions in a separate collection
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from firebase_config import get_firestore
from google.cloud import firestore
import uuid
from datetime import datetime

class TransactionType:
    """Transaction types for claim audit trail"""
    CREATED = "CREATED"
    SUBMITTED = "SUBMITTED"
    ASSIGNED = "ASSIGNED"
    QUERIED = "QUERIED"
    ANSWERED = "ANSWERED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLEARED = "CLEARED"
    DISPATCHED = "DISPATCHED"
    UPDATED = "UPDATED"
    CONTESTED = "CONTESTED"
    REVIEWED = "REVIEWED"
    REVIEW_STATUS_UPDATED = "REVIEW_STATUS_UPDATED"
    ESCALATED = "ESCALATED"

def create_transaction(
    claim_id,
    transaction_type,
    performed_by,
    performed_by_email,
    performed_by_name,
    performed_by_role,
    previous_status=None,
    new_status=None,
    remarks=None,
    metadata=None
):
    """
    Create a transaction record in the claim_transactions collection
    
    Args:
        claim_id: The claim ID
        transaction_type: Type of transaction (from TransactionType class)
        performed_by: User ID who performed the action
        performed_by_email: Email of the user
        performed_by_name: Name of the user
        performed_by_role: Role of the user (hospital_user, processor, admin)
        previous_status: Previous claim status (optional)
        new_status: New claim status (optional)
        remarks: Additional remarks (optional)
        metadata: Additional metadata dict (optional)
    
    Returns:
        transaction_id: The ID of the created transaction
    """
    try:
        # Get Firestore instance (without re-initializing Firebase)
        try:
            import firebase_admin
            # Check if Firebase is already initialized
            try:
                firebase_admin.get_app()
                # Use existing app
                from firebase_admin import firestore as fs
                db = fs.client()
            except ValueError:
                # Not initialized, use get_firestore
                db = get_firestore()
        except Exception as e:
            print(f"Warning: Firestore initialization error: {str(e)}")
            # Fallback: try direct firestore client
            from firebase_admin import firestore as fs
            db = fs.client()
        
        transaction_id = str(uuid.uuid4())
        
        transaction_data = {
            'transaction_id': transaction_id,
            'claim_id': claim_id,
            'transaction_type': transaction_type,
            'performed_by': performed_by,
            'performed_by_email': performed_by_email,
            'performed_by_name': performed_by_name,
            'performed_by_role': performed_by_role,
            'performed_at': firestore.SERVER_TIMESTAMP,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add optional fields
        if previous_status:
            transaction_data['previous_status'] = previous_status
        
        if new_status:
            transaction_data['new_status'] = new_status
        
        if remarks:
            transaction_data['remarks'] = remarks
        
        if metadata:
            transaction_data['metadata'] = metadata
        
        # Create transaction document in claim's subcollection
        db.collection('direct_claims').document(claim_id).collection('transactions').document(transaction_id).set(transaction_data)
        
        return transaction_id
        
    except Exception as e:
        print(f"Error creating transaction: {str(e)}")
        raise

def get_claim_transactions(claim_id, limit=None):
    """
    Get all transactions for a claim from the claim's subcollection, ordered by time (most recent first)
    
    Args:
        claim_id: The claim ID
        limit: Optional limit on number of transactions to return
    
    Returns:
        List of transaction dictionaries
    """
    try:
        db = get_firestore()
        query = db.collection('direct_claims').document(claim_id).collection('transactions').order_by('performed_at', direction=firestore.Query.DESCENDING)
        
        if limit:
            query = query.limit(limit)
        
        transactions = []
        for doc in query.stream():
            transaction_data = doc.to_dict()
            transactions.append(transaction_data)
        
        return transactions
        
    except Exception as e:
        print(f"Error fetching transactions: {str(e)}")
        return []

def get_recent_transactions(limit=50):
    """
    Get recent transactions across all claims
    
    Args:
        limit: Number of transactions to return (default 50)
    
    Returns:
        List of transaction dictionaries
    """
    try:
        db = get_firestore()
        query = db.collection('claim_transactions').order_by('performed_at', direction=firestore.Query.DESCENDING).limit(limit)
        
        transactions = []
        for doc in query.stream():
            transaction_data = doc.to_dict()
            transactions.append(transaction_data)
        
        return transactions
        
    except Exception as e:
        print(f"Error fetching recent transactions: {str(e)}")
        return []

