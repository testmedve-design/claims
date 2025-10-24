"""
Firebase configuration and health check routes
"""
from flask import Blueprint, jsonify, request
from firebase_admin import auth, firestore
from firebase_config import get_firestore, get_storage
from config import Config

firebase_bp = Blueprint('firebase', __name__)

@firebase_bp.route('/config', methods=['GET'])
def get_firebase_config():
    """Get Firebase configuration for frontend"""
    try:
        config = {
            "project_id": Config.FIREBASE_PROJECT_ID,
            "auth_domain": f"{Config.FIREBASE_PROJECT_ID}.firebaseapp.com",
            "storage_bucket": Config.FIREBASE_STORAGE_BUCKET,
            "messaging_sender_id": "111793664073187114321",
            "database_url": f"https://{Config.FIREBASE_PROJECT_ID}.firebaseio.com",
            "services": {
                "firestore": True,
                "storage": True,
                "auth": True,
                "functions": False
            }
        }
        
        return jsonify({
            "success": True,
            "config": config,
            "message": "Firebase configuration retrieved successfully"
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to get Firebase configuration",
            "details": str(e)
        }), 500

@firebase_bp.route('/health', methods=['GET'])
def firebase_health_check():
    """Check Firebase connection health"""
    try:
        # Test Firestore connection
        db = get_firestore()
        # Simple test query
        test_collection = db.collection('_health_check').limit(1)
        test_collection.get()
        
        # Test Storage connection
        storage = get_storage()
        
        return jsonify({
            "success": True,
            "message": "Firebase connection is healthy",
            "firebase": {
                "firestore": {
                    "status": "connected",
                    "database_id": Config.FIREBASE_PROJECT_ID
                },
                "storage": {
                    "status": "connected",
                    "bucket": Config.FIREBASE_STORAGE_BUCKET
                },
                "auth": {
                    "status": "connected",
                    "project_id": Config.FIREBASE_PROJECT_ID
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Firebase connection failed",
            "details": str(e)
        }), 500

@firebase_bp.route('/verify-token', methods=['POST'])
def verify_firebase_token():
    """Verify Firebase ID token and return user profile"""
    try:
        data = request.get_json()
        id_token = data.get('id_token')
        
        if not id_token:
            return jsonify({
                'success': False,
                'error': 'ID token is required'
            }), 400
        
        # Verify the Firebase ID token
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        
        # Get user data from Firestore by email
        db = get_firestore()
        user_email = decoded_token.get('email', '')
        users_query = db.collection('users').where('email', '==', user_email)
        users_docs = users_query.get()
        
        if not users_docs:
            return jsonify({
                'success': False,
                'error': 'User not found in database'
            }), 404
        
        # Get the first matching user
        user_doc = users_docs[0]
        user_data = user_doc.to_dict()
        
        # Extract hospital information from entity_assignments
        entity_assignments = user_data.get('entity_assignments', {})
        hospitals = entity_assignments.get('hospitals', [])
        
        # Get the first hospital assignment (most users have one hospital)
        hospital_id = ''
        hospital_name = ''
        if hospitals and len(hospitals) > 0:
            hospital_id = hospitals[0].get('id', '')
            hospital_name = hospitals[0].get('name', '')
        
        # Return user profile
        return jsonify({
            'success': True,
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
        return jsonify({
            'success': False,
            'error': 'Invalid ID token'
        }), 401
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Token verification failed',
            'details': str(e)
        }), 500

@firebase_bp.route('/collections', methods=['GET'])
def get_firestore_collections():
    """Get list of Firestore collections"""
    try:
        db = get_firestore()
        
        # Get all collections
        collections = []
        for collection in db.collections():
            collections.append({
                'name': collection.id
            })
        
        return jsonify({
            'success': True,
            'collections': collections,
            'total': len(collections)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get collections',
            'details': str(e)
        }), 500

@firebase_bp.route('/users', methods=['GET'])
def get_users():
    """Get list of users from Firestore"""
    try:
        email = request.args.get('email')
        db = get_firestore()
        users_ref = db.collection('users')
        
        if email:
            # Search for specific user by email
            users_query = users_ref.where('email', '==', email)
            users_docs = users_query.get()
        else:
            # Get all users (no limit)
            users_docs = users_ref.get()
        
        users = []
        for doc in users_docs:
            user_data = doc.to_dict()
            user_data['uid'] = doc.id
            users.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users,
            'total': len(users)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get users',
            'details': str(e)
        }), 500

@firebase_bp.route('/payer-affiliations', methods=['GET'])
def get_payer_affiliations():
    """Get payer affiliations from Firestore"""
    try:
        hospital_id = request.args.get('hospital_id')
        db = get_firestore()
        affiliations_ref = db.collection('payer_affiliations')
        
        if hospital_id:
            affiliations_query = affiliations_ref.where('hospital_id', '==', hospital_id)
        else:
            affiliations_query = affiliations_ref.limit(10)  # Get first 10 for testing
        
        affiliations_docs = affiliations_query.get()
        
        affiliations = []
        for doc in affiliations_docs:
            affiliation_data = doc.to_dict()
            affiliation_data['affiliation_id'] = doc.id
            affiliations.append(affiliation_data)
        
        return jsonify({
            'success': True,
            'affiliations': affiliations,
            'total': len(affiliations)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to get payer affiliations',
            'details': str(e)
        }), 500

