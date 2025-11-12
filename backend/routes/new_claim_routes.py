"""
New Claim Form Routes - For claim submission
These routes handle new claim submission, draft management, and claim form operations
"""
from flask import Blueprint, request, jsonify
from firebase_config import get_firestore
from middleware import require_hospital_access
from firebase_admin import firestore
from datetime import datetime, date, timedelta


def _normalize_dialysis_bills(raw_bills):
    """
    Validate and normalize dialysis bill entries coming from the claim form.
    Returns (normalized_bills, total_amount).
    """
    if not isinstance(raw_bills, list) or len(raw_bills) == 0:
        raise ValueError('Dialysis claims must include at least one bill entry.')

    normalized = []
    total_amount = 0.0

    for index, bill in enumerate(raw_bills, start=1):
        if not isinstance(bill, dict):
            raise ValueError(f'Dialysis bill #{index} is invalid.')

        bill_number = str(bill.get('bill_number', '')).strip()
        if not bill_number:
            raise ValueError(f'Dialysis bill #{index} is missing bill number.')

        bill_date = bill.get('bill_date')
        if not bill_date:
            raise ValueError(f'Dialysis bill #{index} is missing bill date.')
        try:
            datetime.strptime(bill_date, "%Y-%m-%d")
        except Exception:
            raise ValueError(f'Dialysis bill #{index} has an invalid bill date. Expected YYYY-MM-DD.')

        try:
            bill_amount = float(bill.get('bill_amount', 0))
        except (TypeError, ValueError):
            raise ValueError(f'Dialysis bill #{index} has an invalid bill amount.')

        if bill_amount <= 0:
            raise ValueError(f'Dialysis bill #{index} must have an amount greater than zero.')

        total_amount += bill_amount
        normalized.append({
            'bill_number': bill_number,
            'bill_date': bill_date,
            'bill_amount': round(bill_amount, 2)
        })

    if total_amount <= 0:
        raise ValueError('Dialysis bills must have a combined amount greater than zero.')

    return normalized, round(total_amount, 2)


def _calculate_age_details(dob_str):
    if not dob_str:
        return None, None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
    except Exception:
        return None, None

    today = date.today()

    if dob > today:
        return 0, "DAYS"

    delta_days = (today - dob).days
    if delta_days < 30:
        return delta_days, "DAYS"

    years = today.year - dob.year
    months = today.month - dob.month
    days = today.day - dob.day

    if days < 0:
        months -= 1
    if months < 0:
        years -= 1
        months += 12

    if years <= 0:
        if months > 0:
            return months, "MONTHS"
        return delta_days, "DAYS"

    return years, "YRS"


def _calculate_dob_from_age(age_value, age_unit):
    if age_value is None or age_unit not in ("DAYS", "MONTHS", "YRS"):
        return None
    try:
        age_int = int(age_value)
    except (TypeError, ValueError):
        return None

    today = date.today()
    dob = date(today.year, today.month, today.day)

    if age_unit == "DAYS":
        dob = dob - timedelta(days=age_int)
    elif age_unit == "MONTHS":
        month = dob.month - age_int
        year = dob.year + month // 12
        month = month % 12
        if month <= 0:
            month += 12
            year -= 1
        dob = dob.replace(year=year, month=month)
    else:
        dob = dob.replace(year=dob.year - age_int)

    return dob.strftime("%Y-%m-%d")

import uuid
from utils.transaction_helper import create_transaction, TransactionType
from utils.notification_client import get_notification_client

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
            'patient_name', 'gender', 'id_card_type', 'beneficiary_type', 'relationship',
            'payer_patient_id', 'authorization_number', 'total_authorized_amount', 'payer_type', 'payer_name',
            'patient_registration_number', 'specialty', 'doctor', 'treatment_line', 'policy_type', 'claim_type',
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

        has_dob = bool(data.get('date_of_birth'))
        has_age = data.get('age') not in (None, '',)

        if not has_dob and not has_age:
            return jsonify({
                'success': False,
                'error': 'Either date_of_birth or age must be provided'
            }), 400

        submission_mode = data.pop('submission_mode', 'submit')

        if has_age and data.get('age_unit') not in ('DAYS', 'MONTHS', 'YRS'):
            return jsonify({
                'success': False,
                'error': 'Age unit must be one of DAYS, MONTHS, or YRS when age is provided'
            }), 400
        
        # Generate claim ID
        today = datetime.now().strftime('%Y%m%d')
        prefix = f'CSHLSIP-{today}-'
        
        # Find next sequence number
        try:
            claims_today = db.collection('direct_claims').where('claim_id', '>=', prefix).where('claim_id', '<', f'CSHLSIP-{today}-9999').get()
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
        
        age_value, age_unit = _calculate_age_details(data.get('date_of_birth'))
        if age_value is not None:
            data['age'] = age_value
            data['age_unit'] = age_unit or 'YRS'
        else:
            try:
                data['age'] = int(data.get('age') or 0)
            except (TypeError, ValueError):
                data['age'] = 0
            if data.get('age_unit') not in ('DAYS', 'MONTHS', 'YRS'):
                data['age_unit'] = 'YRS'
            if not data.get('date_of_birth'):
                derived_dob = _calculate_dob_from_age(data['age'], data['age_unit'])
                if derived_dob:
                    data['date_of_birth'] = derived_dob

        claim_type = (data.get('claim_type') or '').strip().upper()
        if claim_type == 'DIALYSIS':
            try:
                normalized_bills, total_bill_amount = _normalize_dialysis_bills(data.get('dialysis_bills'))
            except ValueError as exc:
                return jsonify({
                    'success': False,
                    'error': str(exc)
                }), 400

            patient_discount = float(data.get('patient_discount_amount') or 0)
            amount_paid_by_patient = float(data.get('amount_paid_by_patient') or 0)
            mou_discount = float(data.get('mou_discount_amount') or 0)

            total_bill_amount = float(total_bill_amount)
            total_patient_paid = round(patient_discount + amount_paid_by_patient, 2)
            amount_charged_to_payer = round(total_bill_amount - total_patient_paid, 2)
            if amount_charged_to_payer < 0:
                amount_charged_to_payer = 0.0

            claimed_amount = round(amount_charged_to_payer - mou_discount, 2)
            if claimed_amount < 0:
                claimed_amount = 0.0

            data['dialysis_bills'] = normalized_bills
            data['total_bill_amount'] = total_bill_amount
            data['total_patient_paid_amount'] = total_patient_paid
            data['amount_charged_to_payer'] = amount_charged_to_payer
            data['claimed_amount'] = claimed_amount
        else:
            data.pop('dialysis_bills', None)

        # Business rule validations (after any dialysis adjustments)
        total_authorized_amount = float(data.get('total_authorized_amount') or 0)
        claimed_amount = float(data.get('claimed_amount') or 0)
        
        if claimed_amount > total_authorized_amount:
            return jsonify({
                'success': False,
                'error': f'Claimed Amount (₹{claimed_amount}) cannot exceed Total Authorized Amount (₹{total_authorized_amount})'
            }), 400

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
            'submission_mode': submission_mode,
            'form_data': data
        }
        
        # Save to Firestore
        db.collection('direct_claims').document(claim_id).set(claim_document)
        
        # Create transaction record for claim creation
        create_transaction(
            claim_id=claim_id,
            transaction_type=TransactionType.CREATED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or 'Unknown User',
            performed_by_role='hospital_user',
            previous_status=None,
            new_status='submitted',
            remarks='Claim created and submitted',
            metadata={
                'patient_name': data.get('patient_name'),
                'claimed_amount': data.get('claimed_amount'),
                'payer_name': data.get('payer_name'),
                'submission_mode': submission_mode
            }
        )
        
        # Send notification for pending claim
        try:
            notification_client = get_notification_client()
            actor_name = getattr(request, 'user_name', '') or getattr(request, 'user_display_name', '') or request.user_email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            notification_client.notify_pending(
                claim_id=claim_id,
                claim_data=claim_document,
                actor_id=request.user_id,
                actor_name=actor_name,
                actor_email=request.user_email
            )
        except Exception as e:
            # Log but don't fail the request if notification fails
            import logging
            logging.error(f"Failed to send pending notification for claim {claim_id}: {str(e)}")
        
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
        query = db.collection('direct_claims').where('hospital_id', '==', request.hospital_id).where('is_draft', '==', False)
        
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
