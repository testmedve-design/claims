'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

export default function ClaimDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const claimId = params.claimId as string
  
  const [claim, setClaim] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Query response functionality
  const [showQueryResponse, setShowQueryResponse] = useState(false)
  const [queryResponse, setQueryResponse] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    if (claimId) {
      fetchClaimDetails()
    }
  }, [claimId])

  useEffect(() => {
    // Check if we should show query response form
    const action = searchParams.get('action')
    if (action === 'answer_query') {
      setShowQueryResponse(true)
    }
  }, [searchParams])

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching claim details for:', claimId)
      const token = localStorage.getItem('auth_token')
      console.log('🔍 Token from localStorage:', token ? 'Token exists' : 'No token found')
      console.log('🔍 Token length:', token ? token.length : 0)
      
      const response = await fetch(`http://localhost:5002/api/v1/claims/get-claim/${claimId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClaim(data.claim)
        } else {
          setError(data.error || 'Failed to fetch claim details')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch claim details')
      }
    } catch (error) {
      console.error('Error fetching claim details:', error)
      setError('Failed to fetch claim details')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Prevent duplicate files by checking name and size
    setUploadedFiles(prev => {
      const existingFiles = prev.map(f => `${f.name}-${f.size}`)
      const newFiles = files.filter(file => 
        !existingFiles.includes(`${file.name}-${file.size}`)
      )
      
      // Show toast if duplicates were filtered out
      const duplicates = files.length - newFiles.length
      if (duplicates > 0) {
        toast({
          title: "Duplicate Files Detected",
          description: `${duplicates} duplicate file(s) were not added. Please select different files.`,
          variant: "destructive"
        })
      }
      
      return [...prev, ...newFiles]
    })
    
    // Clear the input to allow selecting the same file again if needed
    event.target.value = ''
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (files: File[]) => {
    const token = localStorage.getItem('auth_token')
    const uploadedUrls: string[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('claim_id', claimId)
      formData.append('document_type', 'query_response')
      formData.append('document_name', `Query Response - ${file.name}`)

      const response = await fetch('http://localhost:5002/api/v1/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          uploadedUrls.push(data.document_id)
        }
      }
    }

    return uploadedUrls
  }

  const handleSubmitQueryResponse = async () => {
    if (!queryResponse.trim() && uploadedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a response or upload files",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmittingResponse(true)
      const token = localStorage.getItem('auth_token')
      
      // Upload files first if any
      let uploadedFileIds: string[] = []
      if (uploadedFiles.length > 0) {
        setUploadingFiles(true)
        uploadedFileIds = await uploadFiles(uploadedFiles)
        setUploadingFiles(false)
      }
      
      const response = await fetch(`http://localhost:5002/api/v1/claims/answer-query/${claimId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_response: queryResponse.trim(),
          uploaded_files: uploadedFileIds
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: "Success",
            description: "Query response submitted successfully"
          })
          setShowQueryResponse(false)
          setQueryResponse('')
          setUploadedFiles([])
          // Refresh claim details
          fetchClaimDetails()
        } else {
          throw new Error(data.error || 'Failed to submit response')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit response')
      }
    } catch (err: any) {
      console.error('Error submitting query response:', err)
      toast({
        title: "Error",
        description: err.message || 'Failed to submit query response',
        variant: "destructive"
      })
    } finally {
      setSubmittingResponse(false)
      setUploadingFiles(false)
    }
  }

  const handleViewDocument = async (doc: any) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('No authentication token found')
        return
      }

      // Use proxy endpoint to serve document content directly
      const proxyUrl = `http://localhost:5002/api/v1/documents/proxy/${doc.document_id}`
      
      // Open document in new tab using proxy endpoint
      window.open(proxyUrl, '_blank')
      
    } catch (err: any) {
      console.error('Error opening document:', err)
      alert(`Error: ${err.message}\n\nDocument: ${doc.document_name}\nType: ${doc.document_type}\nID: ${doc.document_id}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p>Loading claim details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error Loading Claim</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Claim Not Found</h2>
            <p className="text-gray-600 mb-4">The requested claim could not be found.</p>
            <button 
              onClick={() => router.back()} 
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold">Claim Details</h1>
            <p className="text-gray-600">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              claim.claim_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              claim.claim_status === 'qc_query' ? 'bg-orange-100 text-orange-800' :
              claim.claim_status === 'qc_answered' ? 'bg-blue-100 text-blue-800' :
              claim.claim_status === 'approved' ? 'bg-green-100 text-green-800' :
              claim.claim_status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {claim.claim_status?.toUpperCase()}
            </span>
            {claim.claim_status === 'qc_query' && !showQueryResponse && (
              <Button
                onClick={() => setShowQueryResponse(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                Answer Query
              </Button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Submitted: {new Date(claim.submission_date).toLocaleDateString('en-IN')}
          </p>
          <p className="text-xs text-gray-400">
            Time: {new Date(claim.submission_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          </p>
        </div>
      </div>

      {/* Query Response Form */}
      {showQueryResponse && claim.claim_status === 'qc_query' && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">🔍 Answer Processor Query</CardTitle>
            <CardDescription>
              The processor has raised a query about this claim. Please provide your response below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="query-response">Your Response (Optional)</Label>
                <Textarea
                  id="query-response"
                  placeholder="Please provide your response to the processor's query..."
                  value={queryResponse}
                  onChange={(e) => setQueryResponse(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>
              
              {/* File Upload Section */}
              <div>
                <Label htmlFor="file-upload">Upload Supporting Documents (Optional)</Label>
                <div className="mt-2">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, XLSX (Max 10MB per file)
                  </p>
                </div>
                
                {/* Show uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                      <span className="text-xs text-gray-500">{uploadedFiles.length} file(s)</span>
                    </div>
                    {uploadedFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">📎</span>
                          <span className="text-sm text-gray-800">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitQueryResponse}
                  disabled={submittingResponse || uploadingFiles}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submittingResponse ? 'Submitting...' : 
                   uploadingFiles ? 'Uploading Files...' : 'Submit Response'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowQueryResponse(false)
                    setQueryResponse('')
                    setUploadedFiles([])
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Details */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">👤 Patient Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Patient Name:</span>
              <p className="font-semibold">{claim.form_data?.patient_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Age:</span>
                <p>{claim.form_data?.age} {claim.form_data?.age_unit}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Gender:</span>
                <p>{claim.form_data?.gender}</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Contact:</span>
              <p>{claim.form_data?.patient_contact_number}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Email:</span>
              <p>{claim.form_data?.patient_email_id}</p>
            </div>
          </div>
        </div>

        {/* Payer Details */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💳 Payer Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Payer Name:</span>
              <p className="font-semibold">{claim.form_data?.payer_name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Payer Type:</span>
              <p>{claim.form_data?.payer_type}</p>
            </div>
            {claim.form_data?.insurer_name && (
              <div>
                <span className="text-sm font-medium text-gray-500">Insurer:</span>
                <p>{claim.form_data.insurer_name}</p>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-500">Authorization:</span>
              <p>#{claim.form_data?.authorization_number}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Total Authorized Amount:</span>
              <p className="font-semibold text-green-600">₹{claim.form_data?.total_authorized_amount?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Provider Details */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🏥 Provider Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Hospital:</span>
              <p className="font-semibold">{claim.hospital_name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Specialty:</span>
                <p>{claim.form_data?.specialty}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Doctor:</span>
                <p>{claim.form_data?.doctor}</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Diagnosis:</span>
              <p>{claim.form_data?.final_diagnosis}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Treatment:</span>
              <p>{claim.form_data?.treatment_done}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Admission:</span>
                <p>{claim.form_data?.admission_type}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Ward:</span>
                <p>{claim.form_data?.ward_type}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">💰 Bill Details</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Bill Number:</span>
                <p>{claim.form_data?.bill_number}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Bill Date:</span>
                <p>{new Date(claim.form_data?.bill_date).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Total Bill Amount:</span>
              <p className="font-semibold text-lg">₹{claim.form_data?.total_bill_amount?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Claimed Amount:</span>
              <p className="font-semibold text-lg text-green-600">₹{claim.form_data?.claimed_amount?.toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Patient Paid:</span>
                <p>₹{claim.form_data?.total_patient_paid_amount?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Charged to Payer:</span>
                <p>₹{claim.form_data?.amount_charged_to_payer?.toLocaleString()}</p>
              </div>
            </div>
            {claim.form_data?.submission_remarks && (
              <div>
                <span className="text-sm font-medium text-gray-500">Remarks:</span>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{claim.form_data.submission_remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Documents Section */}
      {claim.documents && claim.documents.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📄 Attached Documents ({claim.documents.length})
              </CardTitle>
              <CardDescription>
                Documents that were uploaded and attached to this claim
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {claim.documents.map((doc: any, index: number) => (
                  <div key={doc.document_id || index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">{doc.document_name}</h4>
                        <p className="text-xs text-gray-600 capitalize mb-2">
                          {doc.document_type?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.status === 'uploaded' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-3 space-y-1">
                      <div>ID: {doc.document_id}</div>
                      {doc.uploaded_at && (
                        <div>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewDocument(doc)}
                      >
                        📥 View
                      </Button>
                      {doc.download_url && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.open(doc.download_url, '_blank')}
                        >
                          ⬇️ Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>📋 Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Creator Information */}
              {(claim.created_by || claim.submitted_by) && (
                <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-green-900">
                        Created by: {claim.created_by_name || claim.submitted_by_name || claim.created_by_email || claim.submitted_by_email || claim.created_by || claim.submitted_by}
                      </p>
                      <p className="text-sm text-green-700">Status: Created</p>
                    </div>
                    {claim.created_at && (
                      <p className="text-sm text-green-600">
                        {new Date(claim.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Hospital Response Information */}
              {claim.query_response && (
                <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-purple-900">Answered by: {claim.query_answered_by_name || claim.query_answered_by_email || claim.query_answered_by || 'Hospital User'}</p>
                      <p className="text-sm text-purple-700">Status: QC Answered</p>
                    </div>
                    {claim.query_answered_at && (
                      <p className="text-sm text-purple-600">
                        {new Date(claim.query_answered_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </p>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-purple-900">Response:</p>
                    <p className="text-sm text-purple-800 mt-1">{claim.query_response}</p>
                  </div>
                  {claim.query_response_files && claim.query_response_files.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-purple-900">Supporting Documents:</p>
                      <p className="text-sm text-purple-800 mt-1">{claim.query_response_files.length} file(s) uploaded</p>
                    </div>
                  )}
                </div>
              )}

              {/* Processor Information */}
              {claim.processed_by && (
                <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-blue-900">Processed by: {claim.processed_by_name || claim.processed_by_email || claim.processed_by}</p>
                      <p className="text-sm text-blue-700">Status: {claim.claim_status}</p>
                    </div>
                    {claim.processed_at && (
                      <p className="text-sm text-blue-600">
                        {new Date(claim.processed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                      </p>
                    )}
                  </div>
                  {claim.processing_remarks && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-blue-900">Remarks:</p>
                      <p className="text-sm text-blue-800 mt-1">{claim.processing_remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Submitted by:</strong> {claim.submitted_by_email}</p>
          <p><strong>Submission Date:</strong> {new Date(claim.submission_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          <p><strong>Created:</strong> {new Date(claim.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          {claim.updated_at && claim.updated_at !== claim.created_at && (
            <p><strong>Last Updated:</strong> {new Date(claim.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          )}
        </div>
      </div>
    </div>
  )
}