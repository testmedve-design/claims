# Backend Routes - Complete Overview

## 📋 Overview

This document provides a comprehensive overview of all backend routes in the Claims Management System, organized by module and role-based access.

**Base URL**: `http://localhost:5002`  
**API Version**: v1  
**Backend Framework**: Flask (Python 3.9+)  
**Database**: Firebase Firestore

**Last Updated**: January 2025  
**Version**: 2.0

---

## 🗂️ Route Structure

```
/api
├── /auth                          # Authentication (Public)
│   ├── POST /login                # User login
│   ├── GET  /validate-token       # Validate JWT token
│   
├── /v1
│   ├── /claims                    # Claims (All Authenticated Roles)
│   │   ├── GET    /get-all-claims
│   │   ├── GET    /get-claim/<claim_id>
│   │   ├── GET    /get-claims-stats
│   │   ├── GET    /debug-claims
│   │   ├── POST   /answer-query/<claim_id>
│   │   ├── POST   /contest-denial/<claim_id>
│   │   ├── POST   /dispatch-claim/<claim_id>
│   │   ├── GET    /transactions/<claim_id>
│   │   └── GET    /export
│   │
│   ├── /drafts                    # Drafts (Hospital Users)
│   │   ├── POST   /create
│   │   ├── PUT    /update/<draft_id>
│   │   ├── DELETE /delete/<draft_id>
│   │   ├── GET    /get-all
│   │   ├── GET    /get/<draft_id>
│   │   └── POST   /submit/<draft_id>
│   │
│   ├── /documents                 # Documents (All Authenticated Roles)
│   │   ├── POST   /upload
│   │   ├── GET    /get-claim-documents/<claim_id>
│   │   ├── GET    /download/<document_id>
│   │   ├── DELETE /delete/<document_id>
│   │   └── GET    /view/<document_id>
│   │
│   └── /resources                 # Resources (Public/Authenticated)
│       ├── GET /specialties
│       ├── GET /doctors
│       ├── GET /treatments
│       ├── GET /payers
│       ├── GET /id-card-types
│       ├── GET /payer-types
│       └── GET /gender-options
│
├── /new-claim                     # New Claim Submission (Hospital Users)
│   ├── POST /submit
│   ├── POST /submit-draft
│   └── GET  /validate
│
├── /processor-routes              # Processor Operations (Processors Only)
│   ├── GET  /test-simple
│   ├── GET  /test-locks
│   ├── GET  /get-claims
│   ├── GET  /get-claim-for-processing/<claim_id>
│   ├── POST /process-claim/<claim_id>
│   ├── POST /bulk-process
│   ├── GET  /get-processor-stats
│   ├── POST /lock-claim/<claim_id>
│   ├── POST /unlock-claim/<claim_id>
│   ├── GET  /check-claim-lock/<claim_id>
│   └── POST /generate-cover-letter/<claim_id>
│
├── /review-request                # Review Request (Review Request Only)
│   ├── GET  /get-claims
│   ├── GET  /get-claim-full/<claim_id>
│   ├── GET  /get-claim-details/<claim_id>
│   ├── POST /review-claim/<claim_id>
│   ├── POST /escalate-claim/<claim_id>
│   └── GET  /get-review-stats
│
├── /rm                            # RM Operations (RMs Only)
│   ├── GET  /get-claims
│   ├── GET  /get-claim-details/<claim_id>
│   ├── POST /update-claim/<claim_id>
│   ├── POST /reevaluate-claim/<claim_id>
│   └── GET  /get-rm-stats
│
├── /notifications                 # Notifications (All Authenticated Roles)
│   ├── GET    /get-notifications
│   ├── POST   /mark-read/<notification_id>
│   ├── POST   /mark-all-read
│   └── DELETE /delete/<notification_id>
│
└── /public                        # Public Routes (No Auth Required)
    ├── GET /health
    ├── GET /version
    ├── GET /status
    ├── GET /resources/specialties
    └── GET /resources/treatments
```

---

## 🔐 Authentication Routes

**Module**: `backend/routes/auth.py`  
**Prefix**: `/api/auth`  
**Access**: Public

### Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/login` | User login with email/password | `{ email, password }` | User data + JWT token |
| GET | `/validate-token` | Verify token validity | Header: `Authorization: Bearer <token>` | User data |

**Key Features**:
- Firebase Authentication integration
- Role-based access control (RBAC)
- Entity assignments (hospitals, payers)
- JWT token generation
- Token refresh support
- Blocked roles check (admins cannot access claims module)

**Allowed Roles**:
- `hospital_user`
- `claim_processor`, `claim_processor_l1`, `claim_processor_l2`, `claim_processor_l3`, `claim_processor_l4`
- `rm`, `reconciler`
- `review_request`

**Blocked Roles**:
- `super_admin`, `general_admin`, `viewer`, `auditor`

**Documentation**: [01_AUTHENTICATION.md](./01_AUTHENTICATION.md)

---

## 📋 Claims Routes (Shared)

**Module**: `backend/routes/claims.py`  
**Prefix**: `/api/v1/claims`  
**Access**: All Authenticated Roles

### Endpoints

| Method | Endpoint | Description | Filters/Parameters |
|--------|----------|-------------|-------------------|
| GET | `/get-all-claims` | Get all claims for user's hospital | `status`, `limit`, `start_date`, `end_date` |
| GET | `/get-claim/<claim_id>` | Get specific claim details | `claim_id` (path) |
| GET | `/get-claims-stats` | Get claim statistics | None |
| GET | `/debug-claims` | Debug claims data (development) | `limit` |
| POST | `/answer-query/<claim_id>` | Answer processor query | `{ query_response, uploaded_files }` |
| POST | `/contest-denial/<claim_id>` | Contest denied claim | `{ contest_reason, uploaded_files }` |
| POST | `/dispatch-claim/<claim_id>` | Dispatch cleared claim | `{ dispatch_mode, dispatch_date, ...}` |
| GET | `/transactions/<claim_id>` | Get claim transaction history | `claim_id` (path) |
| GET | `/export` | Export claims as CSV | `status`, `limit`, `start_date`, `end_date` |

**Key Features**:
- **Hospital-based filtering** (automatic): Claims filtered by user's assigned hospital
- **Payer name extraction**: Extracts `payer_name` from `form_data` or claim root
- **Status-based queries**: Filter by claim status
- **Date range filtering**: Start and end date support
- **Transaction history**: Complete audit trail
- **CSV export**: Export claims for reporting
- **Multi-collection support**: Handles both `claims` and `direct_claims` collections

**Status Filtering**:
- `all` - All claims
- `qc_pending` - Pending QC
- `qc_answered` - Query answered
- `qc_clear` - QC cleared
- `qc_query` - Query raised
- `answered` - Answered
- `clear` - Cleared
- `Approved` - Approved
- `rejected` - Rejected
- `dispatched` - Dispatched
- Custom statuses supported

**Documentation**: [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)

---

## 💾 Drafts Routes

**Module**: `backend/routes/drafts.py`  
**Prefix**: `/api/v1/drafts`  
**Access**: Hospital Users Only

### Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/create` | Create new draft | `{ form_data, documents }` |
| PUT | `/update/<draft_id>` | Update existing draft | `{ form_data, documents }` |
| DELETE | `/delete/<draft_id>` | Delete draft | None |
| GET | `/get-all` | Get all drafts for hospital | None |
| GET | `/get/<draft_id>` | Get specific draft | None |
| POST | `/submit/<draft_id>` | Submit draft as claim | None |

**Key Features**:
- Auto-save support (periodic updates)
- Draft-to-claim conversion
- Hospital-based filtering (automatic)
- Document attachment support
- Metadata preservation
- Validation before submission

**Draft Structure**:
```json
{
  "draft_id": "string",
  "is_draft": true,
  "form_data": {},
  "documents": [],
  "created_by": "uid",
  "created_by_email": "email",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "hospital_id": "string",
  "hospital_name": "string"
}
```

**Documentation**: [03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)

---

## 📎 Documents Routes

**Module**: `backend/routes/documents.py`  
**Prefix**: `/api/v1/documents`  
**Access**: All Authenticated Roles

### Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| POST | `/upload` | Upload document to claim | `file`, `claim_id`, `document_type`, `document_name` |
| GET | `/get-claim-documents/<claim_id>` | Get all documents for claim | `claim_id` (path) |
| GET | `/download/<document_id>` | Download document (proxy) | `document_id` (path) |
| DELETE | `/delete/<document_id>` | Delete document | `document_id` (path) |
| GET | `/view/<document_id>` | View document in browser | `document_id` (path) |

**Key Features**:
- **File type validation**: PDF, JPG, PNG, DOC, XLS supported
- **Automatic compression**: Images and PDFs compressed (up to 5MB)
- **Firebase Storage integration**: Secure file storage
- **Document categorization**: Multiple document types
- **Progress tracking**: Upload progress support
- **Download proxy**: Secure download URLs
- **Metadata storage**: File size, type, upload time tracked

**Allowed File Types**:
```python
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'}
```

**Document Types**:
- `discharge_summary`
- `admission_notes`
- `bills`
- `lab_reports`
- `prescriptions`
- `authorization_letter`
- `id_proof`
- `other`

**Compression**:
- Images: Quality 85%, max 5MB
- PDFs: Compression level 3
- Original preserved if compression fails

**Documentation**: [05_DOCUMENTS.md](./05_DOCUMENTS.md)

---

## 📊 Resources Routes

**Module**: `backend/routes/resources.py`  
**Prefix**: `/api/resources`  
**Access**: Public/Authenticated

### Endpoints

| Method | Endpoint | Description | Auth Required | Parameters |
|--------|----------|-------------|---------------|------------|
| GET | `/specialties` | Get all medical specialties | Optional | None |
| GET | `/doctors` | Get doctors by specialty | Optional | `specialty` |
| GET | `/treatments` | Get treatment lines | Optional | None |
| GET | `/payers` | Get payers for hospital | Required | User's hospital from token |
| GET | `/id-card-types` | Get ID card types | Optional | None |
| GET | `/payer-types` | Get payer types | Optional | None |
| GET | `/gender-options` | Get gender options | Optional | None |

**Key Features**:
- **Cached responses**: Redis-ready for performance
- **Hospital-specific payer lists**: Based on payer_affiliations
- **Cascading dropdown support**: Specialty → Doctor → Treatment
- **Fast loading**: Optimized for form dropdowns
- **Static data**: ID cards, genders, payer types

**Payer Affiliations**:
- Fetches payers affiliated with user's hospital
- Uses `payer_affiliations` collection
- Document ID format: `{hospital_id}_payers`

**Documentation**: [06_RESOURCES_API.md](./06_RESOURCES_API.md)

---

## 🏥 New Claim Routes

**Module**: `backend/routes/new_claim_routes.py`  
**Prefix**: `/api/new-claim`  
**Access**: Hospital Users Only

### Endpoints

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/submit` | Submit new claim | `{ form_data, documents }` |
| POST | `/submit-draft` | Submit draft as claim | `{ draft_id }` |
| GET | `/validate` | Validate claim data | `form_data` (query params) |

**Key Features**:
- **Complete claim validation**: Required fields, data types, ranges
- **Automatic claim ID generation**: `CSHLSIP-YYYY-NNN` or `CLS-YYYY-NNN`
- **Document linking**: Links uploaded documents to claim
- **Status initialization**: Sets initial status to `qc_pending`
- **Transaction logging**: Creates initial transaction
- **Notification trigger**: Notifies processors of new claim
- **Dialysis claim support**: Special validation for dialysis bills

**Claim Types**:
- `In-Patient` - Standard inpatient claim
- `Dialysis` - Multiple bill entries for dialysis treatments

**Validation Rules**:
- Required fields check
- Date validations (admission < discharge)
- Amount validations (positive, reasonable ranges)
- Dialysis bills validation (for dialysis claims)
- Document type requirements

**Documentation**: [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md#3-submit-new-claim)

---

## ⚙️ Processor Routes

**Module**: `backend/routes/processor_routes.py`  
**Prefix**: `/api/processor-routes`  
**Access**: Claim Processors Only (L1-L4)

### Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/test-simple` | Simple health check | None |
| GET | `/test-locks` | Check lock information | None |
| GET | `/get-claims` | Get claims to process | `status`, `limit`, `start_date`, `end_date`, `payer`, `hospital` |
| GET | `/get-claim-for-processing/<claim_id>` | Get claim details | `claim_id` (path) |
| POST | `/process-claim/<claim_id>` | Process claim (approve/reject/query) | `{ decision, remarks, ...}` |
| POST | `/bulk-process` | Bulk process multiple claims | `{ claim_ids[], decision, remarks }` |
| GET | `/get-processor-stats` | Get processing statistics | None |
| POST | `/lock-claim/<claim_id>` | Lock claim for processing | `claim_id` (path) |
| POST | `/unlock-claim/<claim_id>` | Unlock claim | `claim_id` (path) |
| GET | `/check-claim-lock/<claim_id>` | Check lock status | `claim_id` (path) |
| POST | `/generate-cover-letter/<claim_id>` | Generate cover letter | `{ processor_name }` |

**Key Features**:
- **Claim locking system**: 2-hour exclusive locks to prevent concurrent processing
- **Level-based approval limits**: L1-L4 processors have different approval limits
- **Hospital affiliation filtering**: Only shows claims from affiliated hospitals
- **Bulk processing**: Process multiple claims at once
- **Cover letter generation**: Automated cover letter with metadata
- **Auto-unlock on expiry**: Locks expire after 2 hours
- **Status options**: Dynamic based on hospital configuration
- **Notification integration**: Notifies hospitals of decisions

**Processor Levels & Limits**:
| Level | Role | Approval Limit |
|-------|------|----------------|
| L1 | `claim_processor_l1` | ₹50,000 |
| L2 | `claim_processor_l2` | ₹200,000 |
| L3 | `claim_processor_l3` | ₹500,000 |
| L4 | `claim_processor_l4` | Unlimited |

**Processing Decisions**:
- `qc_clear` - Clear claim
- `qc_query` - Raise query
- `need_more_info` - Request more information
- `claim_approved` - Approve claim (if hospital option enabled)
- `claim_denial` - Deny claim (if hospital option enabled)
- `claim_contested` - Contested claim review
- `qc_answered` - Query answered, ready for review

**Lock System**:
- **Lock Duration**: 2 hours
- **Auto-cleanup**: Expired locks cleaned on each API call
- **Lock Information**: Stored in claim document with processor details
- **Concurrent Protection**: Only one processor can lock a claim at a time

**Documentation**: [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)  
**Lock System Details**: [LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md)

---

## 🔍 Review Request Routes

**Module**: `backend/routes/review_request_routes.py`  
**Prefix**: `/api/review-request`  
**Access**: Review Request Role Only

### Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/get-claims` | Get claims for review | `status`, `limit`, `start_date`, `end_date`, `payer`, `hospital` |
| GET | `/get-claim-full/<claim_id>` | Get full claim details | `claim_id` (path) |
| GET | `/get-claim-details/<claim_id>` | Get claim details (alternate) | `claim_id` (path) |
| POST | `/review-claim/<claim_id>` | Submit review decision | `{ review_action, review_remarks, ...}` |
| POST | `/escalate-claim/<claim_id>` | Escalate claim | `{ escalation_reason, escalated_to, ...}` |
| GET | `/get-review-stats` | Get review statistics | None |

**Key Features**:
- **Second-level review system**: Review claims after processor clearing
- **Financial amount reviews**: Complete financial review with amounts
- **Escalation workflow**: Escalate complex cases to senior reviewers
- **Review history tracking**: Complete review history maintained
- **Entity-based filtering**: Filter by payer and hospital
- **Transaction logging**: All reviews logged for audit trail

**Review Actions**:
| Action | New Status | Financial Fields Required | Description |
|--------|------------|---------------------------|-------------|
| `reviewed` | `reviewed` | Yes | Complete review with financial amounts |
| `approve` | `review_approved` | No | Approve the claim |
| `reject` | `review_rejected` | No | Reject the claim |
| `request_more_info` | `review_info_needed` | No | Request additional information |
| `mark_under_review` | `review_under_review` | No | Mark as under review |
| `complete` | `review_completed` | No | Complete the review |
| `not_found` | `review_not_found` | No | Claim not found by payer |

**Financial Fields** (for 'reviewed' action):
- `total_bill_amount`
- `claimed_amount`
- `approved_amount`
- `disallowed_amount` (auto-calculated or manual)
- `review_request_amount`
- `patient_paid_amount`
- `discount_amount`
- `reason_by_payer`

**Escalation**:
- Escalate to: Email or name of senior reviewer
- Escalation reason: Required field
- New status: `review_escalated`
- Escalation timestamp tracked

**Documentation**: [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md)

---

## 💼 RM (Relationship Manager) Routes

**Module**: `backend/routes/rm_routes.py`  
**Prefix**: `/api/rm`  
**Access**: RM/Reconciler Role Only

### Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/get-claims` | Get claims for RM (active/settled/all) | `tab`, `limit`, `start_date`, `end_date` |
| GET | `/get-claim-details/<claim_id>` | Get claim details | `claim_id` (path) |
| POST | `/update-claim/<claim_id>` | Update claim status & settlement | `{ claim_status, rm_data, ...}` |
| POST | `/reevaluate-claim/<claim_id>` | Re-evaluate claim | `{ remarks }` |
| GET | `/get-rm-stats` | Get RM statistics | None |

**Key Features**:
- **Post-dispatch processing**: Handle claims after dispatch to payer
- **Settlement tracking**: Record settlement amounts, TDS, payment details
- **Payment reconciliation**: Track payment modes, UTR numbers, bank details
- **Status management**: Multiple RM-specific statuses
- **Entity-based filtering**: Filter by assigned payers and hospitals
- **Transaction logging**: Complete audit trail

**Tab Filters**:
- `active` - Claims with status `dispatched` or `reviewed`
- `settled` - Claims with settlement statuses
- `all` - All claims assigned to RM

**RM Status Options**:
| Status | Description | Settlement Status |
|--------|-------------|-------------------|
| `received` | Received by payer | No |
| `query_raised` | Payer raised query | No |
| `repudiated` | Rejected by payer | No |
| `settled` | Fully settled | Yes |
| `approved` | Approved by payer | Yes |
| `partially_settled` | Partial settlement | Yes |
| `reconciliation` | In reconciliation | Yes |
| `in_progress` | RM working | No |
| `cancelled` | Cancelled | No |
| `closed` | Closed | No |
| `not_found` | Not found by payer | No |

**Settlement Data** (for settlement statuses):
```typescript
{
  settled_amount: number,
  settlement_date: string,
  tds_amount: number,
  net_payable: number,
  payment_mode: string, // NEFT, RTGS, Cheque, DD
  utr_number: string,
  bank_account: string,
  ifsc_code: string,
  settlement_remarks: string
}
```

**Re-evaluation**:
- Marks claim as `in_progress`
- Allows RM to revisit settled/closed claims
- Tracked with reevaluation timestamp and remarks

**Documentation**: [07_RM_ROUTES.md](./07_RM_ROUTES.md)

---

## 🔔 Notifications Routes

**Module**: `backend/routes/notifications.py`  
**Prefix**: `/api/notifications`  
**Access**: All Authenticated Roles

### Endpoints

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/get-notifications` | Get user notifications | `limit`, `unread_only` |
| POST | `/mark-read/<notification_id>` | Mark notification as read | `notification_id` (path) |
| POST | `/mark-all-read` | Mark all as read | None |
| DELETE | `/delete/<notification_id>` | Delete notification | `notification_id` (path) |

**Notification System**:
- **Real-time Firebase notifications**: Live updates via Firestore listeners
- **In-app notification storage**: Persistent storage in `claims_notifications` collection
- **External service integration**: Optional external notification service
- **Automatic cleanup**: 30-day TTL for notifications
- **Read tracking**: Track which users have read notifications
- **Recipient filtering**: Only show to intended recipients

**Notification Events**:
- `claim_pending` - New claim submitted
- `claim_qc_query` - QC query raised
- `claim_qc_answered` - Query answered
- `claim_need_more_info` - More information requested
- `claim_need_more_info_response` - Information provided
- `claim_contested` - Claim contested
- `claim_qc_clear` - QC cleared
- `claim_approved` - Claim approved
- `claim_denied` - Claim denied/rejected

**Notification Structure**:
```typescript
{
  claim_id: string,
  event_type: string,
  title: string,
  message: string,
  recipients: Array<{user_id, user_email, user_role}>,
  recipient_ids: string[],
  recipient_roles: string[],
  metadata: object,
  triggered_by: {actor_id, actor_role, actor_name, actor_email},
  delivery_success: boolean,
  read_by: string[],
  created_at: timestamp,
  updated_at: timestamp
}
```

**Documentation**: [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md)

---

## 🌐 Public Routes

**Module**: `backend/routes/public_routes.py`  
**Prefix**: `/api/public`  
**Access**: No Authentication Required

### Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{ status: 'ok', timestamp }` |
| GET | `/version` | API version | `{ version: '2.0', build }` |
| GET | `/status` | System status | `{ database: 'ok', storage: 'ok' }` |
| GET | `/resources/specialties` | Get specialties (public) | Array of specialties |
| GET | `/resources/treatments` | Get treatments (public) | Array of treatments |

**Use Cases**:
- Health monitoring
- Load balancer checks
- Version verification
- Public resource access (no auth)

---

## 🔒 Middleware & Security

### Authentication Middleware

**Decorators**:
```python
@require_claims_access      # All authenticated roles
@require_hospital_access    # Hospital users only
@require_processor_access   # Processors only (L1-L4)
@require_rm_access          # RMs/Reconcilers only
@require_review_request_access  # Review request only
```

**Token Verification**:
- Extracts Bearer token from Authorization header
- Verifies JWT token with Firebase Admin SDK
- Loads user profile from Firestore `users` collection
- Checks role against allowed/blocked lists
- Injects user data into request context

**Request Context** (injected by middleware):
```python
request.user_id              # Firebase UID
request.user_email           # User email
request.user_name            # Display name
request.user_role            # User role
request.hospital_id          # Primary hospital ID
request.hospital_name        # Primary hospital name
request.assigned_hospitals   # List of assigned hospitals
request.assigned_payers      # List of assigned payers
request.user_data            # Complete user document
```

### Role-Based Access Control (RBAC)

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

**Blocked Roles** (cannot access claims module):
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

**Hospital Filtering**:
```python
# Automatic filtering in middleware
user_hospital_id = user_data.get('entity_assignments', {}).get('hospitals', [])[0].get('id')

# Claims filtered by hospital_id match
claims_query = db.collection('direct_claims').where('hospital_id', '==', user_hospital_id)
```

**Payer Filtering** (for RMs/Reconcilers):
```python
# RMs assigned to specific payers
assigned_payers = user_data.get('entity_assignments', {}).get('payers', [])

# Claims filtered by payer_name match
for payer in assigned_payers:
    if payer['name'] in claim_payer_name:
        # Include claim
```

**Processor Affiliation Filtering**:
```python
# Processors see claims from affiliated hospitals
affiliated_hospitals = user_data.get('entity_assignments', {}).get('hospitals', [])

# Claims filtered by hospital affiliation
```

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
```python
class TransactionType:
    CREATED = "CREATED"
    UPDATED = "UPDATED"
    DELETED = "DELETED"
    PROCESSED = "PROCESSED"
    REVIEWED = "REVIEWED"
    ESCALATED = "ESCALATED"
    ANSWERED = "ANSWERED"
    CONTESTED = "CONTESTED"
    DISPATCHED = "DISPATCHED"
    LOCKED = "LOCKED"
    UNLOCKED = "UNLOCKED"
    REVIEW_STATUS_UPDATED = "REVIEW_STATUS_UPDATED"
```

**Storage**: Transactions stored in `direct_claims/{claim_id}/transactions` subcollection

---

### Lock Utils

**Module**: `backend/utils/lock_utils.py`

Manages claim locking for concurrent access:

```python
from utils import lock_utils

# Lock claim
lock_utils.lock_claim(
    db, 
    claim_id, 
    processor_id, 
    processor_email, 
    processor_name
)

# Check if locked
is_locked, lock_info = lock_utils.is_claim_locked(db, claim_id)

# Unlock claim
lock_utils.unlock_claim(db, claim_id, processor_id)

# Cleanup expired locks
lock_utils.cleanup_expired_locks(db)
```

**Lock Features**:
- **Lock Duration**: 2 hours
- **Auto-cleanup**: Expired locks cleaned on each API call
- **Lock Information**: Processor ID, email, name, timestamps
- **Concurrent Protection**: Only one processor can lock at a time

---

### Notification Client

**Module**: `backend/utils/notification_client.py`

Handles all claim notifications:

```python
from utils.notification_client import get_notification_client

notification_client = get_notification_client()

# Notify processors of new claim
notification_client.notify_pending(
    claim_id, claim_data, actor_id, actor_name, actor_email
)

# Notify hospital of query
notification_client.notify_qc_query(
    claim_id, claim_data, processor_id, processor_name, 
    processor_email, remarks, qc_query_details
)

# Notify processors of answer
notification_client.notify_qc_answered(
    claim_id, claim_data, hospital_user_id, hospital_user_name, 
    hospital_user_email, query_response, uploaded_files
)
```

**Notification Methods**:
- `notify_pending()` - New claim submitted
- `notify_qc_query()` - Query raised
- `notify_qc_answered()` - Query answered
- `notify_need_more_info()` - More info requested
- `notify_need_more_info_response()` - Info provided
- `notify_claim_contested()` - Claim contested
- `notify_qc_clear()` - QC cleared
- `notify_approved()` - Claim approved
- `notify_denial()` - Claim denied

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
- Size limit enforcement (5MB default)
- Quality preservation (85% default)
- Original preserved if compression fails

---

### Letter Templates

**Module**: `backend/utils/letter_templates.py`

Generate cover letters and reports:

```python
from utils.letter_templates import build_processor_letter_metadata

metadata = build_processor_letter_metadata(claim_data, processor_name)
# Returns: Formatted metadata for PDF generation
```

**Features**:
- Cover letter generation with claim details
- Processor information
- Patient details
- Financial summary
- Hospital and payer information

---

## 📊 Database Collections

### Firestore Collections

| Collection | Purpose | Access Control | Indexes Required |
|------------|---------|----------------|------------------|
| `users` | User profiles and roles | All authenticated | `email`, `role` |
| `direct_claims` | All claims | Role-based filtered | `claim_status`, `hospital_id`, `created_at` |
| `drafts` | Draft claims | Hospital users | `hospital_id`, `created_by` |
| `documents` | Document metadata | All authenticated | `claim_id`, `document_type` |
| `hospitals` | Hospital information | Role-based | `hospital_id` |
| `payers` | Payer information | Role-based | `payer_id` |
| `payer_affiliations` | Hospital-payer links | Role-based | Composite: `{hospital_id}_payers` |
| `claim_transactions` | Transaction history | All authenticated | `claim_id`, `performed_at` |
| `claims_notifications` | In-app notifications | Recipient-based | `recipient_ids`, `created_at` |

### Required Indexes

**For optimal performance**, create these Firestore composite indexes:

```javascript
// direct_claims collection
{
  "claim_status": "ASCENDING",
  "hospital_id": "ASCENDING",
  "created_at": "DESCENDING"
}

{
  "claim_status": "ASCENDING",
  "locked_by_processor": "ASCENDING",
  "created_at": "DESCENDING"
}

// claims_notifications collection
{
  "recipient_ids": "ARRAY",
  "created_at": "DESCENDING"
}

// documents collection
{
  "claim_id": "ASCENDING",
  "uploaded_at": "DESCENDING"
}
```

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
                  Claim/Draft/Document Update
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
    performed_by=request.user_id,
    performed_by_email=request.user_email,
    performed_by_name=request.user_name,
    performed_by_role=request.user_role,
    previous_status=previous_status,
    new_status=new_status,
    remarks=remarks,
    metadata={}
)
```

### 2. Check Claim Locks (for processors)
```python
# Before processing
is_locked, lock_info = lock_utils.is_claim_locked(db, claim_id)
if is_locked and lock_info['locked_by_processor'] != request.user_id:
    return jsonify({
        'success': False,
        'error': f'Claim locked by {lock_info["locked_by_processor_name"]}'
    }), 409
```

### 3. Send Notifications
```python
# After successful operation
notification_client.notify_qc_clear(
    claim_id, claim_data, 
    request.user_id, request.user_name, request.user_email, 
    remarks
)
```

### 4. Validate Entity Access
```python
# Middleware automatically checks, but for custom logic:
user_hospital_id = request.hospital_id
claim_hospital_id = claim_data.get('hospital_id', '')

if claim_hospital_id != user_hospital_id:
    return jsonify({
        'success': False,
        'error': 'Access denied - claim belongs to different hospital'
    }), 403
```

### 5. Handle Errors Gracefully
```python
try:
    # Operation
    pass
except Exception as e:
    print(f"ERROR: {str(e)}")
    return jsonify({
        'success': False,
        'error': str(e)
    }), 500
```

### 6. Use Proper HTTP Status Codes
```python
# Success responses
200 - OK (GET, successful operation)
201 - Created (POST, resource created)

# Client errors
400 - Bad Request (validation error)
401 - Unauthorized (invalid/expired token)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
409 - Conflict (claim locked, duplicate)

# Server errors
500 - Internal Server Error
503 - Service Unavailable
```

### 7. Log Important Events
```python
print(f"🔍 DEBUG: Processing claim {claim_id}")
print(f"✅ SUCCESS: Claim {claim_id} cleared")
print(f"❌ ERROR: Failed to process {claim_id}: {error}")
```

---

## 🧪 Testing

### Manual Testing

**Postman Collection**: Available in `/tests/postman/`

**Test Endpoints**:
- `GET /api/processor-routes/test-simple` - Simple health check
- `GET /api/processor-routes/test-locks` - Check lock information
- `GET /api/v1/claims/debug-claims` - Debug claims data
- `GET /api/public/health` - System health check

**Test Users** (create in Firebase):
```json
{
  "email": "hospital@test.com",
  "role": "hospital_user",
  "entity_assignments": {
    "hospitals": [{"id": "HOSP_001", "name": "Test Hospital"}]
  }
}

{
  "email": "processor.l1@medverve.com",
  "role": "claim_processor_l1",
  "entity_assignments": {
    "hospitals": [{"id": "HOSP_001", "name": "Test Hospital"}]
  }
}

{
  "email": "rm@medverve.com",
  "role": "rm",
  "entity_assignments": {
    "hospitals": [{"id": "HOSP_001", "name": "Test Hospital"}],
    "payers": [{"id": "PAY_001", "name": "Test Insurance"}]
  }
}
```

### Automated Testing

**Unit Tests**: Available in `/backend/tests/`

```bash
# Run all tests
python -m pytest

# Run specific module
python -m pytest tests/test_processor_routes.py

# Run with coverage
python -m pytest --cov=backend
```

---

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "total_claims": 10,
  "claims": [],
  "claim": {}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Common HTTP Status Codes
| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful with no response body |
| 400 | Bad Request | Invalid request data/validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., claim locked) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## 🔍 Monitoring & Logging

### Application Logs

**Location**: `backend/backend.log`

**Log Levels**:
- `INFO` - General information, API calls
- `WARNING` - Warning messages, deprecations
- `ERROR` - Error messages, exceptions
- `DEBUG` - Detailed debug information

**Key Log Entries**:
```
INFO: User logged in: hospital@test.com (hospital_user)
INFO: Claim CSHLSIP-2025-001 status changed: qc_pending → qc_clear
INFO: Notification sent: claim_qc_clear for CSHLSIP-2025-001
WARNING: Claim lock expired: CSHLSIP-2025-001
ERROR: Failed to process claim CSHLSIP-2025-001: Document not found
DEBUG: Firestore query returned 25 claims
```

### Debug Endpoints

- `GET /api/v1/claims/debug-claims` - Debug claim data structure
- `GET /api/processor-routes/test-locks` - Check lock status across all claims
- `GET /api/processor-routes/test-simple` - Basic health check
- `GET /api/public/health` - System health status

---

## 📞 Support & Troubleshooting

### Common Issues & Solutions

**Issue: 401 Unauthorized**
- ✅ Check token validity with `/api/auth/validate-token`
- ✅ Verify token in Authorization header: `Bearer <token>`
- ✅ Re-login if token expired (1 hour expiry)
- ✅ Check Firebase service account key is valid

**Issue: 403 Forbidden**
- ✅ Check user role in Firestore `users` collection
- ✅ Verify `entity_assignments` exist
- ✅ Ensure claim belongs to user's hospital
- ✅ Check role is in `ALLOWED_CLAIMS_ROLES`

**Issue: 409 Conflict (Claim Locked)**
- ✅ Check lock status: `GET /check-claim-lock/<claim_id>`
- ✅ Wait for lock to expire (2 hours)
- ✅ Contact processor who locked claim
- ✅ Use unlock endpoint if you own the lock

**Issue: 404 Not Found**
- ✅ Verify claim ID format (CSHLSIP-YYYY-NNN or CLS-YYYY-NNN)
- ✅ Check claim exists in `direct_claims` collection
- ✅ Verify claim hasn't been deleted
- ✅ Check hospital_id match

**Issue: Notifications Not Received**
- ✅ Check Firestore `claims_notifications` collection
- ✅ Verify `recipient_ids` includes user ID
- ✅ Check `entity_assignments` are correct
- ✅ Verify notification service URL (if external service configured)

**Issue: Documents Not Uploading**
- ✅ Check file size (max 5MB after compression)
- ✅ Verify file type in `ALLOWED_EXTENSIONS`
- ✅ Check Firebase Storage bucket permissions
- ✅ Verify document_type is valid

### Debug Steps

**1. Check User Profile**:
```python
db = get_firestore()
user_doc = db.collection('users').document(user_id).get()
user_data = user_doc.to_dict()
print(user_data)
```

**2. Check Claim Status**:
```python
claim_doc = db.collection('direct_claims').document(claim_id).get()
claim_data = claim_doc.to_dict()
print(f"Status: {claim_data.get('claim_status')}")
print(f"Hospital: {claim_data.get('hospital_id')}")
```

**3. Check Locks**:
```python
from utils import lock_utils
is_locked, lock_info = lock_utils.is_claim_locked(db, claim_id)
print(f"Locked: {is_locked}")
if is_locked:
    print(f"Locked by: {lock_info['locked_by_processor_name']}")
```

**4. Check Transactions**:
```python
transactions = db.collection('direct_claims').document(claim_id).collection('transactions').get()
for txn in transactions:
    print(txn.to_dict())
```

**5. Check Notifications**:
```python
notifications = db.collection('claims_notifications').where('claim_id', '==', claim_id).get()
for notif in notifications:
    print(notif.to_dict())
```

---

## 🔗 Related Documentation

### Core Documentation
- [01_AUTHENTICATION.md](./01_AUTHENTICATION.md) - Authentication & Login System
- [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md) - Hospital User APIs & Workflows
- [03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md) - Drafts Management System

### Role-Specific Documentation
- [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md) - Processor APIs & Workflows
- [07_RM_ROUTES.md](./07_RM_ROUTES.md) - RM Operations & Settlement
- [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md) - Review Request System

### Feature Documentation
- [05_DOCUMENTS.md](./05_DOCUMENTS.md) - Document Management & Upload
- [06_RESOURCES_API.md](./06_RESOURCES_API.md) - Resources & Dropdown APIs
- [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md) - Notifications System
- [LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md) - Claim Locking System

### Summary Documentation
- [INDEX.md](./INDEX.md) - Complete Documentation Index
- [CHANGELOG.md](./CHANGELOG.md) - Version History & Changes
- [FINAL_DOCUMENTATION_SUMMARY.md](./FINAL_DOCUMENTATION_SUMMARY.md) - Overview of All Docs

---

## 📈 Performance Considerations

### Query Optimization
- Use indexes for frequently queried fields
- Limit results with pagination (default: 50)
- Filter at database level, not in code
- Use composite indexes for complex queries

### Caching Strategy
- Cache static resources (specialties, treatments)
- Use Redis for frequently accessed data
- Implement ETags for HTTP caching
- Cache user entity_assignments

### Scalability
- Horizontal scaling with load balancers
- Database connection pooling
- Async processing for heavy operations
- Background jobs for notifications

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Backend Version**: Python 3.9 + Flask  
**Database**: Firebase Firestore  
**Storage**: Firebase Storage  
**Authentication**: Firebase Auth

---
