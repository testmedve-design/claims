'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, RefreshCw, FileText, User, Building, DollarSign, Calendar, Upload, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { rmApi, type RMClaimDetails } from '@/services/rmApi'

const RM_STATUSES = [
  'RECEIVED',
  'QUERY RAISED',
  'REPUDIATED',
  'SETTLED',
  'APPROVED',
  'PARTIALLY SETTLED',
  'RECONCILIATION',
  'INPROGRESS',
  'CANCELLED',
  'CLOSED',
  'NOT FOUND'
]

const SETTLEMENT_STATUSES = ['SETTLED', 'PARTIALLY SETTLED', 'RECONCILIATION']

export default function RMProcessClaimPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const claimId = params.claimId as string

  const [claim, setClaim] = useState<RMClaimDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banks, setBanks] = useState<{bank_id: string, name: string}[]>([])

  // Form state
  const [rmStatus, setRmStatus] = useState('RECEIVED')
  const [statusRaisedDate, setStatusRaisedDate] = useState('')
  const [statusRaisedRemarks, setStatusRaisedRemarks] = useState('')
  
  // Settlement fields
  const [settlementData, setSettlementData] = useState({
    claim_settlement_date: '',
    payment_mode: '',
    payer_bank: '',
    payer_account: '',
    provider_bank_name: '',
    provider_account_no: '',
    payment_reference_no: '',
    settled_tds_amount: '',
    settled_amount_without_tds: '',
    tds_percentage: '',
    tds_amount: '',
    disallowed_amount: '',
    disallowed_reasons: '',
    discount_as_per_payer: '',
    uititsl_service_fees: '',
    excess_paid: '',
    contested_amount_from_payer: '',
    settled_remarks: '',
    medverve_review_remarks: ''
  })

  // Custom fields for other statuses
  const [customFields, setCustomFields] = useState<Record<string, string>>({})

  // Document upload state
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')

  useEffect(() => {
    if (claimId) {
      fetchClaimDetails()
      fetchBanks()
    }
  }, [claimId])

  const fetchBanks = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claims-2.onrender.com/api'
      const response = await fetch(`${API_BASE_URL}/resources/banks`)
      const data = await response.json()
      if (data.success && data.banks) {
        setBanks(data.banks)
        console.log('✅ Banks loaded:', data.banks.length, 'banks')
      }
    } catch (err) {
      console.error('❌ Error fetching banks:', err)
    }
  }

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      
      const data = await rmApi.getClaimDetails(claimId)
      
      if (data.success) {
        setClaim(data.claim)
        setRmStatus(data.claim.rm_status || 'RECEIVED')
        
        // Load existing RM data if available
        if (data.claim.rm_data) {
          setSettlementData({ ...settlementData, ...data.claim.rm_data })
          setCustomFields(data.claim.rm_data)
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

  const handleUpdateClaim = async () => {
    try {
      setSaving(true)

      // Prepare data based on status
      let rmData = {}
      if (SETTLEMENT_STATUSES.includes(rmStatus)) {
        rmData = settlementData
      } else {
        rmData = customFields
      }

      const data = await rmApi.updateClaim(claimId, {
        rm_status: rmStatus,
        status_raised_date: statusRaisedDate,
        status_raised_remarks: statusRaisedRemarks,
        rm_data: rmData
      })
      
      if (data.success) {
        alert('Claim updated successfully!')
        router.push('/rm-inbox')
      } else {
        throw new Error(data.error || 'Failed to update claim')
      }
    } catch (err: any) {
      console.error('Error updating claim:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleReEvaluate = async () => {
    try {
      setSaving(true)

      const remarks = prompt('Please enter remarks for re-evaluation:')
      if (!remarks) {
        setSaving(false)
        return
      }

      const data = await rmApi.reevaluateClaim(claimId, remarks)
      
      if (data.success) {
        alert('Claim marked for re-evaluation successfully!')
        router.push('/rm-inbox')
      } else {
        throw new Error(data.error || 'Failed to re-evaluate claim')
      }
    } catch (err: any) {
      console.error('Error re-evaluating claim:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDocumentUpload = async () => {
    if (!selectedFile || !documentType) {
      alert('Please select a file and document type')
      return
    }

    try {
      setUploadingDocument(true)
      const token = localStorage.getItem('auth_token')
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('claim_id', claimId)
      formData.append('document_type', documentType)
      formData.append('document_name', selectedFile.name)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claims-2.onrender.com/api'
      const response = await fetch(`${API_BASE_URL}/v1/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload document')
      }

      const data = await response.json()
      
      if (data.success) {
        alert('Document uploaded successfully!')
        // Refresh claim details to show new document
        fetchClaimDetails()
        // Reset form
        setSelectedFile(null)
        setDocumentType('')
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (err: any) {
      console.error('Error uploading document:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setUploadingDocument(false)
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

  if (error || !claim) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error || 'Claim not found'}</p>
            <Button onClick={() => router.push('/rm-inbox')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to RM Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/rm-inbox')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Process Claim</h1>
            <p className="text-gray-600 mt-1">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Claim Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="patient" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="patient">Patient</TabsTrigger>
                  <TabsTrigger value="payer">Payer</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                </TabsList>
                <TabsContent value="patient" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Patient Name</Label>
                      <p className="font-medium">{claim.patient_details?.patient_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Age / Gender</Label>
                      <p className="font-medium">{claim.patient_details?.age || 'N/A'} / {claim.patient_details?.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Contact Number</Label>
                      <p className="font-medium">{claim.patient_details?.patient_contact_number || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Email</Label>
                      <p className="font-medium">{claim.patient_details?.patient_email_id || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="payer" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Payer Name</Label>
                      <p className="font-medium">{claim.payer_details?.payer_name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Payer Type</Label>
                      <p className="font-medium">{claim.payer_details?.payer_type || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Policy Number</Label>
                      <p className="font-medium">{claim.payer_details?.policy_number || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Authorization Number</Label>
                      <p className="font-medium">{claim.payer_details?.authorization_number || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Total Bill Amount</Label>
                      <p className="font-medium">₹{claim.financial_details?.total_bill_amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Claimed Amount</Label>
                      <p className="font-medium">₹{claim.financial_details?.claimed_amount?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Amount Charged to Payer</Label>
                      <p className="font-medium">₹{claim.financial_details?.amount_charged_to_payer?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* RM Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update RM Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rm-status">RM Status *</Label>
                <Select value={rmStatus} onValueChange={setRmStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RM_STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-date">Status Raised Date</Label>
                <Input
                  id="status-date"
                  type="date"
                  value={statusRaisedDate}
                  onChange={(e) => setStatusRaisedDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="status-remarks">Status Raised Remarks</Label>
                <Textarea
                  id="status-remarks"
                  value={statusRaisedRemarks}
                  onChange={(e) => setStatusRaisedRemarks(e.target.value)}
                  rows={3}
                  placeholder="Enter remarks for this status update..."
                />
              </div>

              {/* Settlement Fields */}
              {SETTLEMENT_STATUSES.includes(rmStatus) && (
                <div className="space-y-4 mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h3 className="text-lg font-semibold text-blue-900">Settlement Information</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="settlement-date">Claim Settlement Date *</Label>
                      <Input
                        id="settlement-date"
                        type="date"
                        value={settlementData.claim_settlement_date}
                        onChange={(e) => setSettlementData({...settlementData, claim_settlement_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-mode">Payment Mode *</Label>
                      <Select 
                        value={settlementData.payment_mode}
                        onValueChange={(value) => setSettlementData({...settlementData, payment_mode: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EFT">EFT</SelectItem>
                          <SelectItem value="NEFT">NEFT</SelectItem>
                          <SelectItem value="RTGS">RTGS</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Online Transfer">Online Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payer-bank">Payer Bank</Label>
                      <Select 
                        value={settlementData.payer_bank}
                        onValueChange={(value) => setSettlementData({...settlementData, payer_bank: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payer bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.bank_id} value={bank.name}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="payer-account">Payer Account</Label>
                      <Input
                        id="payer-account"
                        value={settlementData.payer_account}
                        onChange={(e) => setSettlementData({...settlementData, payer_account: e.target.value})}
                        placeholder="Enter payer account number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="provider-bank">Provider Bank Name</Label>
                      <Select 
                        value={settlementData.provider_bank_name}
                        onValueChange={(value) => setSettlementData({...settlementData, provider_bank_name: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.bank_id} value={bank.name}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="provider-account">Provider Account No</Label>
                      <Input
                        id="provider-account"
                        value={settlementData.provider_account_no}
                        onChange={(e) => setSettlementData({...settlementData, provider_account_no: e.target.value})}
                        placeholder="Enter provider account number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="payment-ref">Payment Reference No</Label>
                    <Input
                      id="payment-ref"
                      value={settlementData.payment_reference_no}
                      onChange={(e) => setSettlementData({...settlementData, payment_reference_no: e.target.value})}
                      placeholder="Enter payment reference number"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="settled-tds">Settled + TDS Amount</Label>
                      <Input
                        id="settled-tds"
                        type="number"
                        value={settlementData.settled_tds_amount}
                        onChange={(e) => setSettlementData({...settlementData, settled_tds_amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="settled-amount">Settled Amount (Without TDS)</Label>
                      <Input
                        id="settled-amount"
                        type="number"
                        value={settlementData.settled_amount_without_tds}
                        onChange={(e) => setSettlementData({...settlementData, settled_amount_without_tds: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tds-percentage">TDS Percentage</Label>
                      <Input
                        id="tds-percentage"
                        type="number"
                        value={settlementData.tds_percentage}
                        onChange={(e) => setSettlementData({...settlementData, tds_percentage: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tds-amount">TDS Amount</Label>
                      <Input
                        id="tds-amount"
                        type="number"
                        value={settlementData.tds_amount}
                        onChange={(e) => setSettlementData({...settlementData, tds_amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="disallowed">Disallowed Amount</Label>
                      <Input
                        id="disallowed"
                        type="number"
                        value={settlementData.disallowed_amount}
                        onChange={(e) => setSettlementData({...settlementData, disallowed_amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="discount">Discount As Per Payer</Label>
                      <Input
                        id="discount"
                        type="number"
                        value={settlementData.discount_as_per_payer}
                        onChange={(e) => setSettlementData({...settlementData, discount_as_per_payer: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="disallowed-reasons">Disallowed Reasons</Label>
                    <Textarea
                      id="disallowed-reasons"
                      value={settlementData.disallowed_reasons}
                      onChange={(e) => setSettlementData({...settlementData, disallowed_reasons: e.target.value})}
                      rows={2}
                      placeholder="Enter reasons for disallowed amount..."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="service-fees">UITITSL Service Fees</Label>
                      <Input
                        id="service-fees"
                        type="number"
                        value={settlementData.uititsl_service_fees}
                        onChange={(e) => setSettlementData({...settlementData, uititsl_service_fees: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="excess-paid">Excess Paid</Label>
                      <Input
                        id="excess-paid"
                        type="number"
                        value={settlementData.excess_paid}
                        onChange={(e) => setSettlementData({...settlementData, excess_paid: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contested">Contested Amount From Payer</Label>
                      <Input
                        id="contested"
                        type="number"
                        value={settlementData.contested_amount_from_payer}
                        onChange={(e) => setSettlementData({...settlementData, contested_amount_from_payer: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="settled-remarks">Settled Remarks</Label>
                    <Textarea
                      id="settled-remarks"
                      value={settlementData.settled_remarks}
                      onChange={(e) => setSettlementData({...settlementData, settled_remarks: e.target.value})}
                      rows={2}
                      placeholder="Enter settlement remarks..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="medverve-remarks">Medverve Review Remarks</Label>
                    <Textarea
                      id="medverve-remarks"
                      value={settlementData.medverve_review_remarks}
                      onChange={(e) => setSettlementData({...settlementData, medverve_review_remarks: e.target.value})}
                      rows={2}
                      placeholder="Enter Medverve review remarks..."
                    />
                  </div>
                </div>
              )}

              {/* Document Upload Section for Settlement Documents */}
              <div className="mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Upload Settlement Documents</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="document-type">Document Type</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Settlement Letter">Settlement Letter</SelectItem>
                        <SelectItem value="Partial Settlement Letter">Partial Settlement Letter</SelectItem>
                        <SelectItem value="Reconciliation Letter">Reconciliation Letter</SelectItem>
                        <SelectItem value="Physical Acknowledge Copy">Physical Acknowledge Copy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="document-file">Select File</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="document-file"
                        type="file"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      {selectedFile && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>{selectedFile.name}</span>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleDocumentUpload}
                    disabled={uploadingDocument || !selectedFile || !documentType}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingDocument ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={handleUpdateClaim}
                  disabled={saving}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Updating...' : 'UPDATE'}
                </Button>
                <Button 
                  onClick={handleReEvaluate}
                  disabled={saving}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-Evaluate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Claim Status</Label>
                <Badge variant="outline" className="mt-1">{claim.claim_status}</Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600">RM Status</Label>
                <Badge variant="outline" className="mt-1">{claim.rm_status || 'RECEIVED'}</Badge>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Hospital</Label>
                <p className="text-sm">{claim.hospital_name}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Submission Date</Label>
                <p className="text-sm">{new Date(claim.submission_date).toLocaleDateString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle>Documents ({claim.documents?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {claim.documents && claim.documents.length > 0 ? (
                <div className="space-y-2">
                  {claim.documents.map((doc: any) => (
                    <div key={doc.document_id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.document_type}</p>
                        <p className="text-xs text-gray-500">{doc.original_filename}</p>
                      </div>
                      {doc.download_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No documents available</p>
              )}
            </CardContent>
          </Card>

          {/* Transaction History */}
          {claim.transactions && claim.transactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {claim.transactions.map((trans: any, index: number) => (
                    <div key={trans.transaction_id || index} className="border-l-2 border-blue-500 pl-3 py-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{trans.transaction_type}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(trans.timestamp).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{trans.performed_by}</p>
                      {trans.remarks && (
                        <p className="text-xs text-gray-600 mt-1">{trans.remarks}</p>
                      )}
                      {trans.previous_status && trans.new_status && (
                        <p className="text-xs text-gray-500 mt-1">
                          {trans.previous_status} → {trans.new_status}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

