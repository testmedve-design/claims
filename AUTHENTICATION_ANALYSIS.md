# Authentication & Routing Analysis

## Current Role Definitions

### Allowed Roles (Backend - middleware.py)
- `hospital_user` - Can create/view claims
- `claim_processor` - Can process claims
- `claim_processor_l4` - Can process claims (L4)
- `reconciler` - RM functionality
- `rm` - RM functionality

### Blocked Roles (Backend - middleware.py)
- `admin` - NO ACCESS
- `super_admin` - NO ACCESS
- `system_admin` - NO ACCESS
- `hospital_admin` - NO ACCESS
- `rp` - NO ACCESS
- `employee` - NO ACCESS

## Issues Found

### 1. Inconsistent Role Checking
- Frontend has multiple places checking roles differently
- ProtectedRoute has hardcoded redirect paths
- Each page has its own role check

### 2. Missing Role Mappings
- Not all roles have defined default pages
- Some roles fall through to `/` which is undefined

### 3. Middleware Inconsistencies
- Different decorators for different features
- Not all routes use appropriate decorators
- Role checks scattered across code

## Solution: Centralized Role-Based Routing

### Role → Page Mapping

```
hospital_user → /claims (Create/View Claims)
claim_processor → /processor-inbox
claim_processor_l4 → /processor-inbox
rm → /rm-inbox
reconciler → /rm-inbox
[others] → /login (blocked)
```

### Protected Routes by Role

```
/claims: [hospital_user]
/drafts: [hospital_user]
/claims-inbox: [hospital_user]
/processor-inbox: [claim_processor, claim_processor_l4]
/rm-inbox: [rm, reconciler]
/profile: [all allowed]
```
