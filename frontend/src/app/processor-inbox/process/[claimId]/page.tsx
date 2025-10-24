'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { toast } from '@/lib/toast'

interface ClaimDetails {
  claim_id: string
  claim_status: string
  submission_date: string
  created_at: string
  updated_at?: string
  hospital_name: string
  created_by_email?: string
  form_data: {
    // Patient details
    patient_name?: string
    age?: number
    gender?: string
    id_card_type?: string
    id_card_number?: string
    patient_contact_number?: string
    patient_email_id?: string
    beneficiary_type?: string
    relationship?: string
    
    // Payer details
    payer_name?: string
    payer_type?: string
    insurer_name?: string
    policy_number?: string
    authorization_number?: string
    total_authorized_amount?: number
    payer_patient_id?: string
    sponsorer_corporate_name?: string
    sponsorer_employee_id?: string
    sponsorer_employee_name?: string
    
    // Provider details
    patient_registration_number?: string
    specialty?: string
    doctor?: string
    treatment_line?: string
    claim_type?: string
    service_start_date?: string
    service_end_date?: string
    inpatient_number?: string
    admission_type?: string
    hospitalization_type?: string
    ward_type?: string
    final_diagnosis?: string
    icd_10_code?: string
    treatment_done?: string
    pcs_code?: string
    
    // Bill details
    bill_number?: string
    bill_date?: string
    security_deposit?: number
    total_bill_amount?: number
    patient_discount_amount?: number
    amount_paid_by_patient?: number
    total_patient_paid_amount?: number
    amount_charged_to_payer?: number
    mou_discount_amount?: number
    claimed_amount?: number
    submission_remarks?: string
  }
  processing_remarks?: string
  processed_by?: string
  processed_by_email?: string
  processed_by_name?: string
  processed_at?: string
  created_by?: string
  created_by_name?: string
  submitted_by?: string
  submitted_by_email?: string
  submitted_by_name?: string
  // Lock information
  locked_by_processor?: string
  locked_by_processor_email?: string
  locked_by_processor_name?: string
  locked_at?: string
  lock_expires_at?: string
  // Documents
  documents?: Array<{
    document_id: string
    document_type: string
    document_name: string
    original_filename: string
    download_url: string
    file_size: number
    file_type: string
    uploaded_at: string
    status: string
  }>
  // Query response information
  query_response?: string
  query_answered_by?: string
  query_answered_by_email?: string
  query_answered_by_name?: string
  query_answered_at?: string
  query_response_files?: string[]
}

interface Query {
  id: string
  query_type: string
  amount: number
  department: string
  status: string
}

interface ProcessingForm {
  status: string
  remarks: string
  estimated_cost?: number
  approved_amount?: number
  disallowed_amount?: number
  payer_branch_location?: string
  cqc_clear_date?: string
  queries: Query[]
  new_query: string
}

const API_BASE_URL = 'http://localhost:5002'

export default function ProcessClaimPage() {
  const { claimId } = useParams<{ claimId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [claim, setClaim] = useState<ClaimDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [availableQueries, setAvailableQueries] = useState<string[]>([])
  
  const [formData, setFormData] = useState<ProcessingForm>({
    status: '',
    remarks: '',
    estimated_cost: 0,
    approved_amount: 0,
    disallowed_amount: 0,
    payer_branch_location: '',
    cqc_clear_date: '',
    queries: [],
    new_query: ''
  })

  useEffect(() => {
    // Check if user has processor access
    console.log('🔍 User role check:', user?.role)
    if (user && !user.role?.includes('processor')) {
      console.log('🔍 Redirecting - user role does not include processor:', user.role)
      router.push('/processor-inbox')
      return
    }
    
    if (claimId) {
      fetchClaimDetails()
      fetchAvailableQueries()
    }
  }, [claimId, user, router])

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/api/processor-routes/get-claim-details/${claimId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('🔍 Claim Details API Response:', data)
      console.log('🔍 Form Data Structure:', data.claim?.form_data)
      
      if (data.success) {
        setClaim(data.claim)
        setFormData(prev => ({
          ...prev,
          status: data.claim.claim_status || 'pending'
        }))
        
        // Debug: Print creator information
        console.log('🔍 DEBUG: Creator info received:')
        console.log('  created_by:', data.claim.created_by)
        console.log('  created_by_email:', data.claim.created_by_email)
        console.log('  created_by_name:', data.claim.created_by_name)
        console.log('  submitted_by:', data.claim.submitted_by)
        console.log('  submitted_by_email:', data.claim.submitted_by_email)
        console.log('  submitted_by_name:', data.claim.submitted_by_name)
        
        // Debug: Print processor information
        console.log('🔍 DEBUG: Processor info received:')
        console.log('  processed_by:', data.claim.processed_by)
        console.log('  processed_by_email:', data.claim.processed_by_email)
        console.log('  processed_by_name:', data.claim.processed_by_name)
        console.log('  processing_remarks:', data.claim.processing_remarks)
        console.log('  processed_at:', data.claim.processed_at)
        
        // Check if claim is locked by another processor
        if (data.claim.locked_by_processor && data.claim.locked_by_processor !== user?.uid) {
          setError(`This claim is currently being processed by ${data.claim.locked_by_processor_name || data.claim.locked_by_processor_email}. Please try again later.`)
          return
        }
      } else {
        throw new Error(data.error || 'Failed to fetch claim details')
      }
    } catch (err: any) {
      console.error('Error fetching claim details:', err)
      setError(err.message || 'An error occurred while fetching claim details')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableQueries = async () => {
    try {
      // This would fetch from a queries collection
      // For now, using hardcoded values
      setAvailableQueries([
        'Medical Necessity',
        'Pre-authorization Required',
        'Coverage Verification',
        'Documentation Incomplete',
        'Billing Code Error',
        'Duplicate Claim',
        'Policy Exclusions',
        'Network Provider Issue'
      ])
    } catch (error) {
      console.error('Error fetching queries:', error)
    }
  }

  const handleStatusChange = (status: string) => {
    setFormData(prev => ({
      ...prev,
      status,
      // Reset form fields when status changes
      estimated_cost: 0,
      approved_amount: 0,
      disallowed_amount: 0,
      payer_branch_location: '',
      cqc_clear_date: '',
      queries: []
    }))
  }

  const addQuery = () => {
    if (formData.new_query.trim()) {
      const newQuery: Query = {
        id: `query_${Date.now()}`,
        query_type: formData.new_query,
        amount: 0,
        department: '',
        status: ''
      }
      
      setFormData(prev => ({
        ...prev,
        queries: [...prev.queries, newQuery],
        new_query: ''
      }))
      
      // Add to available queries if not already present
      if (!availableQueries.includes(formData.new_query)) {
        setAvailableQueries(prev => [...prev, formData.new_query])
      }
      
      toast.success('New query added successfully')
    }
  }

  const handleViewDocument = async (doc: any) => {
    try {
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        alert('No authentication token found')
        return
      }

      // Use the download URL directly if available (signed URL from Firebase Storage)
      if (doc.download_url) {
        window.open(doc.download_url, '_blank')
        return
      }

      // Fallback: Use proxy endpoint with token as query parameter
      const proxyUrl = `http://localhost:5002/api/v1/documents/proxy/${doc.document_id}?token=${encodeURIComponent(token)}`
      window.open(proxyUrl, '_blank')
      
    } catch (err: any) {
      console.error('Error opening document:', err)
      alert(`Error: ${err.message}\n\nDocument: ${doc.document_name}\nType: ${doc.document_type}\nID: ${doc.document_id}`)
    }
  }

  const removeQuery = (queryId: string) => {
    setFormData(prev => ({
      ...prev,
      queries: prev.queries.filter(q => q.id !== queryId)
    }))
  }

  const updateQuery = (queryId: string, field: keyof Query, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      queries: prev.queries.map(q => 
        q.id === queryId ? { ...q, [field]: value } : q
      )
    }))
  }

  const handleSubmit = async () => {
    try {
      setProcessing(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Send the actual status value to the backend
      const requestData = {
        status: formData.status,
        remarks: formData.remarks || ''
      }

      console.log('🔍 Sending claim update request:', {
        url: `${API_BASE_URL}/api/processor-routes/process-claim/${claimId}`,
        data: requestData,
        formData: formData
      })

      const response = await fetch(`${API_BASE_URL}/api/processor-routes/process-claim/${claimId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔍 Error response:', errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('🔍 Response data:', data)
      
      if (data.success) {
        toast.success('Claim processed successfully')
        router.push('/processor-inbox')
      } else {
        throw new Error(data.error || 'Failed to process claim')
      }
    } catch (err: any) {
      console.error('Error processing claim:', err)
      toast.error(err.message || 'An error occurred while processing the claim')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'qc_pending': return 'bg-yellow-100 text-yellow-800'
      case 'qc_clear': return 'bg-emerald-100 text-emerald-800'
      case 'qc_query': return 'bg-orange-100 text-orange-800'
      case 'claim_approved': return 'bg-green-100 text-green-800'
      case 'claim_denial': return 'bg-red-100 text-red-800'
      case 'need_more_info': return 'bg-orange-100 text-orange-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'under_review': return 'bg-blue-100 text-blue-800'
      case 'query': return 'bg-orange-100 text-orange-800'
      case 'clear': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading claim details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Claim Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The claim with ID "{claimId}" could not be found.</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Processor Inbox
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Claim Details */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-2xl font-bold">Claim Details</CardTitle>
                <p className="text-lg text-gray-600 mt-1">Claim ID: {claim.claim_id}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(claim.claim_status)}`}>
                  {claim.claim_status?.toUpperCase()}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted: {new Date(claim.submission_date).toLocaleDateString('en-IN')}
                </p>
                <p className="text-sm text-gray-500">
                  Time: {new Date(claim.submission_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </p>
              </div>
            </CardHeader>
          </Card>

          {/* Patient Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>👤 Patient Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient Name</Label>
                  <p className="font-medium">{claim.form_data?.patient_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Age</Label>
                  <p>{claim.form_data?.age || 'N/A'}</p>
                </div>
                <div>
                  <Label>Gender</Label>
                  <p>{claim.form_data?.gender || 'N/A'}</p>
                </div>
                <div>
                  <Label>Contact</Label>
                  <p>{claim.form_data?.patient_contact_number || 'N/A'}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{claim.form_data?.patient_email_id || 'N/A'}</p>
                </div>
                <div>
                  <Label>Beneficiary Type</Label>
                  <p>{claim.form_data?.beneficiary_type || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payer Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>💳 Payer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payer Name</Label>
                  <p className="font-medium">{claim.form_data?.payer_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Payer Type</Label>
                  <p>{claim.form_data?.payer_type || 'N/A'}</p>
                </div>
                <div>
                  <Label>Authorization</Label>
                  <p>{claim.form_data?.authorization_number || 'N/A'}</p>
                </div>
                <div>
                  <Label>Policy Number</Label>
                  <p>{claim.form_data?.policy_number || 'N/A'}</p>
                </div>
                <div>
                  <Label>Total Authorized Amount</Label>
                  <p>₹{claim.form_data?.total_authorized_amount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <Label>Claimed Amount</Label>
                  <p className="font-bold">₹{claim.form_data?.claimed_amount?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>🏥 Provider Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hospital</Label>
                  <p className="font-medium">{claim.hospital_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <p>{claim.form_data?.specialty || 'N/A'}</p>
                </div>
                <div>
                  <Label>Diagnosis</Label>
                  <p>{claim.form_data?.final_diagnosis || 'N/A'}</p>
                </div>
                <div>
                  <Label>Treatment</Label>
                  <p>{claim.form_data?.treatment_done || 'N/A'}</p>
                </div>
                <div>
                  <Label>Admission</Label>
                  <p>{claim.form_data?.admission_type || 'N/A'}</p>
                </div>
                <div>
                  <Label>Doctor</Label>
                  <p>{claim.form_data?.doctor || 'N/A'}</p>
                </div>
                <div>
                  <Label>Ward</Label>
                  <p>{claim.form_data?.ward_type || 'N/A'}</p>
                </div>
                <div>
                  <Label>Service Period</Label>
                  <p>{claim.form_data?.service_start_date || 'N/A'} to {claim.form_data?.service_end_date || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>💰 Bill Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bill Number</Label>
                  <p className="font-medium">{claim.form_data?.bill_number || 'N/A'}</p>
                </div>
                <div>
                  <Label>Bill Date</Label>
                  <p>{claim.form_data?.bill_date || 'N/A'}</p>
                </div>
                <div>
                  <Label>Total Bill Amount</Label>
                  <p>₹{claim.form_data?.total_bill_amount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <Label>Claimed Amount</Label>
                  <p className="font-bold">₹{claim.form_data?.claimed_amount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <Label>Patient Paid</Label>
                  <p>₹{claim.form_data?.amount_paid_by_patient?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <Label>Charged to Payer</Label>
                  <p>₹{claim.form_data?.amount_charged_to_payer?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>📋 Submission Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Submitted by</Label>
                  <p>{claim.created_by_email || 'N/A'}</p>
                </div>
                <div>
                  <Label>Submission Date</Label>
                  <p>{new Date(claim.submission_date).toLocaleDateString('en-IN')}, {new Date(claim.submission_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p>{new Date(claim.created_at).toLocaleDateString('en-IN')}, {new Date(claim.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="font-medium">{claim.claim_status || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Documents Section */}
        {claim.documents && claim.documents.length > 0 && (
          <Card className="mb-6">
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
        )}

        {/* Transaction History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📋 Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Creator Information */}
              {(claim.created_by || claim.submitted_by || claim.created_by_email || claim.submitted_by_email) ? (
                <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-green-900">
                        Created by: {claim.created_by_name || claim.submitted_by_name || claim.created_by_email || claim.submitted_by_email || claim.created_by || claim.submitted_by || 'Unknown User'}
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
              ) : (
                <div className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-700">
                        Created by: Information not available
                      </p>
                      <p className="text-sm text-gray-600">Status: Created</p>
                    </div>
                    {claim.created_at && (
                      <p className="text-sm text-gray-500">
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

        {/* Processing Form */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Process Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Selection */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qc_clear">QC Clear</SelectItem>
                    <SelectItem value="qc_query">QC Query</SelectItem>
                    <SelectItem value="claim_approved">Claim Approved</SelectItem>
                    <SelectItem value="claim_denial">Claim Denial</SelectItem>
                    <SelectItem value="need_more_info">Need More Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Query Management */}
              {(formData.status === 'qc_query' || formData.status === 'need_more_info') && (
                <div className="space-y-4">
                  <div>
                    <Label>Add New Query Type</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.new_query}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_query: e.target.value }))}
                        placeholder="Enter new query type"
                      />
                      <Button onClick={addQuery} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Existing Queries */}
                  {formData.queries.map((query) => (
                    <Card key={query.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">{query.query_type}</h4>
                        <Button
                          onClick={() => removeQuery(query.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            value={query.amount}
                            onChange={(e) => updateQuery(query.id, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Department</Label>
                          <Input
                            value={query.department}
                            onChange={(e) => updateQuery(query.id, 'department', e.target.value)}
                            placeholder="Department"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <Label>Query Status</Label>
                        <Select value={query.status} onValueChange={(value) => updateQuery(query.id, 'status', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deny">Deny</SelectItem>
                            <SelectItem value="delay">Delay</SelectItem>
                            <SelectItem value="disallowed">Disallowed</SelectItem>
                            <SelectItem value="others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Claim Approved Fields */}
              {formData.status === 'claim_approved' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="estimated_cost">Estimated Cost</Label>
                    <Input
                      id="estimated_cost"
                      type="number"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="approved_amount">Approved Amount</Label>
                    <Input
                      id="approved_amount"
                      type="number"
                      value={formData.approved_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, approved_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="disallowed_amount">Disallowed Amount</Label>
                    <Input
                      id="disallowed_amount"
                      type="number"
                      value={formData.disallowed_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, disallowed_amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}

              {/* Clear Fields */}
              {formData.status === 'qc_clear' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payer_branch_location">Payer Branch Location</Label>
                    <Input
                      id="payer_branch_location"
                      value={formData.payer_branch_location}
                      onChange={(e) => setFormData(prev => ({ ...prev, payer_branch_location: e.target.value }))}
                      placeholder="Enter branch location"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cqc_clear_date">CQC Clear Date</Label>
                    <Input
                      id="cqc_clear_date"
                      type="date"
                      value={formData.cqc_clear_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, cqc_clear_date: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Enter processing remarks..."
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={processing || !formData.status}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {processing ? 'Processing...' : 'Update Claim'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
