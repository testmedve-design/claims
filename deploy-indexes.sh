#!/bin/bash

# Firestore Indexes Deployment Script
# This script deploys all Firestore indexes defined in firestore.indexes.json

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Firestore Indexes Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if firestore.indexes.json exists
if [ ! -f "firestore.indexes.json" ]; then
    echo -e "${RED}Error: firestore.indexes.json not found!${NC}"
    echo "Please ensure you're in the project root directory."
    exit 1
fi

echo -e "${GREEN}✓ Found firestore.indexes.json${NC}"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI is not installed!${NC}"
    echo ""
    echo "Install it with:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Firebase CLI is installed${NC}"

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠ You are not logged in to Firebase${NC}"
    echo "Logging in..."
    firebase login
fi

echo -e "${GREEN}✓ Logged in to Firebase${NC}"

# Count indexes
INDEX_COUNT=$(grep -o '"collectionGroup"' firestore.indexes.json | wc -l | tr -d ' ')
echo -e "${BLUE}Total indexes to deploy: ${INDEX_COUNT}${NC}"
echo ""

# Show current Firebase project
echo -e "${YELLOW}Current Firebase project:${NC}"
firebase projects:list | grep -A1 "Project ID" || echo "Unable to determine current project"
echo ""

# Ask for confirmation
read -p "Deploy indexes to this project? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy indexes
echo -e "${BLUE}Deploying indexes...${NC}"
echo ""

if firebase deploy --only firestore:indexes; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ Indexes deployed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Note: Index building may take 5-60 minutes depending on data size.${NC}"
    echo ""
    echo "Monitor progress:"
    echo "  1. Run: firebase firestore:indexes"
    echo "  2. Or visit: https://console.firebase.google.com/project/_/firestore/indexes"
    echo ""
    echo -e "${BLUE}Index status will be one of:${NC}"
    echo "  • CREATING - Index is being built"
    echo "  • ENABLED  - Index is ready to use"
    echo "  • ERROR    - Index build failed (check console for details)"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Deployment failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Not logged in to Firebase (run: firebase login)"
    echo "  2. Wrong project selected (run: firebase use <project-id>)"
    echo "  3. Invalid index configuration (check firestore.indexes.json syntax)"
    echo "  4. Insufficient permissions (ensure you have admin access)"
    echo ""
    exit 1
fi

# Show current index status
echo -e "${BLUE}Fetching current index status...${NC}"
echo ""
firebase firestore:indexes || echo -e "${YELLOW}Unable to fetch index status. Check Firebase Console.${NC}"

echo ""
echo -e "${GREEN}Deployment complete!${NC}"

