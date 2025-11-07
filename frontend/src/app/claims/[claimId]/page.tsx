'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { claimsApi } from '@/services/claimsApi'
import { Truck, Settings, UserCircle, CreditCard, Building2, Receipt, History } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// Import display components
import { PatientDetailsDisplay } from '@/components/forms/claims/PatientDetailsDisplay'
import { PayerDetailsDisplay } from '@/components/forms/claims/PayerDetailsDisplay'
import { ProviderDetailsDisplay } from '@/components/forms/claims/ProviderDetailsDisplay'
import { BillDetailsDisplay } from '@/components/forms/claims/BillDetailsDisplay'
import { TransactionHistory } from '@/components/forms/claims/TransactionHistory'
import { ProcessorInfo } from '@/components/forms/claims/ProcessorInfo'
import { API_BASE_URL } from '@/lib/apiConfig'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ClaimDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const claimId = params.claimId as string
  
  const [claim, setClaim] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  
  // Query response functionality
  const [showQueryResponse, setShowQueryResponse] = useState(false)
  const [queryResponse, setQueryResponse] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  // Dispatch modal functionality
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchMode, setDispatchMode] = useState<'online' | 'courier' | 'direct'>('online')
  const [dispatchDate, setDispatchDate] = useState('')
  const [dispatchRemarks, setDispatchRemarks] = useState('')
  const [couriers, setCouriers] = useState<any[]>([])
  const [selectedCourier, setSelectedCourier] = useState('')
  const [docketNumber, setDocketNumber] = useState('')
  const [acknowledgmentNumber, setAcknowledgmentNumber] = useState('')
  const [contactPersonName, setContactPersonName] = useState('')
  const [contactPersonPhone, setContactPersonPhone] = useState('')
  const [submittingDispatch, setSubmittingDispatch] = useState(false)
  const [qcQueryDetails, setQcQueryDetails] = useState<{
    issue_categories: string[]
    repeat_issue?: string
    action_required?: string
    remarks?: string
  } | null>(null)

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

  useEffect(() => {
    // Fetch couriers when dispatch modal opens
    if (showDispatchModal && couriers.length === 0) {
      fetchCouriers()
    }
  }, [showDispatchModal])

  const fetchCouriers = async () => {
    try {
      const courierList = await claimsApi.getCouriers()
      setCouriers(courierList)
    } catch (error) {
      console.error('Error fetching couriers:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch couriers',
        variant: 'destructive'
      })
    }
  }

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
      setError(null)
      
      console.log('🔍 Fetching claim details for:', claimId)
      const token = localStorage.getItem('auth_token')
      console.log('🔍 Token from localStorage:', token ? 'Token exists' : 'No token found')
      console.log('🔍 Token length:', token ? token.length : 0)
      
      const response = await fetch(`${API_BASE_URL}/v1/claims/get-claim/${claimId}`, {
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
          // Fetch transactions after getting claim details
          await fetchTransactions()
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
      setQcQueryDetails(claim?.qc_query_details || null)
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

      const response = await fetch(`${API_BASE_URL}/v1/documents/upload`, {
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
      
      const response = await fetch(`${API_BASE_URL}/v1/claims/answer-query/${claimId}`, {
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

  const handleDispatchClaim = async () => {
    try {
      setSubmittingDispatch(true)

      // Prepare dispatch data based on mode
      let dispatchData: any = {
        dispatch_remarks: dispatchRemarks,
        dispatch_date: dispatchDate,
        dispatch_mode: dispatchMode
      }

      // Add mode-specific fields
      if (dispatchMode === 'online') {
        dispatchData.acknowledgment_number = acknowledgmentNumber
      } else if (dispatchMode === 'courier') {
        dispatchData.courier_name = selectedCourier
        dispatchData.docket_number = docketNumber
      } else if (dispatchMode === 'direct') {
        dispatchData.contact_person_name = contactPersonName
        dispatchData.contact_person_phone = contactPersonPhone
      }

      // Call dispatch API
      await claimsApi.dispatchClaim(claimId, dispatchData)

      toast({
        title: 'Success',
        description: 'Claim dispatched successfully!',
        variant: 'default'
      })

      // Close modal and refresh claim details
      setShowDispatchModal(false)
      fetchClaimDetails()
    } catch (error) {
      console.error('Error dispatching claim:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to dispatch claim',
        variant: 'destructive'
      })
    } finally {
      setSubmittingDispatch(false)
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
      const proxyUrl = `${API_BASE_URL}/v1/documents/proxy/${doc.document_id}`
      
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
      {qcQueryDetails && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertDescription className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-200 text-orange-800">
                QC Query Raised
              </Badge>
              <span className="font-medium text-orange-900">Processor requires additional information</span>
            </div>
            <div>
              <span className="font-semibold">Issue Categories:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {(qcQueryDetails.issue_categories || []).map((category) => (
                  <span key={category} className="inline-flex items-center text-xs font-medium bg-white border border-orange-200 text-orange-700 rounded-full px-3 py-1">
                    {category}
                  </span>
                ))}
              </div>
            </div>
            {qcQueryDetails.repeat_issue && (
              <div>
                <span className="font-semibold">Repeat Issue:</span> {qcQueryDetails.repeat_issue.toUpperCase()}
              </div>
            )}
            {qcQueryDetails.action_required && (
              <div>
                <span className="font-semibold">Action Required by Onsite Team:</span>
                <p className="mt-1 whitespace-pre-line">{qcQueryDetails.action_required}</p>
              </div>
            )}
            {qcQueryDetails.remarks && (
              <div>
                <span className="font-semibold">Processor Remarks:</span>
                <p className="mt-1 whitespace-pre-line">{qcQueryDetails.remarks}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
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
            {claim.claim_status === 'qc_clear' && (
              <Dialog open={showDispatchModal} onOpenChange={setShowDispatchModal}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Process
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Dispatch Claim</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Dispatch Mode Selection */}
                    <div className="space-y-2">
                      <Label>Dispatch Mode</Label>
                      <Select value={dispatchMode} onValueChange={(value: 'online' | 'courier' | 'direct') => setDispatchMode(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dispatch mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="courier">Courier</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dispatch Date */}
                    <div className="space-y-2">
                      <Label>Dispatch Date</Label>
                      <input
                        type="date"
                        value={dispatchDate}
                        onChange={(e) => setDispatchDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Mode-specific fields */}
                    {dispatchMode === 'online' && (
                      <div className="space-y-2">
                        <Label>Acknowledgment Number</Label>
                        <input
                          type="text"
                          value={acknowledgmentNumber}
                          onChange={(e) => setAcknowledgmentNumber(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter acknowledgment number"
                          required
                        />
                      </div>
                    )}

                    {dispatchMode === 'courier' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Courier Name</Label>
                          <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select courier" />
                            </SelectTrigger>
                            <SelectContent>
                              {couriers.map((courier) => (
                                <SelectItem key={courier.courier_id} value={courier.courier_name}>
                                  {courier.courier_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Docket Number</Label>
                          <input
                            type="text"
                            value={docketNumber}
                            onChange={(e) => setDocketNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter docket number"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {dispatchMode === 'direct' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Contact Person Name</Label>
                          <input
                            type="text"
                            value={contactPersonName}
                            onChange={(e) => setContactPersonName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter contact person name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <input
                            type="tel"
                            value={contactPersonPhone}
                            onChange={(e) => setContactPersonPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter phone number"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Dispatch Remarks */}
                    <div className="space-y-2">
                      <Label>Dispatch Remarks (Optional)</Label>
                      <Textarea
                        value={dispatchRemarks}
                        onChange={(e) => setDispatchRemarks(e.target.value)}
                        placeholder="Enter any additional remarks"
                        rows={3}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDispatchModal(false)}
                        disabled={submittingDispatch}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDispatchClaim}
                        disabled={submittingDispatch || !dispatchDate}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {submittingDispatch ? 'Dispatching...' : 'Dispatch Claim'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

      {/* Claim Details Accordion */}
      <Card className="border-0 shadow-sm">
        <Accordion type="multiple" defaultValue={['patient', 'payer', 'provider', 'bill', 'history']} className="w-full">
          {/* Patient Details */}
          <AccordionItem value="patient" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Patient Details</p>
                  <p className="text-xs text-gray-500">Basic patient information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PatientDetailsDisplay data={claim.form_data} />
            </AccordionContent>
          </AccordionItem>

          {/* Payer Details */}
          <AccordionItem value="payer" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <CreditCard className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Payer Details</p>
                  <p className="text-xs text-gray-500">Insurance & authorization</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PayerDetailsDisplay data={claim.form_data} />
            </AccordionContent>
          </AccordionItem>

          {/* Provider Details */}
          <AccordionItem value="provider" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Provider Details</p>
                  <p className="text-xs text-gray-500">Treatment information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <ProviderDetailsDisplay data={claim.form_data} hospitalName={claim.hospital_name} />
            </AccordionContent>
          </AccordionItem>

          {/* Bill Details */}
          <AccordionItem value="bill" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Bill Details</p>
                  <p className="text-xs text-gray-500">Financial information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <BillDetailsDisplay data={claim.form_data} />
            </AccordionContent>
          </AccordionItem>

          {/* Transaction History */}
          <AccordionItem value="history">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <History className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Transaction History</p>
                  <p className="text-xs text-gray-500">{transactions.length} events</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <TransactionHistory transactions={transactions} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

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

      {/* Claim Metadata */}
      <div className="mt-8">
        <ProcessorInfo claim={claim} />
      </div>
    </div>
  )
}