"""
New Claim Form Routes - For claim submission
These routes handle new claim submission, draft management, and claim form operations
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_hospital_access
from firebase_admin import firestore
from datetime import datetime
import uuid

new_claim_bp = Blueprint('new_claim', __name__)

@new_claim_bp.route('/submit-claim', methods=['POST'])
@require_hospital_access
def submit_claim():
    """Submit a new claim - CLAIM FORM USERS ONLY"""
    try:
        # No additional role check needed as @require_hospital_access already validates
        
        data = request.get_json()
        db = get_firestore()
        
        # Validate required fields
        required_fields = [
            'patient_name', 'age', 'gender', 'id_card_type', 'beneficiary_type', 'relationship',
            'payer_patient_id', 'authorization_number', 'total_authorized_amount', 'payer_type', 'payer_name',
            'patient_registration_number', 'specialty', 'doctor', 'treatment_line', 'claim_type',
            'service_start_date', 'service_end_date', 'inpatient_number', 'admission_type',
            'hospitalization_type', 'ward_type', 'final_diagnosis', 'treatment_done',
            'bill_number', 'bill_date', 'total_bill_amount', 'claimed_amount'
        ]
        
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Business rule validations
        total_authorized_amount = float(data.get('total_authorized_amount') or 0)
        claimed_amount = float(data.get('claimed_amount') or 0)
        
        if claimed_amount > total_authorized_amount:
            return jsonify({
                'success': False,
                'error': f'Claimed Amount (₹{claimed_amount}) cannot exceed Total Authorized Amount (₹{total_authorized_amount})'
            }), 400
        
        # Generate claim ID
        today = datetime.now().strftime('%Y%m%d')
        prefix = f'CSHLSIP-{today}-'
        
        # Find next sequence number
        try:
            claims_today = db.collection('claims').where('claim_id', '>=', prefix).where('claim_id', '<', f'CSHLSIP-{today}-9999').get()
            sequence_numbers = []
            for claim in claims_today:
                claim_id_str = claim.to_dict().get('claim_id', '')
                if claim_id_str.startswith(prefix):
                    try:
                        seq_num = int(claim_id_str.replace(prefix, ''))
                        sequence_numbers.append(seq_num)
                    except ValueError:
                        continue
            
            next_seq = max(sequence_numbers) + 1 if sequence_numbers else 0
            claim_id = f'{prefix}{next_seq}'
        except Exception as e:
            claim_id = f'{prefix}{int(datetime.now().timestamp())}'
        
        # Prepare claim document
        claim_document = {
            'claim_id': claim_id,
            'claim_status': 'qc_pending',
            'claim_type': 'claims',  # Add claim_type filter
            'submission_date': firestore.SERVER_TIMESTAMP,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'created_by': request.user_id,
            'created_by_email': request.user_email,
            'created_by_name': getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or request.user_email.split('@')[0].replace('.', ' ').replace('_', ' ').title(),
            'hospital_id': request.hospital_id,
            'hospital_name': request.hospital_name,
            'is_draft': False,
            'show_in_claims': True,
            'show_in_preauth': False,
            'show_in_reimb': False,
            'created_in_module': 'claims',
            'form_data': data
        }
        
        # Save to Firestore
        db.collection('claims').document(claim_id).set(claim_document)
        
        return jsonify({
            'success': True,
            'message': 'Claim submitted successfully',
            'claim_id': claim_id,
            'claim_status': 'qc_pending'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Draft routes moved to drafts.py to avoid conflicts

@new_claim_bp.route('/get-my-claims', methods=['GET'])
@require_hospital_access
def get_my_claims():
    """Get claims submitted by claim form user - CLAIM FORM USERS ONLY"""
    try:
        # No additional role check needed as @require_hospital_access already validates
        
        db = get_firestore()
        
        # Get query parameters
        status = request.args.get('status', 'all')
        limit = int(request.args.get('limit', 50))
        
        # Build query
        query = db.collection('claims').where('hospital_id', '==', request.hospital_id).where('is_draft', '==', False)
        
        if status != 'all':
            query = query.where('claim_status', '==', status)
        
        claims = query.limit(limit).get()
        
        claims_list = []
        for doc in claims:
            claim_data = doc.to_dict()
            claims_list.append({
                'claim_id': claim_data.get('claim_id', doc.id),
                'claim_status': claim_data.get('claim_status', ''),
                'created_at': str(claim_data.get('created_at', '')),
                'updated_at': str(claim_data.get('updated_at', '')),
                'patient_name': claim_data.get('form_data', {}).get('patient_name', ''),
                'claimed_amount': claim_data.get('form_data', {}).get('claimed_amount', ''),
                'specialty': claim_data.get('form_data', {}).get('specialty', ''),
                'submission_date': str(claim_data.get('submission_date', ''))
            })
        
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

# Submit draft route moved to drafts.py to avoid conflicts

# ============================================================================
# CHECKLIST ROUTES - Document Requirements for Claims
# ============================================================================

@new_claim_bp.route('/checklist/get-checklist', methods=['GET'])
def get_checklist():
    """Get document checklist based on payer_name (specialty optional)"""
    try:
        payer_name = request.args.get('payer_name')
        specialty = request.args.get('specialty', '')  # Optional now
        
        if not payer_name:
            return jsonify({
                'success': False,
                'error': 'payer_name is required',
                'message': 'Please provide payer_name parameter'
            }), 400
        
        db = get_firestore()
        
        # Try to find specific checklist (payer + specialty)
        if specialty:
            query = db.collection('checklist').where('payer_name', '==', payer_name).where('specialty', '==', specialty)
            docs = query.get()
            
            if docs:
                checklist_doc = docs[0]
                checklist_data = checklist_doc.to_dict()
                return jsonify({
                    'success': True,
                    'checklist': checklist_data.get('documents', []),
                    'payer_name': payer_name,
                    'specialty': specialty,
                    'message': f'Found specific checklist for {payer_name} - {specialty}'
                }), 200
        
        # Try to find any checklist for this payer (without specialty filter)
        payer_query = db.collection('checklist').where('payer_name', '==', payer_name)
        payer_docs = payer_query.get()
        
        if payer_docs:
            checklist_doc = payer_docs[0]
            checklist_data = checklist_doc.to_dict()
            return jsonify({
                'success': True,
                'checklist': checklist_data.get('documents', []),
                'payer_name': payer_name,
                'specialty': checklist_data.get('specialty', ''),
                'message': f'Found checklist for {payer_name}'
            }), 200
        
        # No checklist found - return error
        return jsonify({
            'success': False,
            'error': 'Checklist not found',
            'message': f'No checklist found for payer: {payer_name}',
            'payer_name': payer_name,
            'specialty': specialty or ''
        }), 404
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch checklist',
            'details': str(e),
            'message': 'An error occurred while fetching the document checklist'
        }), 500

@new_claim_bp.route('/checklist/create-checklist', methods=['POST'])
@require_hospital_access
def create_checklist():
    """Create or update a document checklist (Admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['payer_name', 'specialty', 'documents']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        db = get_firestore()
        
        # Create checklist document
        checklist_document = {
            'payer_name': data.get('payer_name'),
            'specialty': data.get('specialty'),
            'documents': data.get('documents'),
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
            'created_by': request.user_id,
            'created_by_email': request.user_email
        }
        
        # Use payer_name + specialty as document ID
        doc_id = f"{data.get('payer_name')}_{data.get('specialty')}".replace(' ', '_').replace('/', '_')
        
        # Save to Firestore
        db.collection('checklist').document(doc_id).set(checklist_document)
        
        return jsonify({
            'success': True,
            'message': 'Checklist created successfully',
            'checklist_id': doc_id
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@new_claim_bp.route('/checklist/list-checklists', methods=['GET'])
def list_checklists():
    """List all available checklists"""
    try:
        db = get_firestore()
        
        # Get all checklists
        checklists = db.collection('checklist').get()
        
        checklist_list = []
        for doc in checklists:
            checklist_data = doc.to_dict()
            checklist_list.append({
                'id': doc.id,
                'payer_name': checklist_data.get('payer_name'),
                'specialty': checklist_data.get('specialty'),
                'document_count': len(checklist_data.get('documents', [])),
                'created_at': str(checklist_data.get('created_at', '')),
                'updated_at': str(checklist_data.get('updated_at', ''))
            })
        
        return jsonify({
            'success': True,
            'checklists': checklist_list
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
