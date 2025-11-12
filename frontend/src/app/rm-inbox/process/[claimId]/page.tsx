'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  History,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Upload,
  UserCircle,
  X
} from 'lucide-react'

import { rmApi, type RMClaimDetails } from '@/services/rmApi'
import { claimsApi } from '@/services/claimsApi'
import { toast } from '@/lib/toast'
import { API_BASE_URL } from '@/lib/apiConfig'
import { cn } from '@/lib/utils'
import { PatientDetailsDisplay } from '@/components/forms/claims/PatientDetailsDisplay'
import { PayerDetailsDisplay } from '@/components/forms/claims/PayerDetailsDisplay'
import { ProviderDetailsDisplay } from '@/components/forms/claims/ProviderDetailsDisplay'
import { BillDetailsDisplay } from '@/components/forms/claims/BillDetailsDisplay'
import { TransactionHistory } from '@/components/forms/claims/TransactionHistory'
import {
  RM_CLAIM_STATUS_OPTIONS,
  RM_SETTLEMENT_STATUS_VALUES,
  getRmClaimStatusLabel
} from '@/constants/rmClaimStatus'

const CLAIM_STATUS_BADGES: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-800',
  DISPATCHED: 'bg-green-100 text-green-800',
  CONTESTED: 'bg-amber-100 text-amber-800',
  SETTLED: 'bg-emerald-100 text-emerald-800',
  CLEARED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  RECEIVED: 'bg-blue-100 text-blue-800',
  QUERY_RAISED: 'bg-orange-100 text-orange-800',
  REPUDIATED: 'bg-red-100 text-red-800',
  APPROVED: 'bg-green-100 text-green-800',
  PARTIALLY_SETTLED: 'bg-teal-100 text-teal-800',
  RECONCILIATION: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  CLOSED: 'bg-slate-200 text-slate-700',
  NOT_FOUND: 'bg-gray-200 text-gray-700'
}

const settlementDocumentOptions = [
  'Settlement Letter',
  'Partial Settlement Letter',
  'Reconciliation Letter',
  'Physical Acknowledge Copy'
]

type DisallowanceReasonOption = {
  id: string
  label: string
  type: string
  description?: string
}

type DisallowanceEntry = {
  reasonId: string
  reasonLabel: string
  reasonType: string
  amount: string
}

const formatCurrencyINR = (value?: number | null) => {
  if (value === null || value === undefined) return '₹0.00'
  const safeNumber = Number(value)
  if (Number.isNaN(safeNumber)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(safeNumber)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

const getBadgeClass = (status: string | undefined, mapping: Record<string, string>) => {
  if (!status) return 'bg-gray-100 text-gray-700'
  return mapping[status.toUpperCase()] || 'bg-gray-100 text-gray-700'
}

export default function RMProcessClaimPage() {
  const params = useParams<{ claimId: string }>()
  const router = useRouter()
  const claimId = params.claimId

  const [claim, setClaim] = useState<RMClaimDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banks, setBanks] = useState<Array<{ bank_id: string; name: string }>>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)

  const [claimStatus, setClaimStatus] = useState('dispatched')
  const [statusRaisedDate, setStatusRaisedDate] = useState('')
  const [statusRaisedRemarks, setStatusRaisedRemarks] = useState('')

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

const [disallowanceReasons, setDisallowanceReasons] = useState<DisallowanceReasonOption[]>([])
const [disallowanceEntries, setDisallowanceEntries] = useState<DisallowanceEntry[]>([])

  const [customFields, setCustomFields] = useState<Record<string, string>>({})

  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')

  const isSettlementStatus = useMemo(
    () => RM_SETTLEMENT_STATUS_VALUES.includes(claimStatus),
    [claimStatus]
  )

  const disallowanceTotal = useMemo(() => {
    return disallowanceEntries.reduce((sum, entry) => {
      const value = parseFloat(entry.amount)
      if (Number.isNaN(value)) {
        return sum
      }
      return sum + Math.max(value, 0)
    }, 0)
  }, [disallowanceEntries])

  const disallowanceTypeOptions = useMemo(() => {
    const options = new Set<string>([
      'Recoverable from Payer',
      'Process Improvement',
      'Recoverable from Patient',
      'Known Disallowance'
    ])
    disallowanceReasons.forEach(reason => {
      if (reason.type) {
        options.add(reason.type)
      }
    })
    return Array.from(options)
  }, [disallowanceReasons])

  const claimedAmount = useMemo(() => {
    const rawClaimed =
      claim?.financial_details?.claimed_amount ??
      claim?.form_data?.claimed_amount
    const parsed = Number(rawClaimed || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [claim?.financial_details?.claimed_amount, claim?.form_data?.claimed_amount])

  const settledAmount = useMemo(() => {
    const settledWithoutTds = Number(settlementData.settled_amount_without_tds || 0)
    if (Number.isFinite(settledWithoutTds) && settledWithoutTds > 0) {
      return settledWithoutTds
    }
    const settledWithTds = Number(settlementData.settled_tds_amount || 0)
    return Number.isFinite(settledWithTds) ? settledWithTds : 0
  }, [settlementData.settled_amount_without_tds, settlementData.settled_tds_amount])

  const suggestedDisallowanceAmount = useMemo(() => {
    const difference = claimedAmount - settledAmount
    return difference > 0 ? difference : 0
  }, [claimedAmount, settledAmount])

  const excessAmount = useMemo(() => {
    const difference = settledAmount - claimedAmount
    return difference > 0 ? difference : 0
  }, [claimedAmount, settledAmount])

  const manualDisallowanceAmount = useMemo(() => {
    const parsed = Number(settlementData.disallowed_amount || 0)
    return Number.isFinite(parsed) ? parsed : 0
  }, [settlementData.disallowed_amount])

  const disallowanceRemaining = useMemo(() => {
    return manualDisallowanceAmount - disallowanceTotal
  }, [manualDisallowanceAmount, disallowanceTotal])

  const hasDisallowanceReasons = disallowanceReasons.length > 0

  const handleSettlementDataChange = (field: keyof typeof settlementData, value: string) => {
    setSettlementData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddDisallowanceEntry = () => {
    if (!hasDisallowanceReasons) {
      toast.error('No disallowance reasons available. Please contact the administrator.')
      return
    }
    setDisallowanceEntries(prev => [
      ...prev,
      { reasonId: '', reasonLabel: '', reasonType: '', amount: '' }
    ])
  }

  const handleDisallowanceReasonChange = (index: number, reasonId: string) => {
    const selectedReason = disallowanceReasons.find(reason => reason.id === reasonId)
    setDisallowanceEntries(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        reasonId,
        reasonLabel: selectedReason?.label || reasonId,
        reasonType: selectedReason?.type || next[index].reasonType || ''
      }
      return next
    })
  }

  const handleDisallowanceTypeChange = (index: number, reasonType: string) => {
    setDisallowanceEntries(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        reasonType
      }
      return next
    })
  }

  const handleDisallowanceAmountChange = (index: number, value: string) => {
    if (value !== '' && Number(value) < 0) {
      return
    }
    setDisallowanceEntries(prev => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        amount: value
      }
      return next
    })
  }

  const handleApplySuggestedDisallowance = useCallback(() => {
    const formatted = suggestedDisallowanceAmount > 0 ? suggestedDisallowanceAmount.toFixed(2) : ''
    setSettlementData(prev => ({
      ...prev,
      disallowed_amount: formatted
    }))
  }, [suggestedDisallowanceAmount])

  const handleApplyExcessSuggestion = useCallback(() => {
    const formatted = excessAmount > 0 ? excessAmount.toFixed(2) : ''
    setSettlementData(prev => ({
      ...prev,
      excess_paid: formatted
    }))
  }, [excessAmount])

  useEffect(() => {
    handleApplySuggestedDisallowance()
  }, [handleApplySuggestedDisallowance])

  useEffect(() => {
    handleApplyExcessSuggestion()
  }, [handleApplyExcessSuggestion])

  const handleRemoveDisallowanceEntry = (index: number) => {
    setDisallowanceEntries(prev => {
      const next = prev.filter((_, entryIndex) => entryIndex !== index)
      if (next.length === 0) {
        setSettlementData(prevData => ({
          ...prevData,
          disallowed_amount: ''
        }))
      }
      return next
    })
  }

  const fetchBanks = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resources/banks`)
      if (!response.ok) {
        throw new Error('Unable to load banks')
      }
      const data = await response.json()
      if (data.success && Array.isArray(data.banks)) {
        setBanks(data.banks)
      }
    } catch (err) {
      console.error('❌ Error fetching banks:', err)
      toast.error('Failed to load banks list')
    }
  }, [])

  const fetchDisallowanceReasons = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/resources/disallowance-reasons`)
      if (!response.ok) {
        console.error('❌ Failed to fetch disallowance reasons:', response.status, response.statusText)
        setDisallowanceReasons([])
        return
      }
      const data = await response.json()
      if (data.success && Array.isArray(data.reasons)) {
        setDisallowanceReasons(data.reasons)
      } else {
        setDisallowanceReasons([])
      }
    } catch (err) {
      console.error('❌ Error fetching disallowance reasons:', err)
      setDisallowanceReasons([])
      toast.error('Failed to load disallowance reasons')
    }
  }, [])

  const fetchClaimDetails = useCallback(async () => {
    if (!claimId) return
    try {
      setLoading(true)
      setError(null)
      const data = await rmApi.getClaimDetails(claimId)

      if (!data.success) {
        throw new Error(data.error || 'Failed to load claim')
      }

      const rmData = data.claim.rm_data || {}
      const normalizedStatus = (data.claim.claim_status || 'dispatched').toLowerCase()
      setClaim({
        ...data.claim,
        claim_status: normalizedStatus,
        claim_status_label: getRmClaimStatusLabel(normalizedStatus)
      })
      setClaimStatus(normalizedStatus)
      const rawDisallowanceEntries = Array.isArray(rmData.disallowance_entries)
        ? rmData.disallowance_entries
        : Array.isArray(rmData.disallowance_summary?.entries)
          ? rmData.disallowance_summary.entries
          : []
      const normalizedDisallowanceEntries: DisallowanceEntry[] = rawDisallowanceEntries.map(
        (entry: any) => ({
          reasonId: entry.reason_id || entry.reasonId || entry.id || '',
          reasonLabel: entry.reason_label || entry.reasonLabel || entry.label || '',
          reasonType: entry.reason_type || entry.reasonType || entry.type || '',
          amount:
            entry.amount !== undefined && entry.amount !== null
              ? String(entry.amount)
              : ''
        })
      )
      const disallowedAmountFromData =
        rmData.disallowed_amount ??
        rmData.disallowance_total ??
        (normalizedDisallowanceEntries.length > 0
          ? normalizedDisallowanceEntries.reduce((sum, entry) => {
              const value = parseFloat(entry.amount)
              if (Number.isNaN(value)) {
                return sum
              }
              return sum + Math.max(value, 0)
            }, 0).toFixed(2)
          : undefined)
      setSettlementData(prev => ({
        ...prev,
        ...rmData,
        disallowed_amount:
          disallowedAmountFromData !== undefined &&
          disallowedAmountFromData !== null &&
          disallowedAmountFromData !== ''
            ? String(disallowedAmountFromData)
            : ''
      }))
      setDisallowanceEntries(normalizedDisallowanceEntries)
      setCustomFields(rmData)
      setTransactions(Array.isArray(data.claim.transactions) ? data.claim.transactions : [])
    } catch (err: any) {
      console.error('Error fetching RM claim:', err)
      setError(err?.message || 'Unable to load claim details')
    } finally {
      setLoading(false)
    }
  }, [claimId])

  const fetchTransactions = useCallback(async () => {
    if (!claimId) return
    try {
      setTransactionsLoading(true)
      const transactionData = await claimsApi.getClaimTransactions(claimId)
      if (Array.isArray(transactionData) && transactionData.length > 0) {
        setTransactions(transactionData)
      }
    } catch (err) {
      console.error('Error fetching RM claim transactions:', err)
    } finally {
      setTransactionsLoading(false)
    }
  }, [claimId])

  useEffect(() => {
    if (!claimId) return
    fetchClaimDetails()
    fetchBanks()
    fetchDisallowanceReasons()
  }, [claimId, fetchClaimDetails, fetchBanks, fetchDisallowanceReasons])

  useEffect(() => {
    if (disallowanceReasons.length === 0) {
      return
    }
    setDisallowanceEntries(prev =>
      prev.map(entry => {
        if (!entry.reasonId || entry.reasonType) {
          return entry
        }
        const matchingReason = disallowanceReasons.find(reason => reason.id === entry.reasonId)
        if (matchingReason && matchingReason.type) {
          return {
            ...entry,
            reasonType: matchingReason.type
          }
        }
        return entry
      })
    )
  }, [disallowanceReasons])

  useEffect(() => {
    if (!claimId) return
    fetchTransactions()
  }, [claimId, fetchTransactions])

  const handleUpdateClaim = async () => {
    if (!claimId) return
    try {
      setSaving(true)
      let rmData: Record<string, any>

      if (isSettlementStatus) {
        const validationErrors: string[] = []
        disallowanceEntries.forEach((entry, index) => {
          if (entry.reasonId || entry.amount) {
            if (!entry.reasonId) {
              validationErrors.push(`Row ${index + 1}: select a reason.`)
            }
            if (!entry.reasonType) {
              validationErrors.push(`Row ${index + 1}: select a type.`)
            }
            const amountValue = parseFloat(entry.amount)
            if (Number.isNaN(amountValue) || amountValue <= 0) {
              validationErrors.push(`Row ${index + 1}: enter a positive amount.`)
            }
          }
        })

        const hasDisallowanceAmount = !Number.isNaN(manualDisallowanceAmount) && manualDisallowanceAmount > 0
        const hasEntries = disallowanceEntries.some(entry => Boolean(entry.reasonId))

        if (validationErrors.length > 0) {
          toast.error(validationErrors.join(' '))
          setSaving(false)
          return
        }

        if (hasDisallowanceAmount && !hasEntries) {
          toast.error('Add at least one disallowance reason for the entered disallowed amount.')
          setSaving(false)
          return
        }

        if (!hasDisallowanceAmount && hasEntries) {
          toast.error('Enter a disallowed amount that matches the bucketised reasons.')
          setSaving(false)
          return
        }

        const normalizedDisallowanceEntries = disallowanceEntries
          .filter(entry => entry.reasonId || entry.amount)
          .map(entry => ({
            reason_id: entry.reasonId,
            reason_label: entry.reasonLabel || entry.reasonId,
          reason_type: entry.reasonType,
            amount: entry.amount ? Number(parseFloat(entry.amount).toFixed(2)) : 0
          }))
          .filter(entry => entry.reason_id && entry.reason_type && entry.amount > 0)

        const disallowanceTotalValue = normalizedDisallowanceEntries.reduce(
          (sum, entry) => sum + (entry.amount || 0),
          0
        )

        if (hasDisallowanceAmount) {
          const delta = Math.abs(disallowanceTotalValue - manualDisallowanceAmount)
          if (delta > 0.01) {
            toast.error(
              `Disallowance bucketisation total (${formatCurrencyINR(disallowanceTotalValue)}) must match the entered disallowed amount (${formatCurrencyINR(manualDisallowanceAmount)}).`
            )
            setSaving(false)
            return
          }
        }

        rmData = {
          ...settlementData,
          disallowance_entries: normalizedDisallowanceEntries
        }

        if (normalizedDisallowanceEntries.length > 0 && hasDisallowanceAmount) {
          const totalFormatted = Number(disallowanceTotalValue.toFixed(2))
          rmData.disallowance_total = totalFormatted
          rmData.disallowed_amount = totalFormatted.toFixed(2)
        } else {
          rmData.disallowance_total = manualDisallowanceAmount || 0
          rmData.disallowed_amount =
            manualDisallowanceAmount > 0 ? manualDisallowanceAmount.toFixed(2) : settlementData.disallowed_amount
        }
      } else {
        rmData = customFields
      }

      const response = await rmApi.updateClaim(claimId, {
        claim_status: claimStatus,
        status_raised_date: statusRaisedDate || undefined,
        status_raised_remarks: statusRaisedRemarks || undefined,
        rm_data: rmData
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to update claim')
      }

      toast.success('Claim updated successfully')
      router.push('/rm-inbox')
    } catch (err: any) {
      console.error('Error updating RM claim:', err)
      toast.error(err?.message || 'Failed to update claim')
    } finally {
      setSaving(false)
    }
  }

  const handleReEvaluate = async () => {
    if (!claimId) return
    try {
      const remarks = window.prompt('Enter remarks for re-evaluation')
      if (!remarks || !remarks.trim()) {
        toast.info('Re-evaluation cancelled')
        return
      }

      setSaving(true)
      const response = await rmApi.reevaluateClaim(claimId, remarks.trim())
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark for re-evaluation')
      }
      toast.success('Claim sent for re-evaluation')
      router.push('/rm-inbox')
    } catch (err: any) {
      console.error('Error re-evaluating RM claim:', err)
      toast.error(err?.message || 'Failed to mark for re-evaluation')
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
  }

  const handleDocumentUpload = async () => {
    if (!claimId) return
    if (!selectedFile || !documentType) {
      toast.error('Select both document type and file before uploading')
      return
    }

    try {
      setUploadingDocument(true)
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication token missing')
      }

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('claim_id', claimId)
      formData.append('document_type', documentType)
      formData.append('document_name', selectedFile.name)

      const response = await fetch(`${API_BASE_URL}/v1/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed. Please retry.')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('Document uploaded successfully')
      setSelectedFile(null)
      setDocumentType('')
      await fetchClaimDetails()
    } catch (err: any) {
      console.error('Error uploading RM document:', err)
      toast.error(err?.message || 'Unable to upload document')
    } finally {
      setUploadingDocument(false)
    }
  }

  const submissionDisplay = useMemo(() => {
    if (!claim?.submission_date) return 'N/A'
    const parsed = new Date(claim.submission_date)
    if (Number.isNaN(parsed.getTime())) return 'N/A'
    return parsed.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [claim?.submission_date])

  const patientDisplayData = useMemo(() => {
    if (!claim) return {}
    return {
      ...(claim.form_data || {}),
      ...(claim.patient_details || {})
    }
  }, [claim])

  const payerDisplayData = useMemo(() => {
    if (!claim) return {}
    return {
      ...(claim.form_data || {}),
      ...(claim.payer_details || {})
    }
  }, [claim])

  const providerDisplayData = useMemo(
    () => claim?.form_data || {},
    [claim?.form_data]
  )

  const transactionsTableData = useMemo(() => {
    const source = Array.isArray(transactions) ? transactions : []
    return source.map((transaction: any) => ({
      ...transaction,
      performed_at:
        transaction.performed_at ||
        transaction.timestamp ||
        transaction.created_at ||
        transaction.updated_at ||
        '',
      performed_by_name: transaction.performed_by_name || transaction.performed_by,
      claim_id: transaction.claim_id || claim?.claim_id
    }))
  }, [transactions, claim?.claim_id])

  const accordionDefaults = useMemo(
    () => ['patient', 'payer', 'provider', 'bill', 'history'],
    []
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading RM claim…</span>
        </div>
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Card className="mx-auto max-w-lg border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Unable to load claim</CardTitle>
            <CardDescription>{error || 'Claim not found.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/rm-inbox')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to RM Inbox
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
          <Button variant="outline" onClick={() => router.push('/rm-inbox')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold leading-tight">Process Claim</h1>
            <p className="text-sm text-muted-foreground">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
        <div className="text-right space-y-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getBadgeClass(claim.claim_status, CLAIM_STATUS_BADGES)}`}
          >
            {getRmClaimStatusLabel(claim.claim_status)?.toUpperCase() || 'UNKNOWN'}
          </span>
          <p className="text-xs text-muted-foreground">Submitted: {submissionDisplay}</p>
        </div>
      </div>

      {(claim.rm_updated_at || claim.rm_updated_by_name) && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="flex flex-col gap-1 text-sm text-blue-900">
            <span className="font-semibold">Last RM update</span>
            <span>
              {claim.rm_updated_by_name || claim.rm_updated_by_email || 'RM Team'}
              {claim.rm_updated_at && (
                <> on {formatDateTime(claim.rm_updated_at)}</>
              )}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border border-blue-100 bg-blue-50/80 shadow-none">
        <CardHeader>
          <CardTitle className="text-blue-900">Update Claim Status</CardTitle>
          <CardDescription>Record settlement details or re-open the claim for revisions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Claim Status *</Label>
              <Select value={claimStatus} onValueChange={setClaimStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select claim status" />
                </SelectTrigger>
                <SelectContent>
                  {RM_CLAIM_STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isSettlementStatus && (
              <div className="space-y-2">
                <Label>Status Raised Date</Label>
                <Input
                  type="date"
                  value={statusRaisedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={event => setStatusRaisedDate(event.target.value)}
                />
              </div>
            )}
          </div>

          {!isSettlementStatus && (
            <div className="space-y-2">
              <Label>Status Raised Remarks</Label>
              <Textarea
                rows={3}
                placeholder="Add remarks related to this status update…"
                value={statusRaisedRemarks}
                onChange={event => setStatusRaisedRemarks(event.target.value)}
              />
            </div>
          )}

          {isSettlementStatus && (
            <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-base font-semibold text-blue-900">Settlement Information</p>
                <p className="text-xs text-muted-foreground">
                  Provide payout details that will be visible to processors and hospital teams.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Claim Settlement Date *</Label>
                  <Input
                    type="date"
                    value={settlementData.claim_settlement_date}
                    onChange={event =>
                      handleSettlementDataChange('claim_settlement_date', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select
                    value={settlementData.payment_mode}
                    onValueChange={value => handleSettlementDataChange('payment_mode', value)}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payer Bank</Label>
                  <Select
                    value={settlementData.payer_bank}
                    onValueChange={value => handleSettlementDataChange('payer_bank', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payer bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.bank_id} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payer Account Number</Label>
                  <Input
                    placeholder="Enter payer account number"
                    value={settlementData.payer_account}
                    onChange={event =>
                      handleSettlementDataChange('payer_account', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Provider Bank Name</Label>
                  <Select
                    value={settlementData.provider_bank_name}
                    onValueChange={value =>
                      handleSettlementDataChange('provider_bank_name', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map(bank => (
                        <SelectItem key={bank.bank_id} value={bank.name}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider Account Number</Label>
                  <Input
                    placeholder="Enter provider account number"
                    value={settlementData.provider_account_no}
                    onChange={event =>
                      handleSettlementDataChange('provider_account_no', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Reference Number</Label>
                <Input
                  placeholder="Payment reference"
                  value={settlementData.payment_reference_no}
                  onChange={event =>
                    handleSettlementDataChange('payment_reference_no', event.target.value)
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Settled + TDS Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.settled_tds_amount}
                    onChange={event =>
                      handleSettlementDataChange('settled_tds_amount', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Settled Amount (Without TDS)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.settled_amount_without_tds}
                    onChange={event =>
                      handleSettlementDataChange('settled_amount_without_tds', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>TDS Percentage</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.tds_percentage}
                    onChange={event =>
                      handleSettlementDataChange('tds_percentage', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>TDS Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.tds_amount}
                    onChange={event =>
                      handleSettlementDataChange('tds_amount', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disallowed Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                  value={settlementData.disallowed_amount}
                    onChange={event =>
                      handleSettlementDataChange('disallowed_amount', event.target.value)
                    }
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground">
                      Enter the difference between the claimed amount and the settled amount.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Suggested:</span>
                      <span className="font-medium text-blue-900">
                        {formatCurrencyINR(suggestedDisallowanceAmount)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={suggestedDisallowanceAmount <= 0}
                        onClick={handleApplySuggestedDisallowance}
                      >
                        Use suggestion
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Bucketised total:</span>
                      <span className="font-medium">
                        {formatCurrencyINR(disallowanceTotal)}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          Math.abs(disallowanceRemaining) <= 0.01
                            ? 'text-emerald-700'
                            : disallowanceRemaining > 0
                              ? 'text-orange-600'
                              : 'text-red-600'
                        )}
                      >
                        {Math.abs(disallowanceRemaining) <= 0.01
                          ? 'All allocated'
                          : disallowanceRemaining > 0
                            ? `${formatCurrencyINR(disallowanceRemaining)} remaining`
                            : `${formatCurrencyINR(Math.abs(disallowanceRemaining))} over allocated`}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Discount as per Payer</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.discount_as_per_payer}
                    onChange={event =>
                      handleSettlementDataChange('discount_as_per_payer', event.target.value)
                    }
                  />
                </div>
              </div>

            <div className="space-y-3 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <Label className="text-sm font-medium text-blue-900">Disallowance Breakdown</Label>
                  <p className="text-xs text-muted-foreground">
                    Bucketize the disallowed amount by selecting a reason and its type.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDisallowanceEntry}
                  disabled={!hasDisallowanceReasons}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Reason
                </Button>
              </div>

              {!hasDisallowanceReasons && (
                <p className="text-sm text-muted-foreground">
                  No disallowance reasons are configured. Please contact the administrator to add
                  entries in the <code>disallowance_reason</code> catalogue.
                </p>
              )}

              {disallowanceEntries.length > 0 && (
                <div className="space-y-3">
                  {disallowanceEntries.map((entry, index) => (
                    <div
                      key={`disallowance-entry-${index}`}
                      className="grid gap-3 md:grid-cols-[minmax(0,6fr)_minmax(0,3fr)_minmax(0,2fr)_minmax(0,1fr)]"
                    >
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Select
                          value={entry.reasonId}
                          onValueChange={value => handleDisallowanceReasonChange(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {disallowanceReasons.map(reason => (
                              <SelectItem key={reason.id} value={reason.id}>
                                {reason.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={entry.reasonType}
                          onValueChange={value => handleDisallowanceTypeChange(index, value)}
                          disabled={!entry.reasonId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                          {disallowanceTypeOptions.map(type => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!entry.reasonId && (
                          <p className="text-xs text-muted-foreground">
                            Select a reason to enable type selection.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={event =>
                            handleDisallowanceAmountChange(index, event.target.value)
                          }
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDisallowanceEntry(index)}
                          aria-label="Remove disallowance reason"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {disallowanceEntries.length > 0 && (
                <div className="flex items-center justify-between rounded-md border border-blue-100 bg-white/60 px-4 py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total mapped amount
                  </span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatCurrencyINR(disallowanceTotal)}
                  </span>
                </div>
              )}
            </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>UITITSL Service Fees</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.uititsl_service_fees}
                    onChange={event =>
                      handleSettlementDataChange('uititsl_service_fees', event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Excess Paid</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.excess_paid}
                    onChange={event =>
                      handleSettlementDataChange('excess_paid', event.target.value)
                    }
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Suggested:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrencyINR(excessAmount)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={excessAmount <= 0}
                      onClick={handleApplyExcessSuggestion}
                    >
                      Use suggestion
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contested Amount From Payer</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={settlementData.contested_amount_from_payer}
                    onChange={event =>
                      handleSettlementDataChange('contested_amount_from_payer', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Settled Remarks</Label>
                <Textarea
                  rows={2}
                  placeholder="Add notes regarding the settlement…"
                  value={settlementData.settled_remarks}
                  onChange={event =>
                    handleSettlementDataChange('settled_remarks', event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Medverve Review Remarks</Label>
                <Textarea
                  rows={2}
                  placeholder="RM review remarks visible to internal teams"
                  value={settlementData.medverve_review_remarks}
                  onChange={event =>
                    handleSettlementDataChange('medverve_review_remarks', event.target.value)
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-blue-900">Settlement Documents</p>
                <p className="text-xs text-muted-foreground">
                  Upload settlement letters or acknowledgements for reference.
                </p>
              </div>
              <Badge variant="outline">{selectedFile ? 'Selected' : 'No file'}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlementDocumentOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Upload File</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between rounded-md border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{selectedFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Button
              type="button"
              className="w-full md:w-fit"
              disabled={uploadingDocument || !selectedFile || !documentType}
              onClick={handleDocumentUpload}
            >
              {uploadingDocument ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              className="flex-1"
              disabled={saving}
              onClick={handleUpdateClaim}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Claim
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={handleReEvaluate}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-evaluate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <Accordion type="multiple" defaultValue={accordionDefaults}>
          <AccordionItem value="patient" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Patient Details</p>
                  <p className="text-xs text-muted-foreground">
                    Contact information and beneficiary details
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PatientDetailsDisplay data={patientDisplayData} />
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
                  <p className="text-xs text-muted-foreground">Authorization and coverage</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <PayerDetailsDisplay data={payerDisplayData} />
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
                  <p className="text-xs text-muted-foreground">
                    Hospital, admission and treatment summary
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <ProviderDetailsDisplay
                data={providerDisplayData}
                hospitalName={claim.hospital_name}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bill" className="border-b">
            <AccordionTrigger className="px-8 py-5 transition-colors hover:bg-muted/50 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Receipt className="h-5 w-5 text-blue-700" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Financial Summary</p>
                  <p className="text-xs text-muted-foreground">
                    Claimed amounts and discounts
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Total Bill Amount
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrencyINR(claim.financial_details?.total_bill_amount)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Claimed Amount
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrencyINR(claim.financial_details?.claimed_amount)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Amount Charged to Payer
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrencyINR(claim.financial_details?.amount_charged_to_payer)}
                  </p>
                </div>
              </div>
              <BillDetailsDisplay data={claim.form_data || {}} />
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
                  <p className="text-xs text-muted-foreground">
                    {transactionsTableData.length} events
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              {transactionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : transactionsTableData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions recorded yet.</p>
              ) : (
                <TransactionHistory transactions={transactionsTableData} />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Settlement & Claim Documents
          </CardTitle>
          <CardDescription>
            Documents shared for this claim, including uploaded settlement proofs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {claim.documents && claim.documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {claim.documents.map((doc: any, index: number) => (
                <div
                  key={doc.document_id || index}
                  className="flex h-full flex-col justify-between rounded-lg border bg-muted/40 p-4 transition-colors hover:bg-muted/60"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {doc.document_name || doc.document_type || 'Document'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {doc.original_filename || 'Unnamed file'}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-medium text-green-700">
                        {doc.status || 'uploaded'}
                      </span>
                    </div>
                    {doc.document_type && (
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {doc.document_type}
                      </p>
                    )}
                    {doc.uploaded_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Uploaded: {formatDateTime(doc.uploaded_at)}
                      </p>
                    )}
                  </div>
                  <div className="pt-3">
                    {doc.download_url ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(doc.download_url, '_blank', 'noopener,noreferrer')}
                      >
                        View / Download
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        disabled
                      >
                        Download unavailable
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No documents available for this claim yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
