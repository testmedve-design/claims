#!/usr/bin/env python3
"""
WSGI entry point for Hospital Claims Management System
Production deployment with Gunicorn
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

# Import the Flask application
from backend.app import create_app

# Create the application instance
application = create_app()

if __name__ == '__main__':
    # This is for local testing only
    port = int(os.environ.get('PORT', 10000))
    host = os.environ.get('HOST', '0.0.0.0')
    application.run(host=host, port=port, debug=False)
