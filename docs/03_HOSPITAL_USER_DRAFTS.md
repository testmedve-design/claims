# Hospital User - Drafts Management API Documentation

## Overview
Hospital users can save claims as drafts, edit them, and submit them later.

**Base URL**: `http://localhost:5002`
**Required Role**: `hospital_user`

---

## Table of Contents
1. [Save Draft](#1-save-draft)
2. [Get All Drafts](#2-get-all-drafts)
3. [Get Single Draft](#3-get-single-draft)
4. [Update Draft](#4-update-draft)
5. [Delete Draft](#5-delete-draft)
6. [Submit Draft as Claim](#6-submit-draft-as-claim)
7. [Upload Draft Documents](#7-upload-draft-documents)

---

## 1. Save Draft

**Endpoint**: `POST /api/v1/drafts/save-draft`

**Description**: Save a new draft claim.

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
  "payer_name": "ABC Insurance",
  "claimed_amount": 50000,
  "draft_name": "John Doe - Cardiology",
  "additional_field1": "value1",
  "additional_field2": "value2"
}
```

**Example Request**:
```typescript
const saveDraft = async (draftData: any) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/v1/drafts/save-draft',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftData)
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
  "message": "Draft saved successfully",
  "draft_id": "DRAFT_67890"
}
```

---

## 2. Get All Drafts

**Endpoint**: `GET /api/v1/drafts/get-drafts`

**Description**: Get all drafts for the current user's hospital.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchDrafts = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/v1/drafts/get-drafts',
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
  "drafts": [
    {
      "draft_id": "DRAFT_67890",
      "draft_name": "John Doe - Cardiology",
      "patient_name": "John Doe",
      "age": 45,
      "gender": "Male",
      "payer_name": "ABC Insurance",
      "claimed_amount": 50000,
      "created_at": "2025-10-23T10:00:00.000000+00:00",
      "updated_at": "2025-10-23T10:30:00.000000+00:00",
      "created_by": "user_id",
      "created_by_email": "user@hospital.com",
      "hospital_id": "hospital_123",
      "hospital_name": "City Hospital",
      "documents": [
        {
          "document_id": "doc_12345",
          "document_name": "Discharge Summary",
          "document_type": "discharge_summary"
        }
      ]
    }
  ],
  "total_drafts": 1
}
```

---

## 3. Get Single Draft

**Endpoint**: `GET /api/v1/drafts/get-draft/<draft_id>`

**Description**: Get a specific draft by ID.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const fetchDraft = async (draftId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/drafts/get-draft/${draftId}`,
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
  "draft": {
    "draft_id": "DRAFT_67890",
    "draft_name": "John Doe - Cardiology",
    "patient_name": "John Doe",
    "age": 45,
    "gender": "Male",
    "id_card_type": "Aadhar",
    "id_card_number": "1234-5678-9012",
    "payer_name": "ABC Insurance",
    "claimed_amount": 50000,
    "created_at": "2025-10-23T10:00:00.000000+00:00",
    "updated_at": "2025-10-23T10:30:00.000000+00:00",
    "created_by": "user_id",
    "created_by_email": "user@hospital.com",
    "hospital_id": "hospital_123",
    "hospital_name": "City Hospital",
    "documents": [
      {
        "document_id": "doc_12345",
        "document_type": "discharge_summary",
        "document_name": "Discharge Summary",
        "original_filename": "discharge.pdf",
        "download_url": "https://storage.googleapis.com/...",
        "file_size": 524288,
        "file_type": "application/pdf",
        "uploaded_at": "2025-10-23T10:15:00.000000+00:00",
        "status": "uploaded"
      }
    ]
  }
}
```

---

## 4. Update Draft

**Endpoint**: `PUT /api/v1/drafts/update-draft/<draft_id>`

**Description**: Update an existing draft.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "patient_name": "John Doe Updated",
  "age": 46,
  "payer_name": "XYZ Insurance",
  "claimed_amount": 55000
}
```

**Example Request**:
```typescript
const updateDraft = async (draftId: string, updatedData: any) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/drafts/update-draft/${draftId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedData)
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
  "message": "Draft updated successfully",
  "draft_id": "DRAFT_67890"
}
```

---

## 5. Delete Draft

**Endpoint**: `DELETE /api/v1/drafts/delete-draft/<draft_id>`

**Description**: Delete a draft permanently.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const deleteDraft = async (draftId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/drafts/delete-draft/${draftId}`,
    {
      method: 'DELETE',
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
  "message": "Draft deleted successfully"
}
```

---

## 6. Submit Draft as Claim

**Endpoint**: `POST /api/v1/drafts/submit-draft/<draft_id>`

**Description**: Convert a draft into a submitted claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const submitDraft = async (draftId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/drafts/submit-draft/${draftId}`,
    {
      method: 'POST',
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

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Draft submitted as claim successfully",
  "claim_id": "CSHLSIP-20251023-6"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Missing required fields: patient_email_id, authorization_number"
}
```

---

## 7. Upload Draft Documents

**Endpoint**: `POST /api/v1/drafts/upload-draft-document`

**Description**: Upload a document and attach it to a draft.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | The document file to upload |
| draft_id | string | Yes | The draft ID to attach the document to |
| document_type | string | Yes | Type of document |
| document_name | string | Yes | Display name for the document |

**Example Request**:
```typescript
const uploadDraftDocument = async (
  file: File,
  draftId: string,
  documentType: string,
  documentName: string
) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('draft_id', draftId);
  formData.append('document_type', documentType);
  formData.append('document_name', documentName);

  const response = await fetch(
    'http://localhost:5002/api/v1/drafts/upload-draft-document',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
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
  "document_id": "doc_12345"
}
```

---

## Complete Example: Draft Workflow

```typescript
// 1. Save a draft
const draftData = {
  patient_name: "John Doe",
  age: 45,
  gender: "Male",
  draft_name: "John Doe - Cardiology"
};

const saveResult = await saveDraft(draftData);
const draftId = saveResult.draft_id;
console.log('Draft ID:', draftId);

// 2. Upload documents to the draft
const file = document.querySelector('#file-input').files[0];
await uploadDraftDocument(
  file,
  draftId,
  'discharge_summary',
  'Discharge Summary'
);

// 3. Update the draft with more information
await updateDraft(draftId, {
  payer_name: "ABC Insurance",
  claimed_amount: 50000,
  authorization_number: "AUTH123"
});

// 4. Fetch the draft to verify
const draft = await fetchDraft(draftId);
console.log('Draft details:', draft);

// 5. When ready, submit the draft as a claim
const submitResult = await submitDraft(draftId);
console.log('Claim ID:', submitResult.claim_id);

// 6. The draft is now converted to a claim and removed from drafts
```

---

## Auto-Save Feature

Implement auto-save to prevent data loss:

```typescript
let autoSaveTimeout: NodeJS.Timeout;

const handleFormChange = (formData: any, draftId: string | null) => {
  // Clear existing timeout
  clearTimeout(autoSaveTimeout);
  
  // Set new timeout for 2 seconds
  autoSaveTimeout = setTimeout(async () => {
    try {
      if (draftId) {
        // Update existing draft
        await updateDraft(draftId, formData);
        console.log('Draft auto-saved');
      } else {
        // Save new draft
        const result = await saveDraft(formData);
        // Store the new draft ID for future updates
        setDraftId(result.draft_id);
        console.log('New draft created:', result.draft_id);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 2000);
};

// Usage in your form component
<input
  value={patientName}
  onChange={(e) => {
    setPatientName(e.target.value);
    handleFormChange({ ...formData, patient_name: e.target.value }, draftId);
  }}
/>
```

---

## Draft Validation

Before submitting a draft as a claim, validate all required fields:

```typescript
const validateDraftForSubmission = (draft: any): {valid: boolean, missingFields: string[]} => {
  const requiredFields = [
    'patient_name', 'age', 'gender', 'id_card_type', 'beneficiary_type',
    'authorization_number', 'payer_name', 'specialty', 'doctor',
    'treatment_line', 'claim_type', 'bill_number', 'bill_date',
    'total_bill_amount', 'claimed_amount'
  ];
  
  const missingFields = requiredFields.filter(field => !draft[field]);
  
  return {
    valid: missingFields.length === 0,
    missingFields
  };
};

// Usage
const submitDraftWithValidation = async (draftId: string) => {
  const draft = await fetchDraft(draftId);
  const validation = validateDraftForSubmission(draft.draft);
  
  if (!validation.valid) {
    alert(`Please fill in the following fields: ${validation.missingFields.join(', ')}`);
    return;
  }
  
  await submitDraft(draftId);
};
```

---

## Draft Visibility and Processor Interaction

- Drafts are visible only to hospital users from the same hospital
- Once submitted, the claim appears in the processor inbox
- Processors can see only the statuses that the hospital enables on its `hospitals/<hospital_id>` document (`need_more_info_option`, `claim_approved_option`, `claim_denial_option`).
- If processors raise a `qc_query`, they must supply the additional details described in the processor documentation.

---

## Best Practices

1. **Auto-save frequently** - Save drafts every 2-3 seconds after user stops typing
2. **Show save status** - Display "Saving...", "Saved", or "Error saving" indicators
3. **Validate before submit** - Check all required fields before converting to claim
4. **Handle offline mode** - Store drafts locally if backend is unavailable
5. **Clean up** - Delete old drafts after submission to keep the drafts list clean
6. **Document upload** - Allow document upload before submission for better user experience

