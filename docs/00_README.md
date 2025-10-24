# Hospital Claims Management System - Frontend Developer Documentation

## 📋 Overview

This is a comprehensive guide for frontend developers to integrate with the Hospital Claims Management System backend API.

**Backend URL**: `http://localhost:5002`  
**Frontend Ports**: 3000, 3001, 3004

---

## 📚 Documentation Structure

1. **[01_AUTHENTICATION.md](./01_AUTHENTICATION.md)** - Authentication, Login, User Roles, Token Management
2. **[02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)** - Hospital User Claims APIs (View, Submit, Answer Queries)
3. **[03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)** - Drafts Management APIs (Save, Update, Delete, Submit)
4. **[04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)** - Processor APIs (View, Process, Approve, Reject, Query)
5. **[05_DOCUMENTS.md](./05_DOCUMENTS.md)** - Documents APIs (Upload, Download, Delete, View)
6. **[06_RESOURCES_API.md](./06_RESOURCES_API.md)** - Master Data APIs (Specialties, Doctors, Dropdown Options)

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
python3 app.py
```

Backend will start on: `http://localhost:5002`

### 2. Test Authentication
```typescript
// Test login
const response = await fetch('http://localhost:5002/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@hospital.com',
    password: 'password123'
  })
});

const data = await response.json();
console.log('Token:', data.token);
localStorage.setItem('auth_token', data.token);
```

### 3. Test API Call
```typescript
// Get all claims
const token = localStorage.getItem('auth_token');

const response = await fetch(
  'http://localhost:5002/api/v1/claims/get-all-claims',
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log('Claims:', data.claims);
```

---

## 👥 User Roles

### Hospital User
- **Role**: `hospital_user`
- **Capabilities**:
  - Create new claims
  - Save drafts
  - View submitted claims
  - Answer processor queries
  - Upload documents
- **Restricted**: Cannot process claims

### Claim Processor
- **Role**: `claim_processor` or `claim_processor_l4`
- **Capabilities**:
  - View all claims from affiliated hospitals
  - Process claims (approve/reject)
  - Raise queries
  - View documents
- **Restricted**: Cannot create new claims

---

## 📊 System Architecture

### API Structure
```
Backend (Flask)
├── /api/auth                    # Authentication
├── /api/v1/claims               # Claims (All Roles)
├── /api/v1/drafts               # Drafts (Hospital Users)
├── /api/v1/documents            # Documents (All Roles)
├── /api/new-claim              # New Claim Submission (Hospital Users)
├── /api/processor-routes       # Processor Operations (Processors Only)
└── /api/resources              # Master Data (Public/Authenticated)
```

### Data Flow

#### Hospital User Flow:
```
1. Login → Get Token
2. Create Draft → Save Periodically
3. Upload Documents → Attach to Draft
4. Submit Claim → Convert Draft to Claim
5. View Claims → Monitor Status
6. Answer Query → Respond to Processor
```

#### Processor Flow:
```
1. Login → Get Token
2. View Claims Inbox → Unprocessed Tab
3. Select Claim → View Details
4. Review Documents → Check Completeness
5. Process Claim → Approve/Reject/Query
6. View Processed → Processed Tab
```

---

## 🔐 Authentication

### Token Usage
All protected endpoints require a Bearer token:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Token Storage
```typescript
// Store after login
localStorage.setItem('auth_token', token);
localStorage.setItem('user_data', JSON.stringify(user));

// Retrieve
const token = localStorage.getItem('auth_token');
const user = JSON.parse(localStorage.getItem('user_data') || '{}');

// Clear on logout
localStorage.removeItem('auth_token');
localStorage.removeItem('user_data');
```

---

## 📝 Claim Statuses

### Hospital User Perspective:

| Status | Description | Action Available |
|--------|-------------|------------------|
| `qc_pending` | Submitted, awaiting review | View only |
| `qc_query` | Processor raised query | Answer query |
| `qc_answered` | Query answered | View only |
| `qc_clear` | QC cleared | View only |
| `claim_approved` | Approved for payment | View only |
| `claim_denial` | Rejected | View only |
| `need_more_info` | More info needed | Provide info |

### Processor Perspective:

#### Unprocessed Tab:
- `qc_pending` - New claims to review
- `need_more_info` - Waiting for additional info
- `qc_answered` - Hospital answered query, needs final review

#### Processed Tab:
- `qc_query` - Query raised, waiting for hospital
- `qc_clear` - QC cleared
- `claim_approved` - Approved
- `claim_denial` - Rejected

---

## 🔄 Complete Workflows

### Workflow 1: Submit New Claim (Hospital User)

```typescript
// 1. Load form resources
const specialties = await fetchSpecialties();
const idCardTypes = await fetchIdCardTypes();
// ... load other dropdowns

// 2. User fills form
const formData = {
  patient_name: "John Doe",
  age: 45,
  // ... all required fields
};

// 3. Save as draft (optional)
const draft = await saveDraft(formData);

// 4. Upload documents
const file = document.querySelector('#file-input').files[0];
await uploadDocument(file, draft.draft_id, 'discharge_summary', 'Discharge Summary');

// 5. Submit claim
const claim = await submitClaim(formData);
console.log('Claim ID:', claim.claim_id);
```

### Workflow 2: Process Claim (Processor)

```typescript
// 1. Get claims to process
const claims = await fetchClaimsToProcess('unprocessed');

// 2. Select a claim
const claimId = claims.claims[0].claim_id;

// 3. Check if locked
const lockStatus = await checkClaimLock(claimId);
if (lockStatus.is_locked) {
  alert('Claim is being processed by another processor');
  return;
}

// 4. Get claim details
const claim = await fetchClaimForProcessing(claimId);

// 5. Review and process
await processClaim(claimId, 'qc_clear', 'All documents verified');
```

### Workflow 3: Answer Query (Hospital User)

```typescript
// 1. Get claims with queries
const claims = await fetchClaims();
const queryClai ms = claims.filter(c => c.claim_status === 'qc_query');

// 2. View query details
const claim = await fetchClaimDetails(queryClaims[0].claim_id);
console.log('Query:', claim.processing_remarks);

// 3. Upload additional documents if needed
await uploadDocument(file, claim.claim_id, 'query_response', 'Additional Document');

// 4. Submit answer
await answerQuery(claim.claim_id, 'I have uploaded the requested documents', [doc_id]);
```

---

## 🛠️ Utility Functions

### API Helper
```typescript
const apiCall = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (response.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};
```

### File Upload Helper
```typescript
const uploadFile = async (
  file: File,
  claimId: string,
  documentType: string
) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('claim_id', claimId);
  formData.append('document_type', documentType);
  formData.append('document_name', file.name);

  const response = await fetch(
    'http://localhost:5002/api/v1/documents/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    }
  );

  return await response.json();
};
```

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Access-Control-Allow-Origin header is missing`

**Solution**: Backend already configured for CORS. Ensure you're using the correct origin (`http://localhost:3000`, `http://localhost:3001`, or `http://localhost:3004`)

### Issue 2: 401 Unauthorized
**Error**: `Invalid token` or `Token expired`

**Solution**: 
1. Check if token exists in localStorage
2. Verify token is being sent in Authorization header
3. Re-login to get a new token

### Issue 3: 403 Forbidden
**Error**: `Insufficient permissions`

**Solution**: User role doesn't have access to the endpoint. Check role-based access requirements.

### Issue 4: Document Upload Fails
**Error**: `Invalid file type`

**Solution**: Ensure file type is supported (.pdf, .jpg, .png, .doc, .docx, .xls, .xlsx) and size is under 10MB

### Issue 5: Claim Not Updating
**Error**: `Claim is locked by another processor`

**Solution**: Wait for the other processor to finish or for the lock to expire (2 hours)

---

## 📱 Frontend Pages to Build

### Hospital User Pages:
1. **Login Page** - Authentication
2. **Dashboard** - Overview, stats
3. **Claims List** - View all submitted claims
4. **Claim Details** - View single claim
5. **New Claim Form** - Multi-step form for claim submission
6. **Drafts List** - View saved drafts
7. **Edit Draft** - Edit and continue draft
8. **Answer Query** - Respond to processor queries

### Processor Pages:
1. **Login Page** - Authentication
2. **Processor Inbox** - Unprocessed and Processed tabs
3. **Process Claim** - View and process claim details
4. **Bulk Actions** - Process multiple claims
5. **Stats Dashboard** - Processing statistics

---

## 📊 Data Models

### Claim Object
```typescript
interface Claim {
  claim_id: string;
  claim_status: string;
  created_at: string;
  submission_date: string;
  hospital_name: string;
  created_by_email: string;
  created_by_name: string;
  form_data: {
    // Patient details
    patient_name: string;
    age: number;
    gender: string;
    // Payer details
    payer_name: string;
    policy_number: string;
    // Provider details
    specialty: string;
    doctor: string;
    // Bill details
    claimed_amount: number;
    total_bill_amount: number;
  };
  processing_remarks?: string;
  processed_by?: string;
  processed_by_email?: string;
  processed_by_name?: string;
  processed_at?: string;
  documents: Document[];
}
```

### Document Object
```typescript
interface Document {
  document_id: string;
  document_type: string;
  document_name: string;
  original_filename: string;
  download_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  status: string;
}
```

---

## 🎯 Testing Checklist

### Hospital User Testing:
- [ ] Login with hospital user credentials
- [ ] View claims list
- [ ] Create new claim
- [ ] Save draft
- [ ] Upload documents
- [ ] Submit claim
- [ ] View claim details
- [ ] Answer processor query
- [ ] Download documents

### Processor Testing:
- [ ] Login with processor credentials
- [ ] View unprocessed claims
- [ ] View processed claims
- [ ] Select claim to process
- [ ] View claim details
- [ ] Download documents
- [ ] Process claim (approve)
- [ ] Process claim (reject)
- [ ] Raise query
- [ ] Bulk process claims
- [ ] View processing stats

---

## 📞 Support

For backend API issues or questions:
- Check the detailed documentation in individual MD files
- Review the error messages in API responses
- Contact the backend team for:
  - Test credentials
  - Database issues
  - New feature requests
  - Bug reports

---

## 🔄 Version History

- **v1.0** (October 2025) - Initial documentation
  - Authentication
  - Hospital User APIs
  - Processor APIs
  - Documents Management
  - Resources APIs

---

## 📝 Notes

1. All dates should be in ISO format (YYYY-MM-DD)
2. All monetary values are in INR (₹)
3. File sizes are in bytes
4. Timestamps include timezone information
5. All IDs are strings
6. Boolean flags use true/false
7. Arrays can be empty []
8. Null values are represented as empty strings "" or null

---

**Happy Coding! 🚀**

