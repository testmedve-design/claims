#!/bin/bash
# Hospital Claims Management System - Startup Script for Render
echo "🚀 Starting Hospital Claims Management System..."

# Set environment variables
export FLASK_ENV=production
export DEBUG=false
export HOST=0.0.0.0
export PORT=${PORT:-10000}

echo "📍 Environment: $FLASK_ENV"
echo "🔧 Debug: $DEBUG"
echo "🌐 Host: $HOST"
echo "🔌 Port: $PORT"

# Start Gunicorn
echo "🚀 Starting Gunicorn server..."
exec gunicorn wsgi:application
