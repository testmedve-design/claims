"""
Authentication middleware for hospital users with role-based access control.

All decorators now require a fully verified Firebase ID token. Unsigned or
tampered tokens are explicitly rejected.
"""
from functools import wraps
from typing import Dict, Tuple

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
    'rm',  # Relationship Manager
    'review_request'  # Second level review team
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

PROCESSOR_ROLES = {
    'claim_processor',
    'claim_processor_l1',
    'claim_processor_l2',
    'claim_processor_l3',
    'claim_processor_l4',
}

RM_ROLES = {'rm', 'reconciler'}
HOSPITAL_ROLE = 'hospital_user'
HOSPITAL_ACCESS_ROLES = ['hospital_user', 'rp', 'employee', 'hospital_admin']  # Roles that can access hospital analytics
REVIEW_REQUEST_ROLE = 'review_request'


def _extract_and_verify_token(raw_token: str) -> Tuple[Dict, str]:
    """
    Normalize the Authorization header value, verify it against Firebase,
    and return the decoded token & uid.
    """
    if not raw_token:
        raise ValueError('No token provided')

    token = raw_token.strip()
    if token.lower().startswith('bearer '):
        token = token[7:]
    token = token.strip()

    if not token:
        raise ValueError('No token provided')

    # Debug logging for token verification issues (truncate token for safety)
    token_preview = f"{token[:10]}..." if len(token) > 10 else token
    print(f"[AUTH] Verifying Firebase token: {token_preview}")

    try:
        decoded_token = auth.verify_id_token(token)
    except auth.ExpiredIdTokenError as exc:
        raise ValueError('Token has expired') from exc
    except auth.RevokedIdTokenError as exc:
        raise ValueError('Token has been revoked') from exc
    except auth.InvalidIdTokenError as exc:
        raise ValueError(f'Failed to verify Firebase ID token: {exc}') from exc
    except Exception as exc:  # pragma: no cover - defensive safeguard
        raise ValueError(f'Failed to verify Firebase token: {exc}') from exc

    uid = decoded_token.get('uid')
    if not uid:
        raise ValueError('Token missing uid claim')

    return decoded_token, uid


def _get_user_record(uid: str) -> Dict:
    """
    Fetch the user document from Firestore.
    """
    db = get_firestore()
    user_doc = db.collection('users').document(uid).get()
    if not user_doc.exists:
        raise LookupError('User not found')
    return user_doc.to_dict()


def _derive_user_name(user_data: Dict) -> str:
    """
    Compute a display name from the available user data fields.
    """
    return (
        user_data.get('name', '') or
        user_data.get('display_name', '') or
        user_data.get('full_name', '') or
        f"{user_data.get('first_name', '')} {user_data.get('last_name', '')}".strip() or
        user_data.get('email', '').split('@')[0].replace('.', ' ').replace('_', ' ').title() or
        'Unknown User'
    )


def require_claims_access(f):
    """Decorator for claims module - allows hospital_user, claim_processor, reconciler ONLY"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            decoded_token, uid = _extract_and_verify_token(request.headers.get('Authorization'))
            user_data = _get_user_record(uid)
            user_role = user_data.get('role', '').lower()
            
            if user_role in BLOCKED_ROLES:
                return jsonify({
                    'error': 'Access denied',
                    'message': 'Administrators cannot access the claims module',
                    'allowed_roles': ALLOWED_CLAIMS_ROLES
                }), 403
            
            if user_role not in ALLOWED_CLAIMS_ROLES:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Your role ({user_role}) is not authorized to access claims',
                    'allowed_roles': ALLOWED_CLAIMS_ROLES
                }), 403
            
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            
            print(f"\n{'='*80}")
            print(f"MIDDLEWARE (require_claims_access): Extracting hospital info")
            print(f"  User Email: {user_data.get('email', '')}")
            print(f"  User Role: {user_role}")
            print(f"  Entity Assignments: {entity_assignments}")
            print(f"  Hospitals: {hospitals}")
            
            hospital_id = ''
            hospital_name = ''
            if hospitals:
                hospital_id = hospitals[0].get('id', '')
                hospital_name = hospitals[0].get('name', '')
                print(f"  ✓ Extracted Hospital ID: '{hospital_id}'")
                print(f"  ✓ Extracted Hospital Name: '{hospital_name}'")
            else:
                print(f"  ⚠️ WARNING: No hospital assignments found!")
                print(f"  Full user_data keys: {list(user_data.keys())}")
            print(f"{'='*80}\n")
            
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            request.user_name = _derive_user_name(user_data)
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
        except LookupError as err:
            return jsonify({'error': str(err)}), 404
    
    return decorated_function

def require_processor_access(f):
    """Decorator for claim processor role ONLY"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            decoded_token, uid = _extract_and_verify_token(request.headers.get('Authorization'))
            user_data = _get_user_record(uid)
            user_role = user_data.get('role', '').lower()
            
            if user_role not in PROCESSOR_ROLES:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Claim processor access required. Your role: {user_role}',
                    'required_role': 'claim_processor (any level)'
                }), 403
            
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            request.user_name = _derive_user_name(user_data)

            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            hospital_id = hospitals[0].get('id', '') if hospitals else ''
            hospital_name = hospitals[0].get('name', '') if hospitals else ''
            
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
        except LookupError as err:
            return jsonify({'error': str(err)}), 404
    
    return decorated_function


def require_hospital_access(f):
    """Decorator for hospital-related roles - allows hospital_user, rp, employee, hospital_admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            decoded_token, uid = _extract_and_verify_token(request.headers.get('Authorization'))
            user_data = _get_user_record(uid)
            user_role = user_data.get('role', '').lower()
            
            if user_role not in HOSPITAL_ACCESS_ROLES:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Hospital access required. Your role: {user_role}. Allowed roles: {HOSPITAL_ACCESS_ROLES}',
                    'required_roles': HOSPITAL_ACCESS_ROLES
                }), 403
            
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            
            entity_assignments = user_data.get('entity_assignments', {})
            hospitals = entity_assignments.get('hospitals', [])
            hospital_id = hospitals[0].get('id', '') if hospitals else ''
            hospital_name = hospitals[0].get('name', '') if hospitals else ''

            request.user_id = uid
            request.user_email = user_data.get('email', '')
            request.user_name = _derive_user_name(user_data)
            request.hospital_id = hospital_id
            request.hospital_name = hospital_name
            
            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
        except LookupError as err:
            return jsonify({'error': str(err)}), 404
    
    return decorated_function


def require_rm_access(f):
    """Decorator for RM (Relationship Manager) and Reconciler roles"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            decoded_token, uid = _extract_and_verify_token(request.headers.get('Authorization'))
            user_data = _get_user_record(uid)
            user_role = user_data.get('role', '').lower()
            
            if user_role not in RM_ROLES:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'RM/Reconciler access required. Your role: {user_role}',
                    'required_role': 'rm or reconciler'
                }), 403
            
            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            request.user_name = _derive_user_name(user_data)

            entity_assignments = user_data.get('entity_assignments', {})
            request.entity_assignments = entity_assignments
            request.assigned_payers = entity_assignments.get('payers', [])
            request.assigned_hospitals = entity_assignments.get('hospitals', [])
            
            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
        except LookupError as err:
            return jsonify({'error': str(err)}), 404
    
    return decorated_function


def require_review_request_access(f):
    """Decorator for Review Request role (second-level reviewers)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)

        try:
            decoded_token, uid = _extract_and_verify_token(request.headers.get('Authorization'))
            user_data = _get_user_record(uid)
            user_role = user_data.get('role', '').lower()

            if user_role != REVIEW_REQUEST_ROLE:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'Review Request access required. Your role: {user_role}',
                    'required_role': REVIEW_REQUEST_ROLE
                }), 403

            request.user = decoded_token
            request.user_data = user_data
            request.user_role = user_role
            request.user_id = uid
            request.user_email = user_data.get('email', '')
            request.user_name = _derive_user_name(user_data)

            entity_assignments = user_data.get('entity_assignments', {}) or {}
            request.entity_assignments = entity_assignments
            request.assigned_payers = entity_assignments.get('payers', [])
            request.assigned_hospitals = entity_assignments.get('hospitals', [])
            request.review_level = entity_assignments.get('review_level')
            request.max_claim_amount = entity_assignments.get('max_claim_amount')

            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
        except LookupError as err:
            return jsonify({'error': str(err)}), 404

    return decorated_function


def require_auth(f):
    """General authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        try:
            decoded_token, _ = _extract_and_verify_token(request.headers.get('Authorization'))
            request.user = decoded_token
            return f(*args, **kwargs)
        except ValueError as err:
            return jsonify({'error': 'Invalid token', 'details': str(err)}), 401
    
    return decorated_function
