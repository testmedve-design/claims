"""
Analytics Routes Module
Handles analytics and reporting for all roles (Hospital User, Processor, Review Request, RM)
"""
from flask import Blueprint, request, jsonify
from firebase_admin import firestore
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
        
        # Base query
        query = db.collection('direct_claims')
        
        if hospital_id:
            query = query.where('hospital_id', '==', hospital_id)
            
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        # Apply date filter
        claims = filter_claims_by_date(claims, start_date, end_date)
        
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
            'disallowance_reasons': {}
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
                if hasattr(val, 'timestamp'): return datetime.fromtimestamp(val.timestamp())
                if isinstance(val, datetime): return val
                try: return parse(val)
                except: return None

            def calc_days(start, end):
                if start and end:
                    # Ensure naive vs aware compatibility (make both naive)
                    if start.tzinfo: start = start.replace(tzinfo=None)
                    if end.tzinfo: end = end.replace(tzinfo=None)
                    diff = (end - start).days
                    return diff if diff >= 0 else 0
                return None

            # Timestamps
            discharge_date = get_dt(form_data.get('discharge_date') or form_data.get('date_of_discharge'))
            created_at = get_dt(claim.get('created_at'))
            
            qc_clear_at = get_dt(claim.get('qc_clear_date'))
            if not qc_clear_at and status == 'qc_clear':
                 qc_clear_at = get_dt(claim.get('processed_at'))
            
            qc_query_at = None
            if status in ['qc_query', 'qc_answered']: # qc_answered implies it was queried
                 qc_query_at = get_dt(claim.get('processed_at')) # Best effort
            
            dispatched_at = get_dt(claim.get('dispatched_at'))
            
            settled_at = get_dt(rm_data.get('settled_date') or rm_data.get('settlement_date') or claim.get('rm_status_raised_date'))
            if not settled_at and status in settled_statuses:
                 settled_at = get_dt(claim.get('updated_at'))

            # 1. Discharge to QC Pending (Created)
            d_to_qcp = calc_days(discharge_date, created_at)
            if d_to_qcp is not None:
                stats['tat_metrics']['discharge_to_qc_pending'].append(d_to_qcp)

            # 2. QC Pending to QC Clear
            if created_at and qc_clear_at:
                 qcp_to_qcc = calc_days(created_at, qc_clear_at)
                 if qcp_to_qcc is not None:
                     stats['tat_metrics']['qc_pending_to_qc_clear'].append(qcp_to_qcc)
            
            # 3. QC Pending to QC Query
            if created_at and qc_query_at:
                 qcp_to_qcq = calc_days(created_at, qc_query_at)
                 if qcp_to_qcq is not None:
                     stats['tat_metrics']['qc_pending_to_qc_query'].append(qcp_to_qcq)

            # 4. QC Clear to Despatch
            if qc_clear_at and dispatched_at:
                 qcc_to_disp = calc_days(qc_clear_at, dispatched_at)
                 if qcc_to_disp is not None:
                     stats['tat_metrics']['qc_clear_to_despatch'].append(qcc_to_disp)

            # 5. Despatch to Settle
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
        
        # Base Query
        query = db.collection('direct_claims')
        
        # If processor selects a specific hospital, filter by it (must be in their assignments)
        if selected_hospital_id:
            if affiliated_ids and selected_hospital_id not in affiliated_ids:
                return jsonify({'success': False, 'error': 'Access denied for this hospital'}), 403
            query = query.where('hospital_id', '==', selected_hospital_id)
        elif affiliated_ids:
             # Ideally we'd filter by 'hospital_id in affiliated_ids', but Firestore 'in' has limits (max 10)
             # For MVP, fetch all and filter in memory if list is small, or rely on client side filtering mostly
             # For now, let's fetch all non-drafts and filter in memory for accuracy
             pass
            
        docs = query.get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        # Apply Date Filter
        claims = filter_claims_by_date(claims, start_date, end_date)
        
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
            'approved_amount': 0
        }
        
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status', 'unknown')
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

        # Base Query - fetch all relevant claims (dispatched or in review flow)
        # Since we don't have a simple index for "all review claims", we might scan or rely on status
        # A better approach: query where review_status is set or claim_status is 'dispatched'
        
        # Fetching all claims for now (optimize later with indexes)
        docs = db.collection('direct_claims').get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        # Filter relevant claims (those that reached review stage)
        # Relevant statuses: dispatched, reviewed, review_approved, review_rejected, review_escalated, etc.
        review_statuses = ['dispatched', 'reviewed', 'review_approved', 'review_rejected', 'review_info_needed', 'review_completed', 'review_escalated', 'review_under_review']
        
        claims = [c for c in claims if c.get('claim_status') in review_statuses or c.get('review_status')]
        
        # Apply Date Filter
        claims = filter_claims_by_date(claims, start_date, end_date)

        # Apply Filters
        filtered_claims = []
        for claim in claims:
            if hospital_id and claim.get('hospital_id') != hospital_id:
                continue
            if payer_name_filter:
                payer = claim.get('form_data', {}).get('payer_name', '').lower()
                if payer_name_filter not in payer:
                    continue
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
            'approved_amount': 0
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
        
        # Simplification: Fetch all relevant claims and filter in memory
        # Relevant claims for RM are typically 'dispatched', 'settled', 'partially_settled', 'reconciliation'
        docs = db.collection('direct_claims').get()
        claims = [doc.to_dict() for doc in docs]
        
        # Filter out drafts (drafts have claim_status == 'draft')
        claims = [c for c in claims if c.get('claim_status') != 'draft']
        
        print(f"🔍 RM Analytics DEBUG: Total claims before filters: {len(claims)}")
        
        # Apply Date Filter
        claims = filter_claims_by_date(claims, start_date, end_date)
        
        print(f"🔍 RM Analytics DEBUG: Claims after date filter: {len(claims)}")
        
        filtered_claims = []
        for claim in claims:
            # Must be dispatched or later status
            # Check status - RM usually deals with post-dispatch
            status = claim.get('claim_status', '')
            if status not in ['dispatched', 'settled', 'partially_settled', 'reconciliation', 'approved', 'rejected', 'received', 'query_raised', 'repudiated']:
                # Maybe include reviewed if flow goes there
                continue
                
            # Check assignments
            c_hosp_id = claim.get('hospital_id')
            c_payer = (claim.get('form_data', {}).get('payer_name', '') or '').strip().upper()
            
            # Hospital Assignment Check
            # If assigned_hospitals is provided and not empty, filter by it
            # If empty, show all (no filter)
            if assigned_hospitals and len(assigned_hospitals) > 0:
                assigned_hosp_ids = [h.get('id') if isinstance(h, dict) else h for h in assigned_hospitals]
                if c_hosp_id not in assigned_hosp_ids:
                    continue
            
            # Payer Assignment Check
            # If assigned_payers is provided and not empty, filter by it
            # If empty, show all (no filter)
            if assigned_payers and len(assigned_payers) > 0:
                assigned_names = [p.get('name', '').upper() if isinstance(p, dict) else str(p).upper() for p in assigned_payers]
                # Simple substring match or exact? Let's do partial match
                payer_match = any(p_name in c_payer for p_name in assigned_names if p_name)
                if not payer_match:
                    continue

            # Apply User Filters
            if hospital_id and c_hosp_id != hospital_id:
                continue
            if payer_name_filter and payer_name_filter not in c_payer.lower():
                continue
            if payer_type_filter:
                c_type = claim.get('form_data', {}).get('payer_type', '').lower()
                if payer_type_filter != c_type:
                    continue
            
            filtered_claims.append(claim)
        claims = filtered_claims
        
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
            'approved_amount': 0
        }
        
        settled_statuses = ['settled', 'partially_settled', 'reconciliation']
        
        for claim in claims:
            status = claim.get('claim_status')
            rm_status = claim.get('rm_status') or status
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
                
            stats['settlement_status'][rm_status] = stats['settlement_status'].get(rm_status, 0) + 1

        return jsonify({'success': True, 'data': stats}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

