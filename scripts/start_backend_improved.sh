#!/bin/bash

# Hospital Claims Management System - Backend Startup Script
# This script fixes import path issues and starts the backend properly

echo "🚀 Starting Hospital Claims Management System Backend..."

# Change to backend directory to fix import paths
cd "$(dirname "$0")/backend"

# Activate virtual environment
source ../venv/bin/activate

# Copy Firebase credentials if not present
if [ ! -f "ServiceAccountKey.json" ]; then
    echo "📋 Copying Firebase credentials..."
    cp ../config/ServiceAccountKey.json .
fi

# Set environment variables
export FLASK_DEBUG=True
export FLASK_ENV=development
export PORT=5002
export HOST=0.0.0.0

# Start the application
echo "📍 Starting server at http://localhost:5002"
echo "🔧 Debug Mode: Enabled"
echo "📊 Environment: Development"
echo ""

python app.py
