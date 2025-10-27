# RM (Relationship Manager) System Documentation

## Overview

The RM system is a post-dispatch claim management module designed for Relationship Managers to handle claim settlements, reconciliation, and status tracking after claims have been dispatched from the processor.

## Architecture

### Backend Components

#### 1. Authentication & Authorization (`backend/middleware.py`)
- Added `rm` to `ALLOWED_CLAIMS_ROLES`
- Created `require_rm_access` decorator for RM-only endpoints
- Extracts assigned payers and hospitals from `entity_assignments`

#### 2. RM Routes (`backend/routes/rm_routes.py`)

##### Endpoints:

**GET /api/rm/get-claims**
- Retrieves claims filtered by assigned payer and entity hospital
- Query Parameters:
  - `tab`: 'active', 'settled', 'all'
  - `limit`: Number of claims (default: 50)
  - `start_date`: Filter by start date (YYYY-MM-DD)
  - `end_date`: Filter by end date (YYYY-MM-DD)
- Filters claims based on:
  - RM's assigned payers (from `entity_assignments.payers`)
  - RM's assigned hospitals (from `entity_assignments.hospitals`)
  - Claim must be in 'dispatched' status

**GET /api/rm/get-claim-details/<claim_id>**
- Returns detailed claim information including:
  - Patient details
  - Payer details
  - Financial details
  - RM-specific data (rm_data)
  - Documents
  - Complete transaction history

**POST /api/rm/update-claim/<claim_id>**
- Updates claim with RM status and data
- Request Body:
  ```json
  {
    "rm_status": "SETTLED",
    "status_raised_date": "2024-01-15",
    "status_raised_remarks": "Settlement completed",
    "rm_data": {
      // Settlement fields or custom fields
    }
  }
  ```
- Creates transaction record in history

**POST /api/rm/reevaluate-claim/<claim_id>**
- Marks claim for re-evaluation
- Sets status to 'INPROGRESS'
- Request Body:
  ```json
  {
    "remarks": "Reason for re-evaluation"
  }
  ```

**GET /api/rm/get-rm-stats**
- Returns statistics for RM dashboard
- Includes status-wise count of claims

### RM Statuses

The system supports 11 RM statuses:

1. **RECEIVED** - Initial status when claim reaches RM
2. **QUERY RAISED** - Questions or clarifications needed
3. **REPUDIATED** - Claim rejected by payer
4. **SETTLED** - Full settlement completed
5. **APPROVED** - Claim approved for payment
6. **PARTIALLY SETTLED** - Partial payment received
7. **RECONCILIATION** - Under reconciliation process
8. **INPROGRESS** - Currently being processed
9. **CANCELLED** - Claim cancelled
10. **CLOSED** - Final closure
11. **NOT FOUND** - Claim not found by payer

### Settlement Statuses

Three statuses require detailed financial information:
- **SETTLED**
- **PARTIALLY SETTLED**
- **RECONCILIATION**

#### Settlement Fields

When any settlement status is selected, the following fields are required/available:

##### Common Fields
- **Claim Settlement Date*** (required)
- **Payment Mode*** (required) - Options: EFT, NEFT, RTGS, Cheque, Online Transfer
- **Payer Bank**
- **Payer Account**
- **Provider Bank Name**
- **Provider Account No**
- **Payment Reference No**

##### Financial Fields
- **Settled + TDS Amount** - Total amount including TDS
- **Settled Amount (Without TDS)** - Net amount without TDS
- **TDS Percentage** - Tax percentage applied
- **TDS Amount** - Calculated tax amount
- **Disallowed Amount** - Amount not approved by payer
- **Disallowed Reasons** - Explanation for disallowance
- **Discount As Per Payer** - Discount applied by payer
- **UITITSL Service Fees** - Service fees charged
- **Excess Paid** - Any overpayment
- **Contested Amount From Payer** - Disputed amount

##### Remarks
- **Settled Remarks** - General settlement notes
- **Medverve Review Remarks** - Internal review comments

### Data Storage

#### Claim Document Structure

```javascript
{
  claim_id: "CLM123456",
  claim_status: "dispatched",  // Original claim status
  rm_status: "SETTLED",         // RM-specific status
  rm_data: {                    // RM-specific data object
    // Settlement fields or custom fields
    claim_settlement_date: "2024-01-15",
    payment_mode: "NEFT",
    settled_amount_without_tds: 50000,
    // ... other fields
  },
  rm_updated_at: Timestamp,
  rm_updated_by: "user_uid",
  rm_updated_by_email: "rm@example.com",
  rm_updated_by_name: "RM Name",
  rm_status_raised_date: "2024-01-15",
  rm_status_raised_remarks: "Settlement completed successfully",
  // ... existing claim fields
}
```

#### Transaction History

Every RM action creates a transaction record:

```javascript
{
  claim_id: "CLM123456",
  transaction_type: "UPDATED",
  performed_by: "rm_user_uid",
  performed_by_email: "rm@example.com",
  performed_by_name: "RM Name",
  performed_by_role: "rm",
  timestamp: Timestamp,
  previous_status: "RECEIVED",
  new_status: "SETTLED",
  remarks: "Settlement completed",
  metadata: {
    rm_action: "update",
    rm_data: { /* settlement data */ }
  }
}
```

## Frontend Components

### 1. RM Inbox (`/rm-inbox/page.tsx`)

Features:
- Three tabs: Active Claims, Settled Claims, All Claims
- Filter by:
  - Search (patient name, claim ID, payer, hospital)
  - RM status
  - Date range
- Displays:
  - Claim ID
  - Patient Name
  - Payer
  - Hospital
  - Amount
  - RM Status
  - Submission Date
  - Process button

### 2. RM Process Claim (`/rm-inbox/process/[claimId]/page.tsx`)

Features:
- **Claim Information Tabs**:
  - Patient Details
  - Payer Details
  - Financial Details

- **Status Update Section**:
  - RM Status dropdown (all 11 statuses)
  - Status Raised Date
  - Status Raised Remarks

- **Dynamic Form**:
  - Settlement fields (for SETTLED/PARTIALLY SETTLED/RECONCILIATION)
  - All settlement financial fields in organized sections

- **Action Buttons**:
  - **UPDATE** - Save changes and update claim
  - **Re-Evaluate** - Mark for re-evaluation (sets status to INPROGRESS)

- **Sidebar**:
  - Current status display
  - Hospital information
  - Documents list with download
  - Complete transaction history

### 3. Sidebar Navigation (`/components/layout/Sidebar.tsx`)

For RM users, shows:
- RM Inbox
- Profile

## User Flow

### 1. RM Login
```
User logs in with RM role
→ Redirected to /rm-inbox
→ Sidebar shows RM Inbox and Profile only
```

### 2. View Claims
```
RM Inbox displays filtered claims
→ Only claims from assigned payers
→ Only claims from assigned hospitals
→ Click "Process" to open claim details
```

### 3. Process Claim
```
Open claim processing page
→ Review claim details in tabs
→ Select RM status
→ Enter status raised date and remarks
→ If settlement status: Fill settlement fields
→ Click UPDATE to save
→ Transaction recorded
→ Redirected to RM Inbox
```

### 4. Re-Evaluate Claim
```
Open claim processing page
→ Click "Re-Evaluate" button
→ Enter re-evaluation remarks in prompt
→ Status set to INPROGRESS
→ Transaction recorded
→ Redirected to RM Inbox
```

## Entity Assignments

RMs must have proper entity assignments in Firestore:

```javascript
{
  uid: "rm_user_uid",
  role: "rm",
  entity_assignments: {
    payers: [
      {
        id: "payer_1",
        name: "Insurance Company A"
      },
      {
        id: "payer_2", 
        name: "TPA XYZ"
      }
    ],
    hospitals: [
      {
        id: "hospital_1",
        name: "City Hospital",
        code: "CH001"
      },
      {
        id: "hospital_2",
        name: "Metro Medical Center",
        code: "MMC002"
      }
    ]
  }
}
```

## API Examples

### Get RM Claims
```bash
curl -X GET "http://localhost:5002/api/rm/get-claims?tab=active&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Claim to Settled
```bash
curl -X POST "http://localhost:5002/api/rm/update-claim/CLM123456" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rm_status": "SETTLED",
    "status_raised_date": "2024-01-15",
    "status_raised_remarks": "Full settlement completed",
    "rm_data": {
      "claim_settlement_date": "2024-01-15",
      "payment_mode": "NEFT",
      "settled_amount_without_tds": 50000,
      "tds_percentage": 10,
      "tds_amount": 5000,
      "settled_tds_amount": 55000,
      "payer_bank": "HDFC Bank",
      "payer_account": "1234567890",
      "payment_reference_no": "REF123456",
      "settled_remarks": "Payment received successfully"
    }
  }'
```

### Re-Evaluate Claim
```bash
curl -X POST "http://localhost:5002/api/rm/reevaluate-claim/CLM123456" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Need additional verification from payer"
  }'
```

## Security & Access Control

1. **Role-Based Access**:
   - Only users with `role: 'rm'` can access RM routes
   - Middleware validates role on every request

2. **Entity-Based Filtering**:
   - Claims automatically filtered by assigned payers
   - Claims automatically filtered by assigned hospitals
   - RMs can only see/process their assigned claims

3. **Transaction Audit**:
   - Every action recorded in transaction history
   - Includes user details, timestamps, and metadata

## Testing

### Create Test RM User

```javascript
// In Firestore users collection
{
  uid: "test_rm_uid",
  email: "rm.test@medverve.com",
  role: "rm",
  displayName: "Test RM User",
  entity_assignments: {
    payers: [
      {
        id: "test_payer_1",
        name: "Test Insurance Co"
      }
    ],
    hospitals: [
      {
        id: "test_hospital_1",
        name: "Test Hospital",
        code: "TH001"
      }
    ]
  }
}
```

### Create Test Dispatched Claim

```javascript
// In Firestore claims collection
{
  claim_id: "CLM_TEST_001",
  claim_status: "dispatched",
  rm_status: "RECEIVED",
  hospital_id: "test_hospital_1",
  hospital_name: "Test Hospital",
  form_data: {
    payer_name: "Test Insurance Co",
    patient_name: "Test Patient",
    claimed_amount: 100000
  },
  created_at: Timestamp,
  submission_date: Timestamp
}
```

## Future Enhancements

1. **Bulk Operations**:
   - Update multiple claims at once
   - Export settlement reports

2. **Analytics Dashboard**:
   - Settlement rate metrics
   - Average settlement time
   - Payer-wise statistics

3. **Notifications**:
   - Email alerts for status changes
   - Payment reminders

4. **Document Management**:
   - Upload settlement proofs
   - Generate settlement letters

5. **Integration**:
   - Bank payment integration
   - Accounting system sync

## Troubleshooting

### RM Can't See Any Claims
- Check entity_assignments in Firestore
- Verify claims have matching payer_name and hospital_id
- Ensure claims are in 'dispatched' status

### Settlement Fields Not Showing
- Verify RM status is one of: SETTLED, PARTIALLY SETTLED, RECONCILIATION
- Check browser console for errors

### Update Fails
- Verify RM has valid authentication token
- Check network console for API errors
- Ensure claim exists and is accessible to RM

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs for API errors
3. Verify Firestore data structure
4. Contact system administrator

