"""
RM Routes - For Relationship Managers only
These routes handle post-dispatch claim processing, settlement, and reconciliation
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_rm_access
from firebase_admin import firestore
from datetime import datetime, timedelta
from utils.transaction_helper import create_transaction, TransactionType
import pytz

rm_bp = Blueprint('rm_routes', __name__)

# RM Status Options
RM_STATUSES = [
    'RECEIVED',
    'QUERY RAISED',
    'REPUDIATED',
    'SETTLED',
    'APPROVED',
    'PARTIALLY SETTLED',
    'RECONCILIATION',
    'INPROGRESS',
    'CANCELLED',
    'CLOSED',
    'NOT FOUND'
]

# Settlement statuses that require financial fields
SETTLEMENT_STATUSES = ['SETTLED', 'PARTIALLY SETTLED', 'RECONCILIATION']

@rm_bp.route('/get-claims', methods=['GET'])
@require_rm_access
def get_rm_claims():
    """Get claims for RM inbox - filtered by assigned payer and entity hospital"""
    try:
        ist = pytz.timezone('Asia/Kolkata')
        db = get_firestore()
        
        # Get query parameters
        tab = request.args.get('tab', 'active')  # active, settled, all
        limit = int(request.args.get('limit', 50))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build base query - only get dispatched claims for RM
        query = db.collection('direct_claims')
        
        # Filter by claim_status - RMs work with dispatched claims
        if tab == 'active':
            # Active claims: not yet settled
            query = query.where('claim_status', '==', 'dispatched')
        elif tab == 'settled':
            # Settled claims: completed by RM
            query = query.where('rm_status', 'in', SETTLEMENT_STATUSES)
        # For 'all', don't add status filter
        
        # Apply date filtering if provided
        if start_date:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
            start_datetime = ist.localize(start_datetime)
            query = query.where('created_at', '>=', start_datetime)
        
        if end_date:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            end_datetime = end_datetime + timedelta(days=1)
            end_datetime = ist.localize(end_datetime)
            query = query.where('created_at', '<', end_datetime)
        
        # Execute query
        claims = query.get()
        
        print(f"🔍 RM DEBUG: Found {len(claims)} claims from query for tab '{tab}'")
        
        # Get RM's assigned payers and hospitals
        assigned_payers = request.assigned_payers if hasattr(request, 'assigned_payers') else []
        assigned_hospitals = request.assigned_hospitals if hasattr(request, 'assigned_hospitals') else []
        
        print(f"🔍 RM DEBUG: Assigned payers: {assigned_payers}")
        print(f"🔍 RM DEBUG: Assigned hospitals: {assigned_hospitals}")
        
        # Filter claims by assigned payer and hospital
        filtered_claims = []
        
        for doc in claims:
            claim_data = doc.to_dict()
            
            # Skip drafts
            is_draft = claim_data.get('is_draft', False)
            if is_draft:
                continue
            
            # Get payer and hospital from claim
            form_data = claim_data.get('form_data', {})
            claim_payer = (form_data.get('payer_name') or '').strip().upper()
            claim_hospital_id = claim_data.get('hospital_id', '')
            claim_hospital_name = (claim_data.get('hospital_name') or '').strip().upper()
            
            # Check if claim matches assigned payer
            payer_match = False
            if not assigned_payers:  # If no payers assigned, match all
                payer_match = True
            else:
                for payer in assigned_payers:
                    payer_name = (payer.get('name') or '').strip().upper()
                    if payer_name and payer_name in claim_payer:
                        payer_match = True
                        break
            
            # Check if claim matches assigned hospital
            hospital_match = False
            if not assigned_hospitals:  # If no hospitals assigned, match all
                hospital_match = True
            else:
                for hospital in assigned_hospitals:
                    hospital_id = hospital.get('id', '')
                    hospital_name = (hospital.get('name') or '').strip().upper()
                    if (hospital_id and hospital_id == claim_hospital_id) or \
                       (hospital_name and hospital_name in claim_hospital_name):
                        hospital_match = True
                        break
            
            # Only include if both payer and hospital match
            if payer_match and hospital_match:
                filtered_claims.append((doc, claim_data))
        
        print(f"🔍 RM DEBUG: Filtered to {len(filtered_claims)} claims after payer/hospital filter")
        
        # Build response
        claims_list = []
        for doc, claim_data in filtered_claims[:limit]:
            form_data = claim_data.get('form_data', {})
            claims_list.append({
                'claim_id': claim_data.get('claim_id', doc.id),
                'claim_status': claim_data.get('claim_status', ''),
                'rm_status': claim_data.get('rm_status', 'RECEIVED'),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'patient_name': form_data.get('patient_name', ''),
                'claimed_amount': form_data.get('claimed_amount', ''),
                'payer_name': form_data.get('payer_name', ''),
                'specialty': form_data.get('specialty', ''),
                'hospital_name': claim_data.get('hospital_name', ''),
                'hospital_id': claim_data.get('hospital_id', ''),
                'created_by_email': claim_data.get('created_by_email', ''),
                'rm_updated_at': str(claim_data.get('rm_updated_at', '')),
                'rm_updated_by': claim_data.get('rm_updated_by_name', '')
            })
        
        return jsonify({
            'success': True,
            'total_claims': len(claims_list),
            'claims': claims_list
        }), 200
        
    except Exception as e:
        print(f"❌ RM ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@rm_bp.route('/get-claim-details/<claim_id>', methods=['GET'])
@require_rm_access
def get_rm_claim_details(claim_id):
    """Get detailed claim information for RM processing"""
    try:
        db = get_firestore()
        
        # Get claim by document ID
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        
        if not claim_doc.exists:
            # Search by claim_id field
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            
            if not claims_docs:
                return jsonify({
                    'success': False,
                    'error': 'Claim not found'
                }), 404
            
            claim_doc = claims_docs[0]
        
        claim_data = claim_doc.to_dict()
        form_data = claim_data.get('form_data', {})
        
        # Get RM-specific data
        rm_data = claim_data.get('rm_data', {})
        
        # Get documents for this claim
        documents = claim_data.get('documents', [])
        detailed_documents = []
        
        print(f"🔍 RM DEBUG: Found {len(documents)} documents in claim")
        
        for doc in documents:
            try:
                # Handle both string and dict document_ids
                if isinstance(doc, str):
                    doc_id = doc
                else:
                    doc_id = doc.get('document_id') or doc.get('id')
                
                if not doc_id:
                    print(f"⚠️ Warning: Document missing ID: {doc}")
                    continue
                
                print(f"🔍 RM DEBUG: Fetching document with ID: {doc_id}")
                doc_detailed = db.collection('documents').document(doc_id).get()
                
                if doc_detailed.exists:
                    doc_data = doc_detailed.to_dict()
                    detailed_documents.append({
                        'document_id': doc_data.get('document_id', doc_id),
                        'document_type': doc_data.get('document_type', doc_data.get('type', 'Unknown')),
                        'document_name': doc_data.get('document_name', doc_data.get('name', '')),
                        'original_filename': doc_data.get('original_filename', doc_data.get('filename', '')),
                        'download_url': doc_data.get('download_url', doc_data.get('url', '')),
                        'file_size': doc_data.get('file_size', ''),
                        'file_type': doc_data.get('file_type', ''),
                        'uploaded_at': str(doc_data.get('uploaded_at', '')),
                        'status': doc_data.get('status', '')
                    })
                    print(f"✅ RM DEBUG: Added document: {doc_data.get('document_type', 'Unknown')}")
                else:
                    print(f"⚠️ Warning: Document {doc_id} not found in documents collection")
            except Exception as doc_error:
                print(f"❌ Error processing document: {str(doc_error)}")
                continue
        
        print(f"🔍 RM DEBUG: Total detailed documents: {len(detailed_documents)}")
        
        # Get transaction history
        transaction_list = []
        try:
            transactions_query = db.collection('transactions').where('claim_id', '==', claim_id).order_by('timestamp', direction=firestore.Query.DESCENDING)
            transactions = transactions_query.get()
            
            for trans in transactions:
                trans_data = trans.to_dict()
                transaction_list.append({
                    'transaction_id': trans.id,
                    'transaction_type': trans_data.get('transaction_type', ''),
                    'performed_by': trans_data.get('performed_by_name', ''),
                    'performed_by_email': trans_data.get('performed_by_email', ''),
                    'performed_by_role': trans_data.get('performed_by_role', ''),
                    'timestamp': str(trans_data.get('timestamp', '')),
                    'previous_status': trans_data.get('previous_status', ''),
                    'new_status': trans_data.get('new_status', ''),
                    'remarks': trans_data.get('remarks', ''),
                    'metadata': trans_data.get('metadata', {})
                })
        except Exception as trans_error:
            print(f"⚠️ Warning: Could not fetch transaction history: {str(trans_error)}")
            # Continue without transaction history
            transaction_list = []
        
        return jsonify({
            'success': True,
            'claim': {
                'claim_id': claim_data.get('claim_id', claim_id),
                'claim_status': claim_data.get('claim_status', ''),
                'rm_status': claim_data.get('rm_status', 'RECEIVED'),
                'created_at': str(claim_data.get('created_at', '')),
                'submission_date': str(claim_data.get('submission_date', '')),
                'hospital_name': claim_data.get('hospital_name', ''),
                'hospital_id': claim_data.get('hospital_id', ''),
                # RM-specific fields
                'rm_data': rm_data,
                'rm_updated_at': str(claim_data.get('rm_updated_at', '')),
                'rm_updated_by': claim_data.get('rm_updated_by', ''),
                'rm_updated_by_email': claim_data.get('rm_updated_by_email', ''),
                'rm_updated_by_name': claim_data.get('rm_updated_by_name', ''),
                # Patient details
                'patient_details': {
                    'patient_name': form_data.get('patient_name', ''),
                    'age': form_data.get('age', 0),
                    'gender': form_data.get('gender', ''),
                    'id_card_type': form_data.get('id_card_type', ''),
                    'id_card_number': form_data.get('id_card_number', ''),
                    'patient_contact_number': form_data.get('patient_contact_number', ''),
                    'patient_email_id': form_data.get('patient_email_id', ''),
                },
                # Payer details
                'payer_details': {
                    'payer_name': form_data.get('payer_name', ''),
                    'payer_type': form_data.get('payer_type', ''),
                    'insurer_name': form_data.get('insurer_name', ''),
                    'policy_number': form_data.get('policy_number', ''),
                    'authorization_number': form_data.get('authorization_number', ''),
                },
                # Financial details
                'financial_details': {
                    'total_bill_amount': form_data.get('total_bill_amount', 0),
                    'claimed_amount': form_data.get('claimed_amount', 0),
                    'amount_charged_to_payer': form_data.get('amount_charged_to_payer', 0),
                },
                'form_data': form_data,
                'documents': detailed_documents,
                'transactions': transaction_list
            }
        }), 200
        
    except Exception as e:
        print(f"❌ RM ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@rm_bp.route('/update-claim/<claim_id>', methods=['POST'])
@require_rm_access
def update_rm_claim(claim_id):
    """Update claim status and data - RM ONLY"""
    try:
        data = request.get_json()
        rm_status = data.get('rm_status')
        status_raised_date = data.get('status_raised_date')
        status_raised_remarks = data.get('status_raised_remarks', '')
        rm_data = data.get('rm_data', {})
        
        # Validate status
        if rm_status not in RM_STATUSES:
            return jsonify({
                'success': False,
                'error': f'Invalid RM status. Must be one of: {", ".join(RM_STATUSES)}'
            }), 400
        
        db = get_firestore()
        
        # Get claim
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        
        if not claim_doc.exists:
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            
            if not claims_docs:
                return jsonify({
                    'success': False,
                    'error': 'Claim not found'
                }), 404
            
            claim_doc = claims_docs[0]
        
        claim_data = claim_doc.to_dict()
        previous_rm_status = claim_data.get('rm_status', 'RECEIVED')
        
        # Prepare update data
        update_data = {
            'rm_status': rm_status,
            'rm_updated_at': firestore.SERVER_TIMESTAMP,
            'rm_updated_by': request.user_id,
            'rm_updated_by_email': request.user_email,
            'rm_updated_by_name': request.user_name,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        # Add status raised date and remarks if provided
        if status_raised_date:
            update_data['rm_status_raised_date'] = status_raised_date
        if status_raised_remarks:
            update_data['rm_status_raised_remarks'] = status_raised_remarks
        
        # Handle settlement-specific data
        if rm_status in SETTLEMENT_STATUSES:
            # Merge settlement data into rm_data
            existing_rm_data = claim_data.get('rm_data', {})
            existing_rm_data.update(rm_data)
            update_data['rm_data'] = existing_rm_data
        else:
            # For non-settlement statuses, update rm_data with custom fields
            existing_rm_data = claim_data.get('rm_data', {})
            existing_rm_data.update(rm_data)
            update_data['rm_data'] = existing_rm_data
        
        # Update claim
        db.collection('direct_claims').document(claim_doc.id).update(update_data)
        
        # Create transaction record
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.UPDATED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=request.user_name,
            performed_by_role='rm',
            previous_status=previous_rm_status,
            new_status=rm_status,
            remarks=status_raised_remarks,
            metadata={'rm_action': 'update', 'rm_data': rm_data}
        )
        
        return jsonify({
            'success': True,
            'message': f'Claim updated to {rm_status} successfully',
            'claim_id': claim_id,
            'rm_status': rm_status
        }), 200
        
    except Exception as e:
        print(f"❌ RM ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@rm_bp.route('/reevaluate-claim/<claim_id>', methods=['POST'])
@require_rm_access
def reevaluate_rm_claim(claim_id):
    """Re-evaluate claim - allows editing again"""
    try:
        data = request.get_json()
        remarks = data.get('remarks', '')
        
        db = get_firestore()
        
        # Get claim
        claim_doc = db.collection('direct_claims').document(claim_id).get()
        
        if not claim_doc.exists:
            claims_query = db.collection('direct_claims').where('claim_id', '==', claim_id)
            claims_docs = claims_query.get()
            
            if not claims_docs:
                return jsonify({
                    'success': False,
                    'error': 'Claim not found'
                }), 404
            
            claim_doc = claims_docs[0]
        
        claim_data = claim_doc.to_dict()
        previous_rm_status = claim_data.get('rm_status', 'RECEIVED')
        
        # Set status to INPROGRESS for re-evaluation
        update_data = {
            'rm_status': 'INPROGRESS',
            'rm_reevaluation_requested': True,
            'rm_reevaluation_remarks': remarks,
            'rm_reevaluation_requested_at': firestore.SERVER_TIMESTAMP,
            'rm_reevaluation_requested_by': request.user_id,
            'rm_reevaluation_requested_by_email': request.user_email,
            'rm_reevaluation_requested_by_name': request.user_name,
            'rm_updated_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP
        }
        
        # Update claim
        db.collection('direct_claims').document(claim_doc.id).update(update_data)
        
        # Create transaction record
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.UPDATED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=request.user_name,
            performed_by_role='rm',
            previous_status=previous_rm_status,
            new_status='INPROGRESS',
            remarks=f'Re-evaluation requested: {remarks}',
            metadata={'rm_action': 'reevaluate'}
        )
        
        return jsonify({
            'success': True,
            'message': 'Claim marked for re-evaluation',
            'claim_id': claim_id
        }), 200
        
    except Exception as e:
        print(f"❌ RM ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@rm_bp.route('/get-rm-stats', methods=['GET'])
@require_rm_access
def get_rm_stats():
    """Get RM statistics"""
    try:
        db = get_firestore()
        
        # Get RM's assigned payers and hospitals
        assigned_payers = request.assigned_payers if hasattr(request, 'assigned_payers') else []
        assigned_hospitals = request.assigned_hospitals if hasattr(request, 'assigned_hospitals') else []
        
        # Get all dispatched claims (base for RM)
        claims_query = db.collection('direct_claims').where('claim_status', '==', 'dispatched')
        all_claims = claims_query.get()
        
        # Filter by assigned payer and hospital
        filtered_claims = []
        for doc in all_claims:
            claim_data = doc.to_dict()
            
            # Skip drafts
            if claim_data.get('is_draft', False):
                continue
            
            form_data = claim_data.get('form_data', {})
            claim_payer = form_data.get('payer_name', '').strip().upper()
            claim_hospital_id = claim_data.get('hospital_id', '')
            claim_hospital_name = claim_data.get('hospital_name', '').strip().upper()
            
            # Check payer match
            payer_match = not assigned_payers
            for payer in assigned_payers:
                if payer.get('name', '').strip().upper() in claim_payer:
                    payer_match = True
                    break
            
            # Check hospital match
            hospital_match = not assigned_hospitals
            for hospital in assigned_hospitals:
                hospital_id = hospital.get('id', '')
                hospital_name = hospital.get('name', '').strip().upper()
                if (hospital_id and hospital_id == claim_hospital_id) or \
                   (hospital_name and hospital_name in claim_hospital_name):
                    hospital_match = True
                    break
            
            if payer_match and hospital_match:
                filtered_claims.append(claim_data)
        
        # Count by status
        status_counts = {}
        for status in RM_STATUSES:
            status_counts[status] = 0
        
        for claim in filtered_claims:
            rm_status = claim.get('rm_status', 'RECEIVED')
            if rm_status in status_counts:
                status_counts[rm_status] += 1
        
        return jsonify({
            'success': True,
            'stats': {
                'total_claims': len(filtered_claims),
                'status_counts': status_counts,
                'settled_count': status_counts.get('SETTLED', 0),
                'partially_settled_count': status_counts.get('PARTIALLY SETTLED', 0),
                'reconciliation_count': status_counts.get('RECONCILIATION', 0),
                'active_count': sum(status_counts.get(s, 0) for s in RM_STATUSES if s not in SETTLEMENT_STATUSES)
            }
        }), 200
        
    except Exception as e:
        print(f"❌ RM ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

