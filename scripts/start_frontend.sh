#!/bin/bash
# Start the frontend Next.js application

echo "🚀 Starting Hospital Claims Management System Frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the Next.js development server
echo "🌟 Starting Next.js development server..."
npm run dev
