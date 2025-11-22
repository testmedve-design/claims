# How to Deploy Firestore Indexes

## Quick Start

### Step 1: Authenticate with Firebase
```bash
firebase login
```
This will open a browser window for you to authenticate. If you're already logged in but credentials expired:
```bash
firebase login --reauth
```

### Step 2: Select Your Firebase Project
If you don't have a `.firebaserc` file, you'll need to initialize:
```bash
firebase use --add
```
Select your Firebase project from the list.

Or if you know your project ID:
```bash
firebase use <your-project-id>
```

### Step 3: Deploy the Indexes
```bash
firebase deploy --only firestore:indexes
```

## Alternative: Use the Deployment Script

We have a convenient script that checks everything for you:
```bash
chmod +x deploy_firestore_indexes.sh
./deploy_firestore_indexes.sh
```

## What Happens During Deployment

1. **Validation**: Firebase CLI validates the `firestore.indexes.json` file
2. **Upload**: Indexes are uploaded to your Firebase project
3. **Building**: Firebase starts building the indexes (this happens in the background)
4. **Status**: You'll see a message with a link to monitor index build progress

## Monitor Index Build Progress

After deployment, you can:

1. **Check in Console**: 
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Firestore Database** → **Indexes** tab
   - You'll see all indexes with their build status

2. **Check via CLI**:
   ```bash
   firebase firestore:indexes:list
   ```

## Index Build Time

- **Small datasets** (< 1,000 documents): 2-5 minutes
- **Medium datasets** (1,000-10,000 documents): 5-15 minutes  
- **Large datasets** (> 10,000 documents): 15-30 minutes

**Note**: Your application will continue to work during index building. Queries will use in-memory filtering until indexes are ready.

## Verify Deployment

After indexes are built, test your application endpoints:
- Processor inbox: `/api/processor/get-claims-to-process`
- RM dashboard: `/api/rm/get-claims`
- Hospital claims: `/api/claims/get-all-claims`
- Notifications: `/api/notifications/`

## Troubleshooting

### "Authentication Error"
```bash
firebase login --reauth
```

### "No project selected"
```bash
firebase use --add
# or
firebase use <your-project-id>
```

### "Index building" status persists
- This is normal for large datasets
- Wait up to 30 minutes
- Check Firebase Console for progress

### Deployment fails
- Verify `firestore.indexes.json` is valid JSON
- Check Firebase project permissions
- Ensure you're using the correct project

## Full Command Reference

```bash
# Login to Firebase
firebase login

# List available projects
firebase projects:list

# Select/switch project
firebase use <project-id>

# Deploy only indexes
firebase deploy --only firestore:indexes

# Deploy indexes and rules
firebase deploy --only firestore

# List deployed indexes
firebase firestore:indexes:list

# Check current project
firebase use
```

