"""
Draft management routes for saving and managing claim drafts
Role-based access: hospital_user, claim_processor, reconciler ONLY
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_claims_access
from firebase_admin import firestore
from datetime import datetime
import uuid

drafts_bp = Blueprint('drafts', __name__)


@drafts_bp.route('/save-draft', methods=['POST'])
@require_claims_access
def save_draft():
    """Save a claim as draft with minimum required fields"""
    try:
        print(f"\n🔄 DRAFT SAVE REQUEST RECEIVED")
        print(f"  Timestamp: {datetime.now()}")
        print(f"  User: {getattr(request, 'user_email', 'unknown')}")
        
        data = request.get_json()
        db = get_firestore()
        
        # Validate minimum required field
        if not data.get('patient_name'):
            return jsonify({
                'success': False,
                'error': 'Patient name is required to save a draft'
            }), 400
        
        # TEMPORARILY DISABLED: Check for duplicate drafts with same data (within last 5 minutes)
        # TODO: Re-enable after fixing the main save issue
        print(f"🔍 Skipping duplicate check for now - Patient: {data.get('patient_name', '')}")
        
        # Generate draft ID
        draft_id = f"draft_{uuid.uuid4().hex[:8]}"
        
        # Get user info from request object (set by auth middleware)
        user_id = getattr(request, 'user_id', '')
        user_email = getattr(request, 'user_email', '')
        hospital_id = getattr(request, 'hospital_id', '')
        hospital_name = getattr(request, 'hospital_name', '')
        
        # Prepare draft document
        draft_document = {
            # Draft Metadata
            'draft_id': draft_id,
            'claim_status': 'draft',
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'created_by': user_id,
            'created_by_email': user_email,
            'hospital_id': hospital_id,
            'hospital_name': hospital_name,
            'is_draft': True,
            
            # Form data (all fields from request)
            'form_data': data,
            
            # Module visibility flags (default to claims module for drafts)
            'show_in_claims': True,
            'show_in_preauth': False,
            'show_in_reimb': False,
            'created_in_module': 'claims'
        }
        
        # Save to Firestore
        db.collection('claims').document(draft_id).set(draft_document)
        
        print(f"✅ DRAFT SAVED SUCCESSFULLY")
        print(f"  Draft ID: {draft_id}")
        print(f"  Patient: {data.get('patient_name', 'N/A')}")
        
        return jsonify({
            'success': True,
            'message': 'Draft saved successfully',
            'draft_id': draft_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@drafts_bp.route('/get-drafts', methods=['GET'])
@require_claims_access
def get_drafts():
    """Get all drafts for the user's hospital"""
    try:
        db = get_firestore()
        
        # Get user's hospital ID from request object (set by auth middleware)
        hospital_id = getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital ID not found'
            }), 400
        
        # Query drafts for this hospital - include drafts without hospital info for backward compatibility
        query = db.collection('claims').where('claim_status', '==', 'draft')
        all_drafts = query.get()
        
        # STRICT HOSPITAL FILTERING - Only show drafts with proper hospital info
        drafts = []
        print(f"DEBUG: User hospital - ID: {hospital_id}, Name: {getattr(request, 'hospital_name', 'Unknown')}")
        
        for doc in all_drafts:
            draft_data = doc.to_dict()
            draft_hospital_id = draft_data.get('hospital_id', '')
            draft_hospital_name = draft_data.get('hospital_name', '')
            
            print(f"DEBUG: Checking draft {draft_data.get('draft_id', doc.id)} - hospital_id: '{draft_hospital_id}', hospital_name: '{draft_hospital_name}'")
            
            # EXCLUDE ALL drafts with missing or null hospital information
            if not draft_hospital_id and not draft_hospital_name:
                print(f"DEBUG: EXCLUDED draft {draft_data.get('draft_id', doc.id)} - missing hospital info")
                continue
            
            # Check if draft belongs to user's hospital
            belongs_to_user_hospital = (
                (draft_hospital_id and draft_hospital_id == hospital_id) or
                (draft_hospital_name and hasattr(request, 'hospital_name') and 
                 request.hospital_name and draft_hospital_name.upper() == request.hospital_name.upper())
            )
            
            if belongs_to_user_hospital:
                drafts.append(doc)
                print(f"DEBUG: INCLUDED draft {draft_data.get('draft_id', doc.id)} for hospital {draft_hospital_name}")
            else:
                print(f"DEBUG: EXCLUDED draft {draft_data.get('draft_id', doc.id)} - different hospital (draft: {draft_hospital_name}, user: {getattr(request, 'hospital_name', 'Unknown')})")
        
        drafts_list = []
        for doc in drafts:
            draft_data = doc.to_dict()
            
            # Format dates for JSON serialization
            formatted_draft = {
                'draft_id': draft_data.get('draft_id', doc.id),
                'status': draft_data.get('claim_status', 'draft'),
                'created_at': str(draft_data.get('created_at', '')),
                'updated_at': str(draft_data.get('updated_at', '')),
                'patient_name': draft_data.get('form_data', {}).get('patient_name', ''),
                'claimed_amount': draft_data.get('form_data', {}).get('claimed_amount', ''),
                'specialty': draft_data.get('form_data', {}).get('specialty', ''),
                'hospital_id': draft_data.get('hospital_id', ''),
                'hospital_name': draft_data.get('hospital_name', ''),
                'created_by_email': draft_data.get('created_by_email', '')
            }
            drafts_list.append(formatted_draft)
        
        return jsonify({
            'success': True,
            'drafts': drafts_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@drafts_bp.route('/get-draft/<draft_id>', methods=['GET'])
@require_claims_access
def get_draft(draft_id):
    """Get specific draft by ID"""
    try:
        db = get_firestore()
        
        # Get user's hospital ID from request object (set by auth middleware)
        hospital_id = getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital ID not found'
            }), 400
        
        # Get draft document
        draft_doc = db.collection('claims').document(draft_id).get()
        
        if not draft_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Draft not found'
            }), 404
        
        draft_data = draft_doc.to_dict()
        
        # Check if draft belongs to user's hospital
        # For backward compatibility, allow access if draft has no hospital info
        draft_hospital_id = draft_data.get('hospital_id', '')
        if draft_hospital_id and draft_hospital_id != hospital_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Get fresh download URLs for documents
        documents = draft_data.get('documents', [])
        for doc in documents:
            if doc.get('document_id'):
                try:
                    # Get document metadata from documents collection
                    doc_ref = db.collection('documents').document(doc['document_id'])
                    doc_meta = doc_ref.get()
                    if doc_meta.exists:
                        doc_data = doc_meta.to_dict()
                        storage_path = doc_data.get('storage_path')
                        if storage_path:
                            # Generate fresh signed URL
                            from firebase_config import get_storage
                            from datetime import timedelta
                            storage = get_storage()
                            blob = storage.blob(storage_path)
                            fresh_url = blob.generate_signed_url(expiration=timedelta(days=7))
                            doc['download_url'] = fresh_url
                except Exception as e:
                    print(f"Error generating fresh URL for document {doc.get('document_id')}: {e}")
                    # Keep existing URL if available
                    pass

        # Format response
        formatted_draft = {
            'draft_id': draft_data.get('draft_id', draft_id),
            'status': draft_data.get('claim_status', 'draft'),
            'created_at': str(draft_data.get('created_at', '')),
            'updated_at': str(draft_data.get('updated_at', '')),
            'created_by': draft_data.get('created_by', ''),
            'created_by_email': draft_data.get('created_by_email', ''),
            'hospital_id': draft_data.get('hospital_id', ''),
            'hospital_name': draft_data.get('hospital_name', ''),
            'form_data': draft_data.get('form_data', {}),
            'documents': documents,  # Include documents with fresh URLs
            'is_draft': draft_data.get('is_draft', True)
        }
        
        return jsonify({
            'success': True,
            'draft': formatted_draft
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@drafts_bp.route('/update-draft/<draft_id>', methods=['PUT'])
@require_claims_access
def update_draft(draft_id):
    """Update an existing draft"""
    try:
        data = request.get_json()
        db = get_firestore()
        
        # Get user's hospital ID from request object (set by auth middleware)
        hospital_id = getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital ID not found'
            }), 400
        
        # Get draft document
        draft_ref = db.collection('claims').document(draft_id)
        draft_doc = draft_ref.get()
        
        if not draft_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Draft not found'
            }), 404
        
        draft_data = draft_doc.to_dict()
        
        # Check if draft belongs to user's hospital
        # For backward compatibility, allow access if draft has no hospital info
        draft_hospital_id = draft_data.get('hospital_id', '')
        if draft_hospital_id and draft_hospital_id != hospital_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Update form data
        current_form_data = draft_data.get('form_data', {})
        updated_form_data = {**current_form_data, **data}
        
        # Update document
        draft_ref.update({
            'form_data': updated_form_data,
            'updated_at': firestore.SERVER_TIMESTAMP
        })
        
        return jsonify({
            'success': True,
            'message': 'Draft updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@drafts_bp.route('/submit-draft/<draft_id>', methods=['POST'])
@require_claims_access
def submit_draft(draft_id):
    """Submit a draft as a claim (changes status from draft to pending)"""
    try:
        db = get_firestore()
        
        # Get user's hospital ID from request object (set by auth middleware)
        hospital_id = getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital ID not found'
            }), 400
        
        # Get draft document
        draft_ref = db.collection('claims').document(draft_id)
        draft_doc = draft_ref.get()
        
        if not draft_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Draft not found'
            }), 404
        
        draft_data = draft_doc.to_dict()
        
        # Check if draft belongs to user's hospital
        # For backward compatibility, allow access if draft has no hospital info
        draft_hospital_id = draft_data.get('hospital_id', '')
        if draft_hospital_id and draft_hospital_id != hospital_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Check if it's actually a draft
        if draft_data.get('claim_status') != 'draft':
            return jsonify({
                'success': False,
                'error': 'This is not a draft'
            }), 400
        
        # Get form data
        form_data = draft_data.get('form_data', {})
        
        # Validate required fields for submission
        required_fields = [
            'patient_name', 'age', 'gender', 'id_card_type', 'beneficiary_type', 'relationship',
            'payer_patient_id', 'authorization_number', 'total_authorized_amount', 'payer_type', 'payer_name',
            'patient_registration_number', 'specialty', 'doctor', 'treatment_line', 'claim_type',
            'service_start_date', 'service_end_date', 'inpatient_number', 'admission_type',
            'hospitalization_type', 'ward_type', 'final_diagnosis', 'treatment_done',
            'bill_number', 'bill_date', 'total_bill_amount', 'claimed_amount'
        ]
        
        missing_fields = [field for field in required_fields if not form_data.get(field)]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields to submit: {", ".join(missing_fields)}'
            }), 400
        
        # Generate new claim ID for submission
        claim_id = f"claim_{uuid.uuid4().hex[:8]}"
        
        # Prepare claim document (similar to claims/submit)
        claim_document = {
            # Claim Metadata
            'claim_id': claim_id,
            'claim_status': 'pending',  # ✅ FIXED: Set to pending, not submitted
            'submission_date': firestore.SERVER_TIMESTAMP,
            'created_at': draft_data.get('created_at'),
            'updated_at': firestore.SERVER_TIMESTAMP,
            
            # Module visibility flags
            'show_in_claims': draft_data.get('show_in_claims', True),
            'show_in_preauth': draft_data.get('show_in_preauth', False),
            'show_in_reimb': draft_data.get('show_in_reimb', False),
            'created_in_module': draft_data.get('created_in_module', 'claims'),
            
            # Patient Details
            'patient_details': {
                'patient_name': form_data.get('patient_name'),
                'age': int(form_data.get('age') or 0),
                'age_unit': form_data.get('age_unit', 'YRS'),
                'gender': form_data.get('gender'),
                'id_card_type': form_data.get('id_card_type'),
                'id_card_number': form_data.get('id_card_number', ''),
                'patient_contact_number': form_data.get('patient_contact_number', ''),
                'patient_email_id': form_data.get('patient_email_id', ''),
                'beneficiary_type': form_data.get('beneficiary_type'),
                'relationship': form_data.get('relationship')
            },
            
            # Payer Details
            'payer_details': {
                'payer_patient_id': form_data.get('payer_patient_id'),
                'authorization_number': form_data.get('authorization_number'),
                'total_authorized_amount': float(form_data.get('total_authorized_amount') or 0),
                'payer_type': form_data.get('payer_type'),
                'payer_name': form_data.get('payer_name'),
                'insurer_name': form_data.get('insurer_name', ''),
                'policy_number': form_data.get('policy_number', ''),
                'sponsorer_corporate_name': form_data.get('sponsorer_corporate_name', ''),
                'sponsorer_employee_id': form_data.get('sponsorer_employee_id', ''),
                'sponsorer_employee_name': form_data.get('sponsorer_employee_name', '')
            },
            
            # Provider Details
            'provider_details': {
                'patient_registration_number': form_data.get('patient_registration_number'),
                'specialty': form_data.get('specialty'),
                'doctor': form_data.get('doctor'),
                'treatment_line': form_data.get('treatment_line'),
                'claim_type': form_data.get('claim_type'),
                'service_start_date': form_data.get('service_start_date'),
                'service_end_date': form_data.get('service_end_date'),
                'inpatient_number': form_data.get('inpatient_number'),
                'admission_type': form_data.get('admission_type'),
                'hospitalization_type': form_data.get('hospitalization_type'),
                'ward_type': form_data.get('ward_type'),
                'final_diagnosis': form_data.get('final_diagnosis'),
                'treatment_done': form_data.get('treatment_done'),
                'icd_10_code': form_data.get('icd_10_code', ''),
                'pcs_code': form_data.get('pcs_code', '')
            },
            
            # Bill Details
            'bill_details': {
                'bill_number': form_data.get('bill_number'),
                'bill_date': form_data.get('bill_date'),
                'security_deposit': float(form_data.get('security_deposit') or 0),
                'total_bill_amount': float(form_data.get('total_bill_amount') or 0),
                'patient_discount_amount': float(form_data.get('patient_discount_amount') or 0),
                'amount_paid_by_patient': float(form_data.get('amount_paid_by_patient') or 0),
                'total_patient_paid_amount': float(form_data.get('total_patient_paid_amount') or 0),
                'amount_charged_to_payer': float(form_data.get('amount_charged_to_payer') or 0),
                'mou_discount_amount': float(form_data.get('mou_discount_amount') or 0),
                'claimed_amount': float(form_data.get('claimed_amount') or 0),
                'submission_remarks': form_data.get('submission_remarks', '')
            },
            
            # Additional metadata
            'hospital_id': draft_data.get('hospital_id'),
            'submitted_by': draft_data.get('created_by', ''),
            'submitted_by_email': draft_data.get('created_by_email', ''),
            'submitted_by_name': draft_data.get('created_by_name', '') or draft_data.get('created_by_email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title()
        }
        
        # Save new claim document
        db.collection('claims').document(claim_id).set(claim_document)
        
        # Delete the original draft
        draft_ref.delete()
        
        return jsonify({
            'success': True,
            'message': 'Draft submitted successfully',
            'claim_id': claim_id
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@drafts_bp.route('/upload-document/<draft_id>', methods=['POST'])
@require_claims_access
def upload_draft_document(draft_id):
    """Upload document for a draft"""
    try:
        from firebase_config import get_storage
        from werkzeug.utils import secure_filename
        import uuid
        from datetime import timedelta
        
        # Get form data
        document_type = request.form.get('document_type')
        document_name = request.form.get('document_name')
        
        if not document_type or not document_name:
            return jsonify({
                'success': False,
                'error': 'document_type and document_name are required'
            }), 400
        
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Get user info
        user_id = getattr(request, 'user_id', '')
        hospital_id = getattr(request, 'hospital_id', '')
        
        # Compress file if needed
        from utils.compression import compress_document, get_compression_stats
        print(f"🔧 Compressing draft file: {file.filename}")
        compressed_file, original_size, was_compressed = compress_document(file, max_size_mb=5.0, quality=85)
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        
        # Create storage path: IP_Claims/{hospital_id}/{draft_id}/{document_type}/{filename}
        storage_path = f"IP_Claims/{hospital_id}/{draft_id}/{document_type}/{unique_filename}"
        
        # Upload to Firebase Storage
        bucket = get_storage()
        blob = bucket.blob(storage_path)
        
        # Upload compressed file
        blob.upload_from_file(compressed_file, content_type=compressed_file.content_type)
        
        # Generate signed URL for download (valid for 7 days)
        download_url = blob.generate_signed_url(expiration=timedelta(days=7))
        
        # Save document metadata to Firestore
        db = get_firestore()
        document_id = f"doc_{uuid.uuid4().hex[:8]}"
        
        # Get compressed file size
        compressed_file.seek(0, 2)
        compressed_size = compressed_file.tell()
        compressed_file.seek(0)
        
        # Calculate compression stats
        compression_stats = get_compression_stats(original_size, compressed_size)
        
        document_metadata = {
            'document_id': document_id,
            'claim_id': draft_id,  # Use draft_id as claim_id for drafts
            'document_type': document_type,
            'document_name': document_name,
            'original_filename': secure_filename(file.filename),
            'storage_path': storage_path,
            'download_url': download_url,
            'file_size': compressed_size,
            'original_file_size': original_size,
            'file_type': compressed_file.content_type,
            'uploaded_by': user_id,
            'hospital_id': hospital_id,
            'uploaded_at': firestore.SERVER_TIMESTAMP,
            'status': 'uploaded',
            'compression': {
                'was_compressed': was_compressed,
                'compression_ratio': compression_stats['compression_ratio'],
                'size_reduction_percent': compression_stats['size_reduction_percent'],
                'bytes_saved': compression_stats['bytes_saved']
            }
        }
        
        # Save to documents collection
        db.collection('documents').document(document_id).set(document_metadata)
        
        # Update draft document to include document reference
        draft_ref = db.collection('claims').document(draft_id)
        draft_doc = draft_ref.get()
        
        if draft_doc.exists:
            draft_data = draft_doc.to_dict()
            documents = draft_data.get('documents', [])
            documents.append({
                'document_id': document_id,
                'document_type': document_type,
                'document_name': document_name,
                'uploaded_at': str(document_metadata['uploaded_at']),
                'status': 'uploaded',
                'download_url': download_url
            })
            
            draft_ref.update({
                'documents': documents,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'document_id': document_id,
            'download_url': download_url
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@drafts_bp.route('/delete-draft/<draft_id>', methods=['DELETE'])
@require_claims_access
def delete_draft(draft_id):
    """Delete a draft"""
    try:
        db = get_firestore()
        
        # Get user's hospital ID from request object (set by auth middleware)
        hospital_id = getattr(request, 'hospital_id', '')
        
        if not hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital ID not found'
            }), 400
        
        # Get draft document
        draft_ref = db.collection('claims').document(draft_id)
        draft_doc = draft_ref.get()
        
        if not draft_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Draft not found'
            }), 404
        
        draft_data = draft_doc.to_dict()
        
        # Check if draft belongs to user's hospital
        # For backward compatibility, allow access if draft has no hospital info
        draft_hospital_id = draft_data.get('hospital_id', '')
        if draft_hospital_id and draft_hospital_id != hospital_id:
            return jsonify({
                'success': False,
                'error': 'Access denied'
            }), 403
        
        # Check if it's actually a draft
        if draft_data.get('claim_status') != 'draft':
            return jsonify({
                'success': False,
                'error': 'This is not a draft'
            }), 400
        
        # Delete the draft
        draft_ref.delete()
        
        return jsonify({
            'success': True,
            'message': 'Draft deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
