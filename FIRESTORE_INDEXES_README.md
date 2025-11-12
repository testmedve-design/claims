# Firestore Indexes Configuration

## Overview
This document describes the Firestore composite indexes required for the Claims Management Application to function properly. Without these indexes, queries will fail or perform poorly.

## Required Indexes

### Claims Collection
1. **(claim_status, created_at ASC)** - Used by processor inbox filtering with date ranges
2. **(claim_status, created_at DESC)** - Used by processor inbox with descending date ordering
3. **(rm_status, created_at ASC)** - Used by RM dashboard filtering with date ranges
4. **(rm_status, created_at DESC)** - Used by RM dashboard with descending date ordering
5. **(hospital_id, is_draft)** - Used by hospital user claim listings
6. **(hospital_id, is_draft, claim_status)** - Used by hospital user claim filtering by status
7. **(claim_status, is_draft)** - Used by claims statistics endpoint
8. **(locked_by_processor)** - Used by lock management system
9. **(lock_expires_at)** - Used by lock cleanup utilities
10. **(claim_id)** - Used by individual claim lookups

### Checklist Collection
1. **(payer_name, specialty)** - Used by document checklist lookups
2. **(payer_name)** - Used by payer-only checklist lookups

### Doctors Collection
1. **(hospital_id, specialty_name)** - Used by doctor listings with specialty filter
2. **(hospital_id)** - Used by hospital doctor listings

### Transactions Collection
1. **(claim_id, timestamp DESC)** - Used by transaction history ordering

### Users Collection
1. **(email)** - Used by user authentication lookups
2. **(role)** - Used by role-based user filtering

### Affiliations Collections
1. **(hospital_id)** - Used by payer_affiliations and specialty_affiliations lookups

### Notifications Collection
1. **(created_at)** - Used by notification cleanup (TTL implementation)

### Claim Transactions Collection
1. **(performed_at DESC)** - Used by recent transaction listings

## Deployment Methods

### Method 1: Firebase CLI (Recommended)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Method 2: Firebase Console (Manual)
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index" for each required composite index
3. Fill in the collection ID and field paths as specified above
4. Wait for indexes to build (may take several minutes to hours)

### Method 3: Terraform/GCP Deployment
If using infrastructure as code:
```bash
# Using gcloud CLI
gcloud firestore indexes composite create \
  --collection-group=claims \
  --field-config field-path=claim_status,order=ascending \
  --field-config field-path=created_at,order=ascending
```

## Verification

### Check Index Status
```bash
# Firebase CLI
firebase firestore:indexes:list

# Or check in Firebase Console → Firestore → Indexes tab
```

### Test Queries
After indexes are deployed, test these endpoints:
- `/api/processor/get-claims-to-process` - Processor inbox
- `/api/rm/get-claims` - RM dashboard
- `/api/claims/get-my-claims` - Hospital claims
- `/api/claims/get-claims-stats` - Statistics
- `/api/notifications/` - Notification lists

## Performance Impact

- **Before indexes**: Queries may fail with "requires an index" errors
- **After indexes**: Queries will execute efficiently with proper performance
- **Index build time**: May take 5-30 minutes depending on data volume
- **Storage cost**: Indexes consume additional storage (typically 20-50% of document size)

## Monitoring

Monitor query performance in Firebase Console → Firestore → Usage tab. Look for:
- Query execution times
- Index usage statistics
- Any "missing index" errors in logs

## Troubleshooting

### Common Issues
1. **"Index not found" errors**: Indexes are still building
2. **Slow queries**: Indexes may not be properly configured
3. **Deployment failures**: Check Firebase project permissions

### Emergency Workaround
If indexes can't be deployed immediately, the application will show errors. Temporary workarounds:
- Reduce query complexity (remove date filters temporarily)
- Use smaller result sets (limit to 10-20 records)
- Implement client-side filtering for non-critical features

## Maintenance

- Review indexes quarterly for new query patterns
- Remove unused indexes to reduce storage costs
- Update this document when adding new indexed queries
