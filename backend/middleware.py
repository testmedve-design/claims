"""
Authentication middleware for hospital users with role-based access control
"""
from functools import wraps
from flask import request, jsonify
from firebase_admin import auth
from firebase_config import get_firestore

# Allowed roles for claims module
ALLOWED_CLAIMS_ROLES = [
    'hospital_user',
    'claim_processor',
    'claim_processor_l1',  # Up to 50K
    'claim_processor_l2',  # Up to 1 lakh
    'claim_processor_l3',  # Up to 2 lakhs
    'claim_processor_l4',  # All amounts
    'reconciler',
    'rm'  # Relationship Manager
]

# Blocked roles (NO ACCESS to Claims Module)
BLOCKED_ROLES = [
    'admin',
    'super_admin',
    'system_admin',
    'hospital_admin',
    'rp',
    'employee'
]

def require_claims_access(f):
    """Decorator for claims module - allows hospital_user, claim_processor, reconciler ONLY"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token - handle both ID tokens and custom tokens
            try:
                # First, try to verify as ID token
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token['uid']
            except Exception as id_token_error:
                # If ID token verification fails, it might be a custom token or backend token
                try:
                    import jwt
                    decoded_token = jwt.decode(token, options={"verify_signature": False})
                    uid = decoded_token.get('uid')
                    if not uid:
                        raise ValueError("Invalid token format - no UID found")
                except Exception as custom_token_error:
                    # If JWT decoding fails, it might be a Firebase custom token
                    # Firebase custom tokens contain the UID directly in the payload
                    try:
                        import jwt
                        decoded_token = jwt.decode(token, options={"verify_signature": False})
                        uid = decoded_token.get('uid')
                        if uid:
                            print(f"DEBUG: Using Firebase custom token for UID: {uid}")
                        else:
                            raise ValueError("No UID found in custom token")
                    except Exception as firebase_error:
                        raise ValueError(f"Invalid token: {str(custom_token_error)}")
            
            # Get user data from Firestore
            db = get_firestore()
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', '').lower()
            
            # Check if role is blocked (Admin roles are NOT allowed)
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
                    'message': f'Your role ({user_role}) is not authorized to access claims',
                    'allowed_roles': ALLOWED_CLAIMS_ROLES
                }), 403
            
            # Store user info in request
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            
            # Extract hospital information from entity_assignments
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            print(f"\n{'='*80}")
            print(f"MIDDLEWARE (require_claims_access): Extracting hospital info")
            print(f"  User Email: {user_data.get('email', '')}")
            print(f"  User Role: {user_role}")
            print(f"  Entity Assignments: {entity_assignments}")
            print(f"  Hospitals: {hospitals}")
            
            # Get the first hospital assignment (most users have one hospital)
            hospital_id = ''
            hospital_name = ''
            if hospitals and len(hospitals) > 0:
                hospital_id = hospitals[0].get('id', '')
                hospital_name = hospitals[0].get('name', '')
                print(f"  ✓ Extracted Hospital ID: '{hospital_id}'")
                print(f"  ✓ Extracted Hospital Name: '{hospital_name}'")
            else:
                print(f"  ⚠️ WARNING: No hospital assignments found!")
                print(f"  Full user_data keys: {list(user_data.keys())}")
            print(f"{'='*80}\n")
            
            # Set request attributes for use in routes
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            
            # Debug: Print user data to see what fields are available
            print(f"🔍 User data fields: {list(user_data.keys())}")
            print(f"🔍 User name field: {user_data.get('name', 'NOT_FOUND')}")
            print(f"🔍 User display_name field: {user_data.get('display_name', 'NOT_FOUND')}")
            print(f"🔍 User full_name field: {user_data.get('full_name', 'NOT_FOUND')}")
            print(f"🔍 User first_name field: {user_data.get('first_name', 'NOT_FOUND')}")
            print(f"🔍 User last_name field: {user_data.get('last_name', 'NOT_FOUND')}")
            
            # Try multiple name fields
            user_name = (user_data.get('name', '') or 
                        user_data.get('display_name', '') or 
                        user_data.get('full_name', '') or 
                        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or
                        user_data.get('email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title() or
                        'Unknown User')
            
            print(f"🔍 Extracted user name: '{user_name}'")
            request.user_name = user_name
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function

def require_processor_access(f):
    """Decorator for claim processor role ONLY"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token - handle both ID tokens and custom tokens
            try:
                # First, try to verify as ID token
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token['uid']
            except Exception as id_token_error:
                # If ID token verification fails, it might be a custom token
                try:
                    import jwt
                    decoded_token = jwt.decode(token, options={"verify_signature": False})
                    uid = decoded_token.get('uid')
                    if not uid:
                        raise ValueError("Invalid token format - no UID found")
                except Exception as custom_token_error:
                    # If JWT decoding fails, it might be a Firebase custom token
                    # Firebase custom tokens contain the UID directly in the payload
                    try:
                        import jwt
                        decoded_token = jwt.decode(token, options={"verify_signature": False})
                        uid = decoded_token.get('uid')
                        if uid:
                            print(f"DEBUG: Using Firebase custom token for UID: {uid}")
                        else:
                            raise ValueError("No UID found in custom token")
                    except Exception as firebase_error:
                        raise ValueError(f"Invalid token: {str(custom_token_error)}")
            
            # Get user data from Firestore
            db = get_firestore()
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', '').lower()
            
            # Check if user is a claim processor (including all levels L1-L4)
            if user_role not in ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4']:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Claim processor access required. Your role: {user_role}',
                    'required_role': 'claim_processor (any level)'
                }), 403
            
            # Store user info in request
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            
            # Debug: Print user data to see what fields are available
            print(f"🔍 User data fields: {list(user_data.keys())}")
            print(f"🔍 User name field: {user_data.get('name', 'NOT_FOUND')}")
            print(f"🔍 User display_name field: {user_data.get('display_name', 'NOT_FOUND')}")
            print(f"🔍 User full_name field: {user_data.get('full_name', 'NOT_FOUND')}")
            print(f"🔍 User first_name field: {user_data.get('first_name', 'NOT_FOUND')}")
            print(f"🔍 User last_name field: {user_data.get('last_name', 'NOT_FOUND')}")
            
            # Try multiple name fields
            user_name = (user_data.get('name', '') or 
                        user_data.get('display_name', '') or 
                        user_data.get('full_name', '') or 
                        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or
                        user_data.get('email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title() or
                        'Unknown User')
            
            print(f"🔍 Extracted user name: '{user_name}'")
            request.user_name = user_name
            
            # Extract hospital information from entity_assignments
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            # Get the first hospital assignment
            hospital_id = ''
            hospital_name = ''
            if hospitals and len(hospitals) > 0:
                hospital_id = hospitals[0].get('id', '')
                hospital_name = hospitals[0].get('name', '')
            
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function

def require_hospital_access(f):
    """Decorator for hospital users ONLY - strict role checking"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token - handle both ID tokens and custom tokens
            try:
                # First, try to verify as ID token
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token['uid']
            except Exception as id_token_error:
                # If ID token verification fails, it might be a custom token
                try:
                    import jwt
                    decoded_token = jwt.decode(token, options={"verify_signature": False})
                    uid = decoded_token.get('uid')
                    if not uid:
                        raise ValueError("Invalid token format - no UID found")
                except Exception as custom_token_error:
                    # If JWT decoding fails, it might be a Firebase custom token
                    # Firebase custom tokens contain the UID directly in the payload
                    try:
                        import jwt
                        decoded_token = jwt.decode(token, options={"verify_signature": False})
                        uid = decoded_token.get('uid')
                        if uid:
                            print(f"DEBUG: Using Firebase custom token for UID: {uid}")
                        else:
                            raise ValueError("No UID found in custom token")
                    except Exception as firebase_error:
                        raise ValueError(f"Invalid token: {str(custom_token_error)}")
            
            # Get user data from Firestore
            db = get_firestore()
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', '').lower()
            
            # STRICT CHECK: Only allow hospital_user role
            if user_role != 'hospital_user':
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Hospital user access required. Your role: {user_role}',
                    'required_role': 'hospital_user'
                }), 403
            
            # Store user info in request
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            
            # Extract hospital information from entity_assignments
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            # Get the first hospital assignment (most users have one hospital)
            hospital_id = ''
            hospital_name = ''
            if hospitals and len(hospitals) > 0:
                hospital_id = hospitals[0].get('id', '')
                hospital_name = hospitals[0].get('name', '')
            
            # Set request attributes for use in routes
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            
            # Debug: Print user data to see what fields are available
            print(f"🔍 User data fields: {list(user_data.keys())}")
            print(f"🔍 User name field: {user_data.get('name', 'NOT_FOUND')}")
            print(f"🔍 User display_name field: {user_data.get('display_name', 'NOT_FOUND')}")
            print(f"🔍 User full_name field: {user_data.get('full_name', 'NOT_FOUND')}")
            print(f"🔍 User first_name field: {user_data.get('first_name', 'NOT_FOUND')}")
            print(f"🔍 User last_name field: {user_data.get('last_name', 'NOT_FOUND')}")
            
            # Try multiple name fields
            user_name = (user_data.get('name', '') or 
                        user_data.get('display_name', '') or 
                        user_data.get('full_name', '') or 
                        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or
                        user_data.get('email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title() or
                        'Unknown User')
            
            print(f"🔍 Extracted user name: '{user_name}'")
            request.user_name = user_name
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function

def require_rm_access(f):
    """Decorator for RM (Relationship Manager) and Reconciler roles"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token - handle both ID tokens and custom tokens
            try:
                # First, try to verify as ID token
                decoded_token = auth.verify_id_token(token)
                uid = decoded_token['uid']
            except Exception as id_token_error:
                # If ID token verification fails, it might be a custom token
                try:
                    import jwt
                    decoded_token = jwt.decode(token, options={"verify_signature": False})
                    uid = decoded_token.get('uid')
                    if not uid:
                        raise ValueError("Invalid token format - no UID found")
                except Exception as custom_token_error:
                    raise ValueError(f"Invalid token: {str(custom_token_error)}")
            
            # Get user data from Firestore
            db = get_firestore()
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                return jsonify({'error': 'User not found'}), 404
            
            user_data = user_doc.to_dict()
            user_role = user_data.get('role', '').lower()
            
            # Check if user is an RM or Reconciler (both have same access)
            if user_role not in ['rm', 'reconciler']:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'RM/Reconciler access required. Your role: {user_role}',
                    'required_role': 'rm or reconciler'
                }), 403
            
            # Store user info in request
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            
            # Try multiple name fields
            user_name = (user_data.get('name', '') or 
                        user_data.get('display_name', '') or 
                        user_data.get('full_name', '') or 
                        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or
                        user_data.get('email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title() or
                        'Unknown User')
            
            request.user_name = user_name
            
            # Extract entity assignments for payers and hospitals
            entity_assignments = user_data.get('entity_assignments', {})
            payers = entity_assignments.get('payers', [])
            hospitals = entity_assignments.get('hospitals', [])
            
            request.entity_assignments = entity_assignments
            request.assigned_payers = payers
            request.assigned_hospitals = hospitals
            
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function

def require_auth(f):
    """General authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function
