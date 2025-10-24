# Documents Management API Documentation

## Overview
The documents API handles file uploads, downloads, and management for both claims and drafts.

**Base URL**: `http://localhost:5002`
**Required Roles**: `hospital_user`, `claim_processor`, `claim_processor_l4`

---

## Table of Contents
1. [Upload Document](#1-upload-document)
2. [Get Claim Documents](#2-get-claim-documents)
3. [Download Document (Proxy)](#3-download-document-proxy)
4. [Delete Document](#4-delete-document)
5. [Document Types](#5-document-types)

---

## 1. Upload Document

**Endpoint**: `POST /api/v1/documents/upload`

**Description**: Upload a document and attach it to a claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | The document file to upload |
| claim_id | string | Yes | The claim ID to attach the document to |
| document_type | string | Yes | Type of document (see Document Types) |
| document_name | string | Yes | Display name for the document |

**Example Request**:
```typescript
const uploadDocument = async (
  file: File,
  claimId: string,
  documentType: string,
  documentName: string
) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('claim_id', claimId);
  formData.append('document_type', documentType);
  formData.append('document_name', documentName);

  const response = await fetch(
    'http://localhost:5002/api/v1/documents/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for multipart/form-data
      },
      body: formData
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document_id": "doc_12345",
  "download_url": "https://storage.googleapis.com/bucket/path/to/document.pdf"
}
```

**Error Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Invalid file type. Allowed types: pdf, jpg, jpeg, png, doc, docx, xls, xlsx"
}
```

**Supported File Types**:
- Documents: `.pdf`, `.doc`, `.docx`
- Images: `.jpg`, `.jpeg`, `.png`
- Spreadsheets: `.xls`, `.xlsx`

**Max File Size**: 10MB per file

---

## 2. Get Claim Documents

**Endpoint**: `GET /api/v1/documents/claim-documents/<claim_id>`

**Description**: Get all documents attached to a specific claim.

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const getClaimDocuments = async (claimId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/documents/claim-documents/${claimId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "documents": [
    {
      "document_id": "doc_12345",
      "claim_id": "CSHLSIP-20251023-2",
      "document_type": "discharge_summary",
      "document_name": "Discharge Summary",
      "original_filename": "discharge.pdf",
      "storage_path": "IP_Claims/hospital_123/CSHLSIP-20251023-2/discharge_summary/discharge.pdf",
      "download_url": "https://storage.googleapis.com/bucket/path/to/document.pdf",
      "file_size": 524288,
      "file_type": "application/pdf",
      "uploaded_by": "user_id",
      "hospital_id": "hospital_123",
      "uploaded_at": "2025-10-23T13:10:00.000000+00:00",
      "status": "uploaded"
    },
    {
      "document_id": "doc_67890",
      "claim_id": "CSHLSIP-20251023-2",
      "document_type": "medical_bills",
      "document_name": "Medical Bills",
      "original_filename": "bills.pdf",
      "storage_path": "IP_Claims/hospital_123/CSHLSIP-20251023-2/medical_bills/bills.pdf",
      "download_url": "https://storage.googleapis.com/bucket/path/to/bills.pdf",
      "file_size": 1048576,
      "file_type": "application/pdf",
      "uploaded_by": "user_id",
      "hospital_id": "hospital_123",
      "uploaded_at": "2025-10-23T13:15:00.000000+00:00",
      "status": "uploaded"
    }
  ],
  "total_documents": 2
}
```

---

## 3. Download Document (Proxy)

**Endpoint**: `GET /api/v1/documents/proxy/<document_id>`

**Description**: Download a document through the backend proxy (bypasses signed URL issues).

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Optional | JWT token as query parameter (alternative to header) |

**Example Request**:
```typescript
const viewDocument = async (documentId: string) => {
  const token = localStorage.getItem('auth_token');
  
  // Option 1: Use Authorization header
  const url1 = `http://localhost:5002/api/v1/documents/proxy/${documentId}`;
  window.open(url1, '_blank');
  
  // Option 2: Use token as query parameter (for iframe or direct link)
  const url2 = `http://localhost:5002/api/v1/documents/proxy/${documentId}?token=${encodeURIComponent(token)}`;
  window.open(url2, '_blank');
};
```

**Success Response** (200 OK):
Returns the file content directly with appropriate `Content-Type` and `Content-Disposition` headers.

**Headers in Response**:
```http
Content-Type: application/pdf
Content-Disposition: inline; filename="discharge.pdf"
```

**Error Response** (404 Not Found):
```json
{
  "success": false,
  "error": "Document not found"
}
```

---

## 4. Delete Document

**Endpoint**: `DELETE /api/v1/documents/delete/<document_id>`

**Description**: Delete a document (hospital users can only delete their own documents).

**Headers**:
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Example Request**:
```typescript
const deleteDocument = async (documentId: string) => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(
    `http://localhost:5002/api/v1/documents/delete/${documentId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Response** (403 Forbidden):
```json
{
  "success": false,
  "error": "You do not have permission to delete this document"
}
```

---

## 5. Document Types

### Standard Document Types

| Document Type | Description | Required for Submission |
|--------------|-------------|------------------------|
| `discharge_summary` | Discharge Summary | Yes |
| `medical_bills` | Medical Bills | Yes |
| `lab_reports` | Laboratory Reports | No |
| `prescription` | Prescription | No |
| `investigation_reports` | Investigation Reports | No |
| `consent_forms` | Consent Forms | No |
| `id_proof` | ID Proof | Yes |
| `policy_document` | Insurance Policy Document | No |
| `authorization_letter` | Authorization Letter | Yes |
| `other` | Other Documents | No |

### Query Response Documents
| Document Type | Description | Usage |
|--------------|-------------|-------|
| `query_response` | Documents uploaded as part of query response | Used when hospital responds to processor query |

---

## Complete Upload Flow Example

```typescript
const handleFileUpload = async (
  files: FileList,
  claimId: string,
  documentType: string
) => {
  const uploadedDocuments: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push(`${file.name}: File size exceeds 10MB`);
      continue;
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Invalid file type`);
      continue;
    }
    
    try {
      const result = await uploadDocument(
        file,
        claimId,
        documentType,
        file.name.replace(/\.[^/.]+$/, '') // Remove extension for display name
      );
      
      if (result.success) {
        uploadedDocuments.push(result.document_id);
        console.log(`✅ Uploaded: ${file.name}`);
      } else {
        errors.push(`${file.name}: ${result.error}`);
      }
    } catch (error: any) {
      errors.push(`${file.name}: ${error.message}`);
    }
  }
  
  return {
    success: uploadedDocuments.length > 0,
    uploadedDocuments,
    errors,
    totalUploaded: uploadedDocuments.length,
    totalFailed: errors.length
  };
};
```

---

## Document Upload Progress

```typescript
const uploadWithProgress = async (
  file: File,
  claimId: string,
  documentType: string,
  onProgress: (progress: number) => void
) => {
  const token = localStorage.getItem('auth_token');
  const formData = new FormData();
  
  formData.append('file', file);
  formData.append('claim_id', claimId);
  formData.append('document_type', documentType);
  formData.append('document_name', file.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    // Upload complete
    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(JSON.parse(xhr.responseText).error));
      }
    });

    // Upload error
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('POST', 'http://localhost:5002/api/v1/documents/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

// Usage
const [uploadProgress, setUploadProgress] = useState(0);

await uploadWithProgress(
  file,
  claimId,
  'discharge_summary',
  (progress) => setUploadProgress(progress)
);
```

---

## Document Viewer Component

```typescript
const DocumentViewer = ({ documentId }: { documentId: string }) => {
  const token = localStorage.getItem('auth_token');
  const proxyUrl = `http://localhost:5002/api/v1/documents/proxy/${documentId}?token=${encodeURIComponent(token || '')}`;

  return (
    <div className="document-viewer">
      <iframe
        src={proxyUrl}
        width="100%"
        height="600px"
        title="Document Viewer"
      />
    </div>
  );
};
```

---

## Best Practices

1. **File Validation** - Always validate file type and size before upload
2. **Progress Indicator** - Show upload progress for large files
3. **Error Handling** - Display clear error messages for upload failures
4. **Multiple Files** - Support batch uploads for better UX
5. **Preview** - Show document preview before upload
6. **Delete Confirmation** - Ask for confirmation before deleting documents
7. **Download vs View** - Use proxy endpoint for viewing PDFs in browser
8. **Security** - Always pass authentication token for document access
9. **File Names** - Sanitize file names before upload
10. **Compression** - Consider compressing large images before upload

