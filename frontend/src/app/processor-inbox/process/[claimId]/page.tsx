'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, ChevronsUpDown, X as CloseIcon, ArrowLeft, FileText, UserCircle, CreditCard, Building2, Receipt, History } from 'lucide-react'
import clsx from 'clsx'
import { PatientDetailsDisplay } from '@/components/forms/claims/PatientDetailsDisplay'
import { PayerDetailsDisplay } from '@/components/forms/claims/PayerDetailsDisplay'
import { ProviderDetailsDisplay } from '@/components/forms/claims/ProviderDetailsDisplay'
import { BillDetailsDisplay } from '@/components/forms/claims/BillDetailsDisplay'
import { TransactionHistory } from '@/components/forms/claims/TransactionHistory'
import { ProcessorInfo } from '@/components/forms/claims/ProcessorInfo'
import { toast } from '@/lib/toast'
import { claimsApi } from '@/services/claimsApi'
import { PROCESSOR_APPROVAL_LIMITS } from '@/lib/routes'
import { API_BASE_URL } from '@/lib/apiConfig'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { loadHtml2Pdf } from '@/lib/html2pdf'

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
    approvedAmountFormatted?: string
    approvedAmountInWords?: string
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
    ${data.approvedAmountFormatted ? `
    <p class="spacing"><strong>Approved Amount:</strong> ${data.approvedAmountFormatted}</p>
    <p class="spacing">Approved Amount In Words: Rupees ${data.approvedAmountInWords} Only</p>
    ` : ''}
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
const ISSUE_CATEGORY_OPTIONS = [
  'Bill Enhancement',
  'Supporting Reports',
  'Billing',
  'ICP papers with Drug administration chart',
  'Images',
  'Outer pouch/Stickers/Invoice',
  'Code correction',
  'Chemo performing chart',
  'Justification from treating Dr',
  'Feedback form',
  'Discharge summary',
  'Valid ID card',
  'Approval letter / Appendix-A',
  'Discrepancy / Mismatch',
  'OT Notes',
  'Seal & Signature of competent authority',
  'Blood transfusion chart',
  'Demographic details',
  'Warranty card details'
]

const REPEAT_ISSUE_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' }
]

const normalizeCategory = (label: string) => label.trim()

interface ClaimDetails {
  claim_id: string
  claim_status: string
  submission_date: string
  created_at: string
  updated_at?: string
  hospital_name: string
  created_by_email?: string
  processor_options?: {
    need_more_info_option?: boolean
    claim_approved_option?: boolean
    claim_denial_option?: boolean
  }
  
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
    to_address?: string
    address?: string
    city?: string
    state?: string
    pincode?: number
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
    documents?: Array<{ name?: string; id?: string; required?: boolean; uploaded?: boolean }>
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
  // QC Query details
  qc_query_details?: {
    issue_categories: string[];
    repeat_issue: string;
    action_required: string;
    remarks: string;
  }
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
  const [selectedIssueCategories, setSelectedIssueCategories] = useState<string[]>([])
  const [repeatIssue, setRepeatIssue] = useState<string>('')
  const [onsiteAction, setOnsiteAction] = useState<string>('')
  const [issuePopoverOpen, setIssuePopoverOpen] = useState(false)
  const normalizedIssueOptions = useMemo(
    () => ISSUE_CATEGORY_OPTIONS.map(opt => ({
      label: opt,
      value: normalizeCategory(opt)
    })),
    []
  )
  const processorOptions = claim?.processor_options || {}
  const allowNeedMoreInfo = !!processorOptions.need_more_info_option
  const allowClaimApproved = !!processorOptions.claim_approved_option
  const allowClaimDenial = !!processorOptions.claim_denial_option
  
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
    const processorRoles = ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4']
    if (user && !processorRoles.includes(user.role as string)) {
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

      const response = await fetch(`${API_BASE_URL}/processor-routes/get-claim-details/${claimId}`, {
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
        // Check processor approval limit
        if (user?.role && PROCESSOR_APPROVAL_LIMITS[user.role] !== undefined) {
          const userLimit = PROCESSOR_APPROVAL_LIMITS[user.role]
          const claimAmount = data.claim?.claimed_amount || 0
          
          if (claimAmount > userLimit) {
            setError(`This claim amount (₹${claimAmount.toLocaleString('en-IN')}) exceeds your approval limit of ₹${userLimit.toLocaleString('en-IN')}. You cannot process this claim.`)
            setLoading(false)
            return
          }
        }
        
        const processorOptions = data.claim?.processor_options || {}
        const allowedStatuses = new Set(['qc_clear', 'qc_query'])
        if (processorOptions.need_more_info_option) {
          allowedStatuses.add('need_more_info')
        }
        if (processorOptions.claim_approved_option) {
          allowedStatuses.add('claim_approved')
        }
        if (processorOptions.claim_denial_option) {
          allowedStatuses.add('claim_denial')
        }
        
        const initialStatus = allowedStatuses.has(data.claim?.claim_status)
          ? data.claim.claim_status
          : ''
        
        setClaim(data.claim)
        setFormData(prev => ({
          ...prev,
          status: initialStatus
        }))

        const existingQueryDetails = data.claim?.qc_query_details
        if (existingQueryDetails) {
          setSelectedIssueCategories(
            (existingQueryDetails.issue_categories || [])
              .map((option: string) => normalizeCategory(option))
              .filter((value: string) => normalizedIssueOptions.some(opt => opt.value === value))
          )
          setRepeatIssue(existingQueryDetails.repeat_issue || '')
          setOnsiteAction(existingQueryDetails.action_required || '')
        }
        else {
          setSelectedIssueCategories([])
          setRepeatIssue('')
          setOnsiteAction('')
        }
        
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

    if (status !== 'qc_query') {
      setSelectedIssueCategories([])
      setRepeatIssue('')
      setOnsiteAction('')
      setIssuePopoverOpen(false)
    }
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
    if (!doc?.download_url) {
      toast.error('Document download URL not found.')
      return
    }

    try {
      const link = document.createElement('a')
      link.href = doc.download_url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err: any) {
      console.error('Error downloading document:', err)
      toast.error(err.message || 'Failed to download document.')
    }
  }

  const handleDownloadDocument = async (doc: any) => {
    await handleViewDocument(doc)
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

      if (formData.status === 'qc_query' && (!onsiteAction.trim() || selectedIssueCategories.length === 0 || !repeatIssue)) {
        toast.error('Please complete the QC Query details before submitting.')
        setProcessing(false)
        return
      }

      const requestData: Record<string, any> = {
        status: formData.status,
        remarks: formData.remarks || ''
      }

      if (formData.status === 'qc_query') {
        requestData.query_details = {
          issue_categories: selectedIssueCategories,
          repeat_issue: repeatIssue,
          action_required: onsiteAction.trim(),
          remarks: formData.remarks || ''
        }
      }

      // Add approved_amount for claim_approved status
      if (formData.status === 'claim_approved' && formData.approved_amount) {
        requestData.approved_amount = formData.approved_amount
      }

      console.log('🔍 Sending claim update request:', {
        url: `${API_BASE_URL}/processor-routes/process-claim/${claimId}`,
        data: requestData,
        formData: formData
      })

      const response = await fetch(`${API_BASE_URL}/processor-routes/process-claim/${claimId}`, {
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
      const response = await fetch(`${API_BASE_URL}/processor-routes/unlock-claim/${claimId}`, {
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

  const payerAddressLines = useMemo(() => {
    if (!claim?.payer_details) return []
    const lines: string[] = []
    const toAddress = (claim.payer_details.to_address || '').trim()

    if (toAddress) {
      toAddress.split(/\r?\n/).forEach((line: string) => {
        const trimmed = line.trim()
        if (trimmed) {
          lines.push(trimmed)
        }
      })
    } else {
      const address = claim.payer_details.address
      const cityState = [claim.payer_details.city, claim.payer_details.state]
        .filter(Boolean)
        .join(', ')
      const pincode = claim.payer_details.pincode

      if (address) lines.push(address as string)
      if (cityState) lines.push(cityState)
      if (pincode) lines.push(String(pincode))
    }

    return lines
  }, [claim?.payer_details])

  const coverLetterData = useMemo(() => {
    if (!claim) return null

    const formAny = (claim as any)
    const financial = formAny.financial_details || {}
    const formData = formAny.form_data || formAny.claim_details || {}

    const payerName =
      claim.payer_details?.payer_name ||
      formData?.payer_name ||
      claim.payer_details?.insurer_name ||
      'Payer'

    const amount =
      parseAmountField(financial.claimed_amount) ||
      parseAmountField(financial.amount_charged_to_payer) ||
      parseAmountField(financial.total_bill_amount) ||
      0

    // Get approved amount if claim is approved
    const approvedAmount = claim.claim_status === 'claim_approved' 
      ? (parseAmountField(claim.approved_amount) || parseAmountField(financial.approved_amount) || amount)
      : null

    const billNumber = (financial as any).bill_number || formData.bill_number || 'N/A'
    const billDate = (financial as any).bill_date || formData.bill_date || ''
    const authorizationNo =
      formData.authorization_number ||
      claim.payer_details?.authorization_number ||
      'N/A'

    const patientName =
      formData.patient_name ||
      claim.patient_details?.patient_name ||
      (claim.patient_details as any)?.patient_id ||
      'N/A'

    const dispatchTimestamp = claim.dispatched_at || claim.processed_at || claim.updated_at
    const dispatchDate =
      dispatchTimestamp && !Number.isNaN(new Date(dispatchTimestamp).getTime())
        ? new Date(dispatchTimestamp)
        : new Date()

    const formDocuments: Array<{ name?: string; id?: string; required?: boolean; uploaded?: boolean }> =
      Array.isArray(formData.documents) ? formData.documents : []

    const fallbackEnclosures = ['Cover Letter', 'Pre-Authorisation / Referral Letter', 'Final Bill with Break-Up', 'Discharge Summary']

    const dynamicEnclosures = formDocuments
      .map(doc => (doc.name || doc.id || '').trim())
      .filter(Boolean)

    const enclosures = dynamicEnclosures.length ? Array.from(new Set(dynamicEnclosures)) : fallbackEnclosures

    return {
      payerName,
      billNumber,
      billDate,
      patientName,
      authorizationNo,
      amountFormatted: formatCurrencyINR(amount),
      amountInWords: convertNumberToWords(amount),
      approvedAmountFormatted: approvedAmount ? formatCurrencyINR(approvedAmount) : undefined,
      approvedAmountInWords: approvedAmount ? convertNumberToWords(approvedAmount) : undefined,
      formattedDateTime: new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(dispatchDate),
      hospitalName: claim.hospital_name || 'Hospital',
      enclosures
    }
  }, [claim])

  const handlePrintCoverLetter = useCallback(async () => {
    if (!coverLetterData) return
    const element = document.getElementById('processor-cover-letter-print')
    if (!element) {
      toast.error('Cover letter preview not available.')
      return
    }

    const html2pdfModule = await loadHtml2Pdf()
    const worker = html2pdfModule.default()
      .set({
        margin: [10, 12, 10, 12],
        filename: `${claim?.claim_id || 'cover-letter'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(element)

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

  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false)

  const coverLetterDoc = useMemo(() => {
    if (!claim) return null
    return claim.documents?.find(doc => doc.document_name === 'Cover Letter' && doc.status === 'uploaded')
  }, [claim])

  const claimFormData = useMemo(() => {
    if (!claim) return {}
    const claimAny = claim as any
    return claimAny.form_data || claimAny.claim_details || {}
  }, [claim])

  const payerDetails = claim?.payer_details || {}

  const submissionDisplay = useMemo(() => {
    const timestamp = claim?.submission_date || claim?.created_at
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [claim?.submission_date, claim?.created_at])

  const accordionDefaults = useMemo(() => ['patient', 'payer', 'provider', 'bill', 'history'], [])

  const hasSubmissionLetters = useMemo(() => Boolean(coverLetterData || coverLetterDoc), [coverLetterData, coverLetterDoc])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading claim details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Card className="mx-auto max-w-lg border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Unable to load claim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Claim not found</CardTitle>
            <CardDescription>The claim with ID "{claimId}" could not be located.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold leading-tight">Process Claim</h1>
            <p className="text-sm text-muted-foreground">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
        <div className="text-right space-y-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadge(claim.claim_status)}`}>
            {claim.claim_status?.replace('_', ' ') || 'Unknown'}
          </span>
          <p className="text-xs text-muted-foreground">Submitted: {submissionDisplay}</p>
        </div>
      </div>

      {!isClaimProcessed(claim.claim_status) && (
        <Card className="border border-blue-100 bg-blue-50/80 shadow-none">
          <CardHeader>
            <CardTitle className="text-blue-800">Process Claim</CardTitle>
            <CardDescription>Update the current status or raise a processor query.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qc_clear">QC Clear</SelectItem>
                    <SelectItem value="qc_query">QC Query</SelectItem>
                    {allowClaimApproved && <SelectItem value="claim_approved">Claim Approved</SelectItem>}
                    {allowClaimDenial && <SelectItem value="claim_denial">Claim Denial</SelectItem>}
                    {allowNeedMoreInfo && <SelectItem value="need_more_info">Need More Info</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {formData.status !== 'qc_query' && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">Processing Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter remarks..."
                    value={formData.remarks}
                    onChange={(event) => handleFieldChange('remarks', event.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {formData.status === 'qc_query' && (
              <div className="space-y-6 rounded-lg border bg-white p-4">
                <div className="space-y-2">
                  <Label>Issue Category <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground">Select one or more categories relevant to the query.</p>
                  <Popover open={issuePopoverOpen} onOpenChange={setIssuePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={issuePopoverOpen} className="w-full justify-between">
                        {selectedIssueCategories.length > 0 ? `${selectedIssueCategories.length} option(s) selected` : 'Select issue categories'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search issue categories..." />
                        <CommandEmpty>No issue category found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {normalizedIssueOptions.map((option) => {
                              const selected = selectedIssueCategories.includes(option.value)
                              return (
                                <CommandItem
                                  key={option.value}
                                  onSelect={() => {
                                    setSelectedIssueCategories((prev) =>
                                      prev.includes(option.value)
                                        ? prev.filter((item) => item !== option.value)
                                        : [...prev, option.value]
                                    )
                                  }}
                                >
                                  <Check className={clsx('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                  {option.label}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedIssueCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedIssueCategories.map((category) => {
                        const optionLabel =
                          ISSUE_CATEGORY_OPTIONS.find((opt) => normalizeCategory(opt) === category) || category
                        return (
                          <span
                            key={category}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                          >
                            {optionLabel}
                            <button
                              type="button"
                              onClick={() => setSelectedIssueCategories((prev) => prev.filter((item) => item !== category))}
                              className="ml-1 rounded-full hover:bg-blue-200"
                              aria-label={`Remove ${optionLabel}`}
                            >
                              <CloseIcon className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Is this a repeat issue? <span className="text-red-500">*</span></Label>
                    <Select value={repeatIssue} onValueChange={setRepeatIssue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {REPEAT_ISSUE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action Required by Onsite Team <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="Describe the action required from the onsite team"
                    value={onsiteAction}
                    onChange={(event) => setOnsiteAction(event.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">This field is mandatory when raising a QC query.</p>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    placeholder="Add any additional context for the query"
                    value={formData.remarks}
                    onChange={(event) => handleFieldChange('remarks', event.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {formData.status === 'claim_approved' && (
              <div className="space-y-4 rounded-lg border bg-white p-4">
                <div className="space-y-2">
                  <Label htmlFor="approved_amount">Approved Amount (₹) <span className="text-red-500">*</span></Label>
                  <p className="text-xs text-muted-foreground">Enter the approved amount for this claim. If not specified, claimed amount will be used.</p>
                  <Input
                    id="approved_amount"
                    type="number"
                    placeholder="Enter approved amount"
                    value={formData.approved_amount || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : 0
                      handleFieldChange('approved_amount', value)
                    }}
                    min="0"
                    step="0.01"
                  />
                  {claim?.form_data?.claimed_amount && (
                    <p className="text-xs text-muted-foreground">
                      Claimed Amount: ₹{new Intl.NumberFormat('en-IN').format(parseFloat(claim.form_data.claimed_amount) || 0)}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                processing ||
                !formData.status ||
                (formData.status === 'qc_query' && (!onsiteAction.trim() || selectedIssueCategories.length === 0 || !repeatIssue))
              }
              className="w-full md:w-fit"
            >
              {processing ? 'Processing…' : 'Submit Processing'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isClaimProcessed(claim.claim_status) && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="space-y-2 text-sm text-green-900">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {claim.claim_status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="font-semibold">Claim already processed</span>
            </div>
            <p>This claim is in a processed state and cannot be modified.</p>
          </AlertDescription>
        </Alert>
      )}

      {claim.locked_by_processor === user?.uid && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="flex flex-col gap-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">You have this claim locked.</p>
              <p className="text-xs text-amber-700">
                Locked by {claim.locked_by_processor_name || claim.locked_by_processor_email} on{' '}
                {claim.locked_at ? new Date(claim.locked_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnlockClaim} disabled={processing}>
              {processing ? 'Unlocking…' : 'Unlock Claim'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {claim.processing_remarks && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="space-y-2 text-sm text-amber-900">
            <p className="font-semibold">Processing Remarks</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{claim.processing_remarks}</p>
            {claim.processed_by_name && (
              <p className="text-xs text-amber-700">
                Processed by {claim.processed_by_name}{' '}
                {claim.processed_at &&
                  `(on ${new Date(claim.processed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Accordion type="multiple" defaultValue={accordionDefaults} className="w-full">
          <AccordionItem value="patient" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Patient Details</p>
                  <p className="text-xs text-muted-foreground">Basic patient information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PatientDetailsDisplay data={claimFormData} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="payer" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <CreditCard className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Payer Details</p>
                  <p className="text-xs text-muted-foreground">Insurance &amp; authorization</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PayerDetailsDisplay data={{ ...claimFormData, ...payerDetails }} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="provider" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Provider Details</p>
                  <p className="text-xs text-muted-foreground">Treatment information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <ProviderDetailsDisplay data={claimFormData} hospitalName={claim.hospital_name} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bill" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Bill Details</p>
                  <p className="text-xs text-muted-foreground">Financial information</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <BillDetailsDisplay data={claimFormData} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="history">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <History className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Transaction History</p>
                  <p className="text-xs text-muted-foreground">{transactions.length} events</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                </div>
              ) : (
                <TransactionHistory transactions={transactions} />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {hasSubmissionLetters && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FileText className="h-4 w-4 text-blue-600" />
            Submission Letters
          </div>
          {payerAddressLines.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">To:</p>
              <p className="text-slate-900">
                {payerDetails?.payer_name || claimFormData?.payer_name || 'Payer'}
              </p>
              {payerAddressLines.map((line, idx) => (
                <p key={`payer-address-${idx}`}>{line}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {coverLetterData && (
              <Button size="sm" type="button" onClick={() => setShowCoverLetterPreview(true)}>
                Preview Cover Letter
              </Button>
            )}
            {coverLetterData && (
              <Button size="sm" variant="outline" type="button" onClick={handleDownloadCoverLetter}>
                Download Cover Letter
              </Button>
            )}
            {coverLetterDoc && (
              <>
                <Button size="sm" variant="secondary" type="button" onClick={() => handleViewDocument(coverLetterDoc)}>
                  View Uploaded Cover Letter
                </Button>
                <Button size="sm" variant="outline" type="button" onClick={() => handleDownloadDocument(coverLetterDoc)}>
                  Download Uploaded Cover Letter
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
            <DialogDescription>Automatically generated cover letter using the claim and payer information.</DialogDescription>
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
                id="processor-cover-letter-print"
                className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800"
              >
                <div>
                  <p className="mb-2">To,</p>
                  <p className="font-semibold text-slate-900">{coverLetterData.payerName}</p>
                  {payerAddressLines.length > 0 ? (
                    payerAddressLines.map((line, idx) => (
                      <p key={`preview-address-${idx}`}>{line}</p>
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
                    With reference to the above subject, we are sending the outstanding bills along with the original discharge summary and all the other necessary documents for the below-mentioned patient.
                  </p>
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-left">SL NO</th>
                      <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-left">Bill / Date</th>
                      <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-left">Patient Name</th>
                      <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-left">Authorization / CCN No</th>
                      <th className="border border-slate-200 bg-slate-100 px-2 py-1 text-right">Bill Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-200 px-2 py-1">1</td>
                      <td className="border border-slate-200 px-2 py-1">
                        {coverLetterData.billNumber}
                        {coverLetterData.billDate && ` / ${coverLetterData.billDate}`}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">{coverLetterData.patientName || 'N/A'}</td>
                      <td className="border border-slate-200 px-2 py-1">{coverLetterData.authorizationNo}</td>
                      <td className="border border-slate-200 px-2 py-1 text-right">{coverLetterData.amountFormatted}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <th colSpan={4} className="border border-slate-200 px-2 py-1 text-right">
                        Total Amount
                      </th>
                      <th className="border border-slate-200 px-2 py-1 text-right">{coverLetterData.amountFormatted}</th>
                    </tr>
                  </tfoot>
                </table>

                <p>In Words: Rupees {coverLetterData.amountInWords} Only</p>

                <div className="space-y-1">
                  <p className="font-semibold">Enclosures:</p>
                  <ul className="list-inside list-disc">
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

      {claim.documents && claim.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📄 Attached Documents ({claim.documents.length})
            </CardTitle>
            <CardDescription>Documents that were uploaded and attached to this claim</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {claim.documents.map((doc: any, index: number) => (
                <div key={doc.document_id || index} className="rounded-lg border bg-muted/40 p-4 transition-colors hover:bg-muted/60">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="mb-1 text-sm font-medium text-gray-900">{doc.document_name}</h4>
                      <p className="mb-2 text-xs text-muted-foreground capitalize">
                        {doc.document_type?.replace('_', ' ') || 'Document'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        doc.status === 'uploaded' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                  <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                    <div>ID: {doc.document_id}</div>
                    {doc.uploaded_at && <div>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewDocument(doc)}>
                      View
                    </Button>
                    {doc.download_url && (
                      <Button variant="secondary" size="sm" onClick={() => handleDownloadDocument(doc)}>
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ProcessorInfo claim={claim} />
    </div>
  )
}
