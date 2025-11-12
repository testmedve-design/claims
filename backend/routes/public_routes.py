"""
Public Routes for Notification Service
These endpoints are called by the external notification service
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from firebase_admin import firestore
from datetime import datetime

public_bp = Blueprint('public', __name__)

@public_bp.route('/claims/api/public/<claim_id>', methods=['GET'])
def get_claim_public(claim_id):
    """Public endpoint to get claim details for notification service"""
    try:
        db = get_firestore()
        
        # First try to get the claim by document ID
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        
        if not claim_doc.exists:
            # If not found by document ID, search by claim_id field
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            
            if not claims_docs:
                return jsonify({'error': 'Claim not found'}), 404
            
            claim_doc = claims_docs[0]
        
        claim_data = claim_doc.to_dict()
        form_data = claim_data.get('form_data', {})
        
        # Format response according to notification service requirements
        response_data = {
            'claim': {
                'claim_id': claim_data.get('claim_id', claim_id),
                'hospital_id': claim_data.get('hospital_id', ''),
                'hospital_name': claim_data.get('hospital_name', ''),
                'patient_name': form_data.get('patient_name', ''),
                'uhid': form_data.get('patient_registration_number', '') or form_data.get('uhid', ''),
                'status': claim_data.get('claim_status', ''),
                'admission_date': form_data.get('admission_date', '') or form_data.get('service_start_date', ''),
                
                # Doctor Information (from form_data)
                'treating_doctor_id': form_data.get('doctor_id', ''),
                'treating_doctor_name': form_data.get('doctor', ''),
                'treating_doctor_email': form_data.get('doctor_email', ''),
                'treating_doctor_qualification': form_data.get('doctor_qualification', ''),
                'treating_doctor_designation': form_data.get('doctor_designation', ''),
                'treating_doctor_contact': form_data.get('doctor_contact', ''),
                
                # Creator Information
                'created_by_name': claim_data.get('created_by_name', ''),
                'created_by_email': claim_data.get('created_by_email', ''),
                'created_by_hospital_name': claim_data.get('hospital_name', ''),
                
                # Processor Information
                'processed_by': claim_data.get('processed_by', ''),
                'processed_by_name': claim_data.get('processed_by_name', ''),
                'processed_by_email': claim_data.get('processed_by_email', ''),
                'processed_by_role': claim_data.get('processed_by_role', 'claim_processor'),
                
                # Alternative processor fields
                'processor_id': claim_data.get('processed_by', ''),
                'processor_name': claim_data.get('processed_by_name', ''),
                'processor_email': claim_data.get('processed_by_email', ''),
                
                # Assigned processors
                'assigned_processors': claim_data.get('assigned_processors', []),
                'assigned_processor_ids': claim_data.get('assigned_processor_ids', [])
            }
        }
        
        return jsonify(response_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_bp.route('/claims/api/public/medical-info/<claim_id>', methods=['POST'])
def submit_medical_info(claim_id):
    """Receive medical information from notification service"""
    try:
        medical_data = request.get_json()
        db = get_firestore()
        
        # Validate claim exists
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        if not claim_doc.exists:
            # Try searching by claim_id field
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            if claims_docs:
                claim_doc = claims_docs[0]
            else:
                return jsonify({'error': 'Claim not found'}), 404
        
        # Store medical information
        update_data = {
            'medical_info': medical_data,
            'medical_info_submitted_at': firestore.SERVER_TIMESTAMP,
            'medical_info_status': 'submitted',
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        db.collection('direct_claims').document(claim_doc.id).update(update_data)
        
        return jsonify({
            'success': True,
            'message': 'Medical information saved successfully'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@public_bp.route('/api/claims/<claim_id>/billing-info', methods=['PUT'])
def submit_billing_info(claim_id):
    """Receive billing information from notification service"""
    try:
        data = request.get_json()
        billing_data = data.get('billing_data', {})
        db = get_firestore()
        
        # Validate claim exists
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        if not claim_doc.exists:
            # Try searching by claim_id field
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            if claims_docs:
                claim_doc = claims_docs[0]
            else:
                return jsonify({'error': 'Claim not found'}), 404
        
        # Store billing information
        update_data = {
            'billing_info': billing_data,
            'billing_info_submitted_at': firestore.SERVER_TIMESTAMP,
            'billing_info_status': 'submitted',
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        db.collection('direct_claims').document(claim_doc.id).update(update_data)
        
        return jsonify({
            'success': True,
            'message': 'Billing information saved successfully'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

