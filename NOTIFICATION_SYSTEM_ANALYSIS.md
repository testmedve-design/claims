# Notification System Implementation Analysis

## Overview
The notification system is implemented to send in-app notifications to relevant users when claim status changes occur. It supports both external notification service calls and in-app notification storage in Firestore.

## Roles Involved

### Allowed Roles (from `backend/middleware.py`)
The notification system uses `@require_claims_access` decorator which allows these roles:
- `hospital_user` - Hospital users who create and manage claims
- `claim_processor` - Base processor role
- `claim_processor_l1` - Processor level 1 (up to ₹50K)
- `claim_processor_l2` - Processor level 2 (up to ₹1 Lakh)
- `claim_processor_l3` - Processor level 3 (up to ₹2 Lakhs)
- `claim_processor_l4` - Processor level 4 (unlimited)
- `reconciler` - Reconciliation role
- `rm` - Relationship Manager
- `review_request` - Second level review team

## Notification Flow

### 1. Who Can Trigger Notifications

#### Hospital Users (`hospital_user`)
- ✅ **Claim Submitted** (`notify_pending`) - When submitting a new claim
  - Location: `backend/routes/new_claim_routes.py:299`
  - Recipients: Processors assigned to the claim/hospital

- ✅ **QC Query Answered** (`notify_qc_answered`) - When answering a QC query
  - Location: `backend/routes/claims.py:826`
  - Recipients: Processors assigned to the claim

- ✅ **Additional Info Submitted** (`notify_need_more_info_response`) - When providing more information
  - Location: `backend/routes/claims.py:816`
  - Recipients: Processors assigned to the claim

- ✅ **Claim Contested** (`notify_claim_contested`) - When contesting a denied claim
  - Location: `backend/routes/claims.py:280`
  - Recipients: Processors assigned to the claim

#### Processors (All Levels: `claim_processor`, `claim_processor_l1-l4`)
- ✅ **QC Query Raised** (`notify_qc_query`) - When raising a QC query
  - Location: `backend/routes/processor_routes.py:759`
  - Recipients: Hospital users from the claim's hospital

- ✅ **Need More Info** (`notify_need_more_info`) - When requesting additional information
  - Location: `backend/routes/processor_routes.py:769`
  - Recipients: Hospital users from the claim's hospital

- ✅ **QC Cleared** (`notify_qc_clear`) - When clearing QC
  - Location: `backend/routes/processor_routes.py:778`
  - Recipients: Hospital users from the claim's hospital

- ✅ **Claim Approved** (`notify_approved`) - When approving a claim
  - Location: `backend/routes/processor_routes.py:787`
  - Recipients: Hospital users from the claim's hospital

- ✅ **Claim Denied** (`notify_denial`) - When denying a claim
  - Location: `backend/routes/processor_routes.py:796`
  - Recipients: Hospital users from the claim's hospital

### 2. Who Receives Notifications

#### Processors Receive Notifications When:
1. **Claim Submitted** - New claim from hospital
2. **QC Query Answered** - Hospital responds to QC query
3. **Additional Info Submitted** - Hospital provides requested information
4. **Claim Contested** - Hospital contests a denial

**How processors are determined:**
- From `processed_by` field in claim
- From `assigned_processors` or `assigned_processor_ids` fields
- Fallback: All processors assigned to the hospital (from `get_processors_for_hospital()`)
- Includes all processor levels: `claim_processor`, `claim_processor_l1`, `claim_processor_l2`, `claim_processor_l3`, `claim_processor_l4`

#### Hospital Users Receive Notifications When:
1. **QC Query Raised** - Processor raises a query
2. **Need More Info** - Processor requests additional information
3. **QC Cleared** - Processor clears QC
4. **Claim Approved** - Processor approves the claim
5. **Claim Denied** - Processor denies the claim

**How hospital users are determined:**
- All users with role `hospital_user` assigned to the claim's `hospital_id`
- Retrieved via `get_hospital_users(hospital_id)` from `notification_helpers.py`

### 3. Notification API Access

The notification API endpoints (`/api/notifications/*`) use `@require_claims_access` decorator, which means:
- ✅ All roles in `ALLOWED_CLAIMS_ROLES` can access notifications
- ✅ This includes: `hospital_user`, all processor levels, `reconciler`, `rm`, `review_request`
- ✅ Users can only see notifications where they are in the `recipients` list

## Implementation Details

### Notification Storage
- Stored in Firestore collection: `claims_notifications`
- Each notification includes:
  - `recipients`: Array of recipient objects with `user_id`, `user_role`, `name`, `email`
  - `recipient_ids`: Array of user IDs for quick filtering
  - `recipient_roles`: Array of unique roles for analytics
  - `triggered_by`: Actor information (who triggered the notification)
  - `read_by`: Array of user IDs who have read the notification

### Notification Retrieval
- Endpoint: `GET /api/notifications`
- Filters notifications by:
  - User ID match in `recipient_ids`
  - Email match in recipient emails
  - User ID match in `recipients` array
- Supports filtering by `unread` status
- Auto-cleans expired notifications before retrieval

## Issues & Observations

### ✅ Correctly Implemented
1. **Role-based recipient selection** - Correctly identifies processors and hospital users
2. **Bidirectional notifications** - Both hospitals and processors can trigger and receive notifications
3. **All processor levels included** - `get_processors_for_hospital()` includes all processor levels (L1-L4)
4. **Access control** - Notification API properly protected with `@require_claims_access`
5. **Intentional exclusion** - RM, Reconciler, and Review Request roles are intentionally excluded from receiving notifications (by design)

### ✅ Design Decision - RM/Reconciler/Review Request Roles

**Current Status**: RM, Reconciler, and Review Request roles:
- ✅ Have access to view notifications via API (can read notifications if needed)
- ✅ Are NOT included as recipients in notification logic (by design)
- ✅ This is the intended behavior - only Hospital Users and Processors receive notifications

**Rationale**: 
- Notifications are specifically for the claim processing workflow between hospitals and processors
- RM, Reconciler, and Review Request roles have different responsibilities and don't need real-time notifications
- They can still access the notification API if they need to view notification history

## Summary

**Correctly Implemented For:**
- ✅ **Hospital Users** (`hospital_user`) - Can trigger and receive notifications
- ✅ **Processors** (all levels: `claim_processor`, `claim_processor_l1-l4`) - Can trigger and receive notifications
- ✅ **Notification API access** - All allowed roles can access (for viewing purposes)

**Intentionally Excluded From Receiving Notifications:**
- ✅ **RM** (`rm`) - Has API access but doesn't receive notifications (by design)
- ✅ **Reconciler** (`reconciler`) - Has API access but doesn't receive notifications (by design)
- ✅ **Review Request** (`review_request`) - Has API access but doesn't receive notifications (by design)

**Conclusion**: The notification system is **correctly implemented** according to business requirements. Only Hospital Users and Claim Processors participate in the notification workflow. RM, Reconciler, and Review Request roles are intentionally excluded from receiving notifications, which aligns with their different responsibilities in the system.

