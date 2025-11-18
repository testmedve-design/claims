# Review Request Routes - Complete Documentation

## 📋 Overview

The Review Request module provides a second-level review system for claims that have been dispatched. Review Request users can review financial details, approve/reject claims, escalate complex cases, and provide detailed review decisions.

**Base URL**: `http://localhost:5002`  
**Required Role**: `review_request`  
**API Prefix**: `/api/review-request`

**Status**: ✅ **FULLY IMPLEMENTED**

---

## 🔐 Authentication

All Review Request endpoints require authentication with a valid Bearer token and `review_request` role.

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Access Control
- Only users with role `review_request` can access these endpoints
- Claims automatically filtered by review status
- No entity assignment restrictions (global access)

---

## 🎯 Review Workflow

```
Processor Clears → Dispatch → [Review Request Process]
                                        ↓
                        Reviewed/Approved/Rejected/Escalated
                                        ↓
                                    RM Process
```

### Claim Status Flow

**Review Eligible Statuses** (appear in review inbox):
- `dispatched` → Claim dispatched to payer, ready for review

**Review Actions** (what reviewers can do):
1. **reviewed** → Complete review with financial amounts
2. **approve** → Approve the claim  
3. **reject** → Reject the claim
4. **request_more_info** → Request additional information
5. **mark_under_review** → Mark as under review
6. **complete** → Mark review as complete
7. **not_found** → Claim not found by payer

**Review Status After Action**:
- `reviewed` → `reviewed`
- `approve` → `review_approved`
- `reject` → `review_rejected`
- `request_more_info` → `review_info_needed`
- `mark_under_review` → `review_under_review`
- `complete` → `review_completed`
- `not_found` → `review_not_found`

---

## 📡 API Endpoints

### 1. Get Review Claims

Get list of claims for review, with filtering options.

**Endpoint**: `GET /api/review-request/get-claims`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | Filter: `pending`, `under_review`, `completed`, `all` (default: `pending`) |
| limit | integer | No | Maximum claims to return (default: 50) |
| start_date | string | No | Start date filter (YYYY-MM-DD) |
| end_date | string | No | End date filter (YYYY-MM-DD) |
| payer | string | No | Filter by payer name (case-insensitive) |
| hospital | string | No | Filter by hospital ID or name substring |

**Request Example**:
```typescript
const fetchReviewClaims = async (status = 'pending') => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/review-request/get-claims?status=${status}&limit=50`,
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

**Response (200 OK)**:
```json
{
  "success": true,
  "total_claims": 25,
  "status_filter": "pending",
  "claims": [
    {
      "claim_id": "CSHLSIP-2025-001",
      "document_id": "abc123",
      "claim_status": "dispatched",
      "created_at": "2025-01-15T10:30:00Z",
      "submission_date": "2025-01-15T10:30:00Z",
      "hospital_name": "City Hospital",
      "hospital_id": "HOSP_001",
      "patient_name": "John Doe",
      "payer_name": "Health Insurance Ltd",
      "payer_type": "Corporate",
      "doctor_name": "Dr. Smith",
      "provider_name": "City Hospital",
      "authorization_number": "AUTH123456",
      "date_of_admission": "2025-01-10",
      "date_of_discharge": "2025-01-14",
      "billed_amount": 50000.0,
      "patient_paid_amount": 5000.0,
      "discount_amount": 0.0,
      "claimed_amount": 45000.0,
      "approved_amount": null,
      "disallowed_amount": null,
      "review_requested_amount": 45000.0,
      "review_data": {},
      "processor_decision": {},
      "review_history_count": 0,
      "last_reviewed_at": null,
      "reviewed_by": null,
      "reviewed_by_email": null,
      "claim_type": "In-Patient"
    }
  ]
}
```

---

### 2. Get Full Claim Details for Review

Get complete claim details including documents, payer information, and processor decision.

**Endpoint**: `GET /api/review-request/get-claim-full/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to fetch |

**Request Example**:
```typescript
const getReviewClaimFull = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/review-request/get-claim-full/${claimId}`,
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

**Response (200 OK)**:
```json
{
  "success": true,
  "claim": {
    "claim_id": "CSHLSIP-2025-001",
    "claim_status": "dispatched",
    "created_at": "2025-01-15T10:30:00Z",
    "submission_date": "2025-01-15T10:30:00Z",
    "hospital_name": "City Hospital",
    "created_by_email": "user@hospital.com",
    "created_by_name": "Hospital User",
    "submitted_by": "hospital_user_uid",
    "submitted_by_email": "user@hospital.com",
    "submitted_by_name": "Hospital User",
    
    "form_data": {
      "patient_name": "John Doe",
      "age": 45,
      "gender": "Male",
      "payer_name": "Health Insurance Ltd",
      "payer_type": "Corporate",
      "authorization_number": "AUTH123456",
      "admission_date": "2025-01-10",
      "discharge_date": "2025-01-14",
      "total_bill_amount": 50000,
      "claimed_amount": 45000,
      "patient_paid_amount": 5000,
      "discount_amount": 0
    },
    
    "processing_remarks": "All documents verified. Claim cleared.",
    "processed_by": "processor_uid",
    "processed_by_email": "processor@medverve.com",
    "processed_by_name": "Processor Name",
    "processed_at": "2025-01-16T14:00:00Z",
    
    "source_collection": "direct_claims",
    "document_count": 5,
    "documents": [
      {
        "document_id": "doc_001",
        "document_type": "discharge_summary",
        "document_name": "Discharge Summary",
        "original_filename": "discharge.pdf",
        "download_url": "https://storage.googleapis.com/...",
        "file_size": 1024000,
        "file_type": "application/pdf",
        "uploaded_at": "2025-01-15T10:35:00Z",
        "status": "active"
      }
    ],
    
    "payer_details": {
      "payer_id": "payer_123",
      "payer_name": "Health Insurance Ltd",
      "payer_type": "Corporate",
      "payer_code": "HLTH001",
      "to_address": "123 Insurance Plaza",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "contact_person": "Claims Manager",
      "contact_phone": "+91-22-12345678",
      "contact_email": "claims@healthinsurance.com"
    },
    
    "review_status": "REVIEW PENDING",
    "review_data": {},
    "review_history": [],
    "processor_decision": {
      "decision": "qc_clear",
      "remarks": "All documents verified successfully"
    }
  }
}
```

---

### 3. Review Claim (Submit Review Decision)

Submit a review decision for a claim with financial details.

**Endpoint**: `POST /api/review-request/review-claim/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to review |

**Request Body**:
```json
{
  "review_action": "reviewed",
  "review_remarks": "Claim reviewed and approved with minor deductions",
  
  "total_bill_amount": 50000.0,
  "claimed_amount": 45000.0,
  "approved_amount": 42000.0,
  "disallowed_amount": 3000.0,
  "review_request_amount": 45000.0,
  "patient_paid_amount": 5000.0,
  "discount_amount": 0.0,
  "reason_by_payer": "Non-covered items deducted"
}
```

**Review Actions**:
| Action | Description | Financial Fields Required |
|--------|-------------|---------------------------|
| `reviewed` | Complete review with amounts | Yes - all amounts |
| `approve` | Approve claim | No |
| `reject` | Reject claim | No |
| `request_more_info` | Request additional info | No |
| `mark_under_review` | Mark as under review | No |
| `complete` | Complete review | No |
| `not_found` | Claim not found | No |

**Request Example**:
```typescript
const reviewClaim = async (
  claimId: string,
  action: string,
  remarks: string,
  amounts?: {
    total_bill_amount?: number;
    claimed_amount?: number;
    approved_amount?: number;
    disallowed_amount?: number;
    review_request_amount?: number;
    patient_paid_amount?: number;
    discount_amount?: number;
    reason_by_payer?: string;
  }
) => {
  const token = localStorage.getItem('auth_token');
  
  const payload = {
    review_action: action,
    review_remarks: remarks,
    ...amounts
  };
  
  const response = await fetch(
    `http://localhost:5002/api/review-request/review-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  return data;
};

// Usage - Complete review with amounts
await reviewClaim('CSHLSIP-2025-001', 'reviewed', 'Approved with deductions', {
  total_bill_amount: 50000,
  claimed_amount: 45000,
  approved_amount: 42000,
  disallowed_amount: 3000,
  review_request_amount: 45000,
  patient_paid_amount: 5000,
  discount_amount: 0,
  reason_by_payer: 'Non-covered items deducted'
});

// Usage - Simple approve
await reviewClaim('CSHLSIP-2025-001', 'approve', 'Claim approved as submitted');
```

**Response (200 OK)**:
```json
{
  "success": true,
  "new_status": "reviewed",
  "review_data": {
    "reviewer_id": "reviewer_uid",
    "reviewer_email": "reviewer@medverve.com",
    "reviewer_name": "Reviewer Name",
    "review_decision": "REVIEWED",
    "review_remarks": "Claim reviewed and approved with minor deductions",
    "reviewed_at": "2025-01-18T10:00:00Z",
    "total_bill_amount": 50000.0,
    "claimed_amount": 45000.0,
    "approved_amount": 42000.0,
    "disallowed_amount": 3000.0,
    "review_request_amount": 45000.0,
    "patient_paid_amount": 5000.0,
    "discount_amount": 0.0,
    "reason_by_payer": "Non-covered items deducted"
  },
  "review_history": [
    {
      "reviewer_id": "reviewer_uid",
      "reviewer_email": "reviewer@medverve.com",
      "reviewer_name": "Reviewer Name",
      "review_decision": "REVIEWED",
      "review_remarks": "Claim reviewed and approved with minor deductions",
      "reviewed_at": "2025-01-18T10:00:00Z",
      "review_action": "REVIEWED",
      "total_bill_amount": 50000.0,
      "claimed_amount": 45000.0,
      "approved_amount": 42000.0,
      "disallowed_amount": 3000.0
    }
  ]
}
```

---

### 4. Escalate Claim

Escalate a complex claim to higher authority.

**Endpoint**: `POST /api/review-request/escalate-claim/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to escalate |

**Request Body**:
```json
{
  "escalation_reason": "High value claim requiring senior review",
  "escalated_to": "senior_reviewer@medverve.com",
  "review_remarks": "Amount exceeds standard limits"
}
```

**Request Example**:
```typescript
const escalateClaim = async (
  claimId: string,
  reason: string,
  escalatedTo?: string,
  remarks?: string
) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/review-request/escalate-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        escalation_reason: reason,
        escalated_to: escalatedTo,
        review_remarks: remarks
      })
    }
  );

  const data = await response.json();
  return data;
};

// Usage
await escalateClaim(
  'CSHLSIP-2025-001',
  'High value claim requiring senior review',
  'senior@medverve.com',
  'Amount exceeds ₹5 lakhs'
);
```

**Response (200 OK)**:
```json
{
  "success": true,
  "new_status": "review_escalated",
  "review_data": {
    "reviewer_id": "reviewer_uid",
    "reviewer_email": "reviewer@medverve.com",
    "reviewer_name": "Reviewer Name",
    "review_decision": "ESCALATED",
    "review_remarks": "Amount exceeds standard limits",
    "reviewed_at": "2025-01-18T10:15:00Z",
    "escalation_reason": "High value claim requiring senior review",
    "escalated_to": "senior@medverve.com",
    "escalated_at": "2025-01-18T10:15:00Z"
  }
}
```

---

### 5. Get Review Statistics

Get summary statistics for reviewer's workload.

**Endpoint**: `GET /api/review-request/get-review-stats`

**Request Example**:
```typescript
const getReviewStats = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/review-request/get-review-stats',
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

**Response (200 OK)**:
```json
{
  "success": true,
  "stats": {
    "total": 75,
    "pending": 30,
    "under_review": 20,
    "completed": 25
  }
}
```

---

## 📊 Data Structures

### Review Data Object

```typescript
interface ReviewData {
  // Reviewer information
  reviewer_id: string;
  reviewer_email: string;
  reviewer_name: string;
  review_decision: string;  // REVIEWED, APPROVED, REJECTED, etc.
  review_remarks: string;
  reviewed_at: string;  // ISO timestamp
  
  // Financial amounts (for 'reviewed' action)
  total_bill_amount?: number;
  claimed_amount?: number;
  approved_amount?: number;
  disallowed_amount?: number;
  review_request_amount?: number;
  patient_paid_amount?: number;
  discount_amount?: number;
  reason_by_payer?: string;
  
  // Escalation data (for 'escalate' action)
  escalation_reason?: string;
  escalated_to?: string;
  escalated_at?: string;
  
  // Status tracking
  info_requested_at?: string;
  under_review_at?: string;
  completed_at?: string;
  not_found_at?: string;
}
```

### Review History Entry

```typescript
interface ReviewHistoryEntry {
  reviewer_id: string;
  reviewer_email: string;
  reviewer_name: string;
  review_decision: string;
  review_remarks: string;
  reviewed_at: string;
  review_action: string;
  
  // Financial amounts (if applicable)
  total_bill_amount?: number;
  claimed_amount?: number;
  approved_amount?: number;
  disallowed_amount?: number;
}
```

---

## 🔄 Complete Workflow Examples

### Example 1: Review with Full Financial Details

```typescript
// Step 1: Get pending claims
const pendingClaims = await fetchReviewClaims('pending');
console.log('Pending claims:', pendingClaims.total_claims);

// Step 2: Select a claim to review
const claimId = pendingClaims.claims[0].claim_id;

// Step 3: Get full claim details
const claimDetails = await getReviewClaimFull(claimId);
console.log('Claim details:', claimDetails.claim);

// Step 4: Calculate amounts
const totalBill = claimDetails.claim.form_data.total_bill_amount;
const claimed = claimDetails.claim.form_data.claimed_amount;
const approved = 42000;  // After review
const disallowed = totalBill - approved;

// Step 5: Submit review
const result = await reviewClaim(
  claimId,
  'reviewed',
  'Approved with minor deductions for non-covered items',
  {
    total_bill_amount: totalBill,
    claimed_amount: claimed,
    approved_amount: approved,
    disallowed_amount: disallowed,
    review_request_amount: claimed,
    patient_paid_amount: claimDetails.claim.form_data.patient_paid_amount,
    discount_amount: claimDetails.claim.form_data.discount_amount,
    reason_by_payer: 'Non-covered consumables deducted'
  }
);

console.log('Review completed:', result.new_status);
```

### Example 2: Simple Approval

```typescript
// Approve claim without detailed financial review
await reviewClaim(
  'CSHLSIP-2025-001',
  'approve',
  'Claim approved as per policy terms'
);
```

### Example 3: Reject Claim

```typescript
// Reject claim
await reviewClaim(
  'CSHLSIP-2025-001',
  'reject',
  'Claim rejected: Pre-existing condition not covered under policy'
);
```

### Example 4: Request More Information

```typescript
// Request additional documents or information
await reviewClaim(
  'CSHLSIP-2025-001',
  'request_more_info',
  'Please provide original bills for pharmacy charges'
);
```

### Example 5: Escalate High Value Claim

```typescript
// Escalate for senior review
await escalateClaim(
  'CSHLSIP-2025-001',
  'Claim amount exceeds ₹10 lakhs - requires senior approval',
  'senior.reviewer@medverve.com',
  'High value cardiac surgery claim'
);
```

---

## 🎨 Frontend Implementation Guide

### 1. Review Request Inbox Page

```typescript
// /review-request-inbox/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';

export default function ReviewRequestInboxPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchClaims();
    fetchStats();
  }, [statusFilter]);

  const fetchClaims = async () => {
    setLoading(true);
    const data = await fetchReviewClaims(statusFilter);
    setClaims(data.claims);
    setLoading(false);
  };

  const fetchStats = async () => {
    const data = await getReviewStats();
    setStats(data.stats);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Review Request Inbox</h1>
        <Button onClick={fetchClaims}>Refresh</Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Claims</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-gray-500">Pending Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.under_review}</div>
              <div className="text-sm text-gray-500">Under Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2">
        {['pending', 'under_review', 'completed', 'all'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => setStatusFilter(status)}
          >
            {status.replace('_', ' ').toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Claims Table */}
      <DataTable
        columns={columns}
        data={claims}
        searchKey="patient_name"
        loading={loading}
      />
    </div>
  );
}
```

### 2. Review Claim Processing Page

```typescript
// /review-request-inbox/process/[claimId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function ReviewClaimPage() {
  const { claimId } = useParams();
  const router = useRouter();
  const [claim, setClaim] = useState(null);
  const [action, setAction] = useState('reviewed');
  const [remarks, setRemarks] = useState('');
  const [amounts, setAmounts] = useState({
    total_bill_amount: 0,
    claimed_amount: 0,
    approved_amount: 0,
    disallowed_amount: 0,
    review_request_amount: 0,
    patient_paid_amount: 0,
    discount_amount: 0,
    reason_by_payer: ''
  });

  useEffect(() => {
    loadClaimDetails();
  }, [claimId]);

  const loadClaimDetails = async () => {
    const data = await getReviewClaimFull(claimId as string);
    setClaim(data.claim);
    
    // Pre-fill amounts from form_data
    if (data.claim.form_data) {
      setAmounts({
        total_bill_amount: data.claim.form_data.total_bill_amount || 0,
        claimed_amount: data.claim.form_data.claimed_amount || 0,
        approved_amount: 0,
        disallowed_amount: 0,
        review_request_amount: data.claim.form_data.claimed_amount || 0,
        patient_paid_amount: data.claim.form_data.patient_paid_amount || 0,
        discount_amount: data.claim.form_data.discount_amount || 0,
        reason_by_payer: ''
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const result = await reviewClaim(
        claimId as string,
        action,
        remarks,
        action === 'reviewed' ? amounts : undefined
      );
      alert('Review submitted successfully!');
      router.push('/review-request-inbox');
    } catch (error) {
      alert('Error submitting review: ' + error.message);
    }
  };

  if (!claim) return <div>Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Review Claim: {claim.claim_id}</h1>

      {/* Claim Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Patient:</strong> {claim.form_data.patient_name}
            </div>
            <div>
              <strong>Payer:</strong> {claim.form_data.payer_name}
            </div>
            <div>
              <strong>Hospital:</strong> {claim.hospital_name}
            </div>
            <div>
              <strong>Billed Amount:</strong> ₹{claim.form_data.total_bill_amount?.toLocaleString()}
            </div>
            <div>
              <strong>Claimed Amount:</strong> ₹{claim.form_data.claimed_amount?.toLocaleString()}
            </div>
            <div>
              <strong>Current Status:</strong> {claim.claim_status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Action Card */}
      <Card>
        <CardHeader>
          <CardTitle>Submit Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Selection */}
          <div>
            <label className="block mb-2">Review Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reviewed">Review with Amounts</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="request_more_info">Request More Info</SelectItem>
                <SelectItem value="mark_under_review">Mark Under Review</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="not_found">Not Found</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Financial Fields (conditional) */}
          {action === 'reviewed' && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Financial Review</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Total Bill Amount</label>
                  <Input
                    type="number"
                    value={amounts.total_bill_amount}
                    onChange={(e) => setAmounts({...amounts, total_bill_amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label>Claimed Amount</label>
                  <Input
                    type="number"
                    value={amounts.claimed_amount}
                    onChange={(e) => setAmounts({...amounts, claimed_amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label>Approved Amount</label>
                  <Input
                    type="number"
                    value={amounts.approved_amount}
                    onChange={(e) => {
                      const approved = parseFloat(e.target.value);
                      const disallowed = amounts.total_bill_amount - approved;
                      setAmounts({...amounts, approved_amount: approved, disallowed_amount: disallowed});
                    }}
                  />
                </div>
                <div>
                  <label>Disallowed Amount</label>
                  <Input
                    type="number"
                    value={amounts.disallowed_amount}
                    disabled
                  />
                </div>
              </div>
              
              <div>
                <label>Reason by Payer</label>
                <Textarea
                  value={amounts.reason_by_payer}
                  onChange={(e) => setAmounts({...amounts, reason_by_payer: e.target.value})}
                  placeholder="Enter reason for any deductions..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Review Remarks */}
          <div>
            <label className="block mb-2">Review Remarks</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter your review remarks..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              Submit Review
            </Button>
            <Button 
              onClick={() => router.push('/review-request-inbox')} 
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🛡️ Error Handling

### Common Errors

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Invalid review_action | Action not in allowed list |
| 401 | Unauthorized | Invalid or expired token |
| 403 | Forbidden | User doesn't have review_request role |
| 404 | Claim not found | Claim ID doesn't exist |
| 500 | Server error | Internal server error |

### Error Response Format
```json
{
  "success": false,
  "error": "Error message description"
}
```

---

## 📝 Transaction Logging

All review actions create transaction records:

```typescript
interface Transaction {
  claim_id: string;
  transaction_type: 'REVIEWED' | 'ESCALATED' | 'REVIEW_STATUS_UPDATED';
  performed_by: string;
  performed_by_email: string;
  performed_by_name: string;
  performed_by_role: 'review_request';
  timestamp: string;
  previous_status: string;
  new_status: string;
  remarks: string;
  metadata: {
    review_action: string;
    review_data: ReviewData;
  };
}
```

---

## 🔍 Testing Guide

### Manual Testing Checklist

**Setup**:
- [ ] Create user with `review_request` role
- [ ] Create test claims in `dispatched` status

**Testing Get Claims**:
- [ ] Fetch pending claims
- [ ] Fetch under review claims
- [ ] Fetch completed claims
- [ ] Test date filters
- [ ] Test payer/hospital filters

**Testing Review Actions**:
- [ ] Complete review with full financial details
- [ ] Approve claim
- [ ] Reject claim
- [ ] Request more information
- [ ] Mark under review
- [ ] Verify claim_status updates correctly
- [ ] Verify transaction recorded
- [ ] Verify review_history updated

**Testing Escalation**:
- [ ] Escalate a claim
- [ ] Verify status changes to review_escalated
- [ ] Verify escalation data stored

**Testing Statistics**:
- [ ] Fetch review stats
- [ ] Verify counts accurate

---

## 🚀 Best Practices

1. **Always validate amounts** before submitting review
2. **Calculate disallowed amount** automatically (total_bill - approved)
3. **Provide detailed remarks** for transparency
4. **Use 'reviewed' action** for complete financial review
5. **Use specific actions** (approve/reject) for simple decisions
6. **Escalate high-value claims** or complex cases
7. **Show processor decision** in review UI
8. **Display review history** for auditing
9. **Implement confirmation dialogs** for review submission
10. **Handle decimal precision** correctly for amounts

---

## 📊 Review Status Reference

| Review Action | New claim_status | Description |
|---------------|------------------|-------------|
| `reviewed` | `reviewed` | Complete review with financial details |
| `approve` | `review_approved` | Approve the claim |
| `reject` | `review_rejected` | Reject the claim |
| `request_more_info` | `review_info_needed` | Request additional information |
| `mark_under_review` | `review_under_review` | Mark as under review |
| `complete` | `review_completed` | Complete the review |
| `not_found` | `review_not_found` | Claim not found by payer |
| `escalate` | `review_escalated` | Escalated to senior authority |

---

## 📞 Support

For Review Request module questions:
- Check transaction history for debugging
- Verify review_history in claim document
- Ensure claims in correct status (`dispatched`)
- Contact backend team for access issues

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Status**: ✅ FULLY IMPLEMENTED

---
