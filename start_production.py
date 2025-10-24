#!/usr/bin/env python3
"""
Production startup script for Hospital Claims Management System
"""
import os
import sys

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set production environment variables
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('DEBUG', 'false')
os.environ.setdefault('HOST', '0.0.0.0')
os.environ.setdefault('PORT', os.environ.get('PORT', '10000'))

# Import and run the Flask app
from backend.app import create_app

if __name__ == '__main__':
    app = create_app()
    
    # Get port from environment variable
    port = int(os.environ.get('PORT', 10000))
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"🚀 Starting Hospital Claims Management System...")
    print(f"📍 Server: http://{host}:{port}")
    print(f"🔧 Environment: {os.environ.get('FLASK_ENV', 'production')}")
    
    # Run the application
    app.run(
        host=host,
        port=port,
        debug=False,
        threaded=True
    )
