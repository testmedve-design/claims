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
echo "📁 Current directory: $(pwd)"
echo "📄 Files in current directory:"
ls -la
echo "🔍 Looking for wsgi.py..."
if [ -f "wsgi.py" ]; then
    echo "✅ Found wsgi.py"
else
    echo "❌ wsgi.py not found in current directory"
fi

# Start Gunicorn with explicit path
exec gunicorn --bind 0.0.0.0:$PORT wsgi:application
