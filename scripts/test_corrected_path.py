#!/usr/bin/env python3
"""
Script to test if the corrected path exists in Firebase Storage
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.config.firebase_config import get_firestore, get_storage
from datetime import timedelta

def test_corrected_path():
    try:
        db = get_firestore()
        storage_client = get_storage()
        
        # Get document metadata
        doc_ref = db.collection('documents').document('doc_72e19415')
        doc = doc_ref.get()
        
        if doc.exists:
            doc_data = doc.to_dict()
            storage_path = doc_data.get('storage_path')
            print(f"Original storage path: {storage_path}")
            
            # Test corrected path
            corrected_path = storage_path.replace('IP_Claims//', 'IP_Claims/')
            print(f"Corrected storage path: {corrected_path}")
            
            # Test if corrected path exists
            try:
                blob = storage_client.blob(corrected_path)
                exists = blob.exists()
                print(f"Corrected path exists: {exists}")
                
                if exists:
                    # Generate signed URL with corrected path
                    signed_url = blob.generate_signed_url(expiration=timedelta(hours=1))
                    print(f"Signed URL with corrected path: {signed_url}")
                else:
                    print("Corrected path does not exist")
                    
            except Exception as e:
                print(f"Error checking corrected path: {e}")
            
            # Test original path
            try:
                blob = storage_client.blob(storage_path)
                exists = blob.exists()
                print(f"Original path exists: {exists}")
                
                if exists:
                    # Generate signed URL with original path
                    signed_url = blob.generate_signed_url(expiration=timedelta(hours=1))
                    print(f"Signed URL with original path: {signed_url}")
                    
            except Exception as e:
                print(f"Error checking original path: {e}")
                
        else:
            print("Document not found")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_corrected_path()
