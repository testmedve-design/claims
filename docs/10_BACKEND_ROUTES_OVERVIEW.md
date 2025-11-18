# Backend Routes - Complete Overview

## 📋 Overview

This document provides a comprehensive overview of all backend routes in the Claims Management System, organized by module and role-based access.

**Base URL**: `http://localhost:5002`  
**API Version**: v1  
**Backend Framework**: Flask (Python 3.9+)

---

## 🗂️ Route Structure

```
/api
├── /auth                          # Authentication (Public)
├── /v1
│   ├── /claims                    # Claims (All Authenticated Roles)
│   ├── /drafts                    # Drafts (Hospital Users)
│   ├── /documents                 # Documents (All Authenticated Roles)
│   └── /resources                 # Resources (Public/Authenticated)
├── /new-claim                     # New Claim Submission (Hospital Users)
├── /processor-routes              # Processor Operations (Processors Only)
├── /review-request                # Review Request (Review Request Only)
├── /rm                            # RM Operations (RMs Only)
├── /notifications                 # Notifications (All Authenticated Roles)
└── /public                        # Public Routes (No Auth Required)
```

---

## 🔐 Authentication Routes

**Module**: `backend/routes/auth.py`  
**Prefix**: `/api/auth`  
**Access**: Public

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login with email/password | ❌ No |
| POST | `/signup` | User registration | ❌ No |
| POST | `/logout` | User logout | ✅ Yes |
| POST | `/refresh-token` | Refresh access token | ✅ Yes |
| GET | `/verify-token` | Verify token validity | ✅ Yes |

**Documentation**: [01_AUTHENTICATION.md](./01_AUTHENTICATION.md)

---

## 📋 Claims Routes (Shared)

**Module**: `backend/routes/claims.py`  
**Prefix**: `/api/v1/claims`  
**Access**: All Authenticated Roles (Hospital, Processor, RM, Review Request)

### Endpoints

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/get-all-claims` | Get all claims for user's hospital | All |
| GET | `/get-claim/<claim_id>` | Get specific claim details | All |
| GET | `/get-claims-stats` | Get claim statistics | All |
| GET | `/debug-claims` | Debug claims data | All |
| POST | `/answer-query/<claim_id>` | Answer processor query | Hospital |
| POST | `/contest-denial/<claim_id>` | Contest denied claim | Hospital |
| POST | `/dispatch-claim/<claim_id>` | Dispatch cleared claim | Hospital |
| GET | `/transactions/<claim_id>` | Get claim transaction history | All |
| GET | `/export` | Export claims as CSV | All |

**Key Features**:
- Hospital-based filtering (automatic)
- Status-based queries
- Date range filtering
- Payer name extraction
- Transaction history tracking

**Documentation**: [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)

---

## 💾 Drafts Routes

**Module**: `backend/routes/drafts.py`  
**Prefix**: `/api/v1/drafts`  
**Access**: Hospital Users Only

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create new draft |
| PUT | `/update/<draft_id>` | Update existing draft |
| DELETE | `/delete/<draft_id>` | Delete draft |
| GET | `/get-all` | Get all drafts for hospital |
| GET | `/get/<draft_id>` | Get specific draft |
| POST | `/submit/<draft_id>` | Submit draft as claim |

**Key Features**:
- Auto-save support
- Draft-to-claim conversion
- Hospital-based filtering
- Document attachment support

**Documentation**: [03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)

---

## 📎 Documents Routes

**Module**: `backend/routes/documents.py`  
**Prefix**: `/api/v1/documents`  
**Access**: All Authenticated Roles

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload document to claim |
| GET | `/get-claim-documents/<claim_id>` | Get all documents for claim |
| GET | `/download/<document_id>` | Download document (proxy) |
| DELETE | `/delete/<document_id>` | Delete document |
| GET | `/view/<document_id>` | View document in browser |

**Key Features**:
- File type validation (PDF, JPG, PNG, DOC, XLS)
- Automatic compression (up to 5MB)
- Firebase Storage integration
- Document categorization
- Progress tracking support

**Allowed File Types**:
- Documents: `.pdf`, `.doc`, `.docx`
- Images: `.jpg`, `.jpeg`, `.png`
- Spreadsheets: `.xls`, `.xlsx`

**Documentation**: [05_DOCUMENTS.md](./05_DOCUMENTS.md)

---

## 📊 Resources Routes

**Module**: `backend/routes/resources.py`  
**Prefix**: `/api/resources`  
**Access**: Public/Authenticated

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/specialties` | Get all medical specialties | Optional |
| GET | `/doctors` | Get doctors by specialty | Optional |
| GET | `/treatments` | Get treatment lines | Optional |
| GET | `/payers` | Get payers for hospital | Required |
| GET | `/id-card-types` | Get ID card types | Optional |
| GET | `/payer-types` | Get payer types | Optional |
| GET | `/gender-options` | Get gender options | Optional |

**Key Features**:
- Cached responses (Redis ready)
- Hospital-specific payer lists
- Cascading dropdown support
- Fast loading for form dropdowns

**Documentation**: [06_RESOURCES_API.md](./06_RESOURCES_API.md)

---

## 🏥 New Claim Routes

**Module**: `backend/routes/new_claim_routes.py`  
**Prefix**: `/api/new-claim`  
**Access**: Hospital Users Only

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/submit` | Submit new claim |
| POST | `/submit-draft` | Submit draft as claim |
| GET | `/validate` | Validate claim data |

**Key Features**:
- Complete claim validation
- Automatic claim ID generation
- Document linking
- Status initialization
- Transaction logging

**Documentation**: [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md#3-submit-new-claim)

---

## ⚙️ Processor Routes

**Module**: `backend/routes/processor_routes.py`  
**Prefix**: `/api/processor-routes`  
**Access**: Claim Processors Only (L1-L4)

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-claims` | Get claims to process |
| GET | `/get-claim-for-processing/<claim_id>` | Get claim details |
| POST | `/process-claim/<claim_id>` | Process claim (approve/reject/query) |
| POST | `/bulk-process` | Bulk process multiple claims |
| GET | `/get-processor-stats` | Get processing statistics |
| POST | `/lock-claim/<claim_id>` | Lock claim for processing |
| POST | `/unlock-claim/<claim_id>` | Unlock claim |
| GET | `/check-claim-lock/<claim_id>` | Check lock status |
| POST | `/generate-cover-letter/<claim_id>` | Generate cover letter |

**Key Features**:
- Claim locking system (2-hour lock)
- Level-based approval limits (L1-L4)
- Hospital affiliation filtering
- Bulk processing support
- Cover letter generation
- Auto-unlock on expiry

**Processor Levels & Limits**:
| Level | Role | Approval Limit |
|-------|------|----------------|
| L1 | `claim_processor_l1` | ₹50,000 |
| L2 | `claim_processor_l2` | ₹200,000 |
| L3 | `claim_processor_l3` | ₹500,000 |
| L4 | `claim_processor_l4` | Unlimited |

**Documentation**: [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)  
**Lock System**: [LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md)

---

## 🔍 Review Request Routes

**Module**: `backend/routes/review_request_routes.py`  
**Prefix**: `/api/review-request`  
**Access**: Review Request Role Only

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-claims` | Get claims for review |
| GET | `/get-claim-full/<claim_id>` | Get full claim details |
| GET | `/get-claim-details/<claim_id>` | Get claim details (alternate) |
| POST | `/review-claim/<claim_id>` | Submit review decision |
| POST | `/escalate-claim/<claim_id>` | Escalate claim |
| GET | `/get-review-stats` | Get review statistics |

**Key Features**:
- Second-level review system
- Financial amount reviews
- Escalation workflow
- Review history tracking
- Entity-based filtering

**Review Actions**:
- `reviewed` - Complete review with amounts
- `approve` - Approve claim
- `reject` - Reject claim
- `request_more_info` - Request additional info
- `mark_under_review` - Mark as under review
- `complete` - Complete review
- `not_found` - Claim not found

**Documentation**: [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md)

---

## 💼 RM (Relationship Manager) Routes

**Module**: `backend/routes/rm_routes.py`  
**Prefix**: `/api/rm`  
**Access**: RM/Reconciler Role Only

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-claims` | Get claims for RM (active/settled/all) |
| GET | `/get-claim-details/<claim_id>` | Get claim details |
| POST | `/update-claim/<claim_id>` | Update claim status & settlement |
| POST | `/reevaluate-claim/<claim_id>` | Re-evaluate claim |
| GET | `/get-rm-stats` | Get RM statistics |

**Key Features**:
- Post-dispatch processing
- Settlement tracking
- Payment reconciliation
- Status management
- Entity-based filtering

**RM Status Options**:
- `received` - Received by payer
- `query_raised` - Payer query
- `repudiated` - Rejected by payer
- `settled` - Fully settled
- `approved` - Approved by payer
- `partially_settled` - Partial settlement
- `reconciliation` - In reconciliation
- `in_progress` - RM working
- `cancelled` - Cancelled
- `closed` - Closed
- `not_found` - Not found by payer

**Documentation**: [07_RM_ROUTES.md](./07_RM_ROUTES.md)

---

## 🔔 Notifications Routes

**Module**: `backend/routes/notifications.py`  
**Prefix**: `/api/notifications`  
**Access**: All Authenticated Roles

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/get-notifications` | Get user notifications |
| POST | `/mark-read/<notification_id>` | Mark notification as read |
| POST | `/mark-all-read` | Mark all as read |
| DELETE | `/delete/<notification_id>` | Delete notification |

**Notification System**:
- Real-time Firebase notifications
- In-app notification storage
- External service integration (optional)
- Automatic cleanup (30 days)

**Documentation**: [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md)

---

## 🌐 Public Routes

**Module**: `backend/routes/public_routes.py`  
**Prefix**: `/api/public`  
**Access**: No Authentication Required

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/version` | API version |
| GET | `/status` | System status |
| GET | `/resources/specialties` | Get specialties (public) |
| GET | `/resources/treatments` | Get treatments (public) |

---

## 🔒 Middleware & Security

### Authentication Middleware

```python
# @require_claims_access - All authenticated roles
# @require_hospital_access - Hospital users only
# @require_processor_access - Processors only
# @require_rm_access - RMs only
# @require_review_request_access - Review request only
```

### Role-Based Access Control

**Allowed Roles**:
```python
ALLOWED_CLAIMS_ROLES = [
    'hospital_user',
    'claim_processor',
    'claim_processor_l1',
    'claim_processor_l2',
    'claim_processor_l3',
    'claim_processor_l4',
    'rm',
    'reconciler',
    'review_request'
]
```

**Blocked Roles**:
```python
BLOCKED_ROLES = [
    'super_admin',
    'general_admin',
    'viewer',
    'auditor'
]
```

### Entity-Based Filtering

All routes automatically filter claims based on user's `entity_assignments`:
- Hospitals: Claims from assigned hospitals only
- Payers: Claims for assigned payers only
- Processors: Claims from affiliated hospitals

---

## 🔧 Utility Modules

### Transaction Helper

**Module**: `backend/utils/transaction_helper.py`

Creates audit trail for all claim actions:
```python
from utils.transaction_helper import create_transaction, TransactionType

create_transaction(
    claim_id="CSHLSIP-2025-001",
    transaction_type=TransactionType.PROCESSED,
    performed_by=user_id,
    performed_by_email=user_email,
    performed_by_name=user_name,
    performed_by_role=user_role,
    previous_status="qc_pending",
    new_status="qc_clear",
    remarks="Claim cleared in QC",
    metadata={}
)
```

**Transaction Types**:
- `CREATED`, `UPDATED`, `DELETED`
- `PROCESSED`, `REVIEWED`, `ESCALATED`
- `ANSWERED`, `CONTESTED`, `DISPATCHED`
- `LOCKED`, `UNLOCKED`
- `REVIEW_STATUS_UPDATED`

---

### Lock Utils

**Module**: `backend/utils/lock_utils.py`

Manages claim locking for concurrent access:
```python
from utils import lock_utils

# Lock claim
lock_utils.lock_claim(db, claim_id, processor_id, processor_email, processor_name)

# Check if locked
is_locked, lock_info = lock_utils.is_claim_locked(db, claim_id)

# Unlock claim
lock_utils.unlock_claim(db, claim_id, processor_id)

# Cleanup expired locks
lock_utils.cleanup_expired_locks(db)
```

**Lock Duration**: 2 hours  
**Auto-cleanup**: Every API call checks expired locks

---

### Notification Client

**Module**: `backend/utils/notification_client.py`

Handles all claim notifications:
```python
from utils.notification_client import get_notification_client

notification_client = get_notification_client()

# Notify processors of new claim
notification_client.notify_pending(claim_id, claim_data, actor_id, actor_name, actor_email)

# Notify hospital of query
notification_client.notify_qc_query(claim_id, claim_data, processor_id, processor_name, processor_email, remarks)

# Notify processors of answer
notification_client.notify_qc_answered(claim_id, claim_data, hospital_user_id, hospital_user_name, hospital_user_email, response)
```

**Documentation**: [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md)

---

### Compression Utils

**Module**: `backend/utils/compression.py`

Automatic document compression:
```python
from utils.compression import compress_document

compressed_file, original_size, was_compressed = compress_document(
    file,
    max_size_mb=5.0,
    quality=85
)
```

**Features**:
- Automatic image compression (JPG, PNG)
- PDF compression
- Size limit enforcement
- Quality preservation

---

### Letter Templates

**Module**: `backend/utils/letter_templates.py`

Generate cover letters and reports:
```python
from utils.letter_templates import build_processor_letter_metadata

metadata = build_processor_letter_metadata(claim_data, processor_name)
# Returns: Formatted metadata for PDF generation
```

---

## 📊 Database Collections

### Firestore Collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `users` | User profiles and roles | All authenticated |
| `direct_claims` | All claims | Role-based filtered |
| `drafts` | Draft claims | Hospital users |
| `documents` | Document metadata | All authenticated |
| `hospitals` | Hospital information | Role-based |
| `payers` | Payer information | Role-based |
| `payer_affiliations` | Hospital-payer links | Role-based |
| `claim_transactions` | Transaction history | All authenticated |
| `claims_notifications` | In-app notifications | Recipient-based |

### Data Flow

```
User → Authentication → Middleware → Route Handler
                           ↓
                  Entity Assignment Check
                           ↓
                  Firestore Query (Filtered)
                           ↓
                  Business Logic
                           ↓
                  Transaction Logging
                           ↓
                  Notification Trigger
                           ↓
                  Response to User
```

---

## 🚀 Best Practices

### 1. Always Use Transactions
```python
# Create transaction for audit trail
create_transaction(
    claim_id=claim_id,
    transaction_type=TransactionType.PROCESSED,
    ...
)
```

### 2. Check Claim Locks
```python
# Before processing
is_locked, lock_info = lock_utils.is_claim_locked(db, claim_id)
if is_locked and lock_info['locked_by_processor'] != processor_id:
    return jsonify({'error': 'Claim locked'}), 409
```

### 3. Send Notifications
```python
# After successful operation
notification_client.notify_qc_clear(
    claim_id, claim_data, processor_id, processor_name, processor_email, remarks
)
```

### 4. Validate Entity Access
```python
# Middleware automatically checks, but for custom logic:
user_hospital_id = getattr(request, 'hospital_id', '')
claim_hospital_id = claim_data.get('hospital_id', '')

if claim_hospital_id != user_hospital_id:
    return jsonify({'error': 'Access denied'}), 403
```

### 5. Handle Errors Gracefully
```python
try:
    # Operation
    pass
except Exception as e:
    print(f"ERROR: {str(e)}")
    return jsonify({'success': False, 'error': str(e)}), 500
```

---

## 🧪 Testing

### Manual Testing

**Postman Collection**: Available in `/tests/postman/`

**Test Endpoints**:
- `/api/processor-routes/test-simple` - Simple health check
- `/api/processor-routes/test-locks` - Check lock information
- `/api/v1/claims/debug-claims` - Debug claims data

**Test Users**:
- Hospital User: `hospital@test.com`
- Processor L1: `processor.l1@medverve.com`
- Processor L4: `processor.l4@medverve.com`
- RM: `rm@medverve.com`
- Review Request: `reviewer@medverve.com`

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "total_claims": 10,
  "claims": []
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., claim locked)
- `500` - Internal Server Error

---

## 🔍 Monitoring & Logging

### Application Logs

Located in: `backend/backend.log`

**Log Levels**:
- `INFO` - General information
- `WARNING` - Warning messages
- `ERROR` - Error messages
- `DEBUG` - Debug information

**Key Log Entries**:
- Authentication attempts
- Claim status changes
- Lock operations
- Notification delivery
- Error stack traces

### Debug Endpoints

- `/api/v1/claims/debug-claims` - Debug claim data
- `/api/processor-routes/test-locks` - Check lock status
- `/api/processor-routes/test-simple` - Basic health check

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**
- Check token validity
- Verify token in Authorization header
- Re-login if token expired

**Issue: 403 Forbidden**
- Check user role
- Verify entity_assignments
- Ensure claim belongs to user's hospital

**Issue: 409 Conflict (Claim Locked)**
- Check lock status: `GET /check-claim-lock/<claim_id>`
- Wait for lock to expire (2 hours)
- Contact processor who locked claim

**Issue: Notifications Not Received**
- Check Firestore `claims_notifications` collection
- Verify recipient_ids includes user
- Check entity_assignments

### Debug Steps

1. **Check User Profile**:
```python
db.collection('users').document(user_id).get().to_dict()
```

2. **Check Claim Status**:
```python
db.collection('direct_claims').document(claim_id).get().to_dict()
```

3. **Check Locks**:
```python
lock_utils.is_claim_locked(db, claim_id)
```

4. **Check Transactions**:
```python
db.collection('direct_claims').document(claim_id).collection('transactions').get()
```

---

## 🔗 Related Documentation

- [01_AUTHENTICATION.md](./01_AUTHENTICATION.md) - Authentication & Login
- [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md) - Hospital User APIs
- [03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md) - Drafts Management
- [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md) - Processor APIs
- [05_DOCUMENTS.md](./05_DOCUMENTS.md) - Document Management
- [06_RESOURCES_API.md](./06_RESOURCES_API.md) - Resources & Dropdowns
- [07_RM_ROUTES.md](./07_RM_ROUTES.md) - RM Operations
- [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md) - Review Request System
- [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md) - Notifications
- [LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md) - Claim Locking

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Backend Version**: Python 3.9 + Flask  
**Database**: Firebase Firestore

---


