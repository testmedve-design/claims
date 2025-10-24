#!/bin/bash
# Start the backend Flask application

echo "🚀 Starting Hospital Claims Management System Backend..."

# Navigate to backend directory
cd backend

# Activate virtual environment if it exists
if [ -d "../venv" ]; then
    echo "📦 Activating virtual environment..."
    source ../venv/bin/activate
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📋 Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the Flask application
echo "🌟 Starting Flask application..."
python app.py
