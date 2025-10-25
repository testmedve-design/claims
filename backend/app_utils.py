"""
Error handlers and utilities for the Hospital Claims Management System
"""
from flask import jsonify
from firebase_config import get_firestore
from firebase_admin import firestore
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register error handlers for the Flask application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        return jsonify({
            'success': False,
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server due to malformed syntax.',
            'status_code': 400
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors"""
        return jsonify({
            'success': False,
            'error': 'Unauthorized',
            'message': 'Authentication is required to access this resource.',
            'status_code': 401
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors"""
        return jsonify({
            'success': False,
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource.',
            'status_code': 403
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        return jsonify({
            'success': False,
            'error': 'Not Found',
            'message': 'The requested resource was not found.',
            'status_code': 404
        }), 404
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error"""
        logger.error(f"Internal server error: {str(error)}")
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Please try again later.',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all unhandled exceptions"""
        logger.error(f"Unhandled exception: {str(error)}")
        return jsonify({
            'success': False,
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Please try again later.',
            'status_code': 500
        }), 500

def log_api_request(request, response=None, error=None):
    """Log API requests for debugging and monitoring"""
    try:
        db = get_firestore()
        
        log_data = {
            'method': request.method,
            'url': request.url,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'timestamp': firestore.SERVER_TIMESTAMP,
            'status_code': response.status_code if response else None,
            'error': str(error) if error else None
        }
        
        # Log to Firestore for monitoring
        db.collection('api_logs').add(log_data)
        
    except Exception as e:
        logger.error(f"Failed to log API request: {str(e)}")

def validate_required_fields(data, required_fields):
    """Validate that all required fields are present in the request data"""
    missing_fields = [field for field in required_fields if not data.get(field)]
    if missing_fields:
        return {
            'valid': False,
            'error': f'Missing required fields: {", ".join(missing_fields)}',
            'missing_fields': missing_fields
        }
    return {'valid': True}

def validate_business_rules(data):
    """Validate business rules for claims processing"""
    errors = []
    
    # Rule 1: Claimed Amount cannot exceed Total Authorized Amount
    total_authorized = float(data.get('total_authorized_amount', 0))
    claimed_amount = float(data.get('claimed_amount', 0))
    
    if claimed_amount > total_authorized:
        errors.append(f'Claimed Amount (₹{claimed_amount}) cannot exceed Total Authorized Amount (₹{total_authorized})')
    
    # Rule 2: TPA payer type requires insurer_name
    if data.get('payer_type') == 'TPA' and not data.get('insurer_name'):
        errors.append('Insurer Name is required when Payer Type is TPA')
    
    # Rule 3: Service dates validation
    service_start = data.get('service_start_date')
    service_end = data.get('service_end_date')
    
    if service_start and service_end and service_start > service_end:
        errors.append('Service start date cannot be after service end date')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }
