# Processor Levels & Approval Limits - Implementation Summary

## Overview

Implemented a 4-level processor hierarchy with approval limits to control claim processing access based on claim amounts.

## Processor Levels

| Level | Role Name | Approval Limit | Description |
|-------|-----------|----------------|-------------|
| L1 | claim_processor_l1 | ₹50,000 | Can process claims up to ₹50K |
| L2 | claim_processor_l2 | ₹1,00,000 (1 Lakh) | Can process claims up to ₹1 Lakh |
| L3 | claim_processor_l3 | ₹2,00,000 (2 Lakhs) | Can process claims up to ₹2 Lakhs |
| L4 | claim_processor_l4 | Unlimited | Can process all claims regardless of amount |

## Implementation Details

### 1. Frontend Changes

#### A. Centralized Routing Configuration (`frontend/src/lib/routes.ts`)
- Added all 4 processor levels to `ALLOWED_ROLES`
- Created `PROCESSOR_APPROVAL_LIMITS` mapping:
  ```typescript
  export const PROCESSOR_APPROVAL_LIMITS: Record<string, number> = {
    'claim_processor_l1': 50000,
    'claim_processor_l2': 100000,
    'claim_processor_l3': 200000,
    'claim_processor_l4': Infinity
  }
  ```
- Updated `DEFAULT_ROLE_PAGES` to route all processors to `/processor-inbox`
- Updated `ROUTE_ACCESS` to allow all processor levels to access processor routes

#### B. Processor Inbox Page (`frontend/src/app/processor-inbox/page.tsx`)
- Added import for `PROCESSOR_APPROVAL_LIMITS`
- Updated `filterClaims()` function to filter claims by approval limit:
  ```typescript
  // Filter by processor approval limit
  if (user?.role && PROCESSOR_APPROVAL_LIMITS[user.role] !== undefined) {
    const userLimit = PROCESSOR_APPROVAL_LIMITS[user.role]
    filtered = filtered.filter(claim => claim.amount <= userLimit)
  }
  ```

#### C. Process Claim Page (`frontend/src/app/processor-inbox/process/[claimId]/page.tsx`)
- Added import for `PROCESSOR_APPROVAL_LIMITS`
- Added approval limit check in `fetchClaimDetails()`:
  ```typescript
  // Check processor approval limit
  if (user?.role && PROCESSOR_APPROVAL_LIMITS[user.role] !== undefined) {
    const userLimit = PROCESSOR_APPROVAL_LIMITS[user.role]
    const claimAmount = data.claim?.claimed_amount || 0
    
    if (claimAmount > userLimit) {
      setError(`This claim amount (₹${claimAmount.toLocaleString('en-IN')}) exceeds your approval limit of ₹${userLimit.toLocaleString('en-IN')}. You cannot process this claim.`)
      setLoading(false)
      return
    }
  }
  ```

#### D. Type Definitions (`frontend/src/types/auth.ts`)
- Updated User interface to include all processor levels:
  ```typescript
  role: 'rm' | 'rp' | 'employee' | 'hospital_admin' | 'hospital_user' | 
        'claim_processor' | 'claim_processor_l1' | 'claim_processor_l2' | 
        'claim_processor_l3' | 'claim_processor_l4' | 'reconciler'
  ```

### 2. Backend Changes

#### A. Middleware (`backend/middleware.py`)
- Updated `ALLOWED_CLAIMS_ROLES` to include all 4 processor levels:
  ```python
  ALLOWED_CLAIMS_ROLES = [
      'hospital_user',
      'claim_processor',
      'claim_processor_l1',  # Up to 50K
      'claim_processor_l2',  # Up to 1 lakh
      'claim_processor_l3',  # Up to 2 lakhs
      'claim_processor_l4',  # All amounts
      'reconciler',
      'rm'
  ]
  ```

## How It Works

### 1. Claim Listing (Processor Inbox)
- When a processor views the inbox, the system filters claims based on their approval limit
- Only claims within their limit are displayed
- Example: L1 processor only sees claims ≤ ₹50K

### 2. Claim Processing
- When a processor opens a claim for processing, the system checks the claim amount
- If the claim amount exceeds their limit, they see an error message and cannot proceed
- Example: L1 processor trying to process a ₹75K claim will be blocked

### 3. Error Messages
- Clear error messages indicate why access is denied
- Shows the claim amount and the user's limit
- Formatted in Indian number format (₹ with comma separators)

## Testing Checklist

- [ ] L1 processor can view claims ≤ ₹50K
- [ ] L1 processor CANNOT view claims > ₹50K in inbox
- [ ] L1 processor blocked from processing claim > ₹50K (shows error)
- [ ] L2 processor can view claims ≤ ₹1 Lakh
- [ ] L2 processor CANNOT view claims > ₹1 Lakh in inbox
- [ ] L2 processor blocked from processing claim > ₹1 Lakh
- [ ] L3 processor can view claims ≤ ₹2 Lakhs
- [ ] L3 processor CANNOT view claims > ₹2 Lakhs
- [ ] L3 processor blocked from processing claim > ₹2 Lakhs
- [ ] L4 processor can view ALL claims
- [ ] L4 processor can process ALL claims
- [ ] All processor levels can access processor inbox routes
- [ ] All processor levels redirected to processor inbox on login

## Benefits

1. **Security**: Prevents unauthorized claim processing
2. **Separation of Duties**: Clear hierarchy based on expertise
3. **Clear Limits**: Easy to understand approval limits
4. **User-Friendly**: Clear error messages explain why access is denied
5. **Scalable**: Easy to add more levels or adjust limits
6. **Consistent**: Centralized configuration makes maintenance easy

## Future Enhancements

1. Add backend validation for approval limits
2. Add audit logs for when claims are blocked due to limits
3. Add reporting on processor-level statistics
4. Consider dynamic limits based on other factors (e.g., payer, hospital)
5. Add supervisor override functionality for special cases
