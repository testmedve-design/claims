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
import { claimsApi } from '@/services/claimsApi'

interface ClaimDetails {
  claim_id: string
  claim_status: string
  submission_date: string
  created_at: string
  updated_at?: string
  hospital_name: string
  created_by_email?: string
  
  // Structured data sections from backend
  patient_details?: {
    patient_name?: string
    age?: number
    gender?: string
    id_card_type?: string
    id_card_number?: string
    patient_contact_number?: string
    patient_email_id?: string
    beneficiary_type?: string
    relationship?: string
  }
  
  payer_details?: {
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
  }
  
  provider_details?: {
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
    admission_date?: string
    discharge_date?: string
    patient_id?: string
  }
  
  treatment_details?: {
    diagnosis?: string
    final_diagnosis?: string
    icd_10_code?: string
    pcs_code?: string
    treatment?: string
    treatment_done?: string
  }
  
  financial_details?: {
    total_bill_amount?: number
    total_patient_paid_amount?: number
    total_amount?: number
    claimed_amount?: number
    amount_charged_to_payer?: number
    amount_paid_by_patient?: number
    mou_discount_amount?: number
    patient_discount_amount?: number
    security_deposit?: number
    total_authorized_amount?: number
  }
  
  // Legacy form_data for backward compatibility
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
  
  // Dispatch information
  dispatched_by?: string
  dispatched_by_email?: string
  dispatched_by_name?: string
  dispatched_at?: string
  dispatch_remarks?: string
  dispatch_tracking_number?: string
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

// Helper function to determine if a claim is already processed
const isClaimProcessed = (claimStatus: string): boolean => {
  const processedStatuses = ['qc_query', 'qc_clear', 'claim_approved', 'claim_denial']
  return processedStatuses.includes(claimStatus)
}

export default function ProcessClaimPage() {
  const { claimId } = useParams<{ claimId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [claim, setClaim] = useState<ClaimDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [availableQueries, setAvailableQueries] = useState<string[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  
  console.log('🔍 ProcessClaimPage component mounted')
  console.log('🔍 claimId:', claimId)
  console.log('🔍 user:', user)
  
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
    console.log('🔍 User object:', user)
    
    // Only redirect if user is loaded and doesn't have processor role
    if (user && user.role !== 'claim_processor' && (user.role as string) !== 'claim_processor_l4') {
      console.log('🔍 Redirecting - user role is not claim_processor:', user.role)
      router.push('/processor-inbox')
      return
    }
    
    // If user is not loaded yet, wait
    if (!user) {
      console.log('🔍 User not loaded yet, waiting...')
      return
    }
    
    if (claimId) {
      console.log('🔍 Fetching claim details for:', claimId)
      fetchClaimDetails()
      fetchAvailableQueries()
    }
  }, [claimId, user, router])

  const fetchTransactions = async () => {
    if (transactionsLoading) {
      console.log('⏳ Transactions already loading, skipping...')
      return
    }
    
    try {
      setTransactionsLoading(true)
      console.log('🔍 Fetching transactions for claim:', claimId)
      const transactionData = await claimsApi.getClaimTransactions(claimId)
      console.log('📊 Transactions received:', transactionData.length, 'transactions')
      setTransactions(transactionData)
    } catch (error) {
      console.error('❌ Error fetching transactions:', error)
      console.log('💡 This might be due to authentication issues')
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }

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
      
      // Fetch transactions after getting claim details
      await fetchTransactions()
      
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
        
        // Debug: Print lock information
        console.log('🔍 DEBUG: Lock info received:')
        console.log('  locked_by_processor:', data.claim.locked_by_processor)
        console.log('  locked_by_processor_email:', data.claim.locked_by_processor_email)
        console.log('  locked_by_processor_name:', data.claim.locked_by_processor_name)
        console.log('  locked_at:', data.claim.locked_at)
        console.log('  lock_expires_at:', data.claim.lock_expires_at)
        
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

  const handleFieldChange = (field: keyof ProcessingForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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

  const handleUnlockClaim = async () => {
    try {
      setProcessing(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('🔍 Unlocking claim:', claimId)
      const response = await fetch(`${API_BASE_URL}/api/processor-routes/unlock-claim/${claimId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlock claim')
      }

      const data = await response.json()
      console.log('🔍 Claim unlocked successfully:', data)
      
      toast.success('Claim unlocked successfully')
      
      // Refresh the claim data to update the lock status
      await fetchClaimDetails()
    } catch (err: any) {
      console.error('Error unlocking claim:', err)
      toast.error(err.message || 'An error occurred while unlocking the claim')
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Process Claim</h1>
            <p className="text-gray-600">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(claim.claim_status)}`}>
            {claim.claim_status?.toUpperCase()}
          </span>
          <p className="text-sm text-gray-500 mt-1">
            Submitted: {new Date(claim.submission_date || claim.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>

      {/* Processing Form - Only show for unprocessed claims */}
      {claim && !isClaimProcessed(claim.claim_status) && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">⚙️ Process Claim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
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
              <div>
                <Label htmlFor="remarks">Processing Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Enter remarks..."
                  value={formData.remarks}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <Button 
              onClick={handleSubmit}
              disabled={processing || !formData.status}
              className="w-full"
            >
              {processing ? 'Processing...' : 'Submit Processing'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processed Status Information */}
      {claim && isClaimProcessed(claim.claim_status) && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">✅ Claim Already Processed</CardTitle>
            <CardDescription>
              This claim has already been processed and cannot be modified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {claim.claim_status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                This claim is in a processed state and cannot be reprocessed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unlock Claim Section - Only show if claim is locked by current user */}
      {claim && claim.locked_by_processor === user?.uid && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">🔓 Unlock Claim</CardTitle>
            <CardDescription>
              You have this claim locked. You can unlock it to allow other processors to work on it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Locked by:</strong> {claim.locked_by_processor_name || claim.locked_by_processor_email}
                  </p>
                  {claim.locked_at && (
                    <p className="text-sm text-gray-500">
                      <strong>Locked at:</strong> {new Date(claim.locked_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleUnlockClaim}
                  disabled={processing}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {processing ? 'Unlocking...' : 'Unlock Claim'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Information */}
      {claim.processing_remarks && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">📝 Processing Remarks</CardTitle>
            <CardDescription>
              Remarks from the processor regarding this claim
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white border rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">{claim.processing_remarks}</p>
              {claim.processed_by_name && (
                <div className="mt-3 text-sm text-gray-600">
                  <p><strong>Processed by:</strong> {claim.processed_by_name}</p>
                  {claim.processed_at && (
                    <p><strong>Processed at:</strong> {new Date(claim.processed_at).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Patient Details */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👤 Patient Details</h3>
            <div className="space-y-3">
              <div>
                <Label>Patient Name</Label>
                <p className="font-medium">{claim.patient_details?.patient_name || claim.form_data?.patient_name || 'N/A'}</p>
              </div>
              <div>
                <Label>Age</Label>
                <p>{claim.patient_details?.age || claim.form_data?.age || 'N/A'}</p>
              </div>
              <div>
                <Label>Gender</Label>
                <p>{claim.patient_details?.gender || claim.form_data?.gender || 'N/A'}</p>
              </div>
              <div>
                <Label>Contact</Label>
                <p>{claim.patient_details?.patient_contact_number || claim.form_data?.patient_contact_number || 'N/A'}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p>{claim.patient_details?.patient_email_id || claim.form_data?.patient_email_id || 'N/A'}</p>
              </div>
              <div>
                <Label>Beneficiary Type</Label>
                <p>{claim.patient_details?.beneficiary_type || claim.form_data?.beneficiary_type || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Payer Details */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">💳 Payer Details</h3>
            <div className="space-y-3">
              <div>
                <Label>Payer Name</Label>
                <p className="font-medium">{claim.payer_details?.payer_name || claim.form_data?.payer_name || 'N/A'}</p>
              </div>
              <div>
                <Label>Payer Type</Label>
                <p>{claim.payer_details?.payer_type || claim.form_data?.payer_type || 'N/A'}</p>
              </div>
              <div>
                <Label>Authorization</Label>
                <p>{claim.payer_details?.authorization_number || claim.form_data?.authorization_number || 'N/A'}</p>
              </div>
              <div>
                <Label>Policy Number</Label>
                <p>{claim.payer_details?.policy_number || claim.form_data?.policy_number || 'N/A'}</p>
              </div>
              <div>
                <Label>Total Authorized Amount</Label>
                <p>₹{(claim.payer_details?.total_authorized_amount || claim.form_data?.total_authorized_amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label>Claimed Amount</Label>
                <p className="font-bold">₹{(claim.financial_details?.claimed_amount || claim.form_data?.claimed_amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Provider Details */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🏥 Provider Details</h3>
            <div className="space-y-3">
              <div>
                <Label>Hospital</Label>
                <p className="font-medium">{claim.hospital_name || 'N/A'}</p>
              </div>
              <div>
                <Label>Specialty</Label>
                <p>{claim.provider_details?.specialty || claim.form_data?.specialty || 'N/A'}</p>
              </div>
              <div>
                <Label>Doctor</Label>
                <p>{claim.provider_details?.doctor || claim.form_data?.doctor || 'N/A'}</p>
              </div>
              <div>
                <Label>Admission Type</Label>
                <p>{claim.provider_details?.admission_type || claim.form_data?.admission_type || 'N/A'}</p>
              </div>
              <div>
                <Label>Ward Type</Label>
                <p>{claim.provider_details?.ward_type || claim.form_data?.ward_type || 'N/A'}</p>
              </div>
              <div>
                <Label>Service Period</Label>
                <p>{claim.provider_details?.service_start_date || claim.form_data?.service_start_date || 'N/A'} to {claim.provider_details?.service_end_date || claim.form_data?.service_end_date || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Treatment Details */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🏥 Treatment Details</h3>
            <div className="space-y-3">
              <div>
                <Label>Final Diagnosis</Label>
                <p className="font-medium">{claim.treatment_details?.final_diagnosis || claim.form_data?.final_diagnosis || 'N/A'}</p>
              </div>
              <div>
                <Label>Treatment Done</Label>
                <p>{claim.treatment_details?.treatment_done || claim.form_data?.treatment_done || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>ICD-10 Code</Label>
                  <p>{claim.treatment_details?.icd_10_code || claim.form_data?.icd_10_code || 'N/A'}</p>
                </div>
                <div>
                  <Label>PCS Code</Label>
                  <p>{claim.treatment_details?.pcs_code || claim.form_data?.pcs_code || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Details */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">💰 Bill Details</h3>
            <div className="space-y-3">
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
                <p>₹{(claim.financial_details?.total_bill_amount || claim.form_data?.total_bill_amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label>Claimed Amount</Label>
                <p className="font-bold">₹{(claim.financial_details?.claimed_amount || claim.form_data?.claimed_amount || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label>Patient Paid</Label>
                <p>₹{(claim.financial_details?.amount_paid_by_patient || claim.form_data?.amount_paid_by_patient || 0).toLocaleString()}</p>
              </div>
              <div>
                <Label>Charged to Payer</Label>
                <p>₹{(claim.financial_details?.amount_charged_to_payer || claim.form_data?.amount_charged_to_payer || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Submission Information */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📋 Submission Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </div>
      </div>

      {/* Documents Section */}
      {claim.documents && claim.documents.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📄 Attached Documents ({claim.documents.length})</h3>
          <p className="text-gray-600 mb-4">Documents that were uploaded and attached to this claim</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
      )}

      {/* Transaction History Table */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Transaction History ({transactions.length} events)</h3>
        
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No transaction history available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Trail No</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Status Type</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Status</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Remarks</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Query/Answer Remarks</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Issue Category</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Repeat Issue</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Action Required By Onsite Team</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Letter</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Updated BY</th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Updated Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => {
                  // Map transaction types to display status
                    const getStatusDisplay = (type: string, newStatus: string) => {
                    switch (type) {
                      case 'CREATED': return 'QC pending'
                      case 'QUERIED': return 'QC Query'
                      case 'ANSWERED': return 'QUERY ANSWERED'
                      case 'CLEARED': return `QC Clear(${new Date(transaction.performed_at).toLocaleDateString('en-GB')})`
                      case 'APPROVED': return 'QC Clear'
                      case 'REJECTED': return 'QC Rejected'
                      case 'DISPATCHED': return `DESPATCHED(${new Date(transaction.performed_at).toLocaleDateString('en-GB')})`
                      default: return type
                    }
                  }

                  const statusDisplay = getStatusDisplay(transaction.transaction_type, transaction.new_status)
                  const updatedTime = transaction.performed_at ? 
                    new Date(transaction.performed_at).toLocaleString('en-IN', { 
                      timeZone: 'Asia/Kolkata',
                      day: '2-digit',
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : ''

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2">{index + 1}</td>
                      <td className="border border-gray-300 px-3 py-2">REQUEST</td>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{statusDisplay}</td>
                      <td className="border border-gray-300 px-3 py-2">{transaction.remarks || ''}</td>
                      <td className="border border-gray-300 px-3 py-2">
                        {transaction.transaction_type === 'ANSWERED' ? transaction.remarks : ''}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {transaction.transaction_type === 'QUERIED' ? 'Reports' : ''}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">No</td>
                      <td className="border border-gray-300 px-3 py-2">
                        {transaction.metadata?.action_required || ''}
                      </td>
                      <td className="border border-gray-300 px-3 py-2"></td>
                      <td className="border border-gray-300 px-3 py-2 font-medium">
                        {transaction.performed_by_name || transaction.performed_by_email}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">{updatedTime}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
