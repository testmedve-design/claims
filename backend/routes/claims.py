"""
Shared Claims Routes - For all authenticated users
These routes handle general claim viewing and shared functionality
"""
import csv
from io import StringIO
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, make_response
from firebase_config import get_firestore
from middleware import require_claims_access
from firebase_admin import firestore
from utils.transaction_helper import create_transaction, get_claim_transactions, TransactionType
from utils.notification_client import get_notification_client

claims_bp = Blueprint('claims', __name__)


def _fetch_claims_for_user(status, limit, start_date, end_date, user_hospital_id, user_hospital_name, user_email):
    db = get_firestore()

    query = db.collection('direct_claims')

    if status != 'all':
        query = query.where('claim_status', '==', status)

    if start_date:
        start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.where('created_at', '>=', start_datetime)
        print(f"DEBUG: Filtering from date: {start_date}")

    if end_date:
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        query = query.where('created_at', '<', end_datetime)
        print(f"DEBUG: Filtering to date: {end_date}")

    claims = query.get()

    claims_list = []
    excluded_count = 0
    included_count = 0

    for doc in claims:
        claim_data = doc.to_dict()
        claim_id = claim_data.get('claim_id', doc.id)

        claim_hospital_id = (claim_data.get('hospital_id') or '').strip()
        claim_hospital_name = (claim_data.get('hospital_name') or '').strip()

        print(f"\n--- Checking Claim: {claim_id} ---")
        print(f"  Claim Hospital ID: '{claim_hospital_id}'")
        print(f"  Claim Hospital Name: '{claim_hospital_name}'")
        print(f"  User Hospital ID: '{user_hospital_id}'")
        print(f"  User Hospital Name: '{user_hospital_name}'")

        belongs_to_user_hospital = False
        match_reason = None

        if claim_hospital_id and user_hospital_id and claim_hospital_id == user_hospital_id:
            belongs_to_user_hospital = True
            match_reason = "hospital_id exact match"
            print("  ✓ MATCH: Hospital ID exact match")
        elif claim_hospital_name and user_hospital_name and claim_hospital_name.upper() == user_hospital_name.upper():
            belongs_to_user_hospital = True
            match_reason = "hospital_name case-insensitive match"
            print("  ✓ MATCH: Hospital Name match (case-insensitive)")
        else:
            print("  ✗ NO MATCH: Hospital mismatch")

        if not belongs_to_user_hospital:
            excluded_count += 1
            print("  ❌ EXCLUDED: Different hospital")
            continue

        included_count += 1
        print(f"  ✅ INCLUDED: {match_reason}")

        status_value = claim_data.get('claim_status', '') or claim_data.get('status', '')
        claim_id_value = claim_data.get('claim_id', doc.id)

        # Skip drafts (drafts have claim_status == 'draft')
        if (status_value == 'draft' or 'draft' in claim_id_value.lower()):
            continue

        if not (claim_id_value.startswith('CSHLSIP') or claim_id_value.startswith('CLS')):
            print(f"DEBUG: Excluded claim {claim_id_value} - not a claim form submission")
            continue

        form_data = claim_data.get('form_data', {})
        patient_name = (
            form_data.get('patient_name', '') or
            claim_data.get('email', '') or
            claim_data.get('created_by_name', '')
        )
        payer_name = form_data.get('payer_name', '') or claim_data.get('payer_name', '')
        claimed_amount = form_data.get('claimed_amount', '') or claim_data.get('total_bill_amount', '')
        specialty = form_data.get('specialty', '') or claim_data.get('stage', '')

        created_at = claim_data.get('created_at', '')
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()

        submission_date = claim_data.get('submission_date', '')
        if hasattr(submission_date, 'isoformat'):
            submission_date = submission_date.isoformat()

        claims_list.append({
            'claim_id': claim_id_value,
            'claim_status': status_value,
            'created_at': str(created_at),
            'submission_date': str(submission_date),
            'patient_name': patient_name,
            'payer_name': payer_name,
            'claimed_amount': claimed_amount,
            'specialty': specialty,
            'hospital_name': claim_data.get('hospital_name', ''),
            'hospital_id': claim_data.get('hospital_id', ''),
            'created_by_email': claim_data.get('created_by_email', '') or claim_data.get('email', '')
        })

    total_matched = len(claims_list)
    if limit is not None:
        claims_list = claims_list[:limit]

    print(f"\n{'='*80}")
    print("FILTERING SUMMARY:")
    print(f"  User Email: {user_email}")
    print(f"  Total claims queried: {len(claims)}")
    print(f"  Included (matching hospital): {included_count}")
    print(f"  Excluded (different hospital): {excluded_count}")
    print(f"  Final claims returned: {len(claims_list)} (limit={limit})")
    print(f"{'='*80}\n")

    debug_info = {
        'user_hospital': user_hospital_name,
        'user_hospital_id': user_hospital_id,
        'total_queried': len(claims),
        'included': included_count,
        'excluded': excluded_count,
        'returned': len(claims_list),
        'limit_applied': limit is not None and len(claims_list) < total_matched
    }

    return claims_list, debug_info


@claims_bp.route('/get-all-claims', methods=['GET'])
@require_claims_access
def get_all_claims():
    """Get all claims - ALL ROLES (for viewing/listing)"""
    try:
        status = request.args.get('status', 'all')
        limit = int(request.args.get('limit', 50))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_email = getattr(request, 'user_email', '')

        print(f"\n{'='*80}")
        print("DEBUG GET-ALL-CLAIMS: User Info")
        print(f"  Email: {user_email}")
        print(f"  Hospital ID: '{user_hospital_id}'")
        print(f"  Hospital Name: '{user_hospital_name}'")
        print(f"{'='*80}\n")

        if not user_hospital_id and not user_hospital_name:
            return jsonify({
                'success': False,
                'error': 'Hospital information not found for user. Please contact support.',
                'details': 'User profile does not have proper hospital assignment'
            }), 400

        claims_list, debug_info = _fetch_claims_for_user(
            status=status,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            user_hospital_id=user_hospital_id,
            user_hospital_name=user_hospital_name,
            user_email=user_email
        )

        return jsonify({
            'success': True,
            'total_claims': len(claims_list),
            'claims': claims_list,
            'debug': debug_info
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@claims_bp.route('/contest-denial/<claim_id>', methods=['POST'])
@require_claims_access
def contest_denial(claim_id):
    """Contest a denied claim - HOSPITAL USERS ONLY"""
    try:
        data = request.get_json()
        contest_reason = (data.get('contest_reason') or '').strip()
        uploaded_files = data.get('uploaded_files', [])

        if not contest_reason and not uploaded_files:
            return jsonify({
                'success': False,
                'error': 'Please provide a contest reason or upload supporting documents'
            }), 400

        db = get_firestore()

        # Locate claim (claims or direct_claims collection)
        claim_ref = db.collection('claims').document(claim_id)
        claim_doc = claim_ref.get()

        if not claim_doc.exists:
            claim_ref = db.collection('direct_claims').document(claim_id)
            claim_doc = claim_ref.get()

            if not claim_doc.exists:
                return jsonify({
                    'success': False,
                    'error': 'Claim not found'
                }), 404

        claim_data = claim_doc.to_dict() or {}
        canonical_claim_id = claim_data.get('claim_id') or claim_id
        canonical_claim_id = claim_data.get('claim_id') or claim_id

        if source_collection != 'claims':
            claims_ref = db.collection('claims').document(canonical_claim_id)
        current_status = claim_data.get('claim_status')

        if current_status != 'claim_denial':
            return jsonify({
                'success': False,
                'error': f'This claim cannot be contested. Current status: {current_status or "unknown"}'
            }), 400

        user_name = getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User'
        timestamp = firestore.SERVER_TIMESTAMP

        update_data = {
            'claim_status': 'claim_contested',
            'contest_reason': contest_reason,
            'contest_submitted_by': request.user_id,
            'contest_submitted_by_email': request.user_email,
            'contest_submitted_by_name': user_name,
            'contest_submitted_at': timestamp,
            'updated_at': timestamp
        }

        if uploaded_files:
            update_data['contest_supporting_files'] = uploaded_files

        claim_ref.update(update_data)

        transaction_metadata = {
            'contest_reason': contest_reason,
            'uploaded_files_count': len(uploaded_files or [])
        }

        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.CONTESTED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=user_name,
            performed_by_role='hospital_user',
            previous_status=current_status,
            new_status='claim_contested',
            remarks=contest_reason,
            metadata=transaction_metadata
        )

        try:
            notification_client = get_notification_client()
            updated_claim_data = {**claim_data, **update_data}
            notification_client.notify_claim_contested(
                claim_id=claim_id,
                claim_data=updated_claim_data,
                hospital_user_id=request.user_id,
                hospital_user_name=user_name,
                hospital_user_email=request.user_email,
                contest_reason=contest_reason,
                uploaded_files=uploaded_files
            )
        except Exception as e:
            import logging
            logging.error(f"Failed to send contest notification for claim {claim_id}: {str(e)}")

        return jsonify({
            'success': True,
            'message': 'Contest submitted successfully',
            'claim_id': claim_id,
            'new_status': 'claim_contested'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@claims_bp.route('/export', methods=['GET'])
@require_claims_access
def export_claims():
    """Export claims as CSV for the authenticated hospital user."""
    try:
        status = request.args.get('status', 'all')
        limit_param = request.args.get('limit', '1000')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        limit: int | None
        if limit_param == 'all':
            limit = None
        else:
            try:
                limit = int(limit_param)
            except ValueError:
                limit = 1000

        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_email = getattr(request, 'user_email', '')

        if not user_hospital_id and not user_hospital_name:
            return jsonify({
                'success': False,
                'error': 'Hospital information not found for user. Please contact support.',
                'details': 'User profile does not have proper hospital assignment'
            }), 400

        claims_list, debug_info = _fetch_claims_for_user(
            status=status,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            user_hospital_id=user_hospital_id,
            user_hospital_name=user_hospital_name,
            user_email=user_email
        )

        if not claims_list:
            return jsonify({
                'success': False,
                'error': 'No claims found for the specified filters'
            }), 404

        csv_buffer = StringIO()
        writer = csv.writer(csv_buffer)
        headers = [
            'Claim ID',
            'Status',
            'Patient Name',
            'Claimed Amount',
            'Specialty',
            'Hospital Name',
            'Hospital ID',
            'Created By (Email)',
            'Created At',
            'Submission Date'
        ]
        writer.writerow(headers)

        for claim in claims_list:
            writer.writerow([
                claim.get('claim_id', ''),
                claim.get('claim_status', ''),
                claim.get('patient_name', ''),
                claim.get('claimed_amount', ''),
                claim.get('specialty', ''),
                claim.get('hospital_name', ''),
                claim.get('hospital_id', ''),
                claim.get('created_by_email', ''),
                claim.get('created_at', ''),
                claim.get('submission_date', '')
            ])

        csv_buffer.seek(0)
        filename_date = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"claims_report_{filename_date}.csv"

        response = make_response(csv_buffer.getvalue())
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        response.headers['Content-Type'] = 'text/csv'
        response.headers['X-Report-Records'] = str(len(claims_list))
        response.headers['X-Report-Debug'] = str(debug_info)

        return response

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _generate_claim_details_response(claim_id: str, *, skip_hospital_check: bool = False):
    try:
        # Debug: Check what token is being received
        auth_header = request.headers.get('Authorization', '')
        print(f"🔍 DEBUG: Authorization header: {auth_header[:50]}..." if auth_header else "🔍 DEBUG: No Authorization header")
        
        db = get_firestore()
        
        normalized_claim_id = str(claim_id).replace('CSHLSIP ', 'CSHLSIP-').replace('CLS ', 'CLS-').replace('  ', ' ').replace(' ', '-')
        print(f"DEBUG get_claim: raw='{claim_id}' normalized='{normalized_claim_id}'")

        direct_claims = (
            db.collection('direct_claims')
            .where('claim_id', '>=', normalized_claim_id)
            .where('claim_id', '<=', normalized_claim_id + '\uf8ff')
            .limit(1)
            .get()
        )
        claim_doc = direct_claims[0] if direct_claims else None

        if not claim_doc:
            fallback_ids = {
                str(claim_id),
                normalized_claim_id,
                str(claim_id).replace(' ', '-'),
                str(claim_id).replace(' ', ''),
                str(claim_id).upper(),
                str(claim_id).lower(),
            }

            for fallback_id in fallback_ids:
                doc_candidate = db.collection('direct_claims').document(fallback_id).get()
                if doc_candidate.exists:
                    claim_doc = doc_candidate
                    break

        if not claim_doc:
            claims_collection = db.collection('claims').document(str(claim_id)).get()
            if claims_collection.exists:
                claim_doc = claims_collection

        if not claim_doc:
            return 404, {
                'success': False,
                'error': 'Claim not found'
            }
        
        claim_data = claim_doc.to_dict()
        claim_doc_id = claim_doc.id
        source_collection = 'direct_claims'
        
        # HOSPITAL FILTERING: Check if user can access this claim
        user_hospital_id = getattr(request, 'hospital_id', '')
        user_hospital_name = getattr(request, 'hospital_name', '')
        user_role = getattr(request, 'user_role', '')
        
        claim_hospital_id = claim_data.get('hospital_id', '') or claim_data.get('hospital', {}).get('id', '')
        claim_hospital_name = claim_data.get('hospital_name', '') or claim_data.get('hospital', {}).get('name', '')
        
        # Check if claim belongs to user's hospital (except for processors who can see from affiliated hospitals)
        if (not skip_hospital_check) and user_role not in ['claim_processor', 'claim_processor_l4']:
            belongs_to_user_hospital = (
                (claim_hospital_id and claim_hospital_id == user_hospital_id) or
                (claim_hospital_name and user_hospital_name and 
                 claim_hospital_name.upper() == user_hospital_name.upper())
            )
            
            if not belongs_to_user_hospital:
                return 403, {
                    'success': False,
                    'error': 'Access denied - claim belongs to different hospital'
                }
        
        # Get documents for this claim
        documents = claim_data.get('documents', [])
        if not documents and source_collection == 'direct_claims':
            # Check if documents stored in nested structure
            documents = claim_data.get('document_uploads', [])
        
        # Resolve payer details (address for cover letter)
        payer_details = {}
        form_data = claim_data.get('form_data', {}) or {}
        payer_name = (form_data.get('payer_name') or '').strip()
        hospital_id_for_payer = claim_hospital_id or user_hospital_id
        if payer_name and hospital_id_for_payer:
            affiliation_doc_id = f'{hospital_id_for_payer}_payers'
            try:
                affiliation_doc = db.collection('payer_affiliations').document(affiliation_doc_id).get()
                if affiliation_doc.exists:
                    affiliation_data = affiliation_doc.to_dict() or {}
                    affiliated_payers = affiliation_data.get('affiliated_payers', []) or []
                    matched_payer_id = None
                    for payer in affiliated_payers:
                        if (payer.get('payer_name') or '').strip().lower() == payer_name.lower():
                            matched_payer_id = payer.get('payer_id')
                            payer_details.update({
                                'payer_id': matched_payer_id,
                                'payer_name': payer.get('payer_name'),
                                'payer_type': payer.get('payer_type'),
                                'payer_code': payer.get('payer_code'),
                                'affiliated_at': payer.get('affiliated_at'),
                                'affiliated_by': payer.get('affiliated_by'),
                                'affiliated_by_email': payer.get('affiliated_by_email')
                            })
                            break
                    if matched_payer_id:
                        payer_doc = db.collection('payers').document(matched_payer_id).get()
                        if payer_doc.exists:
                            payer_doc_data = payer_doc.to_dict() or {}
                            payer_details.update({
                                'to_address': payer_doc_data.get('to_address'),
                                'address': payer_doc_data.get('address'),
                                'city': payer_doc_data.get('city'),
                                'state': payer_doc_data.get('state'),
                                'pincode': payer_doc_data.get('pincode'),
                                'contact_person': payer_doc_data.get('contact_person'),
                                'contact_phone': payer_doc_data.get('contact_phone'),
                                'contact_email': payer_doc_data.get('contact_email')
                            })
            except Exception as payer_lookup_error:
                print(f"⚠️ Warning: Failed to fetch payer details for '{payer_name}': {payer_lookup_error}")
                payer_details = payer_details or {}
        
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
        return 200, {
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
                'source_collection': source_collection,
                'document_count': len(detailed_documents),
                'documents': detailed_documents,
                'payer_details': payer_details
            }
        }
        
    except Exception as e:
        return 500, {
            'success': False,
            'error': str(e)
        }


@claims_bp.route('/get-claim/<claim_id>', methods=['GET'])
@require_claims_access
def get_claim(claim_id):
    """Get specific claim details - ALL ROLES"""
    try:
        status, payload = _generate_claim_details_response(claim_id, skip_hospital_check=False)
        return jsonify(payload), status
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
        # Note: These queries automatically exclude drafts since drafts have claim_status == 'draft'
        qc_pending_all = db.collection('direct_claims').where('claim_status', '==', 'qc_pending').get()
        pending_all = db.collection('direct_claims').where('claim_status', '==', 'pending').get()
        approved_all = db.collection('direct_claims').where('claim_status', '==', 'approved').get()
        rejected_all = db.collection('direct_claims').where('claim_status', '==', 'rejected').get()
        queried_all = db.collection('direct_claims').where('claim_status', '==', 'queried').get()
        dispatched_all = db.collection('direct_claims').where('claim_status', '==', 'dispatched').get()
        
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
        claim_ref = db.collection('claims').document(claim_id)
        claim_doc = claim_ref.get()
        claim_collection = 'claims'

        if not claim_doc.exists:
            direct_claim_ref = db.collection('direct_claims').document(claim_id)
            direct_claim_doc = direct_claim_ref.get()
            
            if not direct_claim_doc.exists:
                return jsonify({
                    'success': False,
                    'error': 'Claim not found'
                }), 404
            
            claim_ref = direct_claim_ref
            claim_doc = direct_claim_doc
            claim_collection = 'direct_claims'
        
        claim_data = claim_doc.to_dict() or {}
        
        current_status = claim_data.get('claim_status')
        if current_status not in ['qc_query', 'need_more_info']:
            return jsonify({
                'success': False,
                'error': f'This claim is not awaiting a response. Current status: {current_status or "unknown"}'
            }), 400
        
        is_need_more_info = current_status == 'need_more_info'
        user_name = getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User'
        timestamp = firestore.SERVER_TIMESTAMP
        
        # Prepare update data based on the status
        if is_need_more_info:
            new_status = 'qc_answered'
            update_data = {
                'claim_status': new_status,
                'need_more_info_response': query_response,
                'need_more_info_response_by': request.user_id,
                'need_more_info_response_by_email': request.user_email,
                'need_more_info_response_by_name': user_name,
                'need_more_info_response_at': timestamp,
                'updated_at': timestamp
            }
            if uploaded_files:
                update_data['need_more_info_response_files'] = uploaded_files
        else:
            new_status = 'qc_answered'
            update_data = {
                'claim_status': new_status,
                'query_response': query_response,
                'query_answered_by': request.user_id,
                'query_answered_by_email': request.user_email,
                'query_answered_by_name': user_name,
                'query_answered_at': timestamp,
                'updated_at': timestamp
            }
            if uploaded_files:
                update_data['query_response_files'] = uploaded_files
        
        claim_ref.update(update_data)
        
        # Create transaction record
        transaction_metadata = {
            'response_type': 'need_more_info' if is_need_more_info else 'qc_query',
            'query_response': query_response
        }
        if uploaded_files:
            transaction_metadata['uploaded_files_count'] = len(uploaded_files)
        
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.ANSWERED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=user_name,
            performed_by_role='hospital_user',
            previous_status=current_status,
            new_status=new_status,
            remarks=query_response,
            metadata=transaction_metadata
        )
        
        # Send notifications based on the flow
        try:
            notification_client = get_notification_client()
            updated_claim_data = {**claim_data, **update_data}
            if is_need_more_info:
                notification_client.notify_need_more_info_response(
                    claim_id=claim_id,
                    claim_data=updated_claim_data,
                    hospital_user_id=request.user_id,
                    hospital_user_name=user_name,
                    hospital_user_email=request.user_email,
                    response=query_response,
                    uploaded_files=uploaded_files
                )
            else:
                notification_client.notify_qc_answered(
                    claim_id=claim_id,
                    claim_data=updated_claim_data,
                    hospital_user_id=request.user_id,
                    hospital_user_name=user_name,
                    hospital_user_email=request.user_email,
                    query_response=query_response,
                    uploaded_files=uploaded_files
                )
        except Exception as e:
            import logging
            logging.error(f"Failed to send response notification for claim {claim_id}: {str(e)}")
        
        success_message = 'Additional information submitted successfully' if is_need_more_info else 'Query response submitted successfully'
        
        return jsonify({
            'success': True,
            'message': success_message,
            'claim_id': claim_id,
            'new_status': new_status
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
        
        # Get the claim (support both legacy `claims` and new `direct_claims` collections)
        claims_ref = db.collection('claims').document(claim_id)
        claim_doc = claims_ref.get()
        source_collection = 'claims'
        if not claim_doc.exists:
            direct_claims_ref = db.collection('direct_claims').document(claim_id)
            claim_doc = direct_claims_ref.get()
            source_collection = 'direct_claims'

            if not claim_doc.exists:
                # Fallback: search by `claim_id` field (some documents use generated IDs)
                fallback = (
                    db.collection('direct_claims')
                    .where('claim_id', '==', claim_id)
                    .limit(1)
                    .get()
                )
                if fallback:
                    claim_doc = fallback[0]
                    direct_claims_ref = db.collection('direct_claims').document(claim_doc.id)
                    source_collection = 'direct_claims'
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Claim not found'
                    }), 404
        else:
            direct_claims_ref = db.collection('direct_claims').document(claim_id)
        
        claim_data = claim_doc.to_dict() or {}
        
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
            'dispatch_mode': dispatch_mode,
            'review_status': 'REVIEW PENDING'
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
        
        # Persist updates to the primary collection
        if source_collection == 'claims':
            claims_ref.update(update_data)
        else:
            direct_claims_ref.update(update_data)

        # Mirror updates across collections to keep data in sync
        try:
            # Update `claims` collection if the primary document was in `direct_claims`
            if source_collection == 'direct_claims':
                mirror_claim_ref = db.collection('claims').document(canonical_claim_id)
                if mirror_claim_ref.get().exists:
                    mirror_claim_ref.update(update_data)
            else:
                # Primary document was in `claims`; ensure `direct_claims` reflects the same status
                direct_doc = direct_claims_ref.get()
                if direct_doc.exists:
                    direct_claims_ref.update(update_data)
                else:
                    # Handle documents stored under generated IDs
                    fallback = (
                        db.collection('direct_claims')
                        .where('claim_id', '==', canonical_claim_id)
                        .limit(1)
                        .get()
                    )
                    if fallback:
                        db.collection('direct_claims').document(fallback[0].id).update(update_data)
        except Exception as sync_error:
            # Log and continue without failing the dispatch if mirror updates fail
            print(f"⚠️ Dispatch mirror update failed for claim {claim_id}: {sync_error}")
        
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