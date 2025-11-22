'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { claimsApi } from '@/services/claimsApi'
import {
  Truck,
  Settings,
  UserCircle,
  CreditCard,
  Building2,
  Receipt,
  History,
  FileText,
  Download,
  FlagTriangleRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
import { loadHtml2Pdf } from '@/lib/html2pdf'
import { reviewRequestApi, type ReviewAction, type ReviewDecisionPayload } from '@/services/reviewRequestApi'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'

const formatCurrencyINR = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)

const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

const twoDigitToWords = (num: number): string => {
  if (num < 10) return units[num]
  if (num < 20) return teens[num - 10]
  const ten = Math.floor(num / 10)
  const unit = num % 10
  return `${tens[ten]}${unit ? ` ${units[unit]}` : ''}`.trim()
}

const convertNumberToWords = (value: number): string => {
  value = Math.floor(value)
  if (value === 0) return 'Zero'

  const parts: string[] = []

  const crore = Math.floor(value / 10000000)
  if (crore > 0) {
    parts.push(`${twoDigitToWords(crore)} Crore`)
    value %= 10000000
  }

  const lakh = Math.floor(value / 100000)
  if (lakh > 0) {
    parts.push(`${twoDigitToWords(lakh)} Lakh`)
    value %= 100000
  }

  const thousand = Math.floor(value / 1000)
  if (thousand > 0) {
    parts.push(`${twoDigitToWords(thousand)} Thousand`)
    value %= 1000
  }

  const hundred = Math.floor(value / 100)
  if (hundred > 0) {
    parts.push(`${units[hundred]} Hundred`)
    value %= 100
  }

  if (value > 0) {
    if (parts.length > 0) {
      parts.push('and')
    }
    parts.push(twoDigitToWords(value))
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

const buildCoverLetterHtml = (
  data: {
    payerName: string
    formattedDateTime: string
    billNumber: string
    billDate?: string
    patientName?: string
    authorizationNo: string
    amountFormatted: string
    amountInWords: string
    enclosures: string[]
    hospitalName: string
  },
  addressLines: string[]
) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Cover Letter</title>
    <style>
      body { font-family: 'Inter', sans-serif; padding: 32px; color: #0f172a; }
      h1, h2, h3, h4, h5, h6 { margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #cbd5f5; padding: 8px; font-size: 14px; text-align: left; }
      th { background: #f1f5f9; }
      .text-right { text-align: right; }
      .spacing { margin-top: 16px; }
      ul { margin: 8px 0 0 20px; padding: 0; }
    </style>
  </head>
  <body>
    <p>To,</p>
    <p><strong>${data.payerName}</strong></p>
    ${addressLines.length ? addressLines.map(line => `<p>${line}</p>`).join('') : '<p><em>Payer address not available</em></p>'}
    <p class="spacing" style="text-align:right;"><strong>Date:</strong> ${data.formattedDateTime}</p>
    <div class="spacing">
      <p>Respected Sir/Madam,</p>
      <p><strong>Sub: Submission of Outstanding Bill for Payments</strong></p>
      <p>With reference to the above subject, we are sending the outstanding bills along with the original discharge summary and all the other necessary documents for the below-mentioned patient.</p>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:40px;">SL NO</th>
          <th>Bill / Date</th>
          <th>Patient Name</th>
          <th>Authorization / CCN No</th>
          <th class="text-right">Bill Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${data.billNumber}${data.billDate ? ` / ${data.billDate}` : ''}</td>
          <td>${data.patientName || 'N/A'}</td>
          <td>${data.authorizationNo}</td>
          <td class="text-right">${data.amountFormatted}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th colspan="4" class="text-right">Total Amount</th>
          <th class="text-right">${data.amountFormatted}</th>
        </tr>
      </tfoot>
    </table>
    <p class="spacing">In Words: Rupees ${data.amountInWords} Only</p>
    <div class="spacing">
      <p><strong>Enclosures:</strong></p>
      <ul>
        ${data.enclosures.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
    <div class="spacing">
      <p>Thanking You,</p>
      <p>${data.hospitalName}</p>
    </div>
  </body>
</html>`

const parseAmountField = (value: unknown): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parsed = Number(cleaned)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return 0
}

const REVIEW_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  'REVIEW PENDING': { label: 'Review Pending', className: 'text-amber-600 bg-amber-50' },
  'UNDER REVIEW': { label: 'Under Review', className: 'text-blue-600 bg-blue-50' },
  'REVIEW APPROVED': { label: 'Review Approved', className: 'text-emerald-600 bg-emerald-50' },
  'REVIEW REJECTED': { label: 'Review Rejected', className: 'text-red-600 bg-red-50' },
  'ADDITIONAL INFO NEEDED': { label: 'Additional Info Needed', className: 'text-orange-600 bg-orange-50' },
  'ESCALATED': { label: 'Escalated', className: 'text-purple-600 bg-purple-50' },
  'REVIEW COMPLETED': { label: 'Review Completed', className: 'text-slate-700 bg-slate-50' },
}

export default function ClaimDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const claimId = params.claimId as string
  const isReviewMode = (user?.role === 'review_request') || searchParams.get('from') === 'review'

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
  const [showContestForm, setShowContestForm] = useState(false)
  const [contestReason, setContestReason] = useState('')
  const [contestFiles, setContestFiles] = useState<File[]>([])
  const [submittingContest, setSubmittingContest] = useState(false)
  const [contestUploadingFiles, setContestUploadingFiles] = useState(false)

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
  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false)
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [reviewActionState, setReviewActionState] = useState<{ action?: ReviewAction | 'escalate'; loading: boolean }>({ loading: false })
  const [reviewOutcome, setReviewOutcome] = useState<'reviewed' | 'not_found'>('reviewed')
  const [approvedAmountInput, setApprovedAmountInput] = useState<string>('')
  const [reviewRequestAmountInput, setReviewRequestAmountInput] = useState<string>('')
  const [reasonByPayer, setReasonByPayer] = useState('')
  const [escalationReason, setEscalationReason] = useState('')
  const [escalatedTo, setEscalatedTo] = useState('')
  const [isEscalateOpen, setIsEscalateOpen] = useState(false)
  const handleBack = useCallback(() => {
    if (isReviewMode) {
      router.push('/review-request-inbox')
    } else {
      router.back()
    }
  }, [isReviewMode, router])

  useEffect(() => {
    if (claimId) {
      fetchClaimDetails()
    }
  }, [claimId])

  useEffect(() => {
    if (isReviewMode) {
      return
    }
    // Check if we should show query response form
    const action = searchParams.get('action')
    if (action === 'answer_query') {
      setShowQueryResponse(true)
    }
    if (action === 'contest_denial') {
      setShowContestForm(true)
    }
  }, [searchParams, isReviewMode])

  useEffect(() => {
    if (!claim?.claim_status) return
    if (!['qc_query', 'need_more_info'].includes(claim.claim_status)) {
      setShowQueryResponse(false)
    }
    if (claim.claim_status !== 'claim_denial') {
      setShowContestForm(false)
    }
  }, [claim?.claim_status])

  useEffect(() => {
    if (!isReviewMode) {
      return
    }
    setShowQueryResponse(false)
    setShowContestForm(false)
  }, [isReviewMode])

  useEffect(() => {
    // Fetch couriers when dispatch modal opens
    if (showDispatchModal && couriers.length === 0) {
      fetchCouriers()
    }
  }, [showDispatchModal])

  const coverLetterDoc = useMemo(() => {
    if (!claim?.documents) {
      return null
    }
    return claim.documents.find((doc: any) => {
      const type = (doc.document_type || '').toLowerCase()
      const name = (doc.document_name || '').toLowerCase()
      return type.includes('cover') || name.includes('cover letter')
    }) || null
  }, [claim])

  const dispatchLetterDoc = useMemo(() => {
    if (!claim?.documents) {
      return null
    }
    return claim.documents.find((doc: any) => {
      const type = (doc.document_type || '').toLowerCase()
      const name = (doc.document_name || '').toLowerCase()
      return type.includes('dispatch') || name.includes('dispatch')
    }) || null
  }, [claim])

  const claimedAmount = useMemo(() => {
    const rawValue = claim?.form_data?.claimed_amount ?? claim?.claimed_amount
    if (rawValue === null || rawValue === undefined) {
      return 0
    }
    const numeric = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue).replace(/,/g, ''))
    return Number.isFinite(numeric) ? numeric : 0
  }, [claim?.form_data?.claimed_amount, claim?.claimed_amount])

  const formattedTotalBillAmount = useMemo(() => claimedAmount.toFixed(2), [claimedAmount])

  const disallowedAmount = useMemo(() => {
    const approvedNumeric = parseFloat(approvedAmountInput || '')
    if (!Number.isFinite(approvedNumeric)) {
      return claimedAmount
    }
    const diff = claimedAmount - approvedNumeric
    return diff < 0 ? 0 : Number(diff.toFixed(2))
  }, [approvedAmountInput, claimedAmount])

  const formattedDisallowedAmount = useMemo(() => disallowedAmount.toFixed(2), [disallowedAmount])

  useEffect(() => {
    if (!isReviewMode) {
      return
    }
    if (!approvedAmountInput && claimedAmount) {
      setApprovedAmountInput(claimedAmount.toFixed(2))
    }
  }, [approvedAmountInput, claimedAmount, isReviewMode])

  const payerDetails = claim?.payer_details
  const payerAddressLines = useMemo(() => {
    if (!payerDetails) return []

    const lines: string[] = []
    const toAddress = (payerDetails.to_address || '').trim()

    if (toAddress) {
      toAddress.split(/\r?\n/).forEach((line: string) => {
        const trimmed = line.trim()
        if (trimmed) {
          lines.push(trimmed)
        }
      })
    } else {
      if (payerDetails.address) {
        lines.push(payerDetails.address)
      }
      const cityState = [payerDetails.city, payerDetails.state].filter(Boolean).join(', ')
      if (cityState) {
        lines.push(cityState)
      }
      if (payerDetails.pincode) {
        lines.push(String(payerDetails.pincode))
      }
    }

    return lines
  }, [payerDetails])

  const claimStatus = claim?.claim_status ?? ''
  const isQcQuery = claimStatus === 'qc_query'
  const isNeedMoreInfo = claimStatus === 'need_more_info'
  const isClaimDenied = claimStatus === 'claim_denial'
  const isClaimContested = claimStatus === 'claim_contested'
  const canRespond = !isReviewMode && (isQcQuery || isNeedMoreInfo)
  const responseCardClass = isNeedMoreInfo ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'
  const responseTitleText = isNeedMoreInfo ? '📄 Provide Additional Information' : '🔍 Answer Processor Query'
  const responseDescriptionText = isNeedMoreInfo
    ? 'The processor has requested additional information for this claim. Please share the details or upload supporting documents below.'
    : 'The processor has raised a query about this claim. Please provide your response below.'
  const submitButtonClass = isNeedMoreInfo
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-orange-600 hover:bg-orange-700 text-white'

  const coverLetterData = useMemo(() => {
    if (!claim) return null

    const form = claim.form_data || {}
    const payerName =
      payerDetails?.payer_name ||
      form.payer_name ||
      'Payer'
    const amount =
      parseAmountField(form.claimed_amount) ||
      parseAmountField(form.amount_charged_to_payer) ||
      0
    const lowerCasePatientName = form.patient_name || form.patient_full_name || ''
    const billNumber = form.bill_number || form.bill_no || 'N/A'
    const billDate = form.bill_date || form.bill_datetime || ''
    const authorizationNo = form.authorization_number || form.ccn_number || 'N/A'
    const dispatchTimestamp = claim.dispatched_at || claim.dispatch_date || claim.processed_at
    const dispatchDate =
      dispatchTimestamp && !Number.isNaN(new Date(dispatchTimestamp).getTime())
        ? new Date(dispatchTimestamp)
        : new Date()

    const formDocuments: Array<{ name?: string; id?: string; required?: boolean; uploaded?: boolean }> =
      Array.isArray(form.documents) ? form.documents : []

    const fallbackEnclosures = ['Cover Letter', 'Pre-Authorisation / Referral Letter', 'Final Bill with Break-Up', 'Discharge Summary']

    const dynamicEnclosures = formDocuments
      .filter(doc => doc && (doc.uploaded || doc.required))
      .map(doc => (doc.name || doc.id || '').trim())
      .filter(Boolean)

    const finalEnclosures = dynamicEnclosures.length > 0 ? Array.from(new Set(dynamicEnclosures)) : fallbackEnclosures

    return {
      payerName,
      amount,
      amountFormatted: formatCurrencyINR(amount),
      amountInWords: convertNumberToWords(amount) || 'Zero',
      patientName: lowerCasePatientName,
      billNumber,
      billDate,
      authorizationNo,
      formattedDateTime: new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(dispatchDate),
      hospitalName: claim.hospital_name || 'Hospital',
      enclosures: finalEnclosures
    }
  }, [claim, payerDetails])

  const reviewBadge = useMemo(() => {
    if (!claim?.review_status) {
      return null
    }
    const normalized = (claim.review_status || '').toUpperCase()
    const config = REVIEW_STATUS_BADGES[normalized] || {
      label: claim.review_status,
      className: 'text-slate-600 bg-slate-100',
    }
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }, [claim?.review_status])

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
      
      const encodedId = encodeURIComponent(claimId)
      
      // Determine the correct endpoint based on user role
      const processorRoles = ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4']
      const isProcessor = user && processorRoles.includes(user.role as string)
      
      let endpoint
      if (isReviewMode) {
        endpoint = `${API_BASE_URL}/review-request/get-claim-full/${encodedId}`
      } else if (isProcessor) {
        // Use processor-specific endpoint
        endpoint = `${API_BASE_URL}/processor-routes/get-claim-details/${encodedId}`
      } else {
        // Use hospital user endpoint
        endpoint = `${API_BASE_URL}/v1/claims/get-claim/${encodedId}`
      }
      
      console.log('🔍 Using endpoint:', endpoint, 'for role:', user?.role)

      const response = await fetch(endpoint, {
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
          setQcQueryDetails(data.claim?.qc_query_details || null)
          // Fetch transactions after getting claim details
          await fetchTransactions()
        } else {
          const errorMsg = data.error || 'Failed to fetch claim details'
          console.error('❌ API returned error:', errorMsg)
          setError(errorMsg)
        }
      } else {
        // Try to get error message from response
        let errorMsg = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorData.message || errorMsg
        } catch (e) {
          errorMsg = `${errorMsg} - ${response.statusText}`
        }
        console.error('❌ Failed to fetch claim details:', errorMsg)
        setError(errorMsg)
      }
    } catch (error) {
      console.error('Error fetching claim details:', error)
      setError('Failed to fetch claim details')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewSubmit = async () => {
    if (!isReviewMode) {
      return
    }
    const targetClaimId = claim?.claim_id || claimId
    if (!targetClaimId) {
      return
    }

    const approvedValue = parseFloat(approvedAmountInput || '')
    const reviewRequestValue = parseFloat(reviewRequestAmountInput || '')
    if (reviewOutcome === 'reviewed' && !Number.isFinite(approvedValue)) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid approved amount.',
        variant: 'destructive',
      })
      return
    }

    try {
      const payload: ReviewDecisionPayload = {
        review_action: reviewOutcome,
        review_remarks: reviewRemarks || undefined,
        reason_by_payer: reasonByPayer || undefined,
      }

      if (reviewOutcome === 'reviewed') {
        payload.total_bill_amount = claimedAmount
        payload.approved_amount = approvedValue
        payload.disallowed_amount = disallowedAmount
        if (Number.isFinite(reviewRequestValue)) {
          payload.review_request_amount = reviewRequestValue
        }
      }

      setReviewActionState({ loading: true, action: reviewOutcome })
      const response = await reviewRequestApi.reviewClaim(targetClaimId, payload)
      toast({
        title: 'Review updated',
        description: reviewOutcome === 'reviewed' ? 'Review details saved successfully' : 'Claim marked as not found',
      })
      if (response?.new_status) {
        setClaim((prev: any) =>
          prev
            ? {
                ...prev,
                review_status: response.new_status,
                review_data: response.review_data ?? prev.review_data,
              }
            : prev
        )
      }
      setReviewRemarks('')
      await fetchClaimDetails()
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err?.message || 'Unable to update review status',
        variant: 'destructive',
      })
    } finally {
      setReviewActionState({ loading: false })
    }
  }

  const handleEscalation = async () => {
    if (!isReviewMode) {
      return
    }
    const targetClaimId = claim?.claim_id || claimId
    if (!targetClaimId) {
      return
    }
    if (!escalationReason.trim()) {
      toast({
        title: 'Escalation requires a reason',
        description: 'Please provide a reason before escalating the claim.',
        variant: 'destructive',
      })
      return
    }

    try {
      setReviewActionState({ loading: true, action: 'escalate' })
      const response = await reviewRequestApi.escalateClaim(targetClaimId, {
        escalation_reason: escalationReason,
        escalated_to: escalatedTo || undefined,
        review_remarks: reviewRemarks || undefined,
      })
      toast({
        title: 'Claim escalated',
        description: 'The claim has been escalated to the selected reviewer.',
      })
      if (response?.new_status) {
        setClaim((prev: any) =>
          prev
            ? {
                ...prev,
                review_status: response.new_status,
                review_data: response.review_data ?? prev.review_data,
              }
            : prev
        )
      }
      setEscalationReason('')
      setEscalatedTo('')
      setReviewRemarks('')
      setIsEscalateOpen(false)
      await fetchClaimDetails()
    } catch (err: any) {
      toast({
        title: 'Escalation failed',
        description: err?.message || 'Unable to escalate claim',
        variant: 'destructive',
      })
    } finally {
      setReviewActionState({ loading: false })
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

  const handleContestFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    setContestFiles(prev => {
      const existing = prev.map(f => `${f.name}-${f.size}`)
      const fresh = files.filter(file => !existing.includes(`${file.name}-${file.size}`))

      const duplicates = files.length - fresh.length
      if (duplicates > 0) {
        toast({
          title: 'Duplicate Files Detected',
          description: `${duplicates} duplicate file(s) were not added. Please select different files.`,
          variant: 'destructive'
        })
      }

      return [...prev, ...fresh]
    })

    event.target.value = ''
  }

  const handlePrintCoverLetter = useCallback(async () => {
    const content = document.getElementById('cover-letter-print')
    if (!content || !coverLetterData) return

    const html2pdfModule = await loadHtml2Pdf()
    const worker = html2pdfModule.default()
      .set({
        margin: [10, 12, 10, 12],
        filename: `${claim?.claim_id || 'cover-letter'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(content)

    await worker.save()
  }, [coverLetterData, claim?.claim_id])

  const handleDownloadCoverLetter = useCallback(async () => {
    if (!coverLetterData) return
    const html = buildCoverLetterHtml(coverLetterData, payerAddressLines)
    const html2pdfModule = await loadHtml2Pdf()
    const worker = html2pdfModule.default()
      .set({
        margin: [10, 12, 10, 12],
        filename: `${claim?.claim_id || 'cover-letter'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(html)

    await worker.save()
  }, [coverLetterData, payerAddressLines, claim?.claim_id])

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async (files: File[], documentType: string, documentNamePrefix: string) => {
    const token = localStorage.getItem('auth_token')
    const uploadedUrls: string[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('claim_id', claimId)
      formData.append('document_type', documentType)
      formData.append('document_name', `${documentNamePrefix} - ${file.name}`)

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

  const removeContestFile = (index: number) => {
    setContestFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmitQueryResponse = async () => {
    if (!claim) return
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
      const documentType = claim.claim_status === 'need_more_info' ? 'need_more_info_response' : 'query_response'
      const documentNamePrefix = claim.claim_status === 'need_more_info' ? 'Need More Info Response' : 'Query Response'
      if (uploadedFiles.length > 0) {
        setUploadingFiles(true)
        uploadedFileIds = await uploadFiles(uploadedFiles, documentType, documentNamePrefix)
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
            description: claim.claim_status === 'need_more_info' ? 'Additional information submitted successfully' : 'Query response submitted successfully'
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

  const handleSubmitContest = async () => {
    if (!claim) return
    if (!contestReason.trim() && contestFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide a contest reason or upload supporting documents',
        variant: 'destructive'
      })
      return
    }

    try {
      setSubmittingContest(true)
      let uploadedFileIds: string[] = []
      if (contestFiles.length > 0) {
        setContestUploadingFiles(true)
        uploadedFileIds = await uploadFiles(contestFiles, 'contest_support', 'Contest Support')
        setContestUploadingFiles(false)
      }

      const response = await claimsApi.contestClaim(claimId, {
        contest_reason: contestReason.trim(),
        uploaded_files: uploadedFileIds
      })

      if (!response.success) {
        throw new Error(response.message || 'Failed to submit contest')
      }

      toast({
        title: 'Contest Submitted',
        description: 'Claim denial contested successfully'
      })
      setShowContestForm(false)
      setContestReason('')
      setContestFiles([])
      await fetchClaimDetails()
    } catch (err: any) {
      console.error('Error submitting contest:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit contest',
        variant: 'destructive'
      })
    } finally {
      setSubmittingContest(false)
      setContestUploadingFiles(false)
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
        toast({
          title: 'Authentication required',
          description: 'Please log in again to view documents.',
          variant: 'destructive'
        })
        return
      }

      // Use proxy endpoint to serve document content directly
      const proxyUrl = `${API_BASE_URL}/v1/documents/proxy/${doc.document_id}?token=${encodeURIComponent(token)}`
      
      // Open document in new tab using proxy endpoint
      window.open(proxyUrl, '_blank', 'noopener,noreferrer')
      
    } catch (err: any) {
      console.error('Error opening document:', err)
      toast({
        title: 'Unable to open document',
        description: err instanceof Error ? err.message : 'Unexpected error while opening the document.',
        variant: 'destructive'
      })
    }
  }

  const handleDownloadDocument = async (doc: any) => {
    try {
      const token = localStorage.getItem('auth_token')

      if (!token) {
        toast({
          title: 'Authentication required',
          description: 'Please log in again to download documents.',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch(`${API_BASE_URL}/v1/documents/download/${doc.document_id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || `Download failed with status ${response.status}`)
      }

      const data = await response.json()
      if (!data.download_url) {
        throw new Error('Download URL not available for this document')
      }

      const link = document.createElement('a')
      link.href = data.download_url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = data.original_filename || data.document_name || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast({
        title: 'Download started',
        description: `${data.original_filename || data.document_name || 'Document'} is downloading.`,
        variant: 'default'
      })
    } catch (err) {
      console.error('Error downloading document:', err)
      toast({
        title: 'Unable to download',
        description: err instanceof Error ? err.message : 'Unexpected error while downloading the document.',
        variant: 'destructive'
      })
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
      {isQcQuery && qcQueryDetails && (
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
      {isNeedMoreInfo && (
        <Alert className="border-blue-300 bg-blue-50 mb-6">
          <AlertDescription className="space-y-3 text-sm text-blue-900">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-200 text-blue-800">
                Need More Info
              </Badge>
              <span className="font-medium">Processor requested additional information for this claim.</span>
            </div>
            <p>Please provide the requested information or upload the supporting documents using the button on the top right.</p>
          </AlertDescription>
        </Alert>
      )}
      {isClaimDenied && (
        <Alert className="border-red-300 bg-red-50 mb-6">
          <AlertDescription className="space-y-3 text-sm text-red-900">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-200 text-red-800">
                Claim Denied
              </Badge>
              <span className="font-medium">The claim has been denied. You may contest the decision by providing additional information.</span>
            </div>
            <p>If you have new documents or clarifications, click the contest button to share them with the processor.</p>
          </AlertDescription>
        </Alert>
      )}
      {isClaimContested && (
        <Alert className="border-purple-300 bg-purple-50 mb-6">
          <AlertDescription className="space-y-3 text-sm text-purple-900">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-200 text-purple-800">
                Contest Submitted
              </Badge>
              <span className="font-medium">Additional information has been sent to the processor for reconsideration.</span>
            </div>
            {claim?.contest_reason && (
              <div>
                <span className="font-semibold">Contest Reason:</span>
                <p className="mt-1 whitespace-pre-line">{claim.contest_reason}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
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
      {isReviewMode && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Review Actions</CardTitle>
              {reviewBadge}
            </div>
            <p className="text-sm text-muted-foreground">
              Record your second-level review decision. Actions update the review status and notify other teams.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <Label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Decision
                </Label>
                <Select
                  value={reviewOutcome}
                  onValueChange={(value) => setReviewOutcome(value as 'reviewed' | 'not_found')}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="not_found">Not Found</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground max-w-xl">
                Choose the outcome and provide the financial summary. Values auto-fill from the claim and can
                be adjusted when required. Remarks are shared with the processing team.
              </div>
            </div>

            {reviewOutcome === 'reviewed' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-600/10 p-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Financial Snapshot</h3>
                    <p className="text-sm text-muted-foreground">
                      Total bill amount is auto-filled from the claim. Adjust the approved amount to update the
                      disallowed amount automatically.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Total Bill Amount</Label>
                    <Input value={formattedTotalBillAmount} readOnly />
                    <p className="text-xs text-muted-foreground">Pulled from the submitted claim.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Approved Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={approvedAmountInput}
                      onChange={(event) => setApprovedAmountInput(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Enter the amount cleared by the reviewer.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Disallowed Amount</Label>
                    <Input value={formattedDisallowedAmount} readOnly />
                    <p className="text-xs text-muted-foreground">Calculated as Total - Approved.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Review Request Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={reviewRequestAmountInput}
                      onChange={(event) => setReviewRequestAmountInput(event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: amount requested for the review team.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reviewOutcome === 'not_found' && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  Provide a clear explanation in the remarks so the processing team understands why the claim
                  could not be located.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Reason By Payer</Label>
                  <Textarea
                    placeholder="Provide payer remarks if available"
                    value={reasonByPayer}
                    onChange={(event) => setReasonByPayer(event.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Notes received from the payer explaining their decision.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Medverve Review Remarks</Label>
                  <Textarea
                    placeholder="Add Medverve review remarks"
                    value={reviewRemarks}
                    onChange={(event) => setReviewRemarks(event.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Shared internally with claims and processor teams.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Submitting the decision updates the claim review status and records an audit trail.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleReviewSubmit} disabled={reviewActionState.loading}>
                    {reviewActionState.loading && reviewActionState.action === reviewOutcome && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Submit Decision
                  </Button>
                  <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="border-purple-500 text-purple-600 hover:bg-purple-50"
                        disabled={reviewActionState.loading}
                      >
                        <FlagTriangleRight className="w-4 h-4 mr-1" />
                        Escalate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Escalate Claim</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <Textarea
                          placeholder="Escalation reason (required)"
                          value={escalationReason}
                          onChange={(event) => setEscalationReason(event.target.value)}
                        />
                        <Input
                          placeholder="Escalate to (email or reviewer name)"
                          value={escalatedTo}
                          onChange={(event) => setEscalatedTo(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          The review status will move to ESCALATED and an audit log will be recorded.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEscalationReason('')
                            setEscalatedTo('')
                            setIsEscalateOpen(false)
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleEscalation} disabled={reviewActionState.loading}>
                          {reviewActionState.loading && reviewActionState.action === 'escalate' && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Confirm Escalation
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {canRespond && !showQueryResponse && (
              <Button
                onClick={() => setShowQueryResponse(true)}
                className={`${isNeedMoreInfo ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'} text-white`}
                size="sm"
              >
                {isNeedMoreInfo ? 'Provide Info' : 'Answer Query'}
              </Button>
            )}
          {!isReviewMode && isClaimDenied && !showContestForm && (
              <Button
                onClick={() => setShowContestForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Contest Denial
              </Button>
            )}
          {!isReviewMode && claim.claim_status === 'qc_clear' && (
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

      {/* Query / Additional Info Response Form */}
      {showQueryResponse && canRespond && (
        <Card className={`mb-6 ${responseCardClass}`}>
          <CardHeader>
            <CardTitle className={isNeedMoreInfo ? 'text-blue-800' : 'text-orange-800'}>
              {responseTitleText}
            </CardTitle>
            <CardDescription>
              {responseDescriptionText}
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
                  className={submitButtonClass}
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

      {/* Contest Denial Form */}
      {showContestForm && isClaimDenied && !isReviewMode && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">🚨 Contest Claim Denial</CardTitle>
            <CardDescription>
              Share the justification or attach additional documents to request a reconsideration of the denied claim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="contest-reason">Contest Reason (Optional)</Label>
                <Textarea
                  id="contest-reason"
                  placeholder="Explain why this claim should be reconsidered..."
                  value={contestReason}
                  onChange={(e) => setContestReason(e.target.value)}
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="contest-file-upload">Upload Supporting Documents (Optional)</Label>
                <div className="mt-2">
                  <input
                    id="contest-file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                    onChange={handleContestFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, JPG, PNG, XLSX (Max 10MB per file)
                  </p>
                </div>

                {contestFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                      <span className="text-xs text-gray-500">{contestFiles.length} file(s)</span>
                    </div>
                    {contestFiles.map((file, index) => (
                      <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between bg-white p-2 rounded border border-red-100">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-red-600">📎</span>
                          <span className="text-sm text-gray-800">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContestFile(index)}
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
                  onClick={handleSubmitContest}
                  disabled={submittingContest || contestUploadingFiles}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {submittingContest ? 'Submitting...' : contestUploadingFiles ? 'Uploading Files...' : 'Submit Contest'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowContestForm(false)
                    setContestReason('')
                    setContestFiles([])
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

      {(coverLetterData || coverLetterDoc || dispatchLetterDoc) && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="h-4 w-4 text-blue-600" />
            Submission Letters
          </div>
          {payerAddressLines.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">To:</p>
              <p className="text-slate-900">
                {payerDetails?.payer_name || claim?.form_data?.payer_name || 'Payer'}
              </p>
              {payerAddressLines.map((line, idx) => (
                <p key={`payer-address-${idx}`}>{line}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {coverLetterData && (
              <Button
                size="sm"
                variant="default"
                type="button"
                onClick={() => setShowCoverLetterPreview(true)}
              >
                Preview Cover Letter
              </Button>
            )}
            {coverLetterData && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleDownloadCoverLetter}
              >
                Download Cover Letter
              </Button>
            )}
            {coverLetterDoc && (
              <>
                <Button size="sm" variant="secondary" type="button" onClick={() => handleViewDocument(coverLetterDoc)}>
                  View Cover Letter
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => handleDownloadDocument(coverLetterDoc)}>
                  Download Cover Letter
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={showCoverLetterPreview} onOpenChange={setShowCoverLetterPreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cover Letter Preview</DialogTitle>
            <DialogDescription>
              Automatically generated cover letter using the claim and payer information.
            </DialogDescription>
          </DialogHeader>
          {coverLetterData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePrintCoverLetter}>
                    Print
                  </Button>
                  <Button variant="outline" onClick={handleDownloadCoverLetter}>
                    Download
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setShowCoverLetterPreview(false)}>
                  Close
                </Button>
              </div>
              <div
                id="cover-letter-print"
                className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800 space-y-4"
              >
                <div>
                  <p className="mb-2">To,</p>
                  <p className="font-semibold text-slate-900">{coverLetterData.payerName}</p>
                  {payerAddressLines.length > 0 ? (
                    payerAddressLines.map((line, idx) => (
                      <p key={`print-address-${idx}`}>{line}</p>
                    ))
                  ) : (
                    <p className="italic text-slate-500">Payer address not available</p>
                  )}
                </div>

                <p className="text-right">
                  <span className="font-semibold">Date:</span> {coverLetterData.formattedDateTime}
                </p>

                <div className="space-y-2">
                  <p>Respected Sir/Madam,</p>
                  <p className="font-semibold">Sub: Submission of Outstanding Bill for Payments</p>
                  <p>
                    With reference to the above subject, we are sending the outstanding bills along
                    with the original discharge summary and all the other necessary documents for the
                    below-mentioned patient.
                  </p>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th className="w-8">SL NO</th>
                      <th>Bill / Date</th>
                      <th>Patient Name</th>
                      <th>Authorization / CCN No</th>
                      <th className="text-right">Bill Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>
                        {coverLetterData.billNumber}
                        {coverLetterData.billDate && ` / ${coverLetterData.billDate}`}
                      </td>
                      <td>{coverLetterData.patientName || 'N/A'}</td>
                      <td>{coverLetterData.authorizationNo}</td>
                      <td className="text-right">{coverLetterData.amountFormatted}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4} className="text-right">
                        Total Amount
                      </th>
                      <th className="text-right">{coverLetterData.amountFormatted}</th>
                    </tr>
                  </tfoot>
                </table>

                <p>In Words: Rupees {coverLetterData.amountInWords} Only</p>

                <div className="space-y-1">
                  <p className="font-semibold">Enclosures:</p>
                  <ul className="list-disc list-inside">
                    {coverLetterData.enclosures.map((item, idx) => (
                      <li key={`enclosure-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <p>Thanking You,</p>
                  <p>{coverLetterData.hospitalName}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Unable to generate cover letter data. Please ensure claim details are available.
            </p>
          )}
        </DialogContent>
      </Dialog>

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