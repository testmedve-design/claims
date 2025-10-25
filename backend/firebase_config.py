"""
Firebase configuration and initialization
"""
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage
from config import Config

# Global Firebase instances
db = None
storage_client = None

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global db, storage_client
    
    try:
        # Check if we're in production (using environment variables)
        firebase_credentials = os.environ.get('FIREBASE_CREDENTIALS')
        
        if firebase_credentials:
            # Production: Use environment variable
            print("🔧 Using Firebase credentials from environment variable")
            cred_dict = json.loads(firebase_credentials)
            cred = credentials.Certificate(cred_dict)
        else:
            # Development: Check if credentials file exists
            if os.path.exists(Config.FIREBASE_CREDENTIALS_PATH):
                print("🔧 Using Firebase credentials from file")
                cred = credentials.Certificate(Config.FIREBASE_CREDENTIALS_PATH)
            else:
                # Development mode: Use default credentials (for local testing)
                print("🔧 Development mode: Using default Firebase credentials")
                cred = credentials.ApplicationDefault()
        
        # Initialize Firebase Admin SDK
        firebase_admin.initialize_app(cred, {
            'storageBucket': Config.FIREBASE_STORAGE_BUCKET,
            'projectId': Config.FIREBASE_PROJECT_ID
        })
        
        # Initialize Firestore
        db = firestore.client()
        
        # Initialize Storage
        storage_client = storage.bucket()
        
        print("✅ Firebase Admin SDK initialized successfully")
        
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        raise e

def get_firestore():
    """Get Firestore client instance"""
    global db
    if db is None:
        initialize_firebase()
    return db

def get_storage():
    """Get Firebase Storage client instance"""
    global storage_client
    if storage_client is None:
        initialize_firebase()
    return storage_client
