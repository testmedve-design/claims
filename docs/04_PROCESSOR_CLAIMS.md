# Claim Processor - Claims Processing API Documentation

## Overview
Claim processors can view, process, approve, reject, and raise queries on claims submitted by hospitals.

**Base URL**: `http://localhost:5002`
**Required Role**: `claim_processor` or `claim_processor_l4`

---

## Table of Contents
1. [Get Claims to Process](#1-get-claims-to-process)
2. [Get Claim Details](#2-get-claim-details)
3. [Process Claim](#3-process-claim)
4. [Bulk Process Claims](#4-bulk-process-claims)
5. [Check Claim Lock](#5-check-claim-lock)
6. [Get Processing Stats](#6-get-processing-stats)

---

## 1. Get Claims to Process

**Endpoint**: `GET /api/processor-routes/get-claims-to-process`

**Description**: Get all claims available for processing, filtered by tab.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tab | string | No | Filter by tab: 'unprocessed' or 'processed' (default: 'unprocessed') |
| status | string | No | Filter by specific status |
| start_date | string | No | Filter from date (YYYY-MM-DD) |
| end_date | string | No | Filter to date (YYYY-MM-DD) |
| limit | number | No | Number of claims to return (default: 50) |

**Tab Filtering**:
- **unprocessed**: Shows claims with status `qc_pending`, `need_more_info`, `qc_answered`
- **processed**: Shows claims with status `qc_query`, `qc_clear`, `claim_approved`, `claim_denial`

**Example Request**:
```typescript
const fetchClaimsToProcess = async (tab: 'unprocessed' | 'processed' = 'unprocessed') => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/processor-routes/get-claims-to-process?tab=${tab}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "claims": [
    {
      "claim_id": "CSHLSIP-20251023-2",
      "claim_status": "qc_pending",
      "patient_name": "John Doe",
      "payer_name": "ABC Insurance",
      "specialty": "Cardiology",
      "claimed_amount": 50000,
      "hospital_name": "City Hospital",
      "created_at": "2025-10-23T13:06:06.961000+00:00",
      "submission_date": "2025-10-23T13:06:06.961000+00:00",
      "created_by_email": "user@hospital.com"
    }
  ],
  "total_claims": 1
}
```

---

## 2. Get Claim Details

**Endpoint**: `GET /api/processor-routes/get-claim-details/<claim_id>`

**Description**: Get detailed information for a specific claim for processing.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchClaimForProcessing = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/processor-routes/get-claim-details/${claimId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "claim": {
    "claim_id": "CSHLSIP-20251023-2",
    "claim_status": "qc_pending",
    "created_at": "2025-10-23T13:06:06.961000+00:00",
    "submission_date": "2025-10-23T13:06:06.961000+00:00",
    "hospital_name": "City Hospital",
    "created_by": "user_id",
    "created_by_email": "user@hospital.com",
    "created_by_name": "Jane Smith",
    "submitted_by": "user_id",
    "submitted_by_email": "user@hospital.com",
    "submitted_by_name": "Jane Smith",
    "processing_remarks": "",
    "processed_by": "",
    "processed_by_email": "",
    "processed_by_name": "",
    "processed_at": "",
    "patient_details": {
      "patient_name": "John Doe",
      "age": 45,
      "gender": "Male",
      "id_card_type": "Aadhar",
      "id_card_number": "1234-5678-9012",
      "patient_contact_number": "+91-9876543210",
      "patient_email_id": "john@example.com",
      "beneficiary_type": "Self",
      "relationship": "Self"
    },
    "payer_details": {
      "payer_name": "ABC Insurance",
      "payer_type": "TPA",
      "insurer_name": "XYZ Insurer",
      "policy_number": "POL123456",
      "authorization_number": "AUTH789",
      "total_authorized_amount": 60000,
      "payer_patient_id": "PAT123",
      "sponsorer_corporate_name": "",
      "sponsorer_employee_id": "",
      "sponsorer_employee_name": ""
    },
    "provider_details": {
      "patient_registration_number": "REG001",
      "specialty": "Cardiology",
      "doctor": "Dr. Smith",
      "treatment_line": "Medical Management",
      "claim_type": "Inpatient",
      "hospitalization_type": "Emergency",
      "inpatient_number": "IP001",
      "admission_type": "Emergency",
      "ward_type": "General Ward",
      "final_diagnosis": "Heart Disease",
      "treatment_done": "Angioplasty",
      "icd_10_code": "I25.1",
      "pcs_code": "02703ZZ"
    },
    "bill_details": {
      "bill_number": "BILL001",
      "bill_date": "2025-10-23",
      "total_bill_amount": 60000,
      "claimed_amount": 50000,
      "amount_paid_by_patient": 10000,
      "amount_charged_to_payer": 50000,
      "mou_discount_amount": 0,
      "patient_discount_amount": 0,
      "security_deposit": 0,
      "total_authorized_amount": 60000
    },
    "documents": [
      {
        "document_id": "doc_12345",
        "document_type": "discharge_summary",
        "document_name": "Discharge Summary",
        "original_filename": "discharge.pdf",
        "download_url": "https://storage.googleapis.com/...",
        "file_size": 524288,
        "file_type": "application/pdf",
        "uploaded_at": "2025-10-23T13:10:00.000000+00:00",
        "status": "uploaded"
      }
    ],
    "query_response": "",
    "query_answered_by": "",
    "query_answered_by_email": "",
    "query_answered_by_name": "",
    "query_answered_at": ""
  }
}
```

---

## 3. Process Claim

**Endpoint**: `POST /api/processor-routes/process-claim/<claim_id>`

**Description**: Process a claim by setting its status and adding remarks.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "qc_query",
  "remarks": "Please provide additional discharge summary documents."
}
```

**Valid Status Values**:
- `qc_clear` - QC Clear (claim passed quality check)
- `qc_query` - QC Query (processor has questions/needs more info)
- `claim_approved` - Claim Approved (approved for payment)
- `claim_denial` - Claim Denial (rejected)
- `need_more_info` - Need More Info (additional information required)

**Example Request**:
```typescript
const processClaim = async (
  claimId: string,
  status: string,
  remarks: string
) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/processor-routes/process-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, remarks })
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Claim status updated to qc_query successfully",
  "claim_id": "CSHLSIP-20251023-2",
  "new_status": "qc_query"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid status. Must be one of: qc_clear, qc_query, claim_approved, claim_denial, need_more_info"
}
```

**Error Response** (409 Conflict):
```json
{
  "success": false,
  "error": "Claim is currently being processed by processor@medverve.com. Please try again later.",
  "locked_by": "processor@medverve.com",
  "locked_at": "2025-10-24T10:30:00.000000+00:00"
}
```

---

## 4. Bulk Process Claims

**Endpoint**: `POST /api/processor-routes/bulk-process-claims`

**Description**: Process multiple claims at once with the same status and remarks.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "claim_ids": ["CSHLSIP-20251023-2", "CSHLSIP-20251023-3", "CSHLSIP-20251023-4"],
  "status": "qc_clear",
  "remarks": "All claims cleared after review."
}
```

**Example Request**:
```typescript
const bulkProcessClaims = async (
  claimIds: string[],
  status: string,
  remarks: string
) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/processor-routes/bulk-process-claims',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ claim_ids: claimIds, status, remarks })
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully processed 3 claims",
  "processed_count": 3,
  "errors": []
}
```

**Partial Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Successfully processed 2 claims",
  "processed_count": 2,
  "errors": [
    "Claim CSHLSIP-20251023-4 not found"
  ]
}
```

---

## 5. Check Claim Lock

**Endpoint**: `GET /api/processor-routes/check-claim-lock/<claim_id>`

**Description**: Check if a claim is currently being processed by another processor.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const checkClaimLock = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/processor-routes/check-claim-lock/${claimId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response - Unlocked** (200 OK):
```json
{
  "success": true,
  "is_locked": false,
  "locked_by": null,
  "locked_by_name": null,
  "locked_at": null,
  "lock_expires_at": null
}
```

**Success Response - Locked** (200 OK):
```json
{
  "success": true,
  "is_locked": true,
  "locked_by": "processor@medverve.com",
  "locked_by_name": "Processor Name",
  "locked_at": "2025-10-24T10:30:00.000000+00:00",
  "lock_expires_at": "2025-10-24T12:30:00.000000+00:00"
}
```

---

## 6. Get Processing Stats

**Endpoint**: `GET /api/processor-routes/get-processing-stats`

**Description**: Get statistics about claims processing.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchProcessingStats = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/processor-routes/get-processing-stats',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "stats": {
    "total_claims": 50,
    "qc_pending": 15,
    "qc_query": 10,
    "qc_clear": 20,
    "claim_approved": 3,
    "claim_denial": 2,
    "processed_today": 5,
    "avg_processing_time_minutes": 45
  }
}
```

---

## Claim Locking Mechanism

### How It Works
1. When a processor opens a claim for processing, the claim is automatically **locked**
2. The lock includes the processor's ID, email, and timestamp
3. The lock expires after **2 hours** if not processed
4. Other processors cannot process a locked claim
5. Once the claim is processed, the lock is automatically released

### Frontend Implementation
```typescript
const openClaimForProcessing = async (claimId: string) => {
  try {
    // Check if claim is locked
    const lockStatus = await checkClaimLock(claimId);
    
    if (lockStatus.is_locked) {
      alert(`This claim is currently being processed by ${lockStatus.locked_by_name}. Please try again later.`);
      return;
    }
    
    // Fetch claim details (this also locks the claim)
    const claim = await fetchClaimForProcessing(claimId);
    
    // Open processing modal/page
    openProcessingModal(claim);
  } catch (error) {
    console.error('Error opening claim:', error);
  }
};
```

---

## Processing (Processor Portal)

Processors can take the following actions on an individual claim:

- View full claim details, financials, and supporting documents
- Update the claim status when processing is complete (available statuses depend on the hospital's configuration; see below)

### Processing Actions

| Status | Description |
|--------|-------------|
| `qc_clear` | Claim is approved (if hospital allows this option) |
| `qc_query` | Processor needs additional information from the hospital |
| `claim_approved` | Claim is approved (if hospital allows this option) |
| `claim_denial` | Claim is denied (if hospital allows this option) |
| `need_more_info` | Processor requests extra documents/info (if hospital allows this option) |

> **Hospital-controlled status toggles**
>
> Each hospital can choose whether processors are allowed to use the optional statuses `need_more_info`, `claim_approved`, and `claim_denial`. These are stored on the hospital document as boolean fields:
>
> - `need_more_info_option`
> - `claim_approved_option`
> - `claim_denial_option`
>
> When a flag is set to `true`, the corresponding status appears in the processor UI and can be submitted. If `false` or missing, the status is hidden and any API request that tries to use it is rejected. Hospitals can update these toggles in Firestore (collection: `hospitals`, document: `<hospital_id>`).

### QC Query workflow requirements

When a processor raises a `qc_query` status, the following details are now mandatory:

- **Issue Category:** select one or more predefined categories (e.g. Bill Enhancement, Supporting Reports, etc.)
- **Repeat Issue:** indicate whether this is a repeat issue (`Yes` / `No`)
- **Action Required by Onsite Team:** free-text description of what the onsite team needs to do
- **Remarks (optional):** additional context for the query

These inputs are captured on the `Process Claim` page and validated server-side. The information is saved on the claim (`qc_query_details`) and recorded in the transaction metadata for auditing. Bulk processing to `qc_query` is disabled because it requires this extra detail per claim.

### Bulk Processing

Processors can update multiple claims at once:

- Status (`qc_clear`, `qc_query`, `claim_approved`, `claim_denial`, `need_more_info`)
- Remarks (optional)
- Backend locks each claim while processing to avoid races
- Any errors or failures are returned in the `errors` array

> **Note:** bulk processing for `qc_query` is not supported because the workflow requires the per-claim fields described above.

---

## Status Workflow

```
qc_pending (New Claim)
    ↓
[Processor Reviews]
    ↓
    ├─→ qc_clear → claim_approved (Approved)
    ├─→ qc_query → (Hospital Answers) → qc_answered → [Review Again]
    ├─→ claim_denial (Rejected)
    └─→ need_more_info → (Hospital Provides) → [Review Again]
```

---

## Best Practices

1. **Check Lock Status** - Always check if a claim is locked before processing
2. **Handle Conflicts** - Show appropriate message when claim is locked by another processor
3. **Auto-Refresh** - Periodically refresh the claims list to show new claims
4. **Show Processing Stats** - Display statistics dashboard for processors
5. **Bulk Operations** - Use bulk processing for similar claims to save time
6. **Detailed Remarks** - Always provide clear and detailed remarks for queries/rejections
7. **Document Review** - Ensure all required documents are reviewed before processing
8. **Status Filtering** - Use tab filtering to organize processed and unprocessed claims

