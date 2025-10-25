#!/usr/bin/env python3
"""
Hospital Claims Management System - SIMPLIFIED STRUCTURE
"""
import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from firebase_config import initialize_firebase
import app_utils

# Import route modules
from routes.auth import auth_bp
from routes.claims import claims_bp
from routes.firebase import firebase_bp
from routes.drafts import drafts_bp
from routes.documents import documents_bp
from routes.resources import resources_bp
from routes.processor_routes import processor_bp as processor_routes_bp
from routes.new_claim_routes import new_claim_bp

def create_app():
    """Application factory pattern - SIMPLIFIED"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize CORS with proper configuration
    CORS(app, 
         origins=['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3004', 'http://127.0.0.1:3001'],
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
         expose_headers=['Content-Type', 'Authorization'],
         send_wildcard=False)
    
    # Initialize Firebase
    initialize_firebase()
    
    # Register blueprints - CLEAN STRUCTURE
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(claims_bp, url_prefix='/api/v1/claims')
    app.register_blueprint(firebase_bp, url_prefix='/api/firebase')
    app.register_blueprint(drafts_bp, url_prefix='/api/v1/drafts')
    app.register_blueprint(documents_bp, url_prefix='/api/v1/documents')
    app.register_blueprint(resources_bp, url_prefix='/api/resources')
    app.register_blueprint(new_claim_bp, url_prefix='/api/new-claim')
    app.register_blueprint(processor_routes_bp, url_prefix='/api/processor-routes')
    
    # Register error handlers
    app_utils.register_error_handlers(app)
    
    return app

def main():
    """Main application entry point - SIMPLIFIED"""
    try:
        # Create Flask application
        app = create_app()
        
        # Get configuration
        debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
        port = int(os.environ.get('PORT', 5002))
        host = os.environ.get('HOST', '0.0.0.0')
        
        print(f"🚀 Starting Hospital Claims Management System...")
        print(f"📍 Server: http://{host}:{port}")
        print(f"🔧 Debug Mode: {debug_mode}")
        print(f"📊 Environment: {os.environ.get('FLASK_ENV', 'production')}")
        
        # Run the application
        app.run(
            host=host,
            port=port,
            debug=debug_mode,
            threaded=True
        )
        
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
