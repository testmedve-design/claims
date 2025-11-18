# Relationship Manager (RM) Routes - Complete Documentation

## 📋 Overview

The RM (Relationship Manager) module handles post-dispatch claim processing, settlement tracking, and reconciliation. RMs work with claims that have been processed and dispatched to payers.

**Base URL**: `http://localhost:5002`  
**Required Role**: `rm` or `reconciler`  
**API Prefix**: `/api/rm`

**Status**: ✅ **FULLY IMPLEMENTED**

---

## 🔐 Authentication

All RM endpoints require authentication with a valid Bearer token and either `rm` or `reconciler` role.

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Access Control
- Only users with role `rm` or `reconciler` can access these endpoints
- Users must have `entity_assignments` with assigned payers and hospitals
- Claims are automatically filtered by the RM's entity assignments

---

## 🎯 RM Workflow

```
Processor Clears → Dispatch → Review (Optional)
                                   ↓
                            [RM Processes]
                                   ↓
                  Received → Query → Settled → Reconciliation
```

### Claim Status Flow for RMs

**Active Claims** (can be processed):
- `dispatched` → Claim dispatched to payer
- `reviewed` → Review completed, ready for RM

**RM Status Options** (that RMs can set):
1. **received** → Payer received the claim
2. **query_raised** → Payer raised a query
3. **repudiated** → Payer repudiated/rejected
4. **settled** → Claim fully settled
5. **approved** → Claim approved by payer
6. **partially_settled** → Partial settlement received
7. **reconciliation** → In reconciliation process
8. **in_progress** → RM working on claim
9. **cancelled** → Claim cancelled
10. **closed** → Claim closed
11. **not_found** → Claim not found by payer

---

## 📡 API Endpoints

### 1. Get RM Claims

Get list of claims for RM processing, filtered by assigned payers and hospitals.

**Endpoint**: `GET /api/rm/get-claims`

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tab | string | No | Filter tab: `active`, `settled`, `all` (default: `active`) |
| limit | integer | No | Maximum number of claims to return (default: 50) |
| start_date | string | No | Start date filter (YYYY-MM-DD) |
| end_date | string | No | End date filter (YYYY-MM-DD) |

**Tab Filters**:
- **active**: Claims with status `dispatched` or `reviewed`
- **settled**: Claims with settlement statuses (`settled`, `partially_settled`, `reconciliation`, `approved`)
- **all**: All claims assigned to RM

**Request Example**:
```typescript
const fetchRMClaims = async (tab = 'active') => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/rm/get-claims?tab=${tab}&limit=50`,
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
  "total_claims": 35,
  "claims": [
    {
      "claim_id": "CSHLSIP-2025-001",
      "claim_status": "dispatched",
      "claim_status_label": "Dispatched",
      "created_at": "2025-01-15T10:30:00Z",
      "submission_date": "2025-01-15T10:30:00Z",
      "patient_name": "John Doe",
      "claimed_amount": 45000.0,
      "payer_name": "Health Insurance Ltd",
      "specialty": "Cardiology",
      "hospital_name": "City Hospital",
      "hospital_id": "HOSP_001",
      "created_by_email": "user@hospital.com",
      "rm_updated_at": "",
      "rm_updated_by": ""
    }
  ]
}
```

---

### 2. Get Claim Details for RM

Get complete claim details including documents, financial data, and RM-specific information.

**Endpoint**: `GET /api/rm/get-claim-details/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to fetch |

**Request Example**:
```typescript
const getRMClaimDetails = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/rm/get-claim-details/${claimId}`,
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
    "claim_status_label": "Dispatched",
    "created_at": "2025-01-15T10:30:00Z",
    "submission_date": "2025-01-15T10:30:00Z",
    "hospital_name": "City Hospital",
    "hospital_id": "HOSP_001",
    
    // RM-specific fields
    "rm_data": {
      "settled_amount": 0,
      "settlement_date": "",
      "tds_amount": 0,
      "net_payable": 0,
      "payment_mode": "",
      "utr_number": "",
      "settlement_remarks": ""
    },
    "rm_updated_at": "",
    "rm_updated_by": "",
    "rm_updated_by_email": "",
    "rm_updated_by_name": "",
    
    // Patient details
    "patient_details": {
      "patient_name": "John Doe",
      "age": 45,
      "gender": "Male",
      "id_card_type": "Aadhaar",
      "id_card_number": "1234-5678-9012",
      "patient_contact_number": "+91-9876543210",
      "patient_email_id": "patient@example.com"
    },
    
    // Payer details
    "payer_details": {
      "payer_name": "Health Insurance Ltd",
      "payer_type": "Corporate",
      "insurer_name": "Insurance Company",
      "policy_number": "POL123456",
      "authorization_number": "AUTH123456"
    },
    
    // Financial details
    "financial_details": {
      "total_bill_amount": 50000.0,
      "claimed_amount": 45000.0,
      "amount_charged_to_payer": 45000.0
    },
    
    "form_data": {
      // Complete form data
    },
    
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
    
    "transactions": [
      {
        "transaction_id": "txn_001",
        "transaction_type": "UPDATED",
        "performed_by": "RM Name",
        "performed_by_email": "rm@medverve.com",
        "performed_by_role": "rm",
        "timestamp": "2025-01-16T10:00:00Z",
        "previous_status": "dispatched",
        "new_status": "received",
        "remarks": "Claim received by payer",
        "metadata": {}
      }
    ]
  }
}
```

---

### 3. Update Claim (RM Processing)

Update claim with RM status and settlement data.

**Endpoint**: `POST /api/rm/update-claim/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to update |

**Request Body**:
```json
{
  "claim_status": "settled",
  "status_raised_date": "2025-01-20",
  "status_raised_remarks": "Settlement completed successfully",
  "rm_data": {
    "settled_amount": 42000.0,
    "settlement_date": "2025-01-20",
    "tds_amount": 1000.0,
    "net_payable": 41000.0,
    "payment_mode": "NEFT",
    "utr_number": "UTR123456789",
    "settlement_remarks": "Settled with minor deductions",
    "bank_account": "1234567890",
    "ifsc_code": "HDFC0001234"
  }
}
```

**Allowed Claim Statuses**:
- `dispatched`, `received`, `query_raised`, `repudiated`
- `settled`, `approved`, `partially_settled`, `reconciliation`
- `in_progress`, `cancelled`, `closed`, `not_found`

**Settlement Statuses** (require financial fields):
- `settled`, `approved`, `partially_settled`, `reconciliation`

**Request Example**:
```typescript
const updateRMClaim = async (
  claimId: string,
  status: string,
  remarks: string,
  rmData?: any
) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/rm/update-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        claim_status: status,
        status_raised_remarks: remarks,
        status_raised_date: new Date().toISOString().split('T')[0],
        rm_data: rmData
      })
    }
  );

  const data = await response.json();
  return data;
};

// Usage - Mark as received
await updateRMClaim('CSHLSIP-2025-001', 'received', 'Claim received by payer');

// Usage - Mark as settled with financial data
await updateRMClaim('CSHLSIP-2025-001', 'settled', 'Settlement completed', {
  settled_amount: 42000,
  settlement_date: '2025-01-20',
  tds_amount: 1000,
  net_payable: 41000,
  payment_mode: 'NEFT',
  utr_number: 'UTR123456789',
  settlement_remarks: 'Settled with deductions'
});
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Claim updated to Settled successfully",
  "claim_id": "CSHLSIP-2025-001",
  "claim_status": "settled",
  "claim_status_label": "Settled"
}
```

---

### 4. Re-evaluate Claim

Mark claim for re-evaluation (moves back to in_progress status).

**Endpoint**: `POST /api/rm/reevaluate-claim/<claim_id>`

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| claim_id | string | Yes | Claim ID to re-evaluate |

**Request Body**:
```json
{
  "remarks": "Discrepancy found in settlement amount, needs review"
}
```

**Request Example**:
```typescript
const reevaluateRMClaim = async (claimId: string, remarks: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/rm/reevaluate-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ remarks })
    }
  );

  const data = await response.json();
  return data;
};

// Usage
await reevaluateRMClaim('CSHLSIP-2025-001', 'Settlement discrepancy found');
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Claim marked for re-evaluation",
  "claim_id": "CSHLSIP-2025-001"
}
```

---

### 5. Get RM Statistics

Get summary statistics for RM's workload.

**Endpoint**: `GET /api/rm/get-rm-stats`

**Request Example**:
```typescript
const getRMStats = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/rm/get-rm-stats',
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
    "total_claims": 150,
    "status_counts": {
      "dispatched": 30,
      "received": 25,
      "query_raised": 10,
      "repudiated": 5,
      "settled": 50,
      "approved": 15,
      "partially_settled": 10,
      "reconciliation": 3,
      "in_progress": 2,
      "cancelled": 0,
      "closed": 0,
      "not_found": 0
    },
    "settled_count": 50,
    "partially_settled_count": 10,
    "reconciliation_count": 3,
    "active_count": 72
  }
}
```

---

## 📊 Data Structures

### RM Data Object
```typescript
interface RMData {
  // Settlement information
  settled_amount?: number;
  settlement_date?: string;  // YYYY-MM-DD
  tds_amount?: number;
  net_payable?: number;
  
  // Payment details
  payment_mode?: string;  // NEFT, RTGS, Cheque, etc.
  utr_number?: string;
  cheque_number?: string;
  cheque_date?: string;
  
  // Bank details
  bank_account?: string;
  ifsc_code?: string;
  bank_name?: string;
  
  // Additional fields
  settlement_remarks?: string;
  query_details?: string;
  repudiation_reason?: string;
  
  // Custom fields (extensible)
  [key: string]: any;
}
```

### Claim Status Labels
```typescript
const STATUS_LABELS = {
  'dispatched': 'Dispatched',
  'received': 'Received',
  'query_raised': 'Query Raised',
  'repudiated': 'Repudiated',
  'settled': 'Settled',
  'approved': 'Approved',
  'partially_settled': 'Partially Settled',
  'reconciliation': 'Reconciliation',
  'in_progress': 'In Progress',
  'cancelled': 'Cancelled',
  'closed': 'Closed',
  'not_found': 'Not Found'
};
```

---

## 🔄 Complete Workflow Examples

### Example 1: Mark Claim as Received

```typescript
// Step 1: Get active claims
const activeClaims = await fetchRMClaims('active');
console.log('Active claims:', activeClaims.total_claims);

// Step 2: Select a dispatched claim
const claimId = activeClaims.claims
  .find(c => c.claim_status === 'dispatched')?.claim_id;

// Step 3: Get claim details
const claimDetails = await getRMClaimDetails(claimId);
console.log('Claim details:', claimDetails.claim);

// Step 4: Mark as received
const result = await updateRMClaim(
  claimId,
  'received',
  'Claim received by payer on 2025-01-18'
);

console.log('Claim updated:', result.claim_status_label);
```

### Example 2: Settle Claim with Full Details

```typescript
// Get claim to settle
const claimId = 'CSHLSIP-2025-001';
const claimDetails = await getRMClaimDetails(claimId);

// Calculate settlement amounts
const claimedAmount = claimDetails.claim.financial_details.claimed_amount;
const settledAmount = 42000;  // From payer
const tdsAmount = settledAmount * 0.01;  // 1% TDS
const netPayable = settledAmount - tdsAmount;

// Update claim with settlement
const result = await updateRMClaim(
  claimId,
  'settled',
  'Settlement completed as per payer intimation',
  {
    settled_amount: settledAmount,
    settlement_date: '2025-01-20',
    tds_amount: tdsAmount,
    net_payable: netPayable,
    payment_mode: 'NEFT',
    utr_number: 'UTR123456789012',
    bank_account: '1234567890',
    ifsc_code: 'HDFC0001234',
    settlement_remarks: 'Settled with Rs 3000 deduction for non-covered items'
  }
);

console.log('Settlement recorded:', result.message);
```

### Example 3: Handle Query from Payer

```typescript
// Mark claim with query
await updateRMClaim(
  'CSHLSIP-2025-001',
  'query_raised',
  'Payer raised query regarding pre-existing condition',
  {
    query_details: 'Payer requesting additional medical history documents',
    query_raised_date: '2025-01-19',
    expected_response_date: '2025-01-26'
  }
);
```

### Example 4: Partial Settlement

```typescript
// Record partial settlement
await updateRMClaim(
  'CSHLSIP-2025-001',
  'partially_settled',
  'Partial settlement received - balance pending approval',
  {
    settled_amount: 30000,
    settlement_date: '2025-01-20',
    tds_amount: 300,
    net_payable: 29700,
    payment_mode: 'NEFT',
    utr_number: 'UTR123456789012',
    pending_amount: 12000,
    settlement_remarks: 'Partial payment received. Balance Rs 12000 pending payer approval'
  }
);
```

---

## 🎨 Frontend Implementation Guide

### 1. RM Inbox Page

```typescript
// /rm-inbox/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function RMInboxPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchClaims();
    fetchStats();
  }, [activeTab]);

  const fetchClaims = async () => {
    setLoading(true);
    const data = await fetchRMClaims(activeTab);
    setClaims(data.claims);
    setLoading(false);
  };

  const fetchStats = async () => {
    const data = await getRMStats();
    setStats(data.stats);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">RM Inbox</h1>
        <Button onClick={fetchClaims}>Refresh</Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_claims}</div>
              <div className="text-sm text-gray-500">Total Claims</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.active_count}</div>
              <div className="text-sm text-gray-500">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.settled_count}</div>
              <div className="text-sm text-gray-500">Settled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.reconciliation_count}</div>
              <div className="text-sm text-gray-500">Reconciliation</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button 
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
        >
          Active ({stats?.active_count || 0})
        </Button>
        <Button 
          variant={activeTab === 'settled' ? 'default' : 'outline'}
          onClick={() => setActiveTab('settled')}
        >
          Settled ({stats?.settled_count || 0})
        </Button>
        <Button 
          variant={activeTab === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all')}
        >
          All ({stats?.total_claims || 0})
        </Button>
      </div>

      {/* Claims Table */}
      <Card>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Patient Name</th>
                <th>Payer</th>
                <th>Hospital</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.claim_id}>
                  <td className="font-mono text-sm">{claim.claim_id}</td>
                  <td>{claim.patient_name}</td>
                  <td>{claim.payer_name}</td>
                  <td>{claim.hospital_name}</td>
                  <td>₹{claim.claimed_amount?.toLocaleString()}</td>
                  <td>
                    <Badge>{claim.claim_status_label}</Badge>
                  </td>
                  <td>
                    <Button 
                      size="sm"
                      onClick={() => window.open(`/rm-inbox/process/${claim.claim_id}`, '_blank')}
                    >
                      Process
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. RM Process Claim Page

```typescript
// /rm-inbox/process/[claimId]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function RMProcessClaimPage() {
  const { claimId } = useParams();
  const [claim, setClaim] = useState(null);
  const [status, setStatus] = useState('received');
  const [remarks, setRemarks] = useState('');
  const [rmData, setRmData] = useState({
    settled_amount: 0,
    settlement_date: '',
    tds_amount: 0,
    net_payable: 0,
    payment_mode: 'NEFT',
    utr_number: '',
    settlement_remarks: ''
  });

  useEffect(() => {
    loadClaimDetails();
  }, [claimId]);

  const loadClaimDetails = async () => {
    const data = await getRMClaimDetails(claimId as string);
    setClaim(data.claim);
  };

  const isSettlementStatus = ['settled', 'approved', 'partially_settled', 'reconciliation'].includes(status);

  const handleUpdate = async () => {
    try {
      const result = await updateRMClaim(
        claimId as string,
        status,
        remarks,
        isSettlementStatus ? rmData : {}
      );
      alert('Claim updated successfully!');
      window.close();
    } catch (error) {
      alert('Error updating claim: ' + error.message);
    }
  };

  if (!claim) return <div>Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Process Claim: {claim.claim_id}</h1>

      {/* Claim Information */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Patient:</strong> {claim.patient_details.patient_name}
            </div>
            <div>
              <strong>Payer:</strong> {claim.payer_details.payer_name}
            </div>
            <div>
              <strong>Hospital:</strong> {claim.hospital_name}
            </div>
            <div>
              <strong>Claimed Amount:</strong> ₹{claim.financial_details.claimed_amount?.toLocaleString()}
            </div>
            <div>
              <strong>Current Status:</strong> {claim.claim_status_label}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Update Status */}
      <Card>
        <CardHeader>
          <CardTitle>Update Claim Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Selection */}
          <div>
            <label className="block mb-2">New Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="query_raised">Query Raised</SelectItem>
                <SelectItem value="repudiated">Repudiated</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="partially_settled">Partially Settled</SelectItem>
                <SelectItem value="reconciliation">Reconciliation</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="not_found">Not Found</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Settlement Fields (conditional) */}
          {isSettlementStatus && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Settlement Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Settled Amount</label>
                  <Input
                    type="number"
                    value={rmData.settled_amount}
                    onChange={(e) => setRmData({...rmData, settled_amount: parseFloat(e.target.value)})}
                    placeholder="Enter settled amount"
                  />
                </div>
                <div>
                  <label className="block mb-2">Settlement Date</label>
                  <Input
                    type="date"
                    value={rmData.settlement_date}
                    onChange={(e) => setRmData({...rmData, settlement_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block mb-2">TDS Amount</label>
                  <Input
                    type="number"
                    value={rmData.tds_amount}
                    onChange={(e) => setRmData({...rmData, tds_amount: parseFloat(e.target.value)})}
                    placeholder="Enter TDS amount"
                  />
                </div>
                <div>
                  <label className="block mb-2">Net Payable</label>
                  <Input
                    type="number"
                    value={rmData.net_payable}
                    onChange={(e) => setRmData({...rmData, net_payable: parseFloat(e.target.value)})}
                    placeholder="Enter net payable"
                  />
                </div>
                <div>
                  <label className="block mb-2">Payment Mode</label>
                  <Select value={rmData.payment_mode} onValueChange={(v) => setRmData({...rmData, payment_mode: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="DD">DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block mb-2">UTR Number</label>
                  <Input
                    value={rmData.utr_number}
                    onChange={(e) => setRmData({...rmData, utr_number: e.target.value})}
                    placeholder="Enter UTR number"
                  />
                </div>
              </div>
              
              <div>
                <label className="block mb-2">Settlement Remarks</label>
                <Textarea
                  value={rmData.settlement_remarks}
                  onChange={(e) => setRmData({...rmData, settlement_remarks: e.target.value})}
                  placeholder="Enter settlement remarks..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Status Remarks */}
          <div>
            <label className="block mb-2">Status Remarks</label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks for status update..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleUpdate} className="flex-1">
              Update Claim
            </Button>
            <Button 
              onClick={() => window.close()} 
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
| 400 | Invalid claim status | Status not in allowed list |
| 401 | Unauthorized | Invalid or expired token |
| 403 | Forbidden | User doesn't have RM role |
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

All RM actions create transaction records:

```typescript
interface Transaction {
  claim_id: string;
  transaction_type: 'UPDATED';
  performed_by: string;
  performed_by_email: string;
  performed_by_name: string;
  performed_by_role: 'rm';
  timestamp: string;
  previous_status: string;
  new_status: string;
  remarks: string;
  metadata: {
    rm_action: 'update' | 'reevaluate';
    rm_data: RMData;
  };
}
```

---

## 🔍 Testing Guide

### Manual Testing Checklist

**Setup**:
- [ ] Create user with `rm` or `reconciler` role
- [ ] Assign payers and hospitals to RM
- [ ] Create test claims in `dispatched` or `reviewed` status

**Testing Get Claims**:
- [ ] Fetch active claims
- [ ] Fetch settled claims
- [ ] Verify entity filtering works
- [ ] Test date filters

**Testing Update Claim**:
- [ ] Mark claim as received
- [ ] Mark claim with query
- [ ] Settle claim with full financial data
- [ ] Partial settlement
- [ ] Verify status updates correctly
- [ ] Verify transaction recorded

**Testing Re-evaluation**:
- [ ] Re-evaluate a settled claim
- [ ] Verify status changes to in_progress

**Testing Statistics**:
- [ ] Fetch RM stats
- [ ] Verify counts accurate

---

## 🚀 Best Practices

1. **Validate amounts** before settlement submission
2. **Save UTR/transaction numbers** for audit trail
3. **Calculate TDS automatically** when possible
4. **Require settlement remarks** for transparency
5. **Show previous RM updates** in UI
6. **Implement confirmation dialogs** for status changes
7. **Add settlement date validation** (not future date)
8. **Handle decimal precision** correctly for amounts
9. **Save partial data** as claim progresses
10. **Export settlement reports** for accounting

---

## 📞 Support

For RM module questions:
- Check transaction history for debugging
- Verify entity_assignments in user profile
- Ensure claims in correct status
- Contact backend team for access issues

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: ✅ FULLY IMPLEMENTED

---


