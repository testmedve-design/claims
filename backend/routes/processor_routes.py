"""
Processor Routes - For claim processors only
These routes handle claim processing, approval, rejection, and processor-specific operations
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_processor_access
from firebase_admin import firestore
from datetime import datetime, timedelta
# Removed unused Timestamp import

processor_bp = Blueprint('processor_routes', __name__)

@processor_bp.route('/get-claims-to-process', methods=['GET'])
@require_processor_access
def get_claims_to_process():
    """Get claims assigned to processor for processing - PROCESSORS ONLY"""
    try:
        db = get_firestore()
        
        # Get query parameters
        tab = request.args.get('tab', 'unprocessed')  # Default to 'unprocessed'
        limit = int(request.args.get('limit', 50))
        start_date = request.args.get('start_date')  # Format: YYYY-MM-DD
        end_date = request.args.get('end_date')      # Format: YYYY-MM-DD
        
        # Build query for claims to process
        query = db.collection('claims')
        
        # Filter by status based on tab
        print(f"🔍 DEBUG: Processing tab '{tab}' for processor inbox")
        if tab == 'unprocessed':
            # Show qc_pending, need_more_info, qc_answered claims (claims that need processing)
            query = query.where('claim_status', 'in', ['qc_pending', 'need_more_info', 'qc_answered'])
            print(f"🔍 DEBUG: Filtering for unprocessed claims: qc_pending, need_more_info, qc_answered")
        elif tab == 'processed':
            # Show qc_query, qc_clear, claim_approved, claim_denial claims (claims that have been processed)
            query = query.where('claim_status', 'in', ['qc_query', 'qc_clear', 'claim_approved', 'claim_denial'])
            print(f"🔍 DEBUG: Filtering for processed claims: qc_query, qc_clear, claim_approved, claim_denial")
        else:
            # Default to unprocessed
            query = query.where('claim_status', 'in', ['qc_pending', 'need_more_info', 'qc_answered'])
            print(f"🔍 DEBUG: Default filtering for unprocessed claims")
        
        # Apply date filtering if provided
        if start_date:
            from datetime import datetime
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.where('created_at', '>=', start_datetime)
            print(f"DEBUG: Processor filtering from date: {start_date}")
        
        if end_date:
            from datetime import datetime
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            # Add one day to include the entire end date
            from datetime import timedelta
            end_datetime = end_datetime + timedelta(days=1)
            query = query.where('created_at', '<', end_datetime)
            print(f"DEBUG: Processor filtering to date: {end_date}")
        
        # Get all claims first, then filter by hospital, then apply limit
        claims = query.get()
        
        print(f"🔍 DEBUG: Found {len(claims)} claims from query for tab '{tab}'")
        for i, claim in enumerate(claims):
            claim_data = claim.to_dict()
            print(f"  {i+1}. {claim_data.get('claim_id', 'N/A')} - Status: {claim_data.get('claim_status', 'N/A')}")
        
        # Get processor's affiliated hospitals
        processor_hospitals = []
        if hasattr(request, 'user_data') and request.user_data:
            entity_assignments = request.user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            for hospital in hospitals:
                processor_hospitals.append({
                    'id': hospital.get('id', ''),
                    'name': hospital.get('name', ''),
                    'code': hospital.get('code', '')
                })
        
        # Filter by processor's affiliated hospitals
        processed_claims = []
        
        for doc in claims:
            claim_data = doc.to_dict()
            claim_hospital_id = claim_data.get('hospital_id', '')
            claim_hospital_name = claim_data.get('hospital_name', '')
            
            # SKIP DRAFT CLAIMS - drafts should only appear in the Drafts section
            is_draft = claim_data.get('is_draft', False)
            status = claim_data.get('claim_status', '')
            claim_id = claim_data.get('claim_id', doc.id)
            
            if (is_draft == True or 
                status == 'draft' or
                'draft' in claim_id.lower()):
                print(f"DEBUG: Skipping draft claim {claim_id}")
                continue  # Skip drafts - they should only appear in Drafts section
            
            print(f"DEBUG: Processing claim {claim_data.get('claim_id', doc.id)} - status: {claim_data.get('claim_status', '')}, hospital: {claim_hospital_name}")
            
            # Check if claim belongs to processor's affiliated hospitals
            belongs_to_processor = False
            for hospital in processor_hospitals:
                if (hospital['id'] and hospital['id'] == claim_hospital_id) or \
                   (hospital['name'] and hospital['name'].upper() in claim_hospital_name.upper()):
                    belongs_to_processor = True
                    break
            
            # If no hospital filtering (processor has no hospitals), include all claims
            if not processor_hospitals or belongs_to_processor:
                processed_claims.append((doc, claim_data))
                print(f"DEBUG: Added claim {claim_data.get('claim_id', doc.id)} to results")
        
        
        claims_list = []
        for doc, claim_data in processed_claims:
            claims_list.append({
                'claim_id': claim_data.get('claim_id', doc.id),
                'claim_status': claim_data.get('claim_status', ''),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'patient_name': claim_data.get('form_data', {}).get('patient_name', ''),
                'claimed_amount': claim_data.get('form_data', {}).get('claimed_amount', ''),
                'payer_name': claim_data.get('form_data', {}).get('payer_name', ''),
                'specialty': claim_data.get('form_data', {}).get('specialty', ''),
                'hospital_name': claim_data.get('hospital_name', ''),
                'created_by_email': claim_data.get('created_by_email', '')
            })
        
        # Apply limit after filtering
        claims_list = claims_list[:limit]
        
        return jsonify({
            'success': True,
            'total_claims': len(claims_list),
            'claims': claims_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/get-transition-trail/<claim_id>', methods=['GET'])
@require_processor_access
def get_transition_trail(claim_id):
    """Get transition trail for a specific claim - PROCESSORS ONLY"""
    try:
        db = get_firestore()
        
        # Get the claim document
        claim_doc = db.collection('claims').document(claim_id).get()
        if not claim_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Claim not found'
            }), 404
        
        claim_data = claim_doc.to_dict()
        
        # Get transition trail from claim document
        transition_trail = claim_data.get('transition_trail', [])
        
        # If no transition trail exists, create a basic one from available data
        if not transition_trail:
            basic_trail = [
                {
                    'status': claim_data.get('claim_status', ''),
                    'timestamp': str(claim_data.get('created_at', '')),
                    'user': claim_data.get('created_by_email', ''),
                    'action': 'Claim created'
                }
            ]
            if claim_data.get('updated_at'):
                basic_trail.append({
                    'status': claim_data.get('claim_status', ''),
                    'timestamp': str(claim_data.get('updated_at', '')),
                    'user': claim_data.get('processed_by', ''),
                    'action': 'Status updated'
                })
            transition_trail = basic_trail
        
        return jsonify({
            'success': True,
            'claim_id': claim_id,
            'transition_trail': transition_trail
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/process-claim/<claim_id>', methods=['POST'])
@require_processor_access
def process_claim(claim_id):
    """Process a claim (approve/reject/query) - PROCESSORS ONLY"""
    try:
        data = request.get_json()
        status = data.get('status')  # 'qc_clear', 'qc_query', 'claim_approved', 'claim_denial', 'need_more_info'
        remarks = data.get('remarks', '')
        
        valid_statuses = ['qc_clear', 'qc_query', 'claim_approved', 'claim_denial', 'need_more_info']
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        db = get_firestore()
        
        # Get the claim
        claim_doc = db.collection('claims').document(claim_id).get()
        if not claim_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Claim not found'
            }), 404
        
        claim_data = claim_doc.to_dict()
        
        # 🔒 CHECK CLAIM LOCK - Prevent concurrent processing
        current_processor = claim_data.get('locked_by_processor', '')
        current_processor_email = claim_data.get('locked_by_processor_email', '')
        lock_timestamp = claim_data.get('locked_at', None)
        
        # If claim is locked by another processor
        if current_processor and current_processor != request.user_id:
            return jsonify({
                'success': False,
                'error': f'Claim is currently being processed by {current_processor_email}. Please try again later.',
                'locked_by': current_processor_email,
                'locked_at': str(lock_timestamp) if lock_timestamp else 'Unknown'
            }), 409  # Conflict status
        
        # 🔒 LOCK THE CLAIM - Set lock before processing
        lock_data = {
            'locked_by_processor': request.user_id,
            'locked_by_processor_email': request.user_email,
            'locked_by_processor_name': getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            'locked_at': firestore.SERVER_TIMESTAMP,
            'lock_expires_at': datetime.now() + timedelta(hours=2)  # Lock expires in 2 hours
        }
        
        # Update lock first
        db.collection('claims').document(claim_id).update(lock_data)
        
        # Use the provided status directly
        new_status = status
        
        # Get user name from request context
        user_name = getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User'
        
        # Debug: Print processor information
        print(f"🔍 DEBUG: Processing claim {claim_id} by processor:")
        print(f"  user_id: {request.user_id}")
        print(f"  user_email: {request.user_email}")
        print(f"  user_name: {user_name}")
        print(f"  status: {new_status}")
        print(f"  remarks: {remarks}")
        
        # Prepare update document
        update_data = {
            'claim_status': new_status,
            'processed_at': firestore.SERVER_TIMESTAMP,
            'processed_by': request.user_id,
            'processed_by_email': request.user_email,
            'processed_by_name': user_name,
            'processing_remarks': remarks,
            'updated_at': firestore.SERVER_TIMESTAMP,
            # 🔓 UNLOCK THE CLAIM - Remove lock after processing
            'locked_by_processor': None,
            'locked_by_processor_email': None,
            'locked_by_processor_name': None,
            'locked_at': None,
            'lock_expires_at': None
        }
        
        # Update the claim
        db.collection('claims').document(claim_id).update(update_data)
        
        return jsonify({
            'success': True,
            'message': f'Claim status updated to {new_status} successfully',
            'claim_id': claim_id,
            'new_status': new_status
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/get-claim-details/<claim_id>', methods=['GET'])
@require_processor_access
def get_claim_details(claim_id):
    """Get detailed claim information for processing - PROCESSORS ONLY"""
    try:
        db = get_firestore()
        
        # Get the claim by searching for the claim_id field
        claims_query = db.collection('claims').where('claim_id', '==', claim_id)
        claims_docs = claims_query.get()
        
        if not claims_docs:
            return jsonify({
                'success': False,
                'error': 'Claim not found'
            }), 404
        
        # Get the first matching claim
        claim_doc = claims_docs[0]
        claim_data = claim_doc.to_dict()
        
        # Debug: Print creator information
        print(f"🔍 DEBUG: Creator info for claim {claim_id}:")
        print(f"  created_by: {claim_data.get('created_by', 'NOT_FOUND')}")
        print(f"  created_by_email: {claim_data.get('created_by_email', 'NOT_FOUND')}")
        print(f"  created_by_name: {claim_data.get('created_by_name', 'NOT_FOUND')}")
        print(f"  submitted_by: {claim_data.get('submitted_by', 'NOT_FOUND')}")
        print(f"  submitted_by_email: {claim_data.get('submitted_by_email', 'NOT_FOUND')}")
        print(f"  submitted_by_name: {claim_data.get('submitted_by_name', 'NOT_FOUND')}")
        
        # Debug: Print processor information
        print(f"🔍 DEBUG: Processor info for claim {claim_id}:")
        print(f"  processed_by: {claim_data.get('processed_by', 'NOT_FOUND')}")
        print(f"  processed_by_email: {claim_data.get('processed_by_email', 'NOT_FOUND')}")
        print(f"  processed_by_name: {claim_data.get('processed_by_name', 'NOT_FOUND')}")
        print(f"  processing_remarks: {claim_data.get('processing_remarks', 'NOT_FOUND')}")
        print(f"  processed_at: {claim_data.get('processed_at', 'NOT_FOUND')}")
        
        # Extract form_data for easier access
        form_data = claim_data.get('form_data', {})
        
        # Get documents for this claim
        documents = claim_data.get('documents', [])
        
        # Get detailed document information
        detailed_documents = []
        for doc in documents:
            doc_id = doc.get('document_id')
            if doc_id:
                doc_detailed = db.collection('documents').document(doc_id).get()
                if doc_detailed.exists:
                    doc_data = doc_detailed.to_dict()
                    detailed_documents.append({
                        'document_id': doc_data.get('document_id'),
                        'document_type': doc_data.get('document_type'),
                        'document_name': doc_data.get('document_name'),
                        'original_filename': doc_data.get('original_filename'),
                        'download_url': doc_data.get('download_url'),
                        'file_size': doc_data.get('file_size'),
                        'file_type': doc_data.get('file_type'),
                        'uploaded_at': str(doc_data.get('uploaded_at', '')),
                        'status': doc_data.get('status')
                    })
        
        # Return detailed claim information with proper structure
        return jsonify({
            'success': True,
            'claim': {
                'claim_id': claim_data.get('claim_id', claim_id),
                'claim_status': claim_data.get('claim_status', ''),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'hospital_name': claim_data.get('hospital_name', ''),
                'created_by': claim_data.get('created_by', ''),
                'created_by_email': claim_data.get('created_by_email', ''),
                'created_by_name': claim_data.get('created_by_name', ''),
                'submitted_by': claim_data.get('submitted_by', ''),
                'submitted_by_email': claim_data.get('submitted_by_email', ''),
                'submitted_by_name': claim_data.get('submitted_by_name', ''),
                'processing_remarks': claim_data.get('processing_remarks', ''),
                'processed_by': claim_data.get('processed_by', ''),
                'processed_by_email': claim_data.get('processed_by_email', ''),
                'processed_by_name': claim_data.get('processed_by_name', ''),
                'processed_at': str(claim_data.get('processed_at', '')),
                # Patient details
                'patient_details': {
                    'patient_name': form_data.get('patient_name', ''),
                    'age': form_data.get('age', 0),
                    'gender': form_data.get('gender', ''),
                    'id_card_type': form_data.get('id_card_type', ''),
                    'id_card_number': form_data.get('id_card_number', ''),
                    'patient_contact_number': form_data.get('patient_contact_number', ''),
                    'patient_email_id': form_data.get('patient_email_id', ''),
                    'beneficiary_type': form_data.get('beneficiary_type', ''),
                    'relationship': form_data.get('relationship', '')
                },
                # Payer details
                'payer_details': {
                    'payer_name': form_data.get('payer_name', ''),
                    'payer_type': form_data.get('payer_type', ''),
                    'insurer_name': form_data.get('insurer_name', ''),
                    'policy_number': form_data.get('policy_number', ''),
                    'authorization_number': form_data.get('authorization_number', ''),
                    'total_authorized_amount': form_data.get('total_authorized_amount', 0),
                    'payer_patient_id': form_data.get('payer_patient_id', ''),
                    'sponsorer_corporate_name': form_data.get('sponsorer_corporate_name', ''),
                    'sponsorer_employee_id': form_data.get('sponsorer_employee_id', ''),
                    'sponsorer_employee_name': form_data.get('sponsorer_employee_name', '')
                },
                # Provider details
                'provider_details': {
                    'patient_registration_number': form_data.get('patient_registration_number', ''),
                    'specialty': form_data.get('specialty', ''),
                    'doctor': form_data.get('doctor', ''),
                    'treatment_line': form_data.get('treatment_line', ''),
                    'claim_type': form_data.get('claim_type', ''),
                    'hospitalization_type': form_data.get('hospitalization_type', ''),
                    'admission_type': form_data.get('admission_type', ''),
                    'ward_type': form_data.get('ward_type', ''),
                    'admission_date': form_data.get('admission_date', ''),
                    'discharge_date': form_data.get('discharge_date', ''),
                    'service_start_date': form_data.get('service_start_date', ''),
                    'service_end_date': form_data.get('service_end_date', ''),
                    'inpatient_number': form_data.get('inpatient_number', ''),
                    'patient_id': form_data.get('patient_id', '')
                },
                # Treatment details
                'treatment_details': {
                    'diagnosis': form_data.get('diagnosis', ''),
                    'final_diagnosis': form_data.get('final_diagnosis', ''),
                    'icd_10_code': form_data.get('icd_10_code', ''),
                    'pcs_code': form_data.get('pcs_code', ''),
                    'treatment': form_data.get('treatment', ''),
                    'treatment_done': form_data.get('treatment_done', '')
                },
                # Financial details
                'financial_details': {
                    'total_bill_amount': form_data.get('total_bill_amount', 0),
                    'total_patient_paid_amount': form_data.get('total_patient_paid_amount', 0),
                    'total_amount': form_data.get('total_amount', 0),
                    'claimed_amount': form_data.get('claimed_amount', 0),
                    'amount_charged_to_payer': form_data.get('amount_charged_to_payer', 0),
                    'amount_paid_by_patient': form_data.get('amount_paid_by_patient', 0),
                    'mou_discount_amount': form_data.get('mou_discount_amount', 0),
                    'patient_discount_amount': form_data.get('patient_discount_amount', 0),
                    'security_deposit': form_data.get('security_deposit', 0),
                    'total_authorized_amount': form_data.get('total_authorized_amount', 0)
                },
                # Keep original form_data for backward compatibility
                'form_data': form_data,
                # Include documents
                'documents': detailed_documents
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/get-processing-stats', methods=['GET'])
@require_processor_access
def get_processing_stats():
    """Get processing statistics - PROCESSORS ONLY"""
    try:
        db = get_firestore()
        
        # Get counts for different statuses (updated to match user requirements)
        qc_pending_claims = db.collection('claims').where('claim_status', '==', 'qc_pending').get()
        answered_claims = db.collection('claims').where('claim_status', '==', 'answered').get()
        qc_clear_claims = db.collection('claims').where('claim_status', '==', 'qc_clear').get()
        qc_query_claims = db.collection('claims').where('claim_status', '==', 'qc_query').get()
        rejected_claims = db.collection('claims').where('claim_status', '==', 'rejected').get()
        
        return jsonify({
            'success': True,
            'stats': {
                'qc_pending': len(qc_pending_claims),
                'answered': len(answered_claims),
                'qc_clear': len(qc_clear_claims),
                'qc_query': len(qc_query_claims),
                'rejected': len(rejected_claims),
                'unprocessed': len(qc_pending_claims) + len(answered_claims),
                'processed': len(qc_clear_claims) + len(qc_query_claims),
                'total': len(qc_pending_claims) + len(answered_claims) + len(qc_clear_claims) + len(qc_query_claims) + len(rejected_claims)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/check-claim-lock/<claim_id>', methods=['GET'])
@require_processor_access
def check_claim_lock(claim_id):
    """Check if a claim is locked by another processor"""
    try:
        db = get_firestore()
        claim_doc = db.collection('claims').document(claim_id).get()
        
        if not claim_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Claim not found'
            }), 404
        
        claim_data = claim_doc.to_dict()
        
        # Check if claim is locked
        locked_by = claim_data.get('locked_by_processor', '')
        locked_by_email = claim_data.get('locked_by_processor_email', '')
        locked_by_name = claim_data.get('locked_by_processor_name', '')
        locked_at = claim_data.get('locked_at', None)
        lock_expires_at = claim_data.get('lock_expires_at', None)
        
        # Check if lock has expired
        is_locked = False
        if locked_by and locked_by != request.user_id:
            # Check if lock has expired
            if lock_expires_at:
                current_time = datetime.now()
                # Handle both datetime objects and Firestore timestamps
                if hasattr(lock_expires_at, 'timestamp'):
                    expires_time = datetime.fromtimestamp(lock_expires_at.timestamp())
                elif hasattr(lock_expires_at, 'to_pydatetime'):
                    expires_time = lock_expires_at.to_pydatetime()
                else:
                    expires_time = lock_expires_at
                
                if current_time > expires_time:
                    # Lock expired, clear it
                    db.collection('claims').document(claim_id).update({
                        'locked_by_processor': None,
                        'locked_by_processor_email': None,
                        'locked_by_processor_name': None,
                        'locked_at': None,
                        'lock_expires_at': None
                    })
                    is_locked = False
                else:
                    is_locked = True
            else:
                is_locked = True
        
        return jsonify({
            'success': True,
            'is_locked': is_locked,
            'locked_by': locked_by_email if is_locked else None,
            'locked_by_name': locked_by_name if is_locked else None,
            'locked_at': str(locked_at) if is_locked and locked_at else None,
            'lock_expires_at': str(lock_expires_at) if is_locked and lock_expires_at else None
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@processor_bp.route('/bulk-process-claims', methods=['POST'])
@require_processor_access
def bulk_process_claims():
    """Bulk process multiple claims - PROCESSORS ONLY"""
    try:
        data = request.get_json()
        claim_ids = data.get('claim_ids', [])
        status = data.get('status')  # 'qc_clear', 'qc_query', 'claim_approved', 'claim_denial', 'need_more_info'
        remarks = data.get('remarks', '')
        
        if not claim_ids:
            return jsonify({
                'success': False,
                'error': 'No claim IDs provided'
            }), 400
        
        valid_statuses = ['qc_clear', 'qc_query', 'claim_approved', 'claim_denial', 'need_more_info']
        if status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        db = get_firestore()
        
        # Process each claim
        processed_count = 0
        errors = []
        
        for claim_id in claim_ids:
            try:
                claim_doc = db.collection('claims').document(claim_id).get()
                if claim_doc.exists:
                    # Use the provided status directly
                    new_status = status
                    
                    update_data = {
                        'claim_status': new_status,
                        'processed_at': firestore.SERVER_TIMESTAMP,
                        'processed_by': request.user_id,
                        'processed_by_email': request.user_email,
                        'processing_remarks': remarks,
                        'updated_at': firestore.SERVER_TIMESTAMP
                    }
                    
                    db.collection('claims').document(claim_id).update(update_data)
                    processed_count += 1
                else:
                    errors.append(f'Claim {claim_id} not found')
            except Exception as e:
                errors.append(f'Error processing claim {claim_id}: {str(e)}')
        
        return jsonify({
            'success': True,
            'message': f'Bulk processing completed',
            'processed_count': processed_count,
            'total_claims': len(claim_ids),
            'errors': errors
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500