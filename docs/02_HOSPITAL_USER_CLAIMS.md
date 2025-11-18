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
      "date_of_birth": "1979-04-15",
      "age": 45,
      "age_unit": "YRS",
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
      "treatment_line": "MEDICAL",
      "policy_type": "FAMILY",
      "claim_type": "INPATIENT",
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

**Description**: Submit a new claim with all required information. Supports two submission modes: regular "Submit" and "Proceed for QC".

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Submission Modes

The system supports two submission modes controlled by hospital configuration:

1. **Submit** (`submission_mode: 'submit'`) - Standard claim submission
2. **Proceed for QC** (`submission_mode: 'proceed_for_qc'`) - Submit and proceed directly to QC

### Hospital Configuration

Submission options are controlled by the hospital's configuration in Firestore (`hospitals/{hospital_id}`):

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `submit_option` | boolean \| null | `true` | Show "Submit Claim" button |
| `proceed_for_qc_option` | boolean \| null | `false` | Show "Proceed for QC" button |

**Configuration Endpoint**: `GET /api/resources/hospital-config?hospital_id={hospital_id}`

**Response**:
```json
{
  "success": true,
  "config": {
    "submit_option": true,
    "proceed_for_qc_option": false
  }
}
```

### Button Display Logic

The frontend determines which buttons to show based on hospital configuration:

```typescript
// Button visibility logic
const submitEnabled = submissionOptions.submitOption === true
const proceedEnabled = submissionOptions.proceedForQcOption === true

const showSubmitButton = submitEnabled
const showProceedButton = proceedEnabled || (!submitEnabled && submissionOptions.proceedForQcOption === null)
```

**Display Rules**:
- **Show "Submit Claim" button** when `submit_option === true`
- **Show "Proceed for QC" button** when:
  - `proceed_for_qc_option === true` (explicitly enabled), OR
  - `submit_option === false/null` AND `proceed_for_qc_option === null` (fallback default)
- **Both buttons can be shown** if both options are enabled
- **At least one button is always shown** (fallback to "Proceed for QC" if no config)

### When to Use Each Mode

**Use "Submit Claim" (`submit`) when:**
- Standard claim submission workflow
- Hospital wants standard processing flow
- Default submission mode

**Use "Proceed for QC" (`proceed_for_qc`) when:**
- Hospital wants to bypass intermediate steps
- Direct submission to QC processing
- Streamlined workflow for high-volume hospitals

**Note**: Both modes result in the same claim status (`qc_pending`) and are processed identically by processors. The `submission_mode` field is stored for tracking/analytics purposes.

**Request Body**:
```json
{
  "patient_name": "John Doe",
  "date_of_birth": "1979-04-15",
  "age": 45,
  "age_unit": "YRS",
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
  "treatment_line": "MEDICAL",
  "policy_type": "FAMILY",
  "claim_type": "INPATIENT",
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
  "security_deposit": 0,
  "submission_mode": "submit"
}
```

**Request Body Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `submission_mode` | string | No | Submission mode: `'submit'` or `'proceed_for_qc'` (default: `'submit'`) |
| ... (all other claim fields) | ... | ... | ... |

**Note**: The `submission_mode` field is optional. If not provided, defaults to `'submit'`. The frontend automatically includes this based on which button the user clicks.
```

> **Patient Age / DOB Requirement**  
> Provide either `date_of_birth` **or** both `age` and `age_unit`. If `date_of_birth` is supplied, the system auto-calculates age and stores it with units; if only age/unit is provided the backend derives a DOB.

**Required Fields**:
- patient_name, (date_of_birth **or** age + age_unit), gender, id_card_type, beneficiary_type, relationship
- payer_patient_id, authorization_number, total_authorized_amount, payer_type, payer_name
- patient_registration_number, specialty, doctor, treatment_line, policy_type, claim_type
- service_start_date, service_end_date, inpatient_number, admission_type
- hospitalization_type, ward_type, final_diagnosis, treatment_done
- bill_number, bill_date, total_bill_amount, claimed_amount

**Example Request - Standard Submit**:
```typescript
const submitClaim = async (claimData: any, mode: 'submit' | 'proceed_for_qc' = 'submit') => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/new-claim/submit-claim',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...claimData,
        submission_mode: mode
      })
    }
  );

  const data = await response.json();
  return data;
};

// Usage - Standard submit
await submitClaim(claimFormData, 'submit');

// Usage - Proceed for QC
await submitClaim(claimFormData, 'proceed_for_qc');
```

**Example Request - Frontend Implementation**:
```typescript
// Fetch hospital configuration
const fetchHospitalConfig = async (hospitalId: string) => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(
    `${API_BASE_URL}/resources/hospital-config?hospital_id=${hospitalId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await response.json();
  return data.config; // { submit_option: true, proceed_for_qc_option: false }
};

// Determine which buttons to show
const submissionOptions = await fetchHospitalConfig(hospitalId);
const showSubmitButton = submissionOptions.submit_option === true;
const showProceedButton = 
  submissionOptions.proceed_for_qc_option === true || 
  (!submissionOptions.submit_option && submissionOptions.proceed_for_qc_option === null);

// Handle submission
const handleSubmit = async (mode: 'submit' | 'proceed_for_qc') => {
  const claimData = {
    ...formValues,
    submission_mode: mode
  };
  
  const result = await submitClaim(claimData, mode);
  
  if (mode === 'proceed_for_qc') {
    toast.success('Claim forwarded for QC successfully');
  } else {
    toast.success('Claim submitted successfully');
  }
  
  return result;
};
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claim_id": "CSHLSIP-20251023-5",
  "claim_status": "qc_pending"
}
```

**Note**: Both submission modes result in the same response. The claim is always created with status `qc_pending` and stored with the `submission_mode` field for tracking:

```json
{
  "claim_id": "CSHLSIP-20251023-5",
  "claim_status": "qc_pending",
  "submission_mode": "submit",  // or "proceed_for_qc"
  "form_data": { ... },
  "created_at": "2025-10-23T13:06:06.961000+00:00",
  ...
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

### Example 1: Standard Submit Flow

```typescript
// 1. Fetch hospital configuration
const hospitalConfig = await fetchHospitalConfig(hospitalId);
console.log('Submission options:', hospitalConfig);
// Output: { submit_option: true, proceed_for_qc_option: false }

// 2. Collect form data
const claimFormData = {
  patient_name: "John Doe",
  age: 45,
  gender: "Male",
  // ... all other required fields
};

// 3. Submit the claim (standard mode)
const submitResult = await submitClaim(claimFormData, 'submit');
console.log('Claim ID:', submitResult.claim_id);
console.log('Status:', submitResult.claim_status); // "qc_pending"

// 4. Upload documents
const file1 = document.querySelector('#file-input').files[0];
const uploadResult = await uploadDocument(
  file1,
  submitResult.claim_id,
  'discharge_summary',
  'Discharge Summary'
);

console.log('Document uploaded:', uploadResult.document_id);

// 5. Fetch the claim to verify
const claim = await fetchClaimDetails(submitResult.claim_id);
console.log('Claim submission_mode:', claim.claim.submission_mode); // "submit"
```

### Example 2: Proceed for QC Flow

```typescript
// 1. Fetch hospital configuration
const hospitalConfig = await fetchHospitalConfig(hospitalId);
// If proceed_for_qc_option is enabled

// 2. Collect form data
const claimFormData = {
  patient_name: "John Doe",
  age: 45,
  gender: "Male",
  // ... all other required fields
};

// 3. Submit with "Proceed for QC" mode
const submitResult = await submitClaim(claimFormData, 'proceed_for_qc');
console.log('Claim ID:', submitResult.claim_id);
console.log('Message: Claim forwarded for QC');

// 4. Verify submission mode
const claim = await fetchClaimDetails(submitResult.claim_id);
console.log('Submission mode:', claim.claim.submission_mode); // "proceed_for_qc"
console.log('Status:', claim.claim.claim_status); // "qc_pending" (same as regular submit)
```

### Example 3: Frontend Button Implementation

```typescript
// React component example
import { useState, useEffect } from 'react';

function ClaimSubmissionButtons() {
  const [submissionOptions, setSubmissionOptions] = useState({
    submitOption: null,
    proceedForQcOption: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch hospital configuration on mount
    const loadConfig = async () => {
      const config = await fetchHospitalConfig(hospitalId);
      setSubmissionOptions({
        submitOption: config.submit_option,
        proceedForQcOption: config.proceed_for_qc_option
      });
    };
    loadConfig();
  }, []);

  const handleSubmit = async (mode: 'submit' | 'proceed_for_qc') => {
    setIsSubmitting(true);
    try {
      const result = await submitClaim(formData, mode);
      toast.success(
        mode === 'proceed_for_qc' 
          ? 'Claim forwarded for QC successfully'
          : 'Claim submitted successfully'
      );
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine button visibility
  const showSubmitButton = submissionOptions.submitOption === true;
  const showProceedButton = 
    submissionOptions.proceedForQcOption === true || 
    (!submissionOptions.submitOption && submissionOptions.proceedForQcOption === null);

  return (
    <div className="flex gap-2">
      {showSubmitButton && (
        <Button
          onClick={() => handleSubmit('submit')}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Claim'}
        </Button>
      )}
      {showProceedButton && (
        <Button
          onClick={() => handleSubmit('proceed_for_qc')}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Proceeding...' : 'Proceed for QC'}
        </Button>
      )}
    </div>
  );
}
```

### Example 4: Configuring Hospital Submission Options

To configure submission options for a hospital, update the Firestore document:

```javascript
// Firestore: hospitals/{hospital_id}
{
  "name": "City Hospital",
  "hospital_id": "HOSP_001",
  // ... other hospital fields
  
  // Submission configuration
  "submit_option": true,           // Show "Submit Claim" button
  "proceed_for_qc_option": false   // Hide "Proceed for QC" button
}
```

**Configuration Scenarios**:

| submit_option | proceed_for_qc_option | Buttons Shown |
|---------------|------------------------|---------------|
| `true` | `false` | "Submit Claim" only |
| `true` | `true` | Both buttons |
| `false` | `true` | "Proceed for QC" only |
| `false` | `null` | "Proceed for QC" (fallback) |
| `null` | `null` | "Proceed for QC" (fallback) |
| `true` | `null` | "Submit Claim" only |

**Default Behavior** (if config not found):
- `submit_option`: `true` (default)
- `proceed_for_qc_option`: `false` (default)
- Shows "Submit Claim" button only

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

Hospitals can configure the following settings in Firestore (`hospitals/{hospital_id}`):

### Submission Options

Control which submission buttons are shown to hospital users:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `submit_option` | boolean \| null | `true` | Show "Submit Claim" button |
| `proceed_for_qc_option` | boolean \| null | `false` | Show "Proceed for QC" button |

**Configuration Endpoint**: `GET /api/resources/hospital-config?hospital_id={hospital_id}`

**Example Configuration**:
```javascript
// Firestore: hospitals/{hospital_id}
{
  "name": "City Hospital",
  "hospital_id": "HOSP_001",
  
  // Submission configuration
  "submit_option": true,           // Show "Submit Claim" button
  "proceed_for_qc_option": false   // Hide "Proceed for QC" button
}
```

**Button Display Logic**:
- If `submit_option === true`: Show "Submit Claim" button
- If `proceed_for_qc_option === true`: Show "Proceed for QC" button
- If both are `true`: Show both buttons
- If `submit_option === false/null` and `proceed_for_qc_option === null`: Show "Proceed for QC" as fallback

### Processor Status Options

Control optional processor statuses by toggling these booleans:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `need_more_info_option` | boolean | `false` | Enable "Need More Info" status for processors |
| `claim_approved_option` | boolean | `false` | Enable "Claim Approved" status for processors |
| `claim_denial_option` | boolean | `false` | Enable "Claim Denial" status for processors |

**Behavior**:
- When `true`, processors see that status option in the dropdown
- When `false` or not set, the status is hidden and blocked on the backend
- Processors can always use: `qc_clear`, `qc_query` (regardless of configuration)

### Other Hospital Settings

- **Assign claims to processors**: Configure processor-hospital affiliations
- **Set processor approval limits**: Configure per-role approval limits (L1-L4)
- **Hospital metadata**: Name, address, contact information, etc.

**Note**: All configuration changes take effect immediately. No server restart required.

