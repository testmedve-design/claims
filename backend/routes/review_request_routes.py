"""
Review Request Routes - Second-level review workflow.

These routes are accessible only to users with the `review_request` role and
enable them to fetch pending claims, review claim details, record decisions,
escalate complex cases, and view workload statistics.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import pytz
from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from firebase_config import get_firestore
from middleware import require_review_request_access
from utils.transaction_helper import TransactionType, create_transaction


review_request_bp = Blueprint('review_request', __name__)

# Review status constants
REVIEW_STATUS_PENDING = 'REVIEW PENDING'
REVIEW_STATUS_UNDER = 'UNDER REVIEW'
REVIEW_STATUS_APPROVED = 'REVIEW APPROVED'
REVIEW_STATUS_REJECTED = 'REVIEW REJECTED'
REVIEW_STATUS_INFO_NEEDED = 'ADDITIONAL INFO NEEDED'
REVIEW_STATUS_ESCALATED = 'ESCALATED'
REVIEW_STATUS_COMPLETED = 'REVIEW COMPLETED'

ALL_REVIEW_STATUSES = [
    REVIEW_STATUS_PENDING,
    REVIEW_STATUS_UNDER,
    REVIEW_STATUS_APPROVED,
    REVIEW_STATUS_REJECTED,
    REVIEW_STATUS_INFO_NEEDED,
    REVIEW_STATUS_ESCALATED,
    REVIEW_STATUS_COMPLETED,
]

# Claim statuses eligible for review inbox (extendable)
REVIEW_ELIGIBLE_CLAIM_STATUSES = {
    'dispatched',
}

# Groupings to simplify filtering/analytics
STATUS_GROUPS: Dict[str, Tuple[str, ...]] = {
    'pending': (REVIEW_STATUS_PENDING,),
    'under_review': (
        REVIEW_STATUS_UNDER,
        REVIEW_STATUS_INFO_NEEDED,
        REVIEW_STATUS_ESCALATED,
    ),
    'completed': (
        REVIEW_STATUS_APPROVED,
        REVIEW_STATUS_REJECTED,
        REVIEW_STATUS_COMPLETED,
    ),
    'all': tuple(ALL_REVIEW_STATUSES),
}

# Allowed review decisions -> (status update, transaction_type)
REVIEW_DECISION_STATUS_MAP: Dict[str, Tuple[str, str]] = {
    'approve': (REVIEW_STATUS_APPROVED, TransactionType.REVIEWED),
    'reject': (REVIEW_STATUS_REJECTED, TransactionType.REVIEWED),
    'request_more_info': (REVIEW_STATUS_INFO_NEEDED, TransactionType.REVIEWED),
    'mark_under_review': (REVIEW_STATUS_UNDER, TransactionType.REVIEW_STATUS_UPDATED),
    'complete': (REVIEW_STATUS_COMPLETED, TransactionType.REVIEWED),
    'reviewed': (REVIEW_STATUS_COMPLETED, TransactionType.REVIEWED),
    'not_found': (REVIEW_STATUS_REJECTED, TransactionType.REVIEWED),
}


def _to_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return value.to_datetime()  # Firestore Timestamp
    except AttributeError:
        return None


def _to_iso(value: Any) -> Optional[str]:
    dt = _to_datetime(value)
    if dt is None:
        return None
    return dt.isoformat()


def _normalize_claim_id(raw_claim_id: str) -> str:
    """Normalize claim IDs to a canonical format used in Firestore."""
    if not raw_claim_id:
        return ''
    value = str(raw_claim_id).strip()
    replacements = (
        ('CSHLSIP ', 'CSHLSIP-'),
        ('CLS ', 'CLS-'),
    )
    for old, new in replacements:
        value = value.replace(old, new)
    value = value.replace('  ', ' ')
    return value.replace(' ', '-')


def _claim_id_candidates(raw_claim_id: str) -> List[str]:
    """Generate possible variations of a claim ID for lookup."""
    base = str(raw_claim_id or '').strip()
    normalized = _normalize_claim_id(base)

    variants = {
        base,
        normalized,
        base.replace(' ', '-'),
        base.replace(' ', ''),
        normalized.replace(' ', ''),
        base.upper(),
        base.lower(),
        normalized.upper(),
        normalized.lower(),
    }

    return [candidate for candidate in variants if candidate]


def _get_claim_document(db, claim_id: str):
    """Fetch a claim document from direct_claims using multiple lookup strategies."""
    candidates = _claim_id_candidates(claim_id)
    for candidate in candidates:
        doc = db.collection('direct_claims').document(candidate).get()
        if doc.exists:
            return doc

    for candidate in candidates:
        query = db.collection('direct_claims').where('claim_id', '==', candidate).limit(1)
        results = query.get()
        if results:
            return results[0]

    # Final fallback: raw ID as provided
    doc = db.collection('direct_claims').document(str(claim_id)).get()
    if doc.exists:
        return doc

    return None


def _build_payer_details(db, claim_data: Dict[str, Any], user_hospital_id: Optional[str]) -> Dict[str, Any]:
    form_data = claim_data.get('form_data', {}) or {}
    payer_name = (form_data.get('payer_name') or '').strip()
    payer_details: Dict[str, Any] = {}

    claim_hospital_id = claim_data.get('hospital_id', '') or claim_data.get('hospital', {}).get('id', '')
    hospital_id_for_payer = claim_hospital_id or (user_hospital_id or '')

    if not payer_name or not hospital_id_for_payer:
        return payer_details

    affiliation_doc_id = f'{hospital_id_for_payer}_payers'
    try:
        affiliation_doc = db.collection('payer_affiliations').document(affiliation_doc_id).get()
        if not affiliation_doc.exists:
            return payer_details

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
                    'affiliated_by_email': payer.get('affiliated_by_email'),
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
                    'contact_email': payer_doc_data.get('contact_email'),
                })
    except Exception as payer_lookup_error:  # pragma: no cover - logging only
        print(f"⚠️ Review Request WARN: Failed to fetch payer details for '{payer_name}': {payer_lookup_error}")

    return payer_details


def _build_document_list(db, claim_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    documents = claim_data.get('documents', []) or claim_data.get('document_uploads', []) or []
    detailed_documents: List[Dict[str, Any]] = []

    for entry in documents:
        if isinstance(entry, str):
            doc_id = entry
        else:
            doc_id = entry.get('document_id') or entry.get('id')

        if not doc_id:
            continue

        doc_snapshot = db.collection('documents').document(doc_id).get()
        if not doc_snapshot.exists:
            continue

        doc_data = doc_snapshot.to_dict() or {}
        detailed_documents.append({
            'document_id': doc_data.get('document_id', doc_id),
            'document_type': doc_data.get('document_type'),
            'document_name': doc_data.get('document_name'),
            'original_filename': doc_data.get('original_filename', doc_data.get('filename')),
            'download_url': doc_data.get('download_url', doc_data.get('url')),
            'file_size': doc_data.get('file_size'),
            'file_type': doc_data.get('file_type'),
            'uploaded_at': _to_iso(doc_data.get('uploaded_at')),
            'status': doc_data.get('status'),
        })

    return detailed_documents


def _sanitize_review_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    sanitized: Dict[str, Any] = {}
    for key, value in (entry or {}).items():
        if value is firestore.SERVER_TIMESTAMP:
            continue
        if hasattr(value, 'to_datetime') or hasattr(value, 'to_pydatetime'):
            sanitized[key] = _to_iso(value)
        else:
            sanitized[key] = value
    return sanitized


def _to_float(value: Any) -> Optional[float]:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        try:
            return float(str(value).replace(',', ''))
        except (TypeError, ValueError):
            return None


def _build_review_claim_payload(db, claim_doc, claim_data: Dict[str, Any]) -> Dict[str, Any]:
    payer_details = _build_payer_details(db, claim_data, claim_data.get('hospital_id'))
    detailed_documents = _build_document_list(db, claim_data)

    review_history = claim_data.get('review_history', []) or []
    sanitized_history = [_sanitize_review_entry(entry) for entry in review_history]

    return {
        'success': True,
        'claim': {
            'claim_id': claim_data.get('claim_id') or claim_doc.id,
            'claim_status': claim_data.get('claim_status', ''),
            'created_at': _to_iso(claim_data.get('created_at')),
            'submission_date': _to_iso(claim_data.get('submission_date')),
            'hospital_name': claim_data.get('hospital_name', ''),
            'created_by_email': claim_data.get('created_by_email', ''),
            'created_by_name': claim_data.get('created_by_name', ''),
            'submitted_by': claim_data.get('submitted_by', ''),
            'submitted_by_email': claim_data.get('submitted_by_email', ''),
            'submitted_by_name': claim_data.get('submitted_by_name', ''),
            'form_data': claim_data.get('form_data', {}) or {},
            'processing_remarks': claim_data.get('processing_remarks', ''),
            'processed_by': claim_data.get('processed_by', ''),
            'processed_by_email': claim_data.get('processed_by_email', ''),
            'processed_by_name': claim_data.get('processed_by_name', ''),
            'processed_at': _to_iso(claim_data.get('processed_at')),
            'source_collection': 'direct_claims',
            'document_count': len(detailed_documents),
            'documents': detailed_documents,
            'payer_details': payer_details,
            'review_status': claim_data.get('review_status', REVIEW_STATUS_PENDING),
            'review_data': claim_data.get('review_data', {}) or {},
            'review_history': sanitized_history,
            'processor_decision': claim_data.get('processor_decision', {}) or {},
        }
    }


def _get_review_claim_full_response(db, claim_id: str):
    claim_doc = _get_claim_document(db, claim_id)
    if not claim_doc:
        return 404, {'success': False, 'error': 'Claim not found'}

    claim_data = claim_doc.to_dict() or {}
    payload = _build_review_claim_payload(db, claim_doc, claim_data)
    return 200, payload


@review_request_bp.route('/get-claims', methods=['GET'])
@require_review_request_access
def get_review_claims():
    """
    Fetch claims assigned to the review request team.

    Optional filters:
        - status: pending | under_review | completed | all
        - start_date / end_date: YYYY-MM-DD (submission/creation range)
        - payer: exact payer name match (case-insensitive)
        - hospital: hospital id or name substring
        - limit: max number of claims to return (default 50)
    """
    try:
        db = get_firestore()
        ist = pytz.timezone('Asia/Kolkata')

        status_key = (request.args.get('status') or 'pending').lower()
        statuses = STATUS_GROUPS.get(status_key, STATUS_GROUPS['pending'])

        limit = int(request.args.get('limit', 50))
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        payer_filter = (request.args.get('payer') or '').strip().upper()
        hospital_filter = (request.args.get('hospital') or '').strip().upper()

        start_dt = None
        if start_date_str:
            start_dt = ist.localize(datetime.strptime(start_date_str, '%Y-%m-%d'))

        end_dt = None
        if end_date_str:
            end_dt = ist.localize(datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1))

        query = db.collection('direct_claims').where('claim_status', '==', 'dispatched')

        claim_docs = query.get()

        claims: List[Dict[str, Any]] = []

        for doc in claim_docs:
            claim_data = doc.to_dict() or {}

            if claim_data.get('is_draft'):
                continue

            claim_status = (claim_data.get('claim_status') or '').strip().lower()
            if REVIEW_ELIGIBLE_CLAIM_STATUSES and claim_status not in REVIEW_ELIGIBLE_CLAIM_STATUSES:
                continue

            review_status = claim_data.get('review_status')
            normalized_review_status = (review_status or REVIEW_STATUS_PENDING).upper()
            if status_key != 'all':
                allowed_statuses = {status.upper() for status in statuses}
                if normalized_review_status not in allowed_statuses:
                    continue

            # Date filters (client-side to avoid Firestore index requirements)
            created_at = _to_datetime(claim_data.get('created_at') or claim_data.get('submission_date'))
            if start_dt and (created_at is None or created_at < start_dt):
                continue
            if end_dt and (created_at is None or created_at >= end_dt):
                continue

            # Manual filters
            form_data = claim_data.get('form_data', {}) or {}
            if payer_filter and payer_filter not in (form_data.get('payer_name') or '').strip().upper():
                continue
            hospital_name = (claim_data.get('hospital_name') or '').strip().upper()
            hospital_id = (claim_data.get('hospital_id') or '').strip().upper()
            if hospital_filter and (
                hospital_filter not in hospital_name and hospital_filter != hospital_id
            ):
                continue

            review_history = claim_data.get('review_history', []) or []
            sanitized_history = [_sanitize_review_entry(entry) for entry in review_history]
            last_review_entry = sanitized_history[-1] if sanitized_history else {}
            raw_review_data = claim_data.get('review_data', {}) or {}
            review_data = raw_review_data.copy() if isinstance(raw_review_data, dict) else {}

            raw_form_data = claim_data.get('form_data', {}) or {}
            form_data = raw_form_data if isinstance(raw_form_data, dict) else {}

            raw_payer_details = claim_data.get('payer_details', {}) or {}
            payer_details = raw_payer_details if isinstance(raw_payer_details, dict) else {}

            raw_claim_metadata = claim_data.get('claim_metadata', {}) or {}
            claim_metadata = raw_claim_metadata if isinstance(raw_claim_metadata, dict) else {}

            def _first_non_empty(*values):
                for value in values:
                    if value is None:
                        continue
                    if isinstance(value, str):
                        if value.strip():
                            return value
                        continue
                    return value
                return None

            authorization_number = (
                _first_non_empty(
                    form_data.get('authorization_number'),
                    form_data.get('ccn_number'),
                    payer_details.get('authorization_number'),
                    claim_data.get('authorization_number'),
                    claim_metadata.get('authorization_number'),
                )
                or ''
            )
            admission_date = (
                _first_non_empty(
                    form_data.get('admission_date'),
                    form_data.get('service_start_date'),
                    form_data.get('date_of_admission'),
                    claim_metadata.get('admission_date'),
                )
                or ''
            )
            discharge_date = (
                _first_non_empty(
                    form_data.get('discharge_date'),
                    form_data.get('service_end_date'),
                    form_data.get('date_of_discharge'),
                    claim_metadata.get('discharge_date'),
                )
                or ''
            )

            payer_type = _first_non_empty(
                form_data.get('payer_type'),
                payer_details.get('payer_type'),
                claim_metadata.get('payer_type'),
            ) or ''

            payer_name = _first_non_empty(
                form_data.get('payer_name'),
                payer_details.get('payer_name'),
                claim_metadata.get('payer_name'),
            ) or ''

            doctor_name = _first_non_empty(
                form_data.get('doctor'),
                form_data.get('doctor_name'),
                form_data.get('treating_doctor'),
                form_data.get('treating_doctor_name'),
                claim_metadata.get('doctor_name'),
            ) or ''

            raw_patient_details = claim_data.get('patient_details') or {}
            patient_details = raw_patient_details if isinstance(raw_patient_details, dict) else {}

            patient_name = _first_non_empty(
                form_data.get('patient_name'),
                claim_metadata.get('patient_name'),
                patient_details.get('patient_name'),
            ) or ''

            claim_type = _first_non_empty(
                form_data.get('claim_type'),
                claim_data.get('claim_type'),
                claim_metadata.get('claim_type'),
            ) or ''

            billed_amount_value = _first_non_empty(
                form_data.get('total_bill_amount'),
                form_data.get('total_bill_amount_value'),
                form_data.get('total_billed_amount'),
                claim_metadata.get('total_bill_amount'),
            )

            patient_paid_amount_value = _first_non_empty(
                form_data.get('patient_paid_amount'),
                form_data.get('advance_paid_amount'),
                form_data.get('patient_share_amount'),
                claim_metadata.get('patient_paid_amount'),
            )

            discount_amount_value = _first_non_empty(
                form_data.get('discount_amount'),
                form_data.get('total_discount_amount'),
                claim_metadata.get('discount_amount'),
            )

            claimed_amount_value = _first_non_empty(
                form_data.get('claimed_amount'),
                claim_data.get('claimed_amount'),
                claim_metadata.get('claimed_amount'),
            )

            review_requested_amount_value = _first_non_empty(
                review_data.get('review_request_amount'),
                claim_metadata.get('review_request_amount'),
            )

            approved_amount_value = _first_non_empty(
                review_data.get('approved_amount'),
                claim_metadata.get('approved_amount'),
            )

            disallowed_amount_value = _first_non_empty(
                review_data.get('disallowed_amount'),
                claim_metadata.get('disallowed_amount'),
            )

            reviewer_name = _first_non_empty(
                last_review_entry.get('reviewer_name'),
                last_review_entry.get('reviewed_by'),
                last_review_entry.get('reviewed_by_name'),
                review_data.get('reviewer_name'),
                review_data.get('reviewed_by'),
            )
            reviewer_email = _first_non_empty(
                last_review_entry.get('reviewer_email'),
                last_review_entry.get('reviewed_by_email'),
                review_data.get('reviewer_email'),
                review_data.get('reviewed_by_email'),
            )
            reviewed_at = _first_non_empty(
                last_review_entry.get('reviewed_at'),
                last_review_entry.get('reviewed_on'),
                last_review_entry.get('completed_at'),
                review_data.get('reviewed_at'),
                review_data.get('completed_at'),
            )

            history_count = len(sanitized_history) if sanitized_history else (1 if review_data else 0)

            claims.append({
                'claim_id': claim_data.get('claim_id') or doc.id,
                'document_id': doc.id,
                'review_status': claim_data.get('review_status', REVIEW_STATUS_PENDING),
                'claim_status': claim_data.get('claim_status', ''),
                'created_at': _to_iso(claim_data.get('created_at')),
                'submission_date': _to_iso(claim_data.get('submission_date')),
                'hospital_name': claim_data.get('hospital_name', ''),
                'hospital_id': claim_data.get('hospital_id', ''),
                'patient_name': patient_name,
                'payer_name': payer_name,
                'payer_type': payer_type,
                'doctor_name': doctor_name,
                'provider_name': claim_data.get('hospital_name', ''),
                'authorization_number': authorization_number,
                'date_of_admission': admission_date,
                'date_of_discharge': discharge_date,
                'billed_amount': _to_float(
                    billed_amount_value
                ),
                'patient_paid_amount': _to_float(patient_paid_amount_value),
                'discount_amount': _to_float(discount_amount_value),
                'claimed_amount': _to_float(claimed_amount_value),
                'approved_amount': _to_float(approved_amount_value),
                'disallowed_amount': _to_float(disallowed_amount_value),
                'review_requested_amount': _to_float(review_requested_amount_value),
                'review_data': review_data,
                'processor_decision': claim_data.get('processor_decision', {}),
                'review_history_count': history_count,
                'last_reviewed_at': reviewed_at,
                'reviewed_by': reviewer_name,
                'reviewed_by_email': reviewer_email,
                'claim_type': claim_type,
            })

            if len(claims) >= limit:
                break

        return jsonify({
            'success': True,
            'total_claims': len(claims),
            'claims': claims,
            'status_filter': status_key,
        }), 200
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (get-claims): {exc}")
        return jsonify({'success': False, 'error': str(exc)}), 500


@review_request_bp.route('/get-claim-full/<claim_id>', methods=['GET', 'OPTIONS'])
@require_review_request_access
def get_review_claim_full(claim_id: str):
    """Return the full claim detail payload, matching the hospital/processor view."""
    if request.method == 'OPTIONS':
        return '', 204
    try:
        db = get_firestore()
        status, payload = _get_review_claim_full_response(db, claim_id)
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (get-claim-full): {exc}")
        status, payload = 500, {'success': False, 'error': str(exc)}
    return jsonify(payload), status


@review_request_bp.route('/get-claim-details/<claim_id>', methods=['GET', 'OPTIONS'])
@require_review_request_access
def get_review_claim_details(claim_id: str):
    """Return detailed claim view for reviewers, including documents and history."""
    try:
        if request.method == 'OPTIONS':
            return '', 204
        db = get_firestore()
        claim_doc = _get_claim_document(db, claim_id)

        if not claim_doc:
            return jsonify({'success': False, 'error': 'Claim not found'}), 404

        claim_data = claim_doc.to_dict() or {}
        form_data = claim_data.get('form_data', {}) or {}

        # Confirm reviewer has access to this claim via assignments
        documents_summary = []
        documents = claim_data.get('documents', []) or []
        for doc_entry in documents:
            try:
                if isinstance(doc_entry, str):
                    doc_id = doc_entry
                else:
                    doc_id = doc_entry.get('document_id') or doc_entry.get('id')

                if not doc_id:
                    continue

                doc_snapshot = db.collection('documents').document(doc_id).get()
                if not doc_snapshot.exists:
                    continue

                doc_data = doc_snapshot.to_dict() or {}
                documents_summary.append({
                    'document_id': doc_data.get('document_id', doc_id),
                    'document_type': doc_data.get('document_type', doc_data.get('type', 'Unknown')),
                    'document_name': doc_data.get('document_name', doc_data.get('name', '')),
                    'original_filename': doc_data.get('original_filename', doc_data.get('filename', '')),
                    'download_url': doc_data.get('download_url', doc_data.get('url', '')),
                    'file_size': doc_data.get('file_size'),
                    'file_type': doc_data.get('file_type'),
                    'uploaded_at': _to_iso(doc_data.get('uploaded_at')),
                    'status': doc_data.get('status'),
                })
            except Exception as doc_exc:  # pragma: no cover - continue gracefully
                print(f"⚠️ Review Request WARN: Failed to load document {doc_entry}: {doc_exc}")
                continue

        transactions = []
        try:
            transactions_query = (
                db.collection('direct_claims')
                .document(claim_doc.id)
                .collection('transactions')
                .order_by('performed_at', direction=firestore.Query.DESCENDING)
                .limit(50)
            )
            for txn in transactions_query.stream():
                txn_data = txn.to_dict() or {}
                transactions.append({
                    'transaction_id': txn_data.get('transaction_id', txn.id),
                    'transaction_type': txn_data.get('transaction_type'),
                    'performed_by': txn_data.get('performed_by_name'),
                    'performed_by_email': txn_data.get('performed_by_email'),
                    'performed_by_role': txn_data.get('performed_by_role'),
                    'performed_at': _to_iso(txn_data.get('performed_at')),
                    'previous_status': txn_data.get('previous_status'),
                    'new_status': txn_data.get('new_status'),
                    'remarks': txn_data.get('remarks'),
                    'metadata': txn_data.get('metadata', {}),
                })
        except Exception as txn_exc:  # pragma: no cover
            print(f"⚠️ Review Request WARN: Failed to fetch transactions: {txn_exc}")

        return jsonify({
            'success': True,
            'claim': {
                'claim_id': claim_data.get('claim_id') or claim_doc.id,
                'document_id': claim_doc.id,
                'claim_status': claim_data.get('claim_status', ''),
                'review_status': claim_data.get('review_status', REVIEW_STATUS_PENDING),
                'hospital_name': claim_data.get('hospital_name', ''),
                'hospital_id': claim_data.get('hospital_id', ''),
                'created_at': _to_iso(claim_data.get('created_at')),
                'submission_date': _to_iso(claim_data.get('submission_date')),
                'form_data': form_data,
                'review_data': claim_data.get('review_data', {}),
                'processor_decision': claim_data.get('processor_decision', {}),
                'documents': documents_summary,
                'transactions': transactions,
            },
        }), 200
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (get-claim-details): {exc}")
        return jsonify({'success': False, 'error': str(exc)}), 500


@review_request_bp.route('/review-claim/<claim_id>', methods=['POST', 'OPTIONS'])
@require_review_request_access
def review_claim(claim_id: str):
    """Record a review decision for a claim."""
    try:
        if request.method == 'OPTIONS':
            return '', 204
        payload = request.get_json(force=True) or {}
        action = (payload.get('review_action') or payload.get('review_decision') or '').strip().lower()
        remarks = (payload.get('review_remarks') or payload.get('remarks') or '').strip()

        if action not in REVIEW_DECISION_STATUS_MAP:
            return jsonify({
                'success': False,
                'error': f'Invalid review_action. Allowed: {", ".join(REVIEW_DECISION_STATUS_MAP.keys())}',
            }), 400

        new_status, transaction_type = REVIEW_DECISION_STATUS_MAP[action]

        db = get_firestore()
        claim_doc = _get_claim_document(db, claim_id)
        if not claim_doc:
            return jsonify({'success': False, 'error': 'Claim not found'}), 404

        claim_data = claim_doc.to_dict() or {}
        previous_status = claim_data.get('review_status', REVIEW_STATUS_PENDING)

        review_history = claim_data.get('review_history', []) or []
        review_data = dict(review_history[-1]) if review_history else {}

        reviewed_at = datetime.now(timezone.utc)

        review_data.update({
            'reviewer_id': request.user_id,
            'reviewer_email': request.user_email,
            'reviewer_name': request.user_name,
            'review_decision': action.upper(),
            'review_remarks': remarks,
            'reviewed_at': reviewed_at,
        })

        if action == 'reviewed':
            total_bill_amount_value = _to_float(payload.get('total_bill_amount'))
            approved_amount_value = _to_float(payload.get('approved_amount'))
            disallowed_amount_value = _to_float(payload.get('disallowed_amount'))
            review_request_amount_value = _to_float(payload.get('review_request_amount'))
            claimed_amount_value = _to_float(payload.get('claimed_amount'))
            patient_paid_amount_value = _to_float(payload.get('patient_paid_amount'))
            discount_amount_value = _to_float(payload.get('discount_amount'))
            reason_by_payer = (payload.get('reason_by_payer') or '').strip()

            if total_bill_amount_value is not None and approved_amount_value is not None:
                calculated_disallowed = round(max(total_bill_amount_value - approved_amount_value, 0.0), 2)
                disallowed_amount_value = calculated_disallowed if disallowed_amount_value is None else disallowed_amount_value

            review_data.update({
                k: v for k, v in {
                    'total_bill_amount': total_bill_amount_value,
                    'claimed_amount': claimed_amount_value,
                    'approved_amount': approved_amount_value,
                    'disallowed_amount': disallowed_amount_value,
                    'review_request_amount': review_request_amount_value,
                    'patient_paid_amount': patient_paid_amount_value,
                    'discount_amount': discount_amount_value,
                }.items() if v is not None
            })

        if reason_by_payer:
            review_data['reason_by_payer'] = reason_by_payer

        else:
            reason_by_payer = (payload.get('reason_by_payer') or '').strip()
            if reason_by_payer:
                review_data['reason_by_payer'] = reason_by_payer

        if action == 'request_more_info':
            review_data['info_requested_at'] = reviewed_at
        if action == 'mark_under_review':
            review_data['under_review_at'] = reviewed_at
        if action == 'complete':
            review_data['completed_at'] = reviewed_at
        if action == 'not_found':
            review_data['not_found_at'] = reviewed_at

        current_entry = dict(review_data)
        current_entry['review_action'] = action.upper()
        review_history.append(current_entry)

        update_data = {
            'review_status': new_status,
            'review_data': review_data,
            'review_history': review_history,
            'updated_at': firestore.SERVER_TIMESTAMP,
        }

        db.collection('direct_claims').document(claim_doc.id).update(update_data)

        create_transaction(
            claim_id=claim_data.get('claim_id') or claim_doc.id,
            transaction_type=transaction_type,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=request.user_name,
            performed_by_role='review_request',
            previous_status=previous_status,
            new_status=new_status,
            remarks=remarks,
            metadata={
                'review_action': action,
                'review_data': {k: v for k, v in review_data.items() if k != 'reviewer_email'},
            },
        )

        sanitized_review_data = _sanitize_review_entry(review_data)
        sanitized_history = [_sanitize_review_entry(entry) for entry in review_history]

        return jsonify({
            'success': True,
            'new_status': new_status,
            'review_data': sanitized_review_data,
            'review_history': sanitized_history,
        }), 200
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (review-claim): {exc}")
        return jsonify({'success': False, 'error': str(exc)}), 500


@review_request_bp.route('/escalate-claim/<claim_id>', methods=['POST', 'OPTIONS'])
@require_review_request_access
def escalate_claim(claim_id: str):
    """Escalate a claim to higher authority with reason."""
    try:
        if request.method == 'OPTIONS':
            return '', 204
        payload = request.get_json(force=True) or {}
        escalation_reason = (payload.get('escalation_reason') or '').strip()
        escalated_to = (payload.get('escalated_to') or '').strip()
        remarks = (payload.get('review_remarks') or payload.get('remarks') or '').strip()

        if not escalation_reason:
            return jsonify({'success': False, 'error': 'Escalation reason is required'}), 400

        db = get_firestore()
        claim_doc = _get_claim_document(db, claim_id)
        if not claim_doc:
            return jsonify({'success': False, 'error': 'Claim not found'}), 404

        claim_data = claim_doc.to_dict() or {}
        previous_status = claim_data.get('review_status', REVIEW_STATUS_PENDING)

        review_data = claim_data.get('review_data', {}) or {}
        review_data.update({
            'reviewer_id': request.user_id,
            'reviewer_email': request.user_email,
            'reviewer_name': request.user_name,
            'review_decision': 'ESCALATED',
            'review_remarks': remarks,
            'reviewed_at': firestore.SERVER_TIMESTAMP,
            'escalation_reason': escalation_reason,
            'escalated_to': escalated_to,
            'escalated_at': firestore.SERVER_TIMESTAMP,
        })

        db.collection('direct_claims').document(claim_doc.id).update({
            'review_status': REVIEW_STATUS_ESCALATED,
            'review_data': review_data,
            'updated_at': firestore.SERVER_TIMESTAMP,
        })

        create_transaction(
            claim_id=claim_data.get('claim_id') or claim_doc.id,
            transaction_type=TransactionType.ESCALATED,
            performed_by=request.user_id,
            performed_by_email=request.user_email,
            performed_by_name=request.user_name,
            performed_by_role='review_request',
            previous_status=previous_status,
            new_status=REVIEW_STATUS_ESCALATED,
            remarks=escalation_reason,
            metadata={
                'review_action': 'escalate',
                'escalation_reason': escalation_reason,
                'escalated_to': escalated_to,
            },
        )

        return jsonify({
            'success': True,
            'new_status': REVIEW_STATUS_ESCALATED,
            'review_data': review_data,
        }), 200
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (escalate-claim): {exc}")
        return jsonify({'success': False, 'error': str(exc)}), 500


@review_request_bp.route('/get-review-stats', methods=['GET'])
@require_review_request_access
def get_review_stats():
    """Return aggregate counts of review workloads for the reviewer."""
    try:
        db = get_firestore()
        stats_keys = ('pending', 'under_review', 'completed')
        counters = {key: 0 for key in stats_keys}
        total = 0

        query = db.collection('direct_claims').where('review_status', 'in', ALL_REVIEW_STATUSES)
        claim_docs = query.get()

        for doc in claim_docs:
            claim_data = doc.to_dict() or {}
            if claim_data.get('is_draft'):
                continue
            claim_status = (claim_data.get('claim_status') or '').strip().lower()
            if REVIEW_ELIGIBLE_CLAIM_STATUSES and claim_status not in REVIEW_ELIGIBLE_CLAIM_STATUSES:
                continue
            status = (claim_data.get('review_status') or REVIEW_STATUS_PENDING).upper()

            for key in stats_keys:
                allowed = {value.upper() for value in STATUS_GROUPS[key]}
                if status in allowed:
                    counters[key] += 1
                    break
            total += 1

        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'pending': counters['pending'],
                'under_review': counters['under_review'],
                'completed': counters['completed'],
            },
        }), 200
    except Exception as exc:  # pragma: no cover
        print(f"❌ Review Request ERROR (get-review-stats): {exc}")
        return jsonify({'success': False, 'error': str(exc)}), 500


