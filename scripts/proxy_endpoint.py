@documents_bp.route('/proxy/<document_id>', methods=['GET'])
@require_claims_access
def proxy_document(document_id):
    """Proxy document content directly to avoid URL issues"""
    try:
        db = get_firestore()
        
        # Get document metadata
        doc_doc = db.collection('documents').document(document_id).get()
        
        if not doc_doc.exists:
            return jsonify({
                'success': False,
                'error': 'Document not found'
            }), 404
        
        doc_data = doc_doc.to_dict()
        
        # Get the actual storage path from the document metadata
        storage_path = doc_data.get('storage_path')
        
        if not storage_path:
            return jsonify({
                'success': False,
                'error': 'Storage path not found'
            }), 404
        
        try:
            storage_client = get_storage()
            blob = storage_client.blob(storage_path)
            
            # Download the file content
            file_content = blob.download_as_bytes()
            
            # Get content type
            content_type = doc_data.get('file_type', 'application/pdf')
            
            # Return the file content directly
            return Response(
                file_content,
                mimetype=content_type,
                headers={
                    'Content-Disposition': f'inline; filename="{doc_data.get("document_name", "document")}.pdf"'
                }
            )
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error accessing file: {str(e)}'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
