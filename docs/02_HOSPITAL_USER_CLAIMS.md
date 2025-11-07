# Hospital User - Claims Management API Documentation

## Overview
Hospital users can create claims, manage drafts, view submitted claims, and respond to processor queries.

**Base URL**: `http://localhost:5002`
**Required Role**: `hospital_user`

---

## Table of Contents
1. [Get All Claims](#1-get-all-claims)
2. [Get Single Claim](#2-get-single-claim)
3. [Submit New Claim](#3-submit-new-claim)
4. [Answer Query](#4-answer-query)
5. [Upload Documents](#5-upload-documents)

---

## 1. Get All Claims

**Endpoint**: `GET /api/v1/claims/get-all-claims`

**Description**: Get all claims for the hospital user's hospital.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter by status (default: 'all') |
| limit | number | No | Number of claims to return (default: 50) |
| start_date | string | No | Filter from date (YYYY-MM-DD) |
| end_date | string | No | Filter to date (YYYY-MM-DD) |

**Example Request**:
```typescript
const fetchClaims = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/v1/claims/get-all-claims?status=all&limit=50',
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
      "age": 45,
      "gender": "Male",
      "payer_name": "ABC Insurance",
      "claimed_amount": 50000,
      "total_bill_amount": 60000,
      "hospital_name": "City Hospital",
      "submission_date": "2025-10-23T13:06:06.961000+00:00",
      "created_at": "2025-10-23T13:06:06.961000+00:00",
      "created_by_email": "user@hospital.com",
      "created_by_name": "Jane Smith",
      "form_data": {
        "patient_name": "John Doe",
        "age": 45,
        "gender": "Male",
        "id_card_type": "Aadhar",
        "id_card_number": "1234-5678-9012",
        "beneficiary_type": "Self",
        "relationship": "Self",
        "payer_name": "ABC Insurance",
        "policy_number": "POL123456",
        "claimed_amount": 50000
      }
    }
  ],
  "total_claims": 1
}
```

---

## 2. Get Single Claim

**Endpoint**: `GET /api/v1/claims/get-claim/<claim_id>`

**Description**: Get detailed information for a specific claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchClaimDetails = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/claims/get-claim/${claimId}`,
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
    "claim_status": "qc_query",
    "created_at": "2025-10-23T13:06:06.961000+00:00",
    "submission_date": "2025-10-23T13:06:06.961000+00:00",
    "hospital_name": "City Hospital",
    "created_by_email": "user@hospital.com",
    "created_by_name": "Jane Smith",
    "processing_remarks": "Please provide additional documents",
    "processed_by": "processor_id",
    "processed_by_email": "processor@medverve.com",
    "processed_by_name": "Processor Name",
    "processed_at": "2025-10-24T10:30:00.000000+00:00",
    "form_data": {
      "patient_name": "John Doe",
      "age": 45,
      "gender": "Male",
      "id_card_type": "Aadhar",
      "id_card_number": "1234-5678-9012",
      "patient_contact_number": "+91-9876543210",
      "patient_email_id": "john@example.com",
      "beneficiary_type": "Self",
      "relationship": "Self",
      "payer_name": "ABC Insurance",
      "payer_type": "TPA",
      "insurer_name": "XYZ Insurer",
      "policy_number": "POL123456",
      "authorization_number": "AUTH789",
      "total_authorized_amount": 60000,
      "patient_registration_number": "REG001",
      "specialty": "Cardiology",
      "doctor": "Dr. Smith",
      "treatment_line": "Medical Management",
      "claim_type": "Inpatient",
      "hospitalization_type": "Emergency",
      "admission_type": "Emergency",
      "ward_type": "General Ward",
      "final_diagnosis": "Heart Disease",
      "treatment_done": "Angioplasty",
      "icd_10_code": "I25.1",
      "pcs_code": "02703ZZ",
      "bill_number": "BILL001",
      "bill_date": "2025-10-23",
      "total_bill_amount": 60000,
      "claimed_amount": 50000,
      "amount_paid_by_patient": 10000,
      "amount_charged_to_payer": 50000
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
    ]
  }
}
```

---

## 3. Submit New Claim

**Endpoint**: `POST /api/new-claim/submit-claim`

**Description**: Submit a new claim with all required information.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "patient_name": "John Doe",
  "age": 45,
  "gender": "Male",
  "id_card_type": "Aadhar",
  "id_card_number": "1234-5678-9012",
  "patient_contact_number": "+91-9876543210",
  "patient_email_id": "john@example.com",
  "beneficiary_type": "Self",
  "relationship": "Self",
  "payer_patient_id": "PAT123",
  "authorization_number": "AUTH789",
  "total_authorized_amount": 60000,
  "payer_type": "TPA",
  "payer_name": "ABC Insurance",
  "insurer_name": "XYZ Insurer",
  "policy_number": "POL123456",
  "sponsorer_corporate_name": "",
  "sponsorer_employee_id": "",
  "sponsorer_employee_name": "",
  "patient_registration_number": "REG001",
  "specialty": "Cardiology",
  "doctor": "Dr. Smith",
  "treatment_line": "Medical Management",
  "claim_type": "Inpatient",
  "service_start_date": "2025-10-20",
  "service_end_date": "2025-10-23",
  "inpatient_number": "IP001",
  "admission_type": "Emergency",
  "hospitalization_type": "Emergency",
  "ward_type": "General Ward",
  "final_diagnosis": "Heart Disease",
  "treatment_done": "Angioplasty",
  "icd_10_code": "I25.1",
  "pcs_code": "02703ZZ",
  "bill_number": "BILL001",
  "bill_date": "2025-10-23",
  "total_bill_amount": 60000,
  "claimed_amount": 50000,
  "amount_paid_by_patient": 10000,
  "amount_charged_to_payer": 50000,
  "mou_discount_amount": 0,
  "patient_discount_amount": 0,
  "security_deposit": 0
}
```

**Required Fields**:
- patient_name, age, gender, id_card_type, beneficiary_type, relationship
- payer_patient_id, authorization_number, total_authorized_amount, payer_type, payer_name
- patient_registration_number, specialty, doctor, treatment_line, claim_type
- service_start_date, service_end_date, inpatient_number, admission_type
- hospitalization_type, ward_type, final_diagnosis, treatment_done
- bill_number, bill_date, total_bill_amount, claimed_amount

**Example Request**:
```typescript
const submitClaim = async (claimData: any) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/new-claim/submit-claim',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(claimData)
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claim_id": "CSHLSIP-20251023-5"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Missing required fields: patient_name, age"
}
```

---

## 4. Answer Query

**Endpoint**: `POST /api/v1/claims/answer-query/<claim_id>`

**Description**: Answer a processor's query on a claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "query_response": "I have uploaded the additional documents as requested.",
  "uploaded_files": ["doc_67890", "doc_67891"]
}
```

**Example Request**:
```typescript
const answerQuery = async (claimId: string, response: string, files: string[]) => {
  const token = localStorage.getItem('auth_token');
  
  const res = await fetch(
    `http://localhost:5002/api/v1/claims/answer-query/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query_response: response,
        uploaded_files: files
      })
    }
  );

  const data = await res.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Query response submitted successfully",
  "claim_id": "CSHLSIP-20251023-3",
  "new_status": "qc_answered"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "This claim is not in query status. Current status: qc_pending"
}
```

---

## 5. Upload Documents

**Endpoint**: `POST /api/v1/documents/upload`

**Description**: Upload a document and attach it to a claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | The document file to upload |
| claim_id | string | Yes | The claim ID to attach the document to |
| document_type | string | Yes | Type of document (e.g., "discharge_summary") |
| document_name | string | Yes | Display name for the document |

**Example Request**:
```typescript
const uploadDocument = async (
  file: File,
  claimId: string,
  documentType: string,
  documentName: string
) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('claim_id', claimId);
  formData.append('document_type', documentType);
  formData.append('document_name', documentName);

  const response = await fetch(
    'http://localhost:5002/api/v1/documents/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for multipart/form-data
      },
      body: formData
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document_id": "doc_12345",
  "download_url": "https://storage.googleapis.com/..."
}
```

**Supported File Types**:
- PDF (.pdf)
- Images (.jpg, .jpeg, .png)
- Documents (.doc, .docx)
- Spreadsheets (.xls, .xlsx)

**Max File Size**: 10MB per file

---

## Claim Statuses

| Status | Description | Hospital User Can |
|--------|-------------|-------------------|
| `qc_pending` | Submitted, awaiting processor review | View |
| `qc_query` | Processor raised a query | Answer query |
| `qc_answered` | Hospital answered processor query | View |
| `qc_clear` | QC cleared by processor | View |
| `claim_approved` | Claim approved for payment | View |
| `claim_denial` | Claim rejected | View |
| `need_more_info` | Additional information required | Provide info |

---

## Complete Example: Submit Claim Flow

```typescript
// 1. Collect form data
const claimFormData = {
  patient_name: "John Doe",
  age: 45,
  gender: "Male",
  // ... all other required fields
};

// 2. Submit the claim
const submitResult = await submitClaim(claimFormData);
console.log('Claim ID:', submitResult.claim_id);

// 3. Upload documents
const file1 = document.querySelector('#file-input').files[0];
const uploadResult = await uploadDocument(
  file1,
  submitResult.claim_id,
  'discharge_summary',
  'Discharge Summary'
);

console.log('Document uploaded:', uploadResult.document_id);

// 4. Fetch the claim to verify
const claim = await fetchClaimDetails(submitResult.claim_id);
console.log('Claim details:', claim);
```

---

## Error Handling

```typescript
const safeApiCall = async (apiFunction: () => Promise<any>) => {
  try {
    const result = await apiFunction();
    
    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }
    
    return result;
  } catch (error: any) {
    if (error.message.includes('401')) {
      // Token expired
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    } else {
      // Show error to user
      alert(error.message);
    }
    throw error;
  }
};
```

## Hospital Configuration

Hospitals can configure the following for processors:

- Assign claims to a processor
- Set processor approval limits (per role)
- Control optional processor statuses by toggling these booleans on the `hospitals/<hospital_id>` document:
  - `need_more_info_option`
  - `claim_approved_option`
  - `claim_denial_option`
- When `true`, the processor sees that status in the dropdown; otherwise it is hidden and blocked on the backend.

