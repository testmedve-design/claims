#!/bin/bash

# Firestore Indexes Deployment Script
# This script deploys the required composite indexes for the Claims Management Application

set -e  # Exit on any error

echo "🚀 Starting Firestore Indexes Deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

# Check if firestore.indexes.json exists
if [ ! -f "firestore.indexes.json" ]; then
    echo "❌ firestore.indexes.json not found in current directory"
    exit 1
fi

echo "📋 Found firestore.indexes.json, proceeding with deployment..."

# Deploy indexes
echo "🔄 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

echo "✅ Firestore indexes deployment completed successfully!"
echo ""
echo "📊 Next steps:"
echo "1. Monitor index build status in Firebase Console → Firestore → Indexes"
echo "2. Test application endpoints after indexes are built (may take 5-30 minutes)"
echo "3. Check application logs for any remaining 'requires an index' errors"
echo ""
echo "🔍 To check index status:"
echo "firebase firestore:indexes:list"
echo ""
echo "📖 For more information, see FIRESTORE_INDEXES_README.md"
