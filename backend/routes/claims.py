"""
Shared Claims Routes - For all authenticated users
These routes handle general claim viewing and shared functionality
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_claims_access
from firebase_admin import firestore
from datetime import datetime
from utils.transaction_helper import create_transaction, get_claim_transactions, TransactionType

claims_bp = Blueprint('claims', __name__)


@claims_bp.route('/get-all-claims', methods=['GET'])
@require_claims_access
def get_all_claims():
    """Get all claims - ALL ROLES (for viewing/listing)"""
    try:
        db = get_firestore()
        
        # Get query parameters
        status = request.args.get('status', 'all')  # Default to 'all' to show all claims
        limit = int(request.args.get('limit', 50))
        start_date = request.args.get('start_date')  # Format: YYYY-MM-DD
        end_date = request.args.get('end_date')      # Format: YYYY-MM-DD
        
        # Get user's hospital information from request (set by middleware)
        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_email = getattr(request, 'user_email', '')
        
        print(f"\n{'='*80}")
        print(f"DEBUG GET-ALL-CLAIMS: User Info")
        print(f"  Email: {user_email}")
        print(f"  Hospital ID: '{user_hospital_id}'")
        print(f"  Hospital Name: '{user_hospital_name}'")
        print(f"{'='*80}\n")
        
        # CRITICAL: If hospital info is missing, return error
        if not user_hospital_id and not user_hospital_name:
            return jsonify({
                'success': False,
                'error': 'Hospital information not found for user. Please contact support.',
                'details': 'User profile does not have proper hospital assignment'
            }), 400
        
        # Build query - filter by user's hospital and status
        query = db.collection('claims')
        
        # TEMPORARILY DISABLED: Filter by claim_type = 'claims' to show only claims module submissions
        # query = query.where('claim_type', '==', 'claims')
        
        if status != 'all':
            query = query.where('claim_status', '==', status)
        
        # Apply date filtering if provided
        if start_date:
            from datetime import datetime
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.where('created_at', '>=', start_datetime)
            print(f"DEBUG: Filtering from date: {start_date}")
        
        if end_date:
            from datetime import datetime
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            # Add one day to include the entire end date
            from datetime import timedelta
            end_datetime = end_datetime + timedelta(days=1)
            query = query.where('created_at', '<', end_datetime)
            print(f"DEBUG: Filtering to date: {end_date}")
        
        # Get all claims first, then filter by hospital, then apply limit
        claims = query.get()
        
        claims_list = []
        excluded_count = 0
        included_count = 0
        
        for doc in claims:
            claim_data = doc.to_dict()
            claim_id = claim_data.get('claim_id', doc.id)
            
            # HOSPITAL FILTERING: Only show claims from user's hospital
            claim_hospital_id = (claim_data.get('hospital_id') or '').strip()
            claim_hospital_name = (claim_data.get('hospital_name') or '').strip()
            
            print(f"\n--- Checking Claim: {claim_id} ---")
            print(f"  Claim Hospital ID: '{claim_hospital_id}'")
            print(f"  Claim Hospital Name: '{claim_hospital_name}'")
            print(f"  User Hospital ID: '{user_hospital_id}'")
            print(f"  User Hospital Name: '{user_hospital_name}'")
            
            # STRICT HOSPITAL FILTERING: Only show claims from user's hospital
            belongs_to_user_hospital = False
            match_reason = None
            
            # Check hospital_id match (case-sensitive, exact match)
            if claim_hospital_id and user_hospital_id:
                if claim_hospital_id == user_hospital_id:
                    belongs_to_user_hospital = True
                    match_reason = "hospital_id exact match"
                    print(f"  ✓ MATCH: Hospital ID exact match")
                else:
                    print(f"  ✗ NO MATCH: Hospital ID mismatch ('{claim_hospital_id}' != '{user_hospital_id}')")
            
            # Check hospital_name match (case-insensitive)
            if claim_hospital_name and user_hospital_name:
                if claim_hospital_name.upper() == user_hospital_name.upper():
                    belongs_to_user_hospital = True
                    match_reason = "hospital_name case-insensitive match"
                    print(f"  ✓ MATCH: Hospital Name match (case-insensitive)")
                else:
                    print(f"  ✗ NO MATCH: Hospital Name mismatch ('{claim_hospital_name}' != '{user_hospital_name}')")
            
            # EXCLUDE claims from different hospitals - STRICT FILTERING
            if not belongs_to_user_hospital:
                excluded_count += 1
                print(f"  ❌ EXCLUDED: Different hospital")
                print(f"     Claim: '{claim_hospital_name}' (ID: {claim_hospital_id})")
                print(f"     User: '{user_hospital_name}' (ID: {user_hospital_id})")
                continue
            
            included_count += 1
            print(f"  ✅ INCLUDED: {match_reason}")
            
            # Filter out drafts - only check explicit draft indicators
            is_draft = claim_data.get('is_draft', False)
            status = claim_data.get('claim_status', '') or claim_data.get('status', '')
            claim_id = claim_data.get('claim_id', doc.id)
            
            # Skip only if explicitly marked as draft (handle "NOT_SET" values)
            if (is_draft == True or 
                status == 'draft' or
                'draft' in claim_id.lower()):
                continue  # Skip drafts
            
            # ONLY SHOW CLAIMS FROM CLAIM FORM (CSHLSIP or CLS prefix)
            if not (claim_id.startswith('CSHLSIP') or claim_id.startswith('CLS')):
                print(f"DEBUG: Excluded claim {claim_id} - not a claim form submission")
                continue
            
            # Include claims with "NOT_SET" status as they might be valid claims
            # TODO: Update these claims to have proper status
            
            # Handle different data structures
            form_data = claim_data.get('form_data', {})
            
            # Try to get patient name from form_data first, then from direct fields
            patient_name = form_data.get('patient_name', '') or claim_data.get('email', '') or claim_data.get('created_by_name', '')
            
            # Try to get claimed amount from form_data first, then from direct fields
            claimed_amount = form_data.get('claimed_amount', '') or claim_data.get('total_bill_amount', '')
            
            # Try to get specialty from form_data first, then from direct fields
            specialty = form_data.get('specialty', '') or claim_data.get('stage', '')
            
            claims_list.append({
                'claim_id': claim_data.get('claim_id', doc.id),
                'claim_status': claim_data.get('claim_status', '') or claim_data.get('status', ''),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'patient_name': patient_name,
                'claimed_amount': claimed_amount,
                'specialty': specialty,
                'hospital_name': claim_data.get('hospital_name', ''),
                'created_by_email': claim_data.get('created_by_email', '') or claim_data.get('email', '')
            })
        
        # Apply limit after filtering
        claims_list = claims_list[:limit]
        
        print(f"\n{'='*80}")
        print(f"FILTERING SUMMARY:")
        print(f"  Total claims queried: {len(claims)}")
        print(f"  Included (matching hospital): {included_count}")
        print(f"  Excluded (different hospital): {excluded_count}")
        print(f"  Final claims returned: {len(claims_list)}")
        print(f"{'='*80}\n")
        
        return jsonify({
            'success': True,
            'total_claims': len(claims_list),
            'claims': claims_list,
            'debug': {
                'user_hospital': user_hospital_name,
                'total_queried': len(claims),
                'included': included_count,
                'excluded': excluded_count
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/get-claim/<claim_id>', methods=['GET'])
@require_claims_access
def get_claim(claim_id):
    """Get specific claim details - ALL ROLES"""
    try:
        # Debug: Check what token is being received
        auth_header = request.headers.get('Authorization', '')
        print(f"🔍 DEBUG: Authorization header: {auth_header[:50]}..." if auth_header else "🔍 DEBUG: No Authorization header")
        
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
        
        # HOSPITAL FILTERING: Check if user can access this claim
        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_role = getattr(request, 'user_role', '')
        
        claim_hospital_id = claim_data.get('hospital_id', '')
        claim_hospital_name = claim_data.get('hospital_name', '')
        
        # Check if claim belongs to user's hospital (except for processors who can see from affiliated hospitals)
        if user_role not in ['claim_processor', 'claim_processor_l4']:
            belongs_to_user_hospital = (
                (claim_hospital_id and claim_hospital_id == user_hospital_id) or
                (claim_hospital_name and user_hospital_name and 
                 claim_hospital_name.upper() == user_hospital_name.upper())
            )
            
            if not belongs_to_user_hospital:
                return jsonify({
                    'success': False,
                    'error': 'Access denied - claim belongs to different hospital'
                }), 403
        
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
        
        # Return claim information
        return jsonify({
            'success': True,
            'claim': {
                'claim_id': claim_data.get('claim_id', claim_id),
                'claim_status': claim_data.get('claim_status', ''),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'hospital_name': claim_data.get('hospital_name', ''),
                'created_by_email': claim_data.get('created_by_email', ''),
                'created_by_name': claim_data.get('created_by_name', ''),
                'submitted_by': claim_data.get('submitted_by', ''),
                'submitted_by_email': claim_data.get('submitted_by_email', ''),
                'submitted_by_name': claim_data.get('submitted_by_name', ''),
                'form_data': claim_data.get('form_data', {}),
                'processing_remarks': claim_data.get('processing_remarks', ''),
                'processed_by': claim_data.get('processed_by', ''),
                'processed_by_email': claim_data.get('processed_by_email', ''),
                'processed_by_name': claim_data.get('processed_by_name', ''),
                'processed_at': str(claim_data.get('processed_at', '')),
                'documents': detailed_documents
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/get-claims-stats', methods=['GET'])
@require_claims_access
def get_claims_stats():
    """Get claims statistics - ALL ROLES (hospital-filtered)"""
    try:
        db = get_firestore()
        
        # Get user's hospital information
        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        
        # Get all claims and filter by hospital in Python
        qc_pending_all = db.collection('claims').where('claim_status', '==', 'qc_pending').where('is_draft', '==', False).get()
        pending_all = db.collection('claims').where('claim_status', '==', 'pending').where('is_draft', '==', False).get()
        approved_all = db.collection('claims').where('claim_status', '==', 'approved').where('is_draft', '==', False).get()
        rejected_all = db.collection('claims').where('claim_status', '==', 'rejected').where('is_draft', '==', False).get()
        queried_all = db.collection('claims').where('claim_status', '==', 'queried').where('is_draft', '==', False).get()
        dispatched_all = db.collection('claims').where('claim_status', '==', 'dispatched').where('is_draft', '==', False).get()
        
        # Filter by hospital
        def filter_by_hospital(claims_list):
            filtered = []
            for doc in claims_list:
                claim_data = doc.to_dict()
                claim_hospital_id = claim_data.get('hospital_id', '')
                claim_hospital_name = claim_data.get('hospital_name', '')
                
                belongs_to_user_hospital = (
                    (claim_hospital_id and claim_hospital_id == user_hospital_id) or
                    (claim_hospital_name and user_hospital_name and 
                     claim_hospital_name.upper() == user_hospital_name.upper())
                )
                
                if belongs_to_user_hospital:
                    filtered.append(doc)
            return filtered
        
        qc_pending_claims = filter_by_hospital(qc_pending_all)
        pending_claims = filter_by_hospital(pending_all)
        approved_claims = filter_by_hospital(approved_all)
        rejected_claims = filter_by_hospital(rejected_all)
        queried_claims = filter_by_hospital(queried_all)
        dispatched_claims = filter_by_hospital(dispatched_all)
        
        return jsonify({
            'success': True,
            'stats': {
                'qc_pending': len(qc_pending_claims),
                'pending': len(pending_claims),
                'approved': len(approved_claims),
                'rejected': len(rejected_claims),
                'queried': len(queried_claims),
                'dispatched': len(dispatched_claims),
                'total': len(qc_pending_claims) + len(pending_claims) + len(approved_claims) + len(rejected_claims) + len(queried_claims) + len(dispatched_claims)
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/debug-claims', methods=['GET'])
@require_claims_access
def debug_claims():
    """Debug endpoint to see what claims exist and their claim_type"""
    try:
        db = get_firestore()
        
        # Get user's hospital information
        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_email = getattr(request, 'user_email', '')
        user_data = getattr(request, 'user_data', {})
        
        # Get all claims for debugging (limit to 20 for performance)
        all_claims = db.collection('claims').limit(20).get()
        
        debug_info = []
        for doc in all_claims:
            claim_data = doc.to_dict()
            claim_hospital_name = claim_data.get('hospital_name', 'NOT_SET')
            claim_hospital_id = claim_data.get('hospital_id', 'NOT_SET')
            
            # Check if it matches user's hospital
            id_match = claim_hospital_id == user_hospital_id if (claim_hospital_id and user_hospital_id) else False
            name_match = claim_hospital_name.upper() == user_hospital_name.upper() if (claim_hospital_name and user_hospital_name) else False
            
            debug_info.append({
                'claim_id': claim_data.get('claim_id', doc.id),
                'claim_type': claim_data.get('claim_type', 'NOT_SET'),
                'hospital_name': claim_hospital_name,
                'hospital_id': claim_hospital_id,
                'claim_status': claim_data.get('claim_status', 'NOT_SET'),
                'is_draft': claim_data.get('is_draft', 'NOT_SET'),
                'matches_user_hospital_id': id_match,
                'matches_user_hospital_name': name_match,
                'should_be_visible': id_match or name_match
            })
        
        return jsonify({
            'success': True,
            'user_info': {
                'email': user_email,
                'hospital_id': user_hospital_id,
                'hospital_name': user_hospital_name,
                'entity_assignments': user_data.get('entity_assignments', {})
            },
            'debug_info': debug_info,
            'total_claims_found': len(debug_info),
            'claims_that_should_be_visible': len([c for c in debug_info if c['should_be_visible']])
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/answer-query/<claim_id>', methods=['POST'])
@require_claims_access
def answer_query(claim_id):
    """Answer a processor query - HOSPITAL USERS ONLY"""
    try:
        data = request.get_json()
        query_response = data.get('query_response', '').strip()
        uploaded_files = data.get('uploaded_files', [])
        
        if not query_response and not uploaded_files:
            return jsonify({
                'success': False,
                'error': 'Please provide either a text response or upload supporting documents'
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
        
        # Check if claim is in qc_query status
        if claim_data.get('claim_status') != 'qc_query':
            return jsonify({
                'success': False,
                'error': 'This claim is not in query status. Current status: ' + claim_data.get('claim_status', 'unknown')
            }), 400
        
        # Update claim with query response
        update_data = {
            'claim_status': 'qc_answered',
            'query_response': query_response,
            'query_answered_by': request.user_id,
            'query_answered_by_email': request.user_email,
            'query_answered_by_name': getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            'query_answered_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add uploaded files to claim if any
        if uploaded_files:
            update_data['query_response_files'] = uploaded_files
        
        db.collection('claims').document(claim_id).update(update_data)
        
        # Create transaction record
        transaction_metadata = {
            'query_response': query_response
        }
        if uploaded_files:
            transaction_metadata['uploaded_files_count'] = len(uploaded_files)
        
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.ANSWERED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            performed_by_role='hospital_user',
            previous_status='qc_query',
            new_status='qc_answered',
            remarks=query_response,
            metadata=transaction_metadata
        )
        
        return jsonify({
            'success': True,
            'message': 'Query response submitted successfully',
            'claim_id': claim_id,
            'new_status': 'qc_answered'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/dispatch-claim/<claim_id>', methods=['POST'])
@require_claims_access
def dispatch_claim(claim_id):
    """Dispatch a cleared claim - HOSPITAL USERS ONLY"""
    try:
        data = request.get_json()
        dispatch_remarks = data.get('dispatch_remarks', '').strip()
        dispatch_date = data.get('dispatch_date', '').strip()
        dispatch_mode = data.get('dispatch_mode', 'online').strip()
        
        # Mode-specific fields
        acknowledgment_number = data.get('acknowledgment_number', '').strip()
        courier_name = data.get('courier_name', '').strip()
        docket_number = data.get('docket_number', '').strip()
        contact_person_name = data.get('contact_person_name', '').strip()
        contact_person_phone = data.get('contact_person_phone', '').strip()
        
        db = get_firestore()
        
        # Get the claim
        claim_doc = db.collection('claims').document(claim_id).get()
        if not claim_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Claim not found'
            }), 404
        
        claim_data = claim_doc.to_dict()
        
        # Check if claim is in qc_clear status (cleared by processor)
        if claim_data.get('claim_status') != 'qc_clear':
            return jsonify({
                'success': False,
                'error': f'This claim is not cleared for dispatch. Current status: {claim_data.get("claim_status", "unknown")}'
            }), 400
        
        # Update claim with dispatch information
        update_data = {
            'claim_status': 'dispatched',
            'dispatched_by': request.user_id,
            'dispatched_by_email': request.user_email,
            'dispatched_by_name': getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            'dispatched_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'dispatch_mode': dispatch_mode
        }
        
        # Add optional dispatch information
        if dispatch_remarks:
            update_data['dispatch_remarks'] = dispatch_remarks
        
        if dispatch_date:
            update_data['dispatch_date'] = dispatch_date
            
        # Add mode-specific fields
        if dispatch_mode == 'online' and acknowledgment_number:
            update_data['acknowledgment_number'] = acknowledgment_number
        elif dispatch_mode == 'courier':
            if courier_name:
                update_data['courier_name'] = courier_name
            if docket_number:
                update_data['docket_number'] = docket_number
        elif dispatch_mode == 'direct':
            if contact_person_name:
                update_data['contact_person_name'] = contact_person_name
            if contact_person_phone:
                update_data['contact_person_phone'] = contact_person_phone
        
        db.collection('claims').document(claim_id).update(update_data)
        
        # Create transaction record
        transaction_metadata = {
            'dispatch_mode': dispatch_mode,
            'dispatch_date': dispatch_date
        }
        
        if dispatch_mode == 'online' and acknowledgment_number:
            transaction_metadata['acknowledgment_number'] = acknowledgment_number
        elif dispatch_mode == 'courier':
            if courier_name:
                transaction_metadata['courier_name'] = courier_name
            if docket_number:
                transaction_metadata['docket_number'] = docket_number
        elif dispatch_mode == 'direct':
            if contact_person_name:
                transaction_metadata['contact_person_name'] = contact_person_name
            if contact_person_phone:
                transaction_metadata['contact_person_phone'] = contact_person_phone
        
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.DISPATCHED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            performed_by_role='hospital_user',
            previous_status='qc_clear',
            new_status='dispatched',
            remarks=dispatch_remarks,
            metadata=transaction_metadata
        )
        
        return jsonify({
            'success': True,
            'message': 'Claim dispatched successfully',
            'claim_id': claim_id,
            'new_status': 'dispatched'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/transactions/<claim_id>', methods=['GET'])
@require_claims_access
def get_transactions(claim_id):
    """Get all transactions for a claim - Audit Trail"""
    try:
        # Get transactions from the claim_transactions collection
        transactions = get_claim_transactions(claim_id)
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'total': len(transactions)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'transactions': []
        }), 500

@claims_bp.route('/test-transactions/<claim_id>', methods=['GET'])
def test_get_transactions(claim_id):
    """Test endpoint to get transactions without authentication"""
    try:
        # Get transactions from the claim_transactions collection
        transactions = get_claim_transactions(claim_id)
        
        return jsonify({
            'success': True,
            'transactions': transactions,
            'total': len(transactions),
            'claim_id': claim_id
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'transactions': [],
            'claim_id': claim_id
        }), 500