"""
Analytics Routes Module
Handles analytics and reporting for all roles (Hospital User, Processor, Review Request, RM)
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
from google.cloud.firestore import Timestamp as FirestoreTimestamp
from firebase_config import get_firestore
from middleware import (
    require_auth, 
    require_hospital_access, 
    require_processor_access, 
    require_rm_access, 
    require_review_request_access
)
from datetime import datetime, timedelta
from dateutil.parser import parse

analytics_bp = Blueprint('analytics', __name__)

def parse_date_range(request_args):
    """Helper to parse start_date and end_date from request args"""
    start_date_str = request_args.get('start_date')
    end_date_str = request_args.get('end_date')
    
    start_date = None
    end_date = None
    
    if start_date_str:
        try:
            start_date = parse(start_date_str)
            # Ensure it's start of day
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        except:
            pass
            
    if end_date_str:
        try:
            end_date = parse(end_date_str)
            # Ensure it's end of day
            end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        except:
            pass
            
    return start_date, end_date

def filter_claims_by_date(claims, start_date, end_date, date_field='created_at'):
    """Helper to filter a list of claim dicts by date"""
    if not start_date and not end_date:
        return claims
        
    filtered = []
    for claim in claims:
        claim_date_str = claim.get(date_field)
        if not claim_date_str:
            continue
            
        try:
            # Handle both string ISO format and Firestore timestamps if they come through as objects
            if hasattr(claim_date_str, 'timestamp'):
                claim_date = datetime.fromtimestamp(claim_date_str.timestamp())
            else:
                claim_date = parse(claim_date_str)
                # Make offset-naive for comparison if needed, or ensure both are aware
                if claim_date.tzinfo and not start_date.tzinfo:
                    claim_date = claim_date.replace(tzinfo=None)
            
            if start_date and claim_date < start_date:
                continue
            if end_date and claim_date > end_date:
                continue
                
            filtered.append(claim)
        except:
            continue
            
    return filtered

# ==========================================
# 1. Hospital User Analytics
# ==========================================

@analytics_bp.route('/hospital-user/overview', methods=['GET'])
@require_hospital_access
def get_hospital_analytics():
    """Get analytics for hospital user"""
    try:
        db = get_firestore()
        
        # Get filters
        start_date, end_date = parse_date_range(request.args)
        hospital_id = request.args.get('hospital_id') or getattr(request, 'hospital_id', None)
        payer_name_filter = request.args.get('payer_name', '').strip().lower()
        payer_type_filter = request.args.get('payer_type', '').strip().lower()
        
        # Base query - use Firestore indexes for filtering
        query = db.collection('direct_claims')
        
        # Filter by hospital_id (uses index: hospital_id)
        if hospital_id:
            query = query.where('hospital_id', '==', hospital_id)
        
        # Filter out drafts using claim_status (uses index: hospital_id + claim_status or claim_status)
        # Note: Firestore doesn't support !=, so we'll filter drafts in memory
        # But we can optimize by filtering statuses that are definitely not drafts
        
        # Apply date range filter using Firestore query (uses index: hospital_id + created_at)
        if start_date:
            # Convert datetime to Firestore Timestamp
            start_timestamp = FirestoreTimestamp.from_datetime(start_date)
            query = query.where('created_at', '>=', start_timestamp)
        
        if end_date:
            # Convert datetime to Firestore Timestamp
            end_timestamp = FirestoreTimestamp.from_datetime(end_date)
            query = query.where('created_at', '<=', end_timestamp)
        
        # Order by created_at for consistent results (uses index: hospital_id + created_at)
        if start_date or end_date or hospital_id:
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
        
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts in memory (since Firestore doesn't support != operator)
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        # Apply payer filters in memory (since they are in form_data)
        if payer_name_filter or payer_type_filter:
            filtered_claims = []
            for claim in claims:
                form_data = claim.get('form_data', {})
                payer_name = form_data.get('payer_name', '').lower()
                payer_type = form_data.get('payer_type', '').lower()
                
                if payer_name_filter and payer_name_filter not in payer_name:
                    continue
                if payer_type_filter and payer_type_filter != payer_type:
                    continue
                filtered_claims.append(claim)
            claims = filtered_claims

        # Calculate Stats
        stats = {
            'total_claims': len(claims),
            'claims_created': len(claims),  # Number of claims created (same as total_claims for non-drafts)
            'total_amount': 0,  # Total claimed amount
            'total_billed_amount': 0,  # Total billed amount
            'approved_amount': 0,
            'outstanding_claims': 0,
            'outstanding_amount': 0,
            'settled_claims': 0,
            'settled_amount': 0,
            'total_patient_paid': 0,
            'total_discount': 0,
            'total_disallowed': 0,
            'status_distribution': {},
            'claims_over_time': {}, # Key: Date (YYYY-MM-DD), Value: Count
            'payer_performance': {},
            'tat_metrics': {
                'discharge_to_qc_pending': [],
                'qc_pending_to_qc_clear': [],
                'qc_pending_to_qc_query': [],
                'qc_clear_to_despatch': [],
                'despatch_to_settle': []
            },
            'disallowance_reasons': {},
            '_debug': {
                'claims_with_discharge_date': 0,
                'claims_with_created_at': 0,
                'claims_with_qc_clear': 0,
                'claims_with_qc_query': 0,
                'claims_with_dispatch': 0,
                'claims_with_settlement': 0
            }
        }
        
        # Statuses that indicate settlement
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status', 'unknown')
            stats['status_distribution'][status] = stats['status_distribution'].get(status, 0) + 1
            
            form_data = claim.get('form_data', {})
            
            # Get amounts from form_data
            claimed_amount = float(form_data.get('claimed_amount', 0) or 0)
            billed_amount = float(form_data.get('total_bill_amount', 0) or form_data.get('total_billed_amount', 0) or 0)
            patient_paid = float(form_data.get('total_patient_paid_amount', 0) or form_data.get('patient_paid_amount', 0) or 0)
            patient_discount = float(form_data.get('patient_discount_amount', 0) or 0)
            mou_discount = float(form_data.get('mou_discount_amount', 0) or 0)
            total_discount = patient_discount + mou_discount
            
            # Get amounts from review_data if available
            review_data = claim.get('review_data', {})
            approved_amount = float(review_data.get('approved_amount', 0) or 0)
            review_disallowed_amount = float(review_data.get('disallowed_amount', 0) or 0)
            
            # Get settled amount from rm_data if available (check multiple possible fields)
            rm_data = claim.get('rm_data', {})
            settled_amount = float(rm_data.get('settled_amount', 0) or 0)
            if settled_amount == 0:
                # Check alternative field names
                settled_amount = float(rm_data.get('settled_amount_without_tds', 0) or 0)
            if settled_amount == 0:
                # Check TDS amount field as fallback
                settled_amount = float(rm_data.get('settled_tds_amount', 0) or 0)
            
            # Get disallowed amount from rm_data first (RM processes disallowances)
            # Then fallback to review_data if not available
            disallowed_amount = float(rm_data.get('disallowed_amount', 0) or 0)
            if disallowed_amount == 0:
                # Check disallowance_total field
                disallowed_amount = float(rm_data.get('disallowance_total', 0) or 0)
            if disallowed_amount == 0:
                # Check disallowance_entries array and sum them
                disallowance_entries = rm_data.get('disallowance_entries', [])
                if isinstance(disallowance_entries, list) and len(disallowance_entries) > 0:
                    disallowed_amount = sum(float(entry.get('amount', 0) or 0) for entry in disallowance_entries if isinstance(entry, dict))
            if disallowed_amount == 0:
                # Fallback to review_data disallowed amount
                disallowed_amount = review_disallowed_amount
            
            # Accumulate totals
            stats['total_amount'] += claimed_amount
            stats['total_billed_amount'] += billed_amount
            stats['total_patient_paid'] += patient_paid
            stats['total_discount'] += total_discount
            
            # Check if claim is settled
            is_settled = status in settled_statuses or settled_amount > 0
            
            if is_settled:
                stats['settled_claims'] += 1
                stats['settled_amount'] += settled_amount if settled_amount > 0 else approved_amount
            else:
                # Outstanding claim (not settled)
                stats['outstanding_claims'] += 1
                # Outstanding amount is claimed amount minus any approved amount
                outstanding_amt = claimed_amount - (approved_amount if approved_amount > 0 else 0)
                stats['outstanding_amount'] += outstanding_amt if outstanding_amt > 0 else claimed_amount
            
            # Add disallowed amount
            if disallowed_amount > 0:
                stats['total_disallowed'] += disallowed_amount
            
            # Approximate approved amount logic
            if status in ['approved', 'settled', 'claim_approved', 'qc_clear'] or approved_amount > 0: 
                # Use approved_amount if available, else claimed amount for estimate
                app_amt = approved_amount if approved_amount > 0 else claimed_amount
                stats['approved_amount'] += app_amt
            
            # Time distribution
            created_at = claim.get('created_at')
            if created_at:
                try:
                    date_key = parse(created_at).strftime('%Y-%m-%d')
                    stats['claims_over_time'][date_key] = stats['claims_over_time'].get(date_key, 0) + 1
                except:
                    pass

            # Payer Performance
            payer = form_data.get('payer_name', 'Unknown')
            if payer not in stats['payer_performance']:
                stats['payer_performance'][payer] = {'count': 0, 'amount': 0, 'approved': 0}
            stats['payer_performance'][payer]['count'] += 1
            stats['payer_performance'][payer]['amount'] += claimed_amount
            if status in ['approved', 'settled', 'claim_approved'] or approved_amount > 0:
                stats['payer_performance'][payer]['approved'] += 1

            # --- Disallowance Reasons ---
            d_reasons = []
            # 1. RM Disallowance Entries
            d_entries = rm_data.get('disallowance_entries', [])
            if isinstance(d_entries, list):
                for entry in d_entries:
                    reason = entry.get('reason') or entry.get('category')
                    if reason:
                        d_reasons.append(reason)
            
            # 2. RM Disallowance Reason field
            if not d_reasons:
                reason = rm_data.get('disallowance_reason')
                if reason:
                     d_reasons.append(reason)
                     
            # 3. Review Data Disallowance Reason
            if not d_reasons:
                 reason = review_data.get('disallowance_reason')
                 if reason:
                     d_reasons.append(reason)
                     
            for reason in d_reasons:
                stats['disallowance_reasons'][reason] = stats['disallowance_reasons'].get(reason, 0) + 1

            # --- TAT Metrics ---
            def get_dt(val):
                if not val: return None
                # Handle Firestore Timestamp - try to_datetime() first (preferred method)
                if hasattr(val, 'to_datetime'):
                    try:
                        dt = val.to_datetime()
                        if dt:
                            return dt
                    except:
                        pass
                # Handle Firestore Timestamp - fallback to timestamp() method
                if hasattr(val, 'timestamp') and callable(getattr(val, 'timestamp', None)):
                    try:
                        return datetime.fromtimestamp(val.timestamp())
                    except:
                        pass
                # Handle datetime objects
                if isinstance(val, datetime): return val
                # Handle string dates
                if isinstance(val, str):
                    try:
                        return parse(val)
                    except:
                        pass
                return None

            def calc_days(start, end):
                if start and end:
                    # Ensure naive vs aware compatibility (make both naive)
                    if start.tzinfo: start = start.replace(tzinfo=None)
                    if end.tzinfo: end = end.replace(tzinfo=None)
                    diff = (end - start).days
                    return diff if diff >= 0 else 0
                return None

            # Timestamps - try multiple field names and sources
            discharge_date = get_dt(form_data.get('discharge_date') or form_data.get('date_of_discharge') or form_data.get('service_end_date'))
            created_at = get_dt(claim.get('created_at') or claim.get('submission_date'))
            
            # Debug tracking
            if discharge_date:
                stats['_debug']['claims_with_discharge_date'] += 1
            if created_at:
                stats['_debug']['claims_with_created_at'] += 1
            
            # QC Clear - check qc_clear_date first, then processed_at if status indicates cleared
            qc_clear_at = get_dt(claim.get('qc_clear_date'))
            if not qc_clear_at:
                # Check if claim was ever cleared (current or past status)
                if status in ['qc_clear', 'dispatched', 'settled', 'partially_settled', 'reconciliation', 'reviewed', 'review_approved']:
                    qc_clear_at = get_dt(claim.get('processed_at'))
            if qc_clear_at:
                stats['_debug']['claims_with_qc_clear'] += 1
            
            # QC Query - check if claim was ever queried
            qc_query_at = None
            if status in ['qc_query', 'qc_answered', 'answered']:
                qc_query_at = get_dt(claim.get('processed_at'))
            # Also check if claim has query history even if current status changed
            if not qc_query_at and claim.get('qc_query_details'):
                qc_query_at = get_dt(claim.get('processed_at'))
            if qc_query_at:
                stats['_debug']['claims_with_qc_query'] += 1
            
            # Dispatch timestamp
            dispatched_at = get_dt(claim.get('dispatched_at'))
            if dispatched_at:
                stats['_debug']['claims_with_dispatch'] += 1
            
            # Settlement timestamp - check multiple sources
            settled_at = get_dt(rm_data.get('settled_date') or rm_data.get('settlement_date') or rm_data.get('settlement_processed_date'))
            if not settled_at:
                settled_at = get_dt(claim.get('rm_status_raised_date'))
            if not settled_at and status in settled_statuses:
                settled_at = get_dt(claim.get('updated_at') or claim.get('rm_updated_at'))
            if settled_at:
                stats['_debug']['claims_with_settlement'] += 1

            # 1. Discharge to QC Pending (Created) - only if both dates exist
            if discharge_date and created_at:
                d_to_qcp = calc_days(discharge_date, created_at)
                if d_to_qcp is not None:
                    stats['tat_metrics']['discharge_to_qc_pending'].append(d_to_qcp)

            # 2. QC Pending to QC Clear - only if claim was cleared
            if created_at and qc_clear_at:
                qcp_to_qcc = calc_days(created_at, qc_clear_at)
                if qcp_to_qcc is not None:
                    stats['tat_metrics']['qc_pending_to_qc_clear'].append(qcp_to_qcc)
            
            # 3. QC Pending to QC Query - only if claim was queried
            if created_at and qc_query_at:
                qcp_to_qcq = calc_days(created_at, qc_query_at)
                if qcp_to_qcq is not None:
                    stats['tat_metrics']['qc_pending_to_qc_query'].append(qcp_to_qcq)

            # 4. QC Clear to Despatch - only if both happened
            if qc_clear_at and dispatched_at:
                qcc_to_disp = calc_days(qc_clear_at, dispatched_at)
                if qcc_to_disp is not None:
                    stats['tat_metrics']['qc_clear_to_despatch'].append(qcc_to_disp)

            # 5. Despatch to Settle - only if both happened
            if dispatched_at and settled_at:
                disp_to_settle = calc_days(dispatched_at, settled_at)
                if disp_to_settle is not None:
                    stats['tat_metrics']['despatch_to_settle'].append(disp_to_settle)

        return jsonify({'success': True, 'data': stats}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==========================================
# 2. Processor Analytics
# ==========================================

@analytics_bp.route('/processor/overview', methods=['GET'])
@require_processor_access
def get_processor_analytics():
    """Get analytics for claim processor"""
    try:
        db = get_firestore()
        
        # Filters
        start_date, end_date = parse_date_range(request.args)
        selected_hospital_id = request.args.get('hospital_id') # For processor to filter by specific hospital
        payer_name_filter = request.args.get('payer_name', '').strip().lower()

        # Get processor's affiliated hospitals if no specific one selected
        assigned_hospitals = getattr(request, 'assigned_hospitals', [])
        affiliated_ids = [h['id'] for h in assigned_hospitals] if assigned_hospitals else []
        
        # Base Query - use Firestore indexes for filtering
        query = db.collection('direct_claims')
        
        # If processor selects a specific hospital, filter by it (must be in their assignments)
        if selected_hospital_id:
            if affiliated_ids and selected_hospital_id not in affiliated_ids:
                return jsonify({'success': False, 'error': 'Access denied for this hospital'}), 403
            query = query.where('hospital_id', '==', selected_hospital_id)
        # Note: If multiple hospitals, we'd need to use 'in' operator (max 10 items) or fetch and filter
        # For now, if no specific hospital selected, we'll fetch all and filter by affiliation in memory
        
        # Apply date range filter using Firestore query (uses index: hospital_id + created_at)
        if start_date:
            start_timestamp = FirestoreTimestamp.from_datetime(start_date)
            query = query.where('created_at', '>=', start_timestamp)
        
        if end_date:
            end_timestamp = FirestoreTimestamp.from_datetime(end_date)
            query = query.where('created_at', '<=', end_timestamp)
        
        # Order by created_at for consistent results
        if start_date or end_date or selected_hospital_id:
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
            
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        # Filter by hospital affiliation if multiple hospitals assigned
        if affiliated_ids and not selected_hospital_id:
            claims = [c for c in claims if c.get('hospital_id') in affiliated_ids]
        
        filtered_claims = []
        for claim in claims:
            # Check affiliation
            if affiliated_ids and claim.get('hospital_id') not in affiliated_ids:
                continue
            
            # Check Payer Filter
            if payer_name_filter:
                payer_name = claim.get('form_data', {}).get('payer_name', '').lower()
                if payer_name_filter not in payer_name:
                    continue
            
            filtered_claims.append(claim)
        claims = filtered_claims

        # Calculate Stats
        stats = {
            'total_claims': len(claims),
            'total_processed': 0,
            'pending_workload': 0,
            'decisions': {'approved': 0, 'rejected': 0, 'query': 0, 'cleared': 0},
            'avg_processing_time': 0, # Placeholder
            'hospital_performance': {},
            # Comprehensive stats
            'total_amount': 0,
            'total_billed_amount': 0,
            'outstanding_claims': 0,
            'outstanding_amount': 0,
            'settled_claims': 0,
            'settled_amount': 0,
            'total_patient_paid': 0,
            'total_discount': 0,
            'total_disallowed': 0,
            'approved_amount': 0,
            # Additional analytics fields
            'status_distribution': {},
            'claims_over_time': {},
            'payer_performance': {},
            'disallowance_reasons': {},
            'tat_metrics': {
                'discharge_to_qc_pending': [],
                'qc_pending_to_qc_clear': [],
                'qc_pending_to_qc_query': [],
                'qc_clear_to_despatch': [],
                'despatch_to_settle': []
            }
        }
        
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status', 'unknown')
            form_data = claim.get('form_data', {})
            review_data = claim.get('review_data', {})
            rm_data = claim.get('rm_data', {})
            
            # Status distribution
            stats['status_distribution'][status] = stats['status_distribution'].get(status, 0) + 1
            
            # Get amounts
            claimed_amount = float(form_data.get('claimed_amount', 0) or 0)
            billed_amount = float(form_data.get('total_bill_amount', 0) or form_data.get('total_billed_amount', 0) or 0)
            patient_paid = float(form_data.get('total_patient_paid_amount', 0) or form_data.get('patient_paid_amount', 0) or 0)
            patient_discount = float(form_data.get('patient_discount_amount', 0) or 0)
            mou_discount = float(form_data.get('mou_discount_amount', 0) or 0)
            total_discount = patient_discount + mou_discount
            approved_amount = float(review_data.get('approved_amount', 0) or 0)
            review_disallowed_amount = float(review_data.get('disallowed_amount', 0) or 0)
            
            # Get settled amount from rm_data (check multiple possible fields)
            settled_amount = float(rm_data.get('settled_amount', 0) or 0)
            if settled_amount == 0:
                settled_amount = float(rm_data.get('settled_amount_without_tds', 0) or 0)
            if settled_amount == 0:
                settled_amount = float(rm_data.get('settled_tds_amount', 0) or 0)
            
            # Get disallowed amount from rm_data first, then fallback to review_data
            disallowed_amount = float(rm_data.get('disallowed_amount', 0) or 0)
            if disallowed_amount == 0:
                disallowed_amount = float(rm_data.get('disallowance_total', 0) or 0)
            if disallowed_amount == 0:
                disallowance_entries = rm_data.get('disallowance_entries', [])
                if isinstance(disallowance_entries, list) and len(disallowance_entries) > 0:
                    disallowed_amount = sum(float(entry.get('amount', 0) or 0) for entry in disallowance_entries if isinstance(entry, dict))
            if disallowed_amount == 0:
                disallowed_amount = review_disallowed_amount
            
            # Accumulate comprehensive stats
            stats['total_amount'] += claimed_amount
            stats['total_billed_amount'] += billed_amount
            stats['total_patient_paid'] += patient_paid
            stats['total_discount'] += total_discount
            
            is_settled = status in settled_statuses or settled_amount > 0
            if is_settled:
                stats['settled_claims'] += 1
                stats['settled_amount'] += settled_amount if settled_amount > 0 else approved_amount
            else:
                stats['outstanding_claims'] += 1
                outstanding_amt = claimed_amount - (approved_amount if approved_amount > 0 else 0)
                stats['outstanding_amount'] += outstanding_amt if outstanding_amt > 0 else claimed_amount
            
            if disallowed_amount > 0:
                stats['total_disallowed'] += disallowed_amount
            if approved_amount > 0:
                stats['approved_amount'] += approved_amount
            
            # Time distribution
            created_at = claim.get('created_at')
            if created_at:
                try:
                    date_key = parse(created_at).strftime('%Y-%m-%d')
                    stats['claims_over_time'][date_key] = stats['claims_over_time'].get(date_key, 0) + 1
                except:
                    pass

            # Payer Performance
            payer = form_data.get('payer_name', 'Unknown')
            if payer not in stats['payer_performance']:
                stats['payer_performance'][payer] = {'count': 0, 'amount': 0, 'approved': 0}
            stats['payer_performance'][payer]['count'] += 1
            stats['payer_performance'][payer]['amount'] += claimed_amount
            if status in ['approved', 'settled', 'claim_approved'] or approved_amount > 0:
                stats['payer_performance'][payer]['approved'] += 1

            # Disallowance Reasons
            d_reasons = []
            # 1. RM Disallowance Entries
            d_entries = rm_data.get('disallowance_entries', [])
            if isinstance(d_entries, list):
                for entry in d_entries:
                    reason = entry.get('reason') or entry.get('category')
                    if reason:
                        d_reasons.append(reason)
            
            # 2. RM Disallowance Reason field
            if not d_reasons:
                reason = rm_data.get('disallowance_reason')
                if reason:
                     d_reasons.append(reason)
                     
            # 3. Review Data Disallowance Reason
            if not d_reasons:
                 reason = review_data.get('disallowance_reason')
                 if reason:
                     d_reasons.append(reason)
                     
            for reason in d_reasons:
                stats['disallowance_reasons'][reason] = stats['disallowance_reasons'].get(reason, 0) + 1
            
            if status in ['qc_pending', 'qc_answered', 'answered']:
                stats['pending_workload'] += 1
            else:
                stats['total_processed'] += 1
                
            if status in ['claim_approved', 'approved']:
                stats['decisions']['approved'] += 1
            elif status in ['claim_denial', 'rejected']:
                stats['decisions']['rejected'] += 1
            elif status in ['qc_query', 'queried']:
                stats['decisions']['query'] += 1
            elif status in ['qc_clear']:
                stats['decisions']['cleared'] += 1
                
            # Hospital breakdown
            hosp_name = claim.get('hospital_name', 'Unknown')
            if hosp_name not in stats['hospital_performance']:
                stats['hospital_performance'][hosp_name] = {'total': 0, 'processed': 0, 'pending': 0}
            
            stats['hospital_performance'][hosp_name]['total'] += 1
            if status in ['qc_pending', 'qc_answered']:
                stats['hospital_performance'][hosp_name]['pending'] += 1
            else:
                stats['hospital_performance'][hosp_name]['processed'] += 1

        return jsonify({'success': True, 'data': stats}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==========================================
# 3. Review Request Analytics
# ==========================================

@analytics_bp.route('/review-request/overview', methods=['GET'])
@require_review_request_access
def get_review_analytics():
    """Get analytics for review request role"""
    try:
        db = get_firestore()
        
        start_date, end_date = parse_date_range(request.args)
        hospital_id = request.args.get('hospital_id')
        payer_name_filter = request.args.get('payer_name', '').strip().lower()

        # Base Query - use Firestore indexes for filtering
        query = db.collection('direct_claims')
        
        # Filter by hospital_id if provided (uses index: hospital_id)
        if hospital_id:
            query = query.where('hospital_id', '==', hospital_id)
        
        # Filter relevant claims (those that reached review stage)
        # Use 'in' operator for multiple statuses (max 10 items, but we have 8 statuses)
        review_statuses = ['dispatched', 'reviewed', 'review_approved', 'review_rejected', 'review_info_needed', 'review_completed', 'review_escalated', 'review_under_review']
        query = query.where('claim_status', 'in', review_statuses)
        
        # Apply date range filter using Firestore query (uses index: hospital_id + claim_status + created_at)
        if start_date:
            start_timestamp = FirestoreTimestamp.from_datetime(start_date)
            query = query.where('created_at', '>=', start_timestamp)
        
        if end_date:
            end_timestamp = FirestoreTimestamp.from_datetime(end_date)
            query = query.where('created_at', '<=', end_timestamp)
        
        # Order by created_at for consistent results
        if start_date or end_date or hospital_id:
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
        
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']

        # Apply payer filter in memory (since it's in nested form_data)
        if payer_name_filter:
            filtered_claims = []
            for claim in claims:
                payer = claim.get('form_data', {}).get('payer_name', '').lower()
                if payer_name_filter in payer:
                    filtered_claims.append(claim)
            claims = filtered_claims
        
        stats = {
            'total_claims': len(claims),
            'total_reviewed': 0,
            'pending_review': 0,
            'escalated': 0,
            'financials': {'claimed': 0, 'approved': 0, 'disallowed': 0},
            'status_distribution': {},
            # Comprehensive stats
            'total_amount': 0,
            'total_billed_amount': 0,
            'outstanding_claims': 0,
            'outstanding_amount': 0,
            'settled_claims': 0,
            'settled_amount': 0,
            'total_patient_paid': 0,
            'total_discount': 0,
            'total_disallowed': 0,
            'approved_amount': 0,
            # Additional analytics fields
            'claims_over_time': {},
            'payer_performance': {},
            'disallowance_reasons': {},
            'tat_metrics': {
                'discharge_to_qc_pending': [],
                'qc_pending_to_qc_clear': [],
                'qc_pending_to_qc_query': [],
                'qc_clear_to_despatch': [],
                'despatch_to_settle': []
            }
        }
        
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status')
            review_status = claim.get('review_status', 'pending')
            form_data = claim.get('form_data', {})
            review_data = claim.get('review_data', {})
            rm_data = claim.get('rm_data', {})
            
            # Get amounts
            claimed_amount = float(form_data.get('claimed_amount', 0) or 0)
            billed_amount = float(form_data.get('total_bill_amount', 0) or form_data.get('total_billed_amount', 0) or 0)
            patient_paid = float(form_data.get('total_patient_paid_amount', 0) or form_data.get('patient_paid_amount', 0) or 0)
            patient_discount = float(form_data.get('patient_discount_amount', 0) or 0)
            mou_discount = float(form_data.get('mou_discount_amount', 0) or 0)
            total_discount = patient_discount + mou_discount
            approved_amount = float(review_data.get('approved_amount', 0) or 0)
            review_disallowed_amount = float(review_data.get('disallowed_amount', 0) or 0)
            
            # Get settled amount from rm_data (check multiple possible fields)
            settled_amount = float(rm_data.get('settled_amount', 0) or 0)
            if settled_amount == 0:
                settled_amount = float(rm_data.get('settled_amount_without_tds', 0) or 0)
            if settled_amount == 0:
                settled_amount = float(rm_data.get('settled_tds_amount', 0) or 0)
            
            # Get disallowed amount from rm_data first, then fallback to review_data
            disallowed_amount = float(rm_data.get('disallowed_amount', 0) or 0)
            if disallowed_amount == 0:
                disallowed_amount = float(rm_data.get('disallowance_total', 0) or 0)
            if disallowed_amount == 0:
                disallowance_entries = rm_data.get('disallowance_entries', [])
                if isinstance(disallowance_entries, list) and len(disallowance_entries) > 0:
                    disallowed_amount = sum(float(entry.get('amount', 0) or 0) for entry in disallowance_entries if isinstance(entry, dict))
            if disallowed_amount == 0:
                disallowed_amount = review_disallowed_amount
            
            # Accumulate comprehensive stats
            stats['total_amount'] += claimed_amount
            stats['total_billed_amount'] += billed_amount
            stats['total_patient_paid'] += patient_paid
            stats['total_discount'] += total_discount
            
            is_settled = status in settled_statuses or settled_amount > 0
            if is_settled:
                stats['settled_claims'] += 1
                stats['settled_amount'] += settled_amount if settled_amount > 0 else approved_amount
            else:
                stats['outstanding_claims'] += 1
                outstanding_amt = claimed_amount - (approved_amount if approved_amount > 0 else 0)
                stats['outstanding_amount'] += outstanding_amt if outstanding_amt > 0 else claimed_amount
            
            if disallowed_amount > 0:
                stats['total_disallowed'] += disallowed_amount
            if approved_amount > 0:
                stats['approved_amount'] += approved_amount
            
            stats['status_distribution'][review_status] = stats['status_distribution'].get(review_status, 0) + 1
            
            # Time distribution
            created_at = claim.get('created_at')
            if created_at:
                try:
                    date_key = parse(created_at).strftime('%Y-%m-%d')
                    stats['claims_over_time'][date_key] = stats['claims_over_time'].get(date_key, 0) + 1
                except:
                    pass

            # Payer Performance
            payer = form_data.get('payer_name', 'Unknown')
            if payer not in stats['payer_performance']:
                stats['payer_performance'][payer] = {'count': 0, 'amount': 0, 'approved': 0}
            stats['payer_performance'][payer]['count'] += 1
            stats['payer_performance'][payer]['amount'] += claimed_amount
            if status in ['approved', 'settled', 'claim_approved', 'review_approved'] or approved_amount > 0:
                stats['payer_performance'][payer]['approved'] += 1

            # Disallowance Reasons
            d_reasons = []
            # 1. RM Disallowance Entries
            d_entries = rm_data.get('disallowance_entries', [])
            if isinstance(d_entries, list):
                for entry in d_entries:
                    reason = entry.get('reason') or entry.get('category')
                    if reason:
                        d_reasons.append(reason)
            
            # 2. RM Disallowance Reason field
            if not d_reasons:
                reason = rm_data.get('disallowance_reason')
                if reason:
                     d_reasons.append(reason)
                     
            # 3. Review Data Disallowance Reason
            if not d_reasons:
                 reason = review_data.get('disallowance_reason')
                 if reason:
                     d_reasons.append(reason)
                     
            for reason in d_reasons:
                stats['disallowance_reasons'][reason] = stats['disallowance_reasons'].get(reason, 0) + 1
            
            if status == 'dispatched' or review_status in ['pending', 'under_review']:
                stats['pending_review'] += 1
            elif review_status == 'review_escalated':
                stats['escalated'] += 1
            elif review_status in ['reviewed', 'review_completed', 'review_approved', 'review_rejected']:
                stats['total_reviewed'] += 1
                
            # Financials (if reviewed)
            if review_status == 'reviewed':
                stats['financials']['claimed'] += claimed_amount
                stats['financials']['approved'] += approved_amount
                stats['financials']['disallowed'] += disallowed_amount

        return jsonify({'success': True, 'data': stats}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==========================================
# 4. RM Analytics
# ==========================================

@analytics_bp.route('/rm/overview', methods=['GET'])
@require_rm_access
def get_rm_analytics():
    """Get analytics for RM"""
    try:
        db = get_firestore()
        
        start_date, end_date = parse_date_range(request.args)
        hospital_id = request.args.get('hospital_id')
        payer_name_filter = request.args.get('payer_name', '').strip().lower()
        payer_type_filter = request.args.get('payer_type', '').strip().lower()

        # Get assigned entities
        assigned_payers = getattr(request, 'assigned_payers', [])
        assigned_hospitals = getattr(request, 'assigned_hospitals', [])
        
        print(f"🔍 RM Analytics DEBUG: Assigned payers: {assigned_payers}")
        print(f"🔍 RM Analytics DEBUG: Assigned hospitals: {assigned_hospitals}")
        
        # Base Query - use Firestore indexes for filtering
        query = db.collection('direct_claims')
        
        # Filter by hospital_id if provided (uses index: hospital_id)
        if hospital_id:
            query = query.where('hospital_id', '==', hospital_id)
        # If assigned_hospitals is provided and not empty, use 'in' operator (max 10 items)
        elif assigned_hospitals and len(assigned_hospitals) > 0:
            assigned_hosp_ids = [h.get('id') if isinstance(h, dict) else h for h in assigned_hospitals]
            if len(assigned_hosp_ids) <= 10:  # Firestore 'in' operator limit
                query = query.where('hospital_id', 'in', assigned_hosp_ids)
        
        # Filter by relevant statuses for RM (uses index: hospital_id + claim_status)
        # RM usually deals with post-dispatch statuses
        rm_statuses = ['dispatched', 'settled', 'partially_settled', 'reconciliation', 'approved', 'rejected', 'received', 'query_raised', 'repudiated']
        if len(rm_statuses) <= 10:  # Firestore 'in' operator limit
            query = query.where('claim_status', 'in', rm_statuses)
        
        # Apply date range filter using Firestore query (uses index: hospital_id + claim_status + created_at)
        if start_date:
            start_timestamp = FirestoreTimestamp.from_datetime(start_date)
            query = query.where('created_at', '>=', start_timestamp)
        
        if end_date:
            end_timestamp = FirestoreTimestamp.from_datetime(end_date)
            query = query.where('created_at', '<=', end_timestamp)
        
        # Order by created_at for consistent results
        if start_date or end_date or hospital_id or (assigned_hospitals and len(assigned_hospitals) > 0):
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
        
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        print(f"🔍 RM Analytics DEBUG: Total claims after Firestore query: {len(claims)}")
        
        # Apply additional filters in memory (for complex logic that can't be done in Firestore)
        filtered_claims = []
        for claim in claims:
            c_hosp_id = claim.get('hospital_id')
            c_payer = (claim.get('form_data', {}).get('payer_name', '') or '').strip().upper()
            
            # Hospital Assignment Check (if not already filtered by query)
            if not hospital_id and assigned_hospitals and len(assigned_hospitals) > 0:
                assigned_hosp_ids = [h.get('id') if isinstance(h, dict) else h for h in assigned_hospitals]
                if c_hosp_id not in assigned_hosp_ids:
                    continue
            
            # Payer Assignment Check
            if assigned_payers and len(assigned_payers) > 0:
                assigned_names = [p.get('name', '').upper() if isinstance(p, dict) else str(p).upper() for p in assigned_payers]
                payer_match = any(p_name in c_payer for p_name in assigned_names if p_name)
                if not payer_match:
                    continue

            # Apply User Filters (payer name and type are in nested form_data, so filter in memory)
            if payer_name_filter and payer_name_filter not in c_payer.lower():
                continue
            if payer_type_filter:
                c_type = claim.get('form_data', {}).get('payer_type', '').lower()
                if payer_type_filter != c_type:
                    continue
            
            filtered_claims.append(claim)
        claims = filtered_claims
        
        print(f"🔍 RM Analytics DEBUG: Claims after all filters: {len(claims)}")
        
        stats = {
            'total_claims': len(claims),
            'active_claims': 0,
            'settled_claims': 0,
            'financials': {'settled': 0, 'tds': 0, 'net_payable': 0},
            'settlement_status': {},
            'payment_modes': {},
            # Comprehensive stats
            'total_amount': 0,
            'total_billed_amount': 0,
            'outstanding_claims': 0,
            'outstanding_amount': 0,
            'settled_amount': 0,
            'total_patient_paid': 0,
            'total_discount': 0,
            'total_disallowed': 0,
            'approved_amount': 0,
            # Additional analytics fields
            'status_distribution': {},
            'claims_over_time': {},
            'payer_performance': {},
            'disallowance_reasons': {},
            'tat_metrics': {
                'discharge_to_qc_pending': [],
                'qc_pending_to_qc_clear': [],
                'qc_pending_to_qc_query': [],
                'qc_clear_to_despatch': [],
                'despatch_to_settle': []
            }
        }
        
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status')
            rm_status = claim.get('rm_status') or status
            form_data = claim.get('form_data', {})
            review_data = claim.get('review_data', {})
            rm_data = claim.get('rm_data', {})
            
            # Status distribution
            stats['status_distribution'][status] = stats['status_distribution'].get(status, 0) + 1
            
            # Get amounts
            claimed_amount = float(form_data.get('claimed_amount', 0) or 0)
            billed_amount = float(form_data.get('total_bill_amount', 0) or form_data.get('total_billed_amount', 0) or 0)
            patient_paid = float(form_data.get('total_patient_paid_amount', 0) or form_data.get('patient_paid_amount', 0) or 0)
            patient_discount = float(form_data.get('patient_discount_amount', 0) or 0)
            mou_discount = float(form_data.get('mou_discount_amount', 0) or 0)
            total_discount = patient_discount + mou_discount
            approved_amount = float(review_data.get('approved_amount', 0) or 0)
            
            # Get disallowed amount from rm_data first, then fallback to review_data
            disallowed_amount = float(rm_data.get('disallowed_amount', 0) or 0)
            if disallowed_amount == 0:
                disallowed_amount = float(rm_data.get('disallowance_total', 0) or 0)
            if disallowed_amount == 0:
                disallowance_entries = rm_data.get('disallowance_entries', [])
                if isinstance(disallowance_entries, list) and len(disallowance_entries) > 0:
                    disallowed_amount = sum(float(entry.get('amount', 0) or 0) for entry in disallowance_entries if isinstance(entry, dict))
            if disallowed_amount == 0:
                disallowed_amount = float(review_data.get('disallowed_amount', 0) or 0)
            
            settled_amount = float(rm_data.get('settled_amount', 0) or 0)
            
            # Accumulate comprehensive stats
            stats['total_amount'] += claimed_amount
            stats['total_billed_amount'] += billed_amount
            stats['total_patient_paid'] += patient_paid
            stats['total_discount'] += total_discount
            
            is_settled = rm_status in settled_statuses or settled_amount > 0
            if is_settled:
                stats['settled_claims'] += 1
                stats['settled_amount'] += settled_amount if settled_amount > 0 else approved_amount
                
                # Financials from RM data
                stats['financials']['settled'] += settled_amount if settled_amount > 0 else approved_amount
                stats['financials']['tds'] += float(rm_data.get('tds_amount', 0) or 0)
                stats['financials']['net_payable'] += float(rm_data.get('net_payable', 0) or 0)
                
                mode = rm_data.get('payment_mode', 'Unknown')
                stats['payment_modes'][mode] = stats['payment_modes'].get(mode, 0) + 1
            else:
                stats['outstanding_claims'] += 1
                stats['active_claims'] += 1
                outstanding_amt = claimed_amount - (approved_amount if approved_amount > 0 else 0)
                stats['outstanding_amount'] += outstanding_amt if outstanding_amt > 0 else claimed_amount
            
            if disallowed_amount > 0:
                stats['total_disallowed'] += disallowed_amount
            if approved_amount > 0:
                stats['approved_amount'] += approved_amount
            
            # Time distribution
            created_at = claim.get('created_at')
            if created_at:
                try:
                    date_key = parse(created_at).strftime('%Y-%m-%d')
                    stats['claims_over_time'][date_key] = stats['claims_over_time'].get(date_key, 0) + 1
                except:
                    pass

            # Payer Performance
            payer = form_data.get('payer_name', 'Unknown')
            if payer not in stats['payer_performance']:
                stats['payer_performance'][payer] = {'count': 0, 'amount': 0, 'approved': 0}
            stats['payer_performance'][payer]['count'] += 1
            stats['payer_performance'][payer]['amount'] += claimed_amount
            if status in ['approved', 'settled', 'claim_approved'] or approved_amount > 0:
                stats['payer_performance'][payer]['approved'] += 1

            # Disallowance Reasons
            d_reasons = []
            # 1. RM Disallowance Entries
            d_entries = rm_data.get('disallowance_entries', [])
            if isinstance(d_entries, list):
                for entry in d_entries:
                    reason = entry.get('reason') or entry.get('category')
                    if reason:
                        d_reasons.append(reason)
            
            # 2. RM Disallowance Reason field
            if not d_reasons:
                reason = rm_data.get('disallowance_reason')
                if reason:
                     d_reasons.append(reason)
                     
            # 3. Review Data Disallowance Reason
            if not d_reasons:
                 reason = review_data.get('disallowance_reason')
                 if reason:
                     d_reasons.append(reason)
                     
            for reason in d_reasons:
                stats['disallowance_reasons'][reason] = stats['disallowance_reasons'].get(reason, 0) + 1
                
            stats['settlement_status'][rm_status] = stats['settlement_status'].get(rm_status, 0) + 1

        return jsonify({'success': True, 'data': stats}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

