# Backend Approval Limits Implementation

## Overview

Added backend validation for processor approval limits to ensure that claims exceeding a processor's approval limit are not displayed in the inbox or accessible for processing.

## Implementation

### 1. Added Processor Approval Limits (`backend/routes/processor_routes.py`)

```python
# Processor approval limits (in rupees)
PROCESSOR_APPROVAL_LIMITS = {
    'claim_processor_l1': 50000,   # Up to 50,000
    'claim_processor_l2': 100000,  # Up to 1 lakh
    'claim_processor_l3': 200000,  # Up to 2 lakhs
    'claim_processor_l4': float('inf')  # All amounts
}
```

### 2. Updated `get_claims_to_process` Endpoint

**Location**: `backend/routes/processor_routes.py`

**Changes**:
1. Get processor's role and approval limit from request
2. Filter claims by approval limit in addition to hospital filtering
3. Skip claims that exceed the processor's limit

**Code**:
```python
# Get processor's role and approval limit
user_role = getattr(request, 'user_role', '').lower()
processor_limit = PROCESSOR_APPROVAL_LIMITS.get(user_role, float('inf'))

# ... later in the filtering loop ...

# Check processor approval limit
form_data = claim_data.get('form_data', {})
claimed_amount = form_data.get('claimed_amount', 0)

# Convert to float if it's a string
if isinstance(claimed_amount, str):
    try:
        claimed_amount = float(claimed_amount)
    except ValueError:
        claimed_amount = 0

if claimed_amount > processor_limit:
    print(f"🔍 Skipping claim {claim_id} - amount ₹{claimed_amount} exceeds processor limit ₹{processor_limit}")
    continue
```

**Result**: Processors only see claims within their approval limit in the inbox

### 3. Updated `get_claim_details` Endpoint

**Location**: `backend/routes/processor_routes.py`

**Changes**:
1. Check approval limit before returning claim details
2. Return 403 error if claim exceeds limit
3. Provide clear error message with amounts

**Code**:
```python
# Get processor's role and approval limit
user_role = getattr(request, 'user_role', '').lower()
processor_limit = PROCESSOR_APPROVAL_LIMITS.get(user_role, float('inf'))

# ... after loading claim data ...

# Check processor approval limit
form_data = claim_data.get('form_data', {})
claimed_amount = form_data.get('claimed_amount', 0)

# Convert to float if it's a string
if isinstance(claimed_amount, str):
    try:
        claimed_amount = float(claimed_amount)
    except ValueError:
        claimed_amount = 0

if claimed_amount > processor_limit:
    return jsonify({
        'success': False,
        'error': f'Claim amount (₹{claimed_amount:,.2f}) exceeds your approval limit of ₹{processor_limit:,.2f}. You cannot process this claim.',
        'claimed_amount': claimed_amount,
        'processor_limit': processor_limit
    }), 403
```

**Result**: Processors cannot access claims that exceed their approval limit

## How It Works

### Claim Listing Flow

1. Processor requests claims list via `/api/processor-routes/get-claims-to-process`
2. Backend gets processor's role from authentication
3. Backend calculates processor's approval limit
4. For each claim:
   - Extract claimed amount from form_data
   - Compare with processor's limit
   - Skip claims that exceed limit
5. Return filtered list to frontend

### Claim Details Flow

1. Processor clicks on a claim to process
2. Frontend requests claim details via `/api/processor-routes/get-claim-details/<claim_id>`
3. Backend gets processor's role and approval limit
4. Backend loads claim data
5. Backend checks if claimed amount exceeds limit
6. If exceeds limit:
   - Return 403 Forbidden error
   - Include detailed error message
7. If within limit:
   - Return claim details as normal

## Security Benefits

1. **Server-Side Enforcement**: Validation happens on backend, cannot be bypassed
2. **Double Protection**: Both frontend and backend enforce limits
3. **Clear Error Messages**: Users understand why access is denied
4. **Audit Trail**: Backend logs can track access attempts

## Testing

### Test Cases

1. ✅ L1 processor should not see claims > ₹50K in inbox
2. ✅ L1 processor should get 403 error when trying to access claim > ₹50K
3. ✅ L2 processor should not see claims > ₹1L in inbox
4. ✅ L2 processor should get 403 error when trying to access claim > ₹1L
5. ✅ L3 processor should not see claims > ₹2L in inbox
6. ✅ L3 processor should get 403 error when trying to access claim > ₹2L
7. ✅ L4 processor should see all claims
8. ✅ L4 processor should be able to access all claims

### Example API Response for Exceeded Limit

```json
{
  "success": false,
  "error": "Claim amount (₹75,000.00) exceeds your approval limit of ₹50,000.00. You cannot process this claim.",
  "claimed_amount": 75000,
  "processor_limit": 50000
}
```

## Complete Protection

### Frontend (Client-Side)
- Filters claims list by approval limit
- Blocks navigation to claims exceeding limit
- Shows clear error messages

### Backend (Server-Side)
- Filters claims list by approval limit
- Returns 403 for claims exceeding limit
- Provides detailed error messages

This dual-layer approach ensures complete security - even if a user bypasses frontend checks, the backend will still enforce the limits.
