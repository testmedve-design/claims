const API_BASE_URL = 'http://localhost:5002'

export interface DocumentUploadResponse {
  success: boolean
  document_id?: string
  download_url?: string
  error?: string
}

export interface Document {
  document_id: string
  document_type: string
  document_name: string
  original_filename: string
  download_url: string
  file_size: number
  file_type: string
  uploaded_at: string
  status: string
}

class DocumentsApi {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  async uploadDocument(file: File, claimId: string, documentType: string, documentName: string): Promise<DocumentUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('claim_id', claimId)
      formData.append('document_type', documentType)
      formData.append('document_name', documentName)

      const token = localStorage.getItem('auth_token')
      
      const response = await fetch(`${this.baseUrl}/api/v1/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  async getClaimDocuments(claimId: string): Promise<Document[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/documents/get-claim-documents/${claimId}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch documents')
      }

      const data = await response.json()
      return data.documents || []
    } catch (error) {
      console.error('Error fetching documents:', error)
      throw error
    }
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/documents/delete-document/${documentId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/documents/download/${documentId}`, {
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      return await response.blob()
    } catch (error) {
      console.error('Error downloading document:', error)
      throw error
    }
  }
}

export const documentsApi = new DocumentsApi()
