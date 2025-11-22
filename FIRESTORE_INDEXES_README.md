# Firestore Indexes Configuration

## Overview
This document describes the comprehensive Firestore composite indexes required for the Claims Management Application. The `firestore.indexes.json` file contains all indexes needed to support efficient querying across all collections.

## Index Summary

**Total Indexes Created: 30+**

### direct_claims Collection (12+ indexes)
The main claims collection with the most complex query patterns:

1. **claim_status + created_at (ASC)** - Processor inbox filtering with ascending date order
2. **claim_status + created_at (DESC)** - Processor inbox filtering with descending date order
3. **claim_status + is_draft** - Claims statistics and filtering
4. **claim_status + is_draft + created_at (DESC)** - Filtered claim listings with date sorting
5. **hospital_id + is_draft** - Hospital user claim listings
6. **hospital_id + is_draft + claim_status** - Hospital user claim filtering by status
7. **hospital_id + is_draft + claim_status + created_at (DESC)** - Complete hospital filtering with sorting
8. **claim_status + created_at (ASC) + hospital_id** - Date range queries with hospital filter
9. **claim_status + created_at (DESC) + hospital_id** - Date range queries with hospital filter (descending)
10. **locked_by_processor + created_at (DESC)** - Lock management system queries
11. **review_status + created_at (DESC)** - Review request team queries
12. **rm_status + created_at (ASC/DESC)** - RM dashboard filtering with date ranges
13. **claim_id** - Individual claim lookups

### claims Collection (2 indexes)
Draft claims collection:

1. **claim_status + hospital_id** - Draft filtering by hospital
2. **claim_status + hospital_id + created_at (DESC)** - Draft listings with date sorting

### documents Collection (3 indexes)
Document metadata:

1. **claim_id** - Document lookups by claim
2. **claim_id + uploaded_at (DESC)** - Document listings with upload date sorting
3. **claim_id + document_type** - Filtered document queries

### transactions Collection (1 index)
Transaction history:

1. **claim_id + timestamp (DESC)** - Transaction history ordering

### claim_transactions Collection (2 indexes)
Claim transaction logs:

1. **claim_id + performed_at (DESC)** - Transaction history by claim
2. **performed_at (DESC)** - Recent transaction listings

### checklist Collection (2 indexes)
Document checklist requirements:

1. **payer_name** - Payer-only checklist lookups
2. **payer_name + specialty** - Specific checklist lookups

### doctors Collection (2 indexes)
Doctor information:

1. **hospital_id** - Hospital doctor listings
2. **hospital_id + specialty_name** - Doctor listings with specialty filter

### users Collection (2 indexes)
User authentication and authorization:

1. **email** - User authentication lookups
2. **role** - Role-based user filtering

### payer_affiliations Collection (1 index)
Payer-hospital relationships:

1. **hospital_id** - Payer affiliation lookups

### specialty_affiliations Collection (1 index)
Specialty-hospital relationships:

1. **hospital_id** - Specialty affiliation lookups

### claims_notifications Collection (3 indexes)
In-app notifications:

1. **recipient_ids (ARRAY)** - Notification recipient filtering
2. **recipient_ids (ARRAY) + created_at (DESC)** - Notification listings with date sorting
3. **created_at (DESC)** - Notification cleanup and ordering

## Deployment Methods

### Method 1: Firebase CLI (Recommended)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Navigate to project root (where firestore.indexes.json is located)
cd /path/to/claim

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Method 2: Firebase Console (Manual)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **"Create Index"** for each index
5. Fill in the collection ID and field paths as specified in `firestore.indexes.json`
6. Wait for indexes to build (may take 5-30 minutes depending on data volume)

### Method 3: Using firebase.json Configuration
If you have a `firebase.json` file, ensure it references the indexes file:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Method 4: Terraform/GCP Deployment
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
# Firebase CLI - List all indexes
firebase firestore:indexes:list

# Or check in Firebase Console → Firestore → Indexes tab
```

### Monitor Index Build Progress
1. Go to Firebase Console → Firestore → Indexes
2. Check the status of each index:
   - **Building**: Index is being created (may take 5-30 minutes)
   - **Enabled**: Index is ready to use
   - **Error**: Check error message and fix configuration

### Test Queries
After indexes are deployed and built, test these endpoints:
- `/api/processor/get-claims-to-process` - Processor inbox
- `/api/rm/get-claims` - RM dashboard
- `/api/claims/get-all-claims` - Hospital claims
- `/api/claims/get-claims-stats` - Statistics
- `/api/notifications/` - Notification lists
- `/api/review-request/get-claims` - Review request inbox
- `/api/drafts/get-drafts` - Draft listings

## Performance Impact

### Before Indexes
- Queries may fail with "requires an index" errors
- Complex queries use in-memory filtering (slower)
- Large datasets cause performance degradation
- Date range queries may timeout

### After Indexes
- All queries execute efficiently at database level
- Faster response times (typically < 100ms)
- Better scalability for large datasets
- Reduced server load and data transfer

### Index Build Time
- **Small datasets** (< 1,000 documents): 2-5 minutes
- **Medium datasets** (1,000-10,000 documents): 5-15 minutes
- **Large datasets** (> 10,000 documents): 15-30 minutes

### Storage Cost
- Indexes consume additional storage (typically 20-50% of document size)
- Monitor storage usage in Firebase Console
- Remove unused indexes to reduce costs

## Query Pattern Coverage

The indexes cover all query patterns found in the codebase:

### Processor Routes
- ✅ Status filtering (`claim_status IN [...]`)
- ✅ Date range queries (`created_at >= start AND < end`)
- ✅ Combined status + date queries
- ✅ Lock management queries

### RM Routes
- ✅ Date range queries
- ✅ Status filtering (in-memory, but indexes support future optimization)
- ✅ Payer and hospital filtering

### Review Request Routes
- ✅ Status filtering (`claim_status == 'dispatched'`)
- ✅ Multiple status queries (`claim_status IN [...]`)
- ✅ Date filtering

### Claims Routes
- ✅ Hospital filtering (`hospital_id == ...`)
- ✅ Status filtering (`claim_status == ...`)
- ✅ Draft filtering (`is_draft == False`)
- ✅ Combined hospital + status + draft queries
- ✅ Date range queries

### Draft Routes
- ✅ Draft status filtering (`claim_status == 'draft'`)
- ✅ Hospital filtering

### Notification Routes
- ✅ Recipient array filtering (`recipient_ids ARRAY_CONTAINS`)
- ✅ Date sorting

## Monitoring

### Firebase Console
Monitor query performance in **Firebase Console → Firestore → Usage**:
- Query execution times
- Index usage statistics
- Read/write operations
- Storage usage

### Application Logs
Watch for these indicators:
- "requires an index" errors → Index missing or still building
- Slow query responses → Index may not be optimal
- High read operations → Consider query optimization

## Troubleshooting

### Common Issues

1. **"Index not found" errors**
   - **Cause**: Index is still building or not deployed
   - **Solution**: Wait for index to finish building (check Firebase Console)

2. **"Index building" status persists**
   - **Cause**: Large dataset or complex index
   - **Solution**: Wait longer (up to 30 minutes for large datasets)

3. **Slow queries despite indexes**
   - **Cause**: Query pattern doesn't match index exactly
   - **Solution**: Review query and ensure field order matches index

4. **Deployment failures**
   - **Cause**: Firebase project permissions or authentication issues
   - **Solution**: 
     - Run `firebase login` again
     - Check project permissions
     - Verify `firebase.json` configuration

5. **Index limit exceeded**
   - **Cause**: Firestore has limits on number of indexes per collection
   - **Solution**: Review and consolidate similar indexes if needed

### Emergency Workaround
If indexes can't be deployed immediately:
- The application currently uses in-memory filtering as a fallback
- Performance may be slower but functionality remains
- Prioritize deploying indexes for most-used endpoints first
- Reduce query complexity (remove date filters temporarily)
- Use smaller result sets (limit to 10-20 records) if needed

## Maintenance

### Regular Tasks
- **Quarterly**: Review indexes for new query patterns
- **Monthly**: Check index usage statistics
- **As needed**: Remove unused indexes to reduce storage costs

### Adding New Indexes
When adding new query patterns:
1. Identify the query pattern in the code
2. Add corresponding index to `firestore.indexes.json`
3. Deploy using `firebase deploy --only firestore:indexes`
4. Update this README with new index information

### Removing Unused Indexes
1. Check index usage in Firebase Console
2. Remove from `firestore.indexes.json`
3. Deploy changes
4. Monitor for any query errors

## Best Practices

1. **Index Order Matters**: Field order in index must match query filter order
2. **Start with Most Selective**: Put most selective fields first
3. **Monitor Usage**: Regularly check which indexes are actually used
4. **Test After Deployment**: Always test queries after deploying new indexes
5. **Document Changes**: Update this README when adding/removing indexes

## Related Files

- `firestore.indexes.json` - Index configuration file
- `FIRESTORE_INDEX_FIX.md` - Documentation on why in-memory filtering was used
- `docs/10_BACKEND_ROUTES_OVERVIEW.md` - Backend routes documentation
