# Review Request System Documentation

## Overview

The Review Request system handles second-level reviews and escalations for claims that require additional scrutiny or approval.

**Base URL**: `http://localhost:5002`  
**Required Role**: `review_request`

---

## ⚠️ IMPORTANT NOTE

**The Review Request module is currently under development.**

Based on the current codebase analysis:
- No dedicated Review Request backend routes found
- No Review Request frontend pages implemented
- No Review Request API service exists

This documentation serves as a placeholder and specification for future implementation.

---

## Planned Architecture

### Backend Components (TO BE IMPLEMENTED)

#### 1. Authentication & Authorization
- Add `review_request` to `ALLOWED_CLAIMS_ROLES`
- Create `require_review_request_access()` decorator
- Extract assigned payers and hospitals from `entity_assignments`

#### 2. Review Request Routes (PLANNED: `/backend/routes/review_request_routes.py`)

##### Planned Endpoints:

**GET /api/review-request/get-claims**
- Purpose: Get claims requiring second-level review
- Filters: Review status, date range, payer, hospital
- Response: List of claims needing review

**GET /api/review-request/get-claim-details/<claim_id>**
- Purpose: Get detailed claim information for review
- Response: Complete claim data with review history

**POST /api/review-request/review-claim/<claim_id>**
- Purpose: Submit review decision
- Actions: Approve, Reject, Request More Info, Escalate
- Creates transaction record

**POST /api/review-request/escalate-claim/<claim_id>**
- Purpose: Escalate claim to higher authority
- Captures escalation reason and target reviewer

**GET /api/review-request/get-review-stats**
- Purpose: Dashboard statistics
- Response: Count of pending/completed reviews

---

## Planned Review Statuses

1. **REVIEW PENDING** - Awaiting review assignment
2. **UNDER REVIEW** - Currently being reviewed
3. **REVIEW APPROVED** - Review approved
4. **REVIEW REJECTED** - Review rejected
5. **ADDITIONAL INFO NEEDED** - More information required
6. **ESCALATED** - Escalated to higher authority
7. **REVIEW COMPLETED** - Review process completed

---

## Frontend Integration (TO BE IMPLEMENTED)

### Planned Components:

#### 1. Review Request Inbox (`/review-request-inbox/page.tsx`)
- List of claims requiring review
- Filter by review status, date, payer
- Tabs: Pending, Under Review, Completed
- Process button for each claim

#### 2. Review Claim Page (`/review-request-inbox/process/[claimId]/page.tsx`)
- Claim details display
- Review history timeline
- Review decision form
- Escalation option
- Document viewer

#### 3. Review Request API Service (`/frontend/src/services/reviewRequestApi.ts`)
```typescript
class ReviewRequestApi {
  async getClaims(params): Promise<ReviewClaim[]>
  async getClaimDetails(claimId): Promise<ReviewClaimDetails>
  async reviewClaim(claimId, decision): Promise<ReviewResult>
  async escalateClaim(claimId, reason): Promise<EscalationResult>
  async getReviewStats(): Promise<ReviewStats>
}
```

---

## Planned User Flow

### 1. Review Request Login
```
User logs in with review_request role
→ Redirected to /review-request-inbox
→ Sidebar shows Review Request Inbox and Profile
```

### 2. View Claims for Review
```
Review Request Inbox displays claims
→ Filtered by assigned payers/hospitals
→ Shows only claims requiring second review
→ Click "Review" to open claim details
```

### 3. Review Claim
```
Open claim review page
→ Review claim details in tabs
→ Review processor's decision and remarks
→ Review documents
→ Make review decision:
   - Approve processor's decision
   - Reject processor's decision
   - Request additional information
   - Escalate to higher authority
→ Enter review remarks
→ Click SUBMIT REVIEW
→ Transaction recorded
→ Redirected to Review Request Inbox
```

### 4. Escalate Claim
```
Open claim review page
→ Click "Escalate" button
→ Select escalation reason
→ Select target reviewer (if applicable)
→ Enter escalation remarks
→ Status set to ESCALATED
→ Transaction recorded
→ Notification sent to target reviewer
```

---

## Data Structure (PLANNED)

### Claim Document
```javascript
{
  claim_id: "CLM123456",
  claim_status: "qc_clear",
  review_status: "REVIEW PENDING",
  review_data: {
    reviewer_id: "reviewer_uid",
    reviewer_email: "reviewer@example.com",
    reviewer_name: "Reviewer Name",
    review_decision: "APPROVED",
    review_remarks: "All documents verified",
    reviewed_at: Timestamp,
    escalation_reason: "",
    escalated_to: ""
  },
  processor_decision: {
    status: "qc_clear",
    remarks: "Claim cleared",
    processed_by: "processor_uid"
  },
  // ... existing claim fields
}
```

### Transaction History
```javascript
{
  claim_id: "CLM123456",
  transaction_type: "REVIEWED",
  performed_by: "reviewer_uid",
  performed_by_email: "reviewer@example.com",
  performed_by_name: "Reviewer Name",
  performed_by_role: "review_request",
  timestamp: Timestamp,
  previous_status: "REVIEW PENDING",
  new_status: "REVIEW APPROVED",
  remarks: "Review approved after verification",
  metadata: {
    review_action: "approve",
    review_data: { /* review fields */ }
  }
}
```

---

## Implementation Checklist

### Backend Tasks:
- [ ] Create `review_request_routes.py`
- [ ] Add `require_review_request_access()` middleware
- [ ] Implement GET /api/review-request/get-claims
- [ ] Implement GET /api/review-request/get-claim-details/<claim_id>
- [ ] Implement POST /api/review-request/review-claim/<claim_id>
- [ ] Implement POST /api/review-request/escalate-claim/<claim_id>
- [ ] Implement GET /api/review-request/get-review-stats
- [ ] Add review_request to allowed roles
- [ ] Create transaction helper for review actions

### Frontend Tasks:
- [ ] Create `/review-request-inbox/page.tsx`
- [ ] Create `/review-request-inbox/process/[claimId]/page.tsx`
- [ ] Create `reviewRequestApi.ts` service
- [ ] Add Review Request to sidebar navigation
- [ ] Implement review decision form
- [ ] Implement escalation dialog
- [ ] Add review status badges
- [ ] Create review history timeline component

### Database Tasks:
- [ ] Add review_status field to claims
- [ ] Add review_data field to claims
- [ ] Create review_request user profile structure
- [ ] Add entity_assignments for review users
- [ ] Create Firestore indexes for review queries

---

## Entity Assignments (PLANNED)

Review Request users will need proper entity assignments:

```javascript
{
  uid: "reviewer_uid",
  role: "review_request",
  email: "reviewer@medverve.com",
  displayName: "Review Specialist",
  entity_assignments: {
    payers: [
      {
        id: "payer_1",
        name: "Insurance Company A"
      }
    ],
    hospitals: [
      {
        id: "hospital_1",
        name: "City Hospital",
        code: "CH001"
      }
    ],
    review_level: "L2",  // Review authority level
    max_claim_amount: 1000000  // Maximum claim amount for review
  }
}
```

---

## API Examples (PLANNED)

### Get Claims for Review
```typescript
const fetchReviewClaims = async () => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    'http://localhost:5002/api/review-request/get-claims?status=pending',
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

### Review Claim
```typescript
const reviewClaim = async (claimId: string, decision: string, remarks: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/review-request/review-claim/${claimId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        review_decision: decision,
        review_remarks: remarks
      })
    }
  );

  const data = await response.json();
  return data;
};
```

### Escalate Claim
```typescript
const escalateClaim = async (claimId: string, reason: string, targetReviewer?: string) => {
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
        escalated_to: targetReviewer
      })
    }
  );

  const data = await response.json();
  return data;
};
```

---

## Workflow Integration

### Current Claim Workflow:
```
Hospital Submits → Processor Reviews → RM Settles
```

### With Review Request (PLANNED):
```
Hospital Submits → Processor Reviews → [Review Request Reviews] → RM Settles
                                              ↓
                                         (if needed)
```

### Triggers for Review Request:
1. High-value claims (> threshold)
2. Processor escalation
3. Complex cases requiring second opinion
4. Random quality checks
5. Claims with specific payer requirements

---

## Security & Access Control (PLANNED)

1. **Role-Based Access**:
   - Only users with `role: 'review_request'` can access review routes
   - Middleware validates role on every request

2. **Entity-Based Filtering**:
   - Claims filtered by assigned payers
   - Claims filtered by assigned hospitals
   - Review level restrictions apply

3. **Transaction Audit**:
   - Every review action recorded
   - Includes user details, timestamps, decisions

---

## Future Enhancements (PLANNED)

1. **Auto-Assignment**:
   - Automatic claim assignment to reviewers
   - Load balancing across review team

2. **SLA Management**:
   - Review time tracking
   - SLA alerts and notifications

3. **Collaboration**:
   - Multi-reviewer approval workflow
   - Internal messaging for reviewers

4. **Analytics**:
   - Review performance metrics
   - Decision accuracy tracking

---

## Status

**Current Status**: Not Implemented  
**Priority**: TBD  
**Estimated Effort**: 2-3 weeks

**Next Steps**:
1. Define complete requirements
2. Design database schema
3. Implement backend routes
4. Create frontend pages
5. Add tests
6. Deploy and monitor

---

## Contact

For questions about implementing Review Request system:
- Review requirements with product team
- Check backend architecture with development team
- Coordinate with hospital users for workflow validation

---

**Last Updated**: January 2025  
**Status**: 📋 PLANNED - Not Yet Implemented

