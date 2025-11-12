"""
Authentication routes for hospital users - PURE FIREBASE AUTH
"""
from flask import Blueprint, request, jsonify
from firebase_admin import auth
from firebase_config import get_firestore
from middleware import ALLOWED_CLAIMS_ROLES, BLOCKED_ROLES

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login endpoint - authenticate existing hospital user using Firebase Auth"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Verify user credentials using Firebase REST API
        try:
            import requests
            import json
            import os
            
            # Get Firebase Web API key from environment variable or use default
            FIREBASE_WEB_API_KEY = os.environ.get('FIREBASE_WEB_API_KEY', 'AIzaSyAaqgkXJXkntZBs7QQyss7Hy_HECyMXE2c')
            
            print(f"🔍 DEBUG: FIREBASE_WEB_API_KEY = {FIREBASE_WEB_API_KEY}")
            print(f"🔍 DEBUG: API key length = {len(FIREBASE_WEB_API_KEY) if FIREBASE_WEB_API_KEY else 0}")
            
            if not FIREBASE_WEB_API_KEY:
                # Fallback: Use a temporary approach for development
                # In production, you MUST set FIREBASE_WEB_API_KEY environment variable
                print("⚠️  WARNING: FIREBASE_WEB_API_KEY not set. Using insecure fallback!")
                print("⚠️  SECURITY RISK: Password verification is disabled!")
                print(f"⚠️  User {email} logged in without password verification!")
                
                # For development only - get user by email without password verification
                user = auth.get_user_by_email(email)
            else:
                # Firebase Auth REST API endpoint
                auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
                
                print(f"🔍 DEBUG: Using Firebase API key: {FIREBASE_WEB_API_KEY[:10]}...")
                print(f"🔍 DEBUG: Auth URL: {auth_url}")
                
                # Prepare the request payload
                auth_payload = {
                    "email": email,
                    "password": password,
                    "returnSecureToken": True
                }
                
                print(f"🔍 DEBUG: Auth payload: {auth_payload}")
                
                # Make the authentication request
                auth_response = requests.post(auth_url, json=auth_payload)
                
                print(f"🔍 DEBUG: Auth response status: {auth_response.status_code}")
                print(f"🔍 DEBUG: Auth response body: {auth_response.text}")
                
                if auth_response.status_code != 200:
                    # Authentication failed
                    error_data = auth_response.json()
                    error_message = error_data.get('error', {}).get('message', 'Invalid email or password')
                    
                    # Map Firebase error messages to user-friendly messages
                    if 'INVALID_PASSWORD' in error_message or 'EMAIL_NOT_FOUND' in error_message:
                        return jsonify({'error': 'Invalid email or password'}), 401
                    elif 'USER_DISABLED' in error_message:
                        return jsonify({'error': 'Account has been disabled'}), 401
                    elif 'TOO_MANY_ATTEMPTS_TRY_LATER' in error_message:
                        return jsonify({'error': 'Too many failed attempts. Please try again later'}), 429
                    else:
                        return jsonify({'error': 'Authentication failed'}), 401
                
                # Authentication successful
                auth_data = auth_response.json()
                firebase_uid = auth_data.get('localId')
                
                # Get user data from Firebase Admin SDK
                user = auth.get_user(firebase_uid)
            
        except requests.exceptions.RequestException as e:
            print(f"Firebase Auth API error: {str(e)}")
            return jsonify({'error': 'Authentication service unavailable'}), 503
        except auth.UserNotFoundError:
            return jsonify({'error': 'Invalid email or password'}), 401
        except Exception as e:
            print(f"Authentication error: {str(e)}")
            return jsonify({'error': 'Authentication failed'}), 401
        
        # Get user data from Firestore
        db = get_firestore()
        user_doc = db.collection('users').document(user.uid).get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found in system'}), 404
        
        user_data = user_doc.to_dict()
        user_role = user_data.get('role', '').lower()
        
        # Check if role is blocked
        if user_role in BLOCKED_ROLES:
            return jsonify({
                'error': 'Access denied',
                'message': 'Administrators cannot access the claims module',
                'allowed_roles': ALLOWED_CLAIMS_ROLES
            }), 403
        
        # Check if role is allowed
        if user_role not in ALLOWED_CLAIMS_ROLES:
            return jsonify({
                'error': 'Access denied', 
                'message': f'Your role ({user_role}) is not authorized',
                'allowed_roles': ALLOWED_CLAIMS_ROLES
            }), 403
        
        id_token = None
        refresh_token = None
        if 'auth_data' in locals():
            id_token = auth_data.get('idToken')
            refresh_token = auth_data.get('refreshToken')

        # Generate custom token for optional client usage
        custom_token = auth.create_custom_token(user.uid).decode('utf-8')

        if not id_token:
            # As a fallback (should not happen with proper Firebase REST auth), return 503
            return jsonify({
                'error': 'Failed to obtain Firebase ID token. Please check FIREBASE_WEB_API_KEY configuration.'
            }), 503
        
        # Extract hospital information from entity_assignments
        entity_assignments = user_data.get('entity_assignments', {})
        hospitals = entity_assignments.get('hospitals', [])
        
        # Get the first hospital assignment
        hospital_id = ''
        hospital_name = ''
        if hospitals and len(hospitals) > 0:
            hospital_id = hospitals[0].get('id', '')
            hospital_name = hospitals[0].get('name', '')
        
        # Return user data with token
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'uid': user.uid,
                'email': user.email,
                'displayName': user_data.get('displayName', ''),
                'role': user_data.get('role'),
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'entity_assignments': entity_assignments
            },
            'token': id_token,
            'id_token': id_token,
            'custom_token': custom_token,
            'refresh_token': refresh_token,
            'expires_in': 3600
        })
        
    except auth.UserNotFoundError:
        return jsonify({'error': 'Invalid email or password'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/validate-token', methods=['GET'])
def validate_token():
    """Validate token and return user info"""
    try:
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'valid': False, 'error': 'No token provided'}), 401
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Verify the token
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Get user data from Firestore
        db = get_firestore()
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            return jsonify({'valid': False, 'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        
        # Extract hospital information from entity_assignments
        entity_assignments = user_data.get('entity_assignments', {})
        hospitals = entity_assignments.get('hospitals', [])
        
        # Get the first hospital assignment
        hospital_id = ''
        hospital_name = ''
        if hospitals and len(hospitals) > 0:
            hospital_id = hospitals[0].get('id', '')
            hospital_name = hospitals[0].get('name', '')
        
        return jsonify({
            'valid': True,
            'user': {
                'uid': uid,
                'email': decoded_token.get('email', ''),
                'displayName': user_data.get('displayName', ''),
                'role': user_data.get('role'),
                'hospital_id': hospital_id,
                'hospital_name': hospital_name,
                'entity_assignments': entity_assignments
            }
        }), 200
        
    except auth.InvalidIdTokenError:
        return jsonify({'valid': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 401