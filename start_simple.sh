#!/bin/bash
# Simple startup script for Render
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

# Start Gunicorn with minimal configuration
echo "🚀 Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 wsgi:application
