'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building2, CreditCard, FileText, History, Loader2, ShieldQuestion, UserCircle, ClipboardList } from 'lucide-react'

import { PatientDetailsDisplay } from '@/components/forms/claims/PatientDetailsDisplay'
import { PayerDetailsDisplay } from '@/components/forms/claims/PayerDetailsDisplay'
import { ProviderDetailsDisplay } from '@/components/forms/claims/ProviderDetailsDisplay'
import { BillDetailsDisplay } from '@/components/forms/claims/BillDetailsDisplay'
import { TransactionHistory } from '@/components/forms/claims/TransactionHistory'
import { ProcessorInfo } from '@/components/forms/claims/ProcessorInfo'
import reviewRequestApi, { ReviewAction } from '@/services/reviewRequestApi'
import { toast } from '@/lib/toast'

const formatCurrencyINR = (value?: number | null) => {
  if (!value || Number.isNaN(value)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value)
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

const REVIEW_ACTION_OPTIONS: Array<{ value: ReviewAction; label: string }> = [
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'not_found', label: 'Not Found / Invalid' },
]

const REVIEW_STATUS_BADGE: Record<string, string> = {
  'REVIEW PENDING': 'bg-yellow-100 text-yellow-800',
  'UNDER REVIEW': 'bg-blue-100 text-blue-800',
  'ADDITIONAL INFO NEEDED': 'bg-orange-100 text-orange-800',
  'ESCALATED': 'bg-purple-100 text-purple-800',
  'REVIEW APPROVED': 'bg-green-100 text-green-800',
  'REVIEW REJECTED': 'bg-red-100 text-red-800',
  'REVIEW COMPLETED': 'bg-emerald-100 text-emerald-800'
}

const numberOrEmpty = (value: string) => (value === '' ? undefined : Number(value))

export default function ReviewRequestClaimPage() {
  const params = useParams<{ claimId: string }>()
  const router = useRouter()
  const claimId = params.claimId

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claim, setClaim] = useState<any | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])

  const [reviewAction, setReviewAction] = useState<ReviewAction>('reviewed')
  const [reviewRemarks, setReviewRemarks] = useState('')
  const [totalBillAmount, setTotalBillAmount] = useState('')
  const [claimedAmount, setClaimedAmount] = useState('')
  const [patientPaidAmount, setPatientPaidAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [disallowedAmount, setDisallowedAmount] = useState('')
  const [reviewRequestAmount, setReviewRequestAmount] = useState('')
  const [reasonByPayer, setReasonByPayer] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  const requiresAmounts = reviewAction === 'reviewed'

  const fetchClaimDetails = useCallback(async () => {
    if (!claimId) return
    try {
      setLoading(true)
      setError(null)
      const response = await reviewRequestApi.getClaimDetails(claimId)
      if (response.success) {
        setClaim(response.claim)
        setTransactions(response.claim.transactions || [])
        setDocuments(response.claim.documents || [])

        const reviewData = response.claim.review_data || {}
        const formData = response.claim.form_data || {}
        if (reviewData.review_decision) {
          const decision = (reviewData.review_decision || '').toLowerCase()
          setReviewAction(decision === 'not_found' ? 'not_found' : 'reviewed')
        }
        if (reviewData.review_remarks) {
          setReviewRemarks(reviewData.review_remarks)
        }
        const deriveAmount = (value: any) =>
          value === undefined || value === null || value === '' ? undefined : Number(value)

        const reviewClaimed = deriveAmount(reviewData.claimed_amount ?? reviewData.total_bill_amount)
        const reviewApproved = deriveAmount(reviewData.approved_amount)
        const reviewDisallowed = deriveAmount(reviewData.disallowed_amount)
        const reviewReqAmount = deriveAmount(reviewData.review_request_amount)
        const reviewPatientPaid = deriveAmount(reviewData.patient_paid_amount)
        const reviewDiscount = deriveAmount(reviewData.discount_amount)

        const totalBillAmountValue =
          deriveAmount(reviewData.total_bill_amount) ??
          deriveAmount(formData.total_bill_amount) ??
          deriveAmount(formData.total_bill_amount_value)

        const claimedAmountValue =
          reviewClaimed ??
          deriveAmount(formData.claimed_amount) ??
          deriveAmount(formData.review_request_amount)

        const patientPaidValue =
          reviewPatientPaid ??
          deriveAmount(formData.patient_paid_amount) ??
          deriveAmount(formData.total_patient_paid)

        const discountValue =
          reviewDiscount ??
          deriveAmount(formData.discount_amount) ??
          deriveAmount(formData.total_discount_amount)

        setTotalBillAmount(totalBillAmountValue !== undefined ? String(totalBillAmountValue) : '')
        setClaimedAmount(claimedAmountValue !== undefined ? String(claimedAmountValue) : '')
        setPatientPaidAmount(patientPaidValue !== undefined ? String(patientPaidValue) : '')
        setDiscountAmount(discountValue !== undefined ? String(discountValue) : '')
        setApprovedAmount(reviewApproved !== undefined ? String(reviewApproved) : '')
        setDisallowedAmount(reviewDisallowed !== undefined ? String(reviewDisallowed) : '')
        setReviewRequestAmount(reviewReqAmount !== undefined ? String(reviewReqAmount) : '')
        setReasonByPayer(reviewData.reason_by_payer || '')
      } else {
        setError(response.error || 'Failed to load claim details')
      }
    } catch (err: any) {
      console.error('Error fetching review claim details:', err)
      setError(err.message || 'Failed to load claim details')
    } finally {
      setLoading(false)
    }
  }, [claimId])

  useEffect(() => {
    fetchClaimDetails()
  }, [fetchClaimDetails])

  const handleSubmitReview = async () => {
    if (!claimId) return
    if (!reviewRemarks.trim() && reviewAction === 'not_found') {
      toast.error('Please provide remarks describing why the claim was not found or is invalid.')
      return
    }
    if (requiresAmounts && (!totalBillAmount || !claimedAmount || !approvedAmount)) {
      toast.error('Total bill amount, claimed amount, and approved amount are required for the Reviewed action.')
      return
    }

    try {
      setSubmittingDecision(true)
      const payload: any = {
        review_action: reviewAction,
        review_remarks: reviewRemarks.trim(),
      }

      if (requiresAmounts) {
        payload.total_bill_amount = numberOrEmpty(totalBillAmount)
        payload.claimed_amount = numberOrEmpty(claimedAmount)
        payload.patient_paid_amount = numberOrEmpty(patientPaidAmount)
        payload.discount_amount = numberOrEmpty(discountAmount)
        payload.approved_amount = numberOrEmpty(approvedAmount)
        payload.disallowed_amount = numberOrEmpty(disallowedAmount)
        payload.review_request_amount = numberOrEmpty(reviewRequestAmount)
      }

      if (reasonByPayer.trim()) {
        payload.reason_by_payer = reasonByPayer.trim()
      }

      await reviewRequestApi.reviewClaim(claimId, payload)
      toast.success('Review decision recorded successfully')
      await fetchClaimDetails()
      router.push('/review-request-inbox/reviewed')
    } catch (err: any) {
      console.error('Error submitting review:', err)
      toast.error(err.message || 'Failed to record review decision')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const reviewStatusBadgeClass = useMemo(() => {
    if (!claim?.review_status) return 'bg-gray-100 text-gray-800'
    return REVIEW_STATUS_BADGE[claim.review_status] || 'bg-gray-100 text-gray-800'
  }, [claim?.review_status])

  const hospitalSummary = useMemo(() => {
    if (!claim) return null
    const formData = claim.form_data || {}
    return {
      hospitalName: claim.hospital_name || 'Unknown Hospital',
      patientName: formData.patient_name || 'Unknown Patient',
      payerName: formData.payer_name || 'Unknown Payer',
      claimedAmount: formatCurrencyINR(Number(formData.claimed_amount || 0)),
      admissionType: formData.admission_type || 'N/A',
      wardType: formData.ward_type || 'N/A',
      totalBillAmount: formatCurrencyINR(Number(formData.total_bill_amount || 0)),
    }
  }, [claim])

  const reviewHistory = useMemo(() => {
    if (!claim?.review_history) return []
    if (Array.isArray(claim.review_history)) {
      return claim.review_history
    }
    if (typeof claim.review_history === 'object') {
      return Object.entries(claim.review_history).map(([key, value]) => ({
        __key: key,
        ...(value as Record<string, unknown>),
      }))
    }
    return []
  }, [claim?.review_history])

  const sortedReviewEntries = useMemo(() => {
    if (reviewHistory.length === 0) return []
    return [...reviewHistory].sort((a: any, b: any) => {
      const getTimestamp = (entry: any) => {
        const dateValue = entry?.reviewed_at || entry?.completed_at || entry?.updated_at
        if (dateValue) {
          const parsed = new Date(dateValue)
          if (!Number.isNaN(parsed.getTime())) {
            return parsed.getTime()
          }
        }
        return 0
      }
      return getTimestamp(a) - getTimestamp(b)
    })
  }, [reviewHistory])

  const latestReviewData = useMemo(() => {
    return (claim?.review_data as Record<string, any>) || {}
  }, [claim?.review_data])

  const hasOtherRemarks = useMemo(() => {
    const fields = [
      latestReviewData.reason_by_payer,
      latestReviewData.review_remarks,
      latestReviewData.additional_notes,
      latestReviewData.reviewed_at,
      latestReviewData.updated_at,
    ]
    return fields.some(value => value !== undefined && value !== null && String(value).trim() !== '')
  }, [latestReviewData])

  const formatOptionalAmount = useCallback((value: any) => {
    if (value === undefined || value === null || value === '') return '—'
    const num = typeof value === 'number' ? value : Number(value)
    if (!Number.isNaN(num)) {
      return formatCurrencyINR(num)
    }
    return String(value)
  }, [])

  const formatOptionalText = useCallback((value: any) => {
    if (value === undefined || value === null) return '—'
    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : '—'
    }
    return String(value)
  }, [])

  const renderReviewDetailsContent = useCallback(
    (entry: Record<string, any> | null, emptyMessage: string) => {
      if (!entry) {
        return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      }

      const fieldConfigs: Array<{ label: string; value: any; type?: 'currency' | 'datetime' }> = [
        { label: 'Total Bill Amount', value: entry.total_bill_amount, type: 'currency' },
        { label: 'Claimed Amount', value: entry.claimed_amount, type: 'currency' },
        { label: 'Approved Amount', value: entry.approved_amount, type: 'currency' },
        { label: 'Disallowed Amount', value: entry.disallowed_amount, type: 'currency' },
        { label: 'Review Requested Amount', value: entry.review_request_amount, type: 'currency' },
        { label: 'Patient Paid Amount', value: entry.patient_paid_amount, type: 'currency' },
        { label: 'Discount Amount', value: entry.discount_amount, type: 'currency' },
        { label: 'Reason by Payer', value: entry.reason_by_payer },
        { label: 'Medverve Review Remarks', value: entry.review_remarks },
        { label: 'Review Action', value: entry.review_action || entry.review_decision },
        { label: 'Reviewer', value: entry.reviewer_name },
        { label: 'Reviewer Email', value: entry.reviewer_email },
        { label: 'Review Time', value: entry.reviewed_at, type: 'datetime' },
      ]

      return (
        <div className="grid gap-4 md:grid-cols-2">
          {fieldConfigs.map(field => (
            <div key={field.label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</p>
              <p className="text-sm font-medium">
                {field.type === 'currency'
                  ? formatOptionalAmount(field.value)
                  : field.type === 'datetime'
                    ? formatDateTime(field.value as string | null)
                    : formatOptionalText(field.value)}
              </p>
            </div>
          ))}
        </div>
      )
    },
    [formatDateTime, formatOptionalAmount, formatOptionalText]
  )

  const renderOtherRemarks = useCallback(() => {
    const entries: Array<{ label: string; value: any; type?: 'datetime' }> = [
      { label: 'Reason by Payer', value: latestReviewData.reason_by_payer },
      { label: 'Medverve Review Remarks', value: latestReviewData.review_remarks },
      { label: 'Additional Notes', value: latestReviewData.additional_notes },
      { label: 'Last Updated At', value: latestReviewData.reviewed_at || latestReviewData.updated_at, type: 'datetime' },
    ]

    const hasContent = entries.some(entry => entry.value !== undefined && entry.value !== null && entry.value !== '')

    if (!hasContent) {
      return <p className="text-sm text-muted-foreground">No additional remarks recorded.</p>
    }

    return (
      <div className="space-y-3">
        {entries.map(entry => (
          <div key={entry.label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</p>
            <p className="text-sm font-medium">
              {entry.type === 'datetime'
                ? formatDateTime(entry.value as string | null)
                : formatOptionalText(entry.value)}
            </p>
          </div>
        ))}
      </div>
    )
  }, [formatDateTime, formatOptionalText, latestReviewData])

  const renderPatientDetails = useCallback(() => {
    const formData = (claim?.form_data as Record<string, any>) || {}
    const entries: Array<{ label: string; value: any }> = [
      { label: 'Patient Name', value: formData.patient_name },
      { label: 'Age', value: formData.patient_age },
      { label: 'Gender', value: formData.gender },
      { label: 'Relationship', value: formData.relationship },
      { label: 'Insurance ID', value: formData.payer_patient_id },
      { label: 'Specialty', value: formData.specialty },
      { label: 'Doctor', value: formData.doctor },
      { label: 'Admission Type', value: formData.admission_type },
      { label: 'Ward Type', value: formData.ward_type },
    ]

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(entry => (
          <div key={entry.label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{entry.label}</p>
            <p className="text-sm font-medium">{formatOptionalText(entry.value)}</p>
          </div>
        ))}
      </div>
    )
  }, [claim?.form_data, formatOptionalText])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Loading review claim...</span>
        </div>
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Card className="mx-auto max-w-xl border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Unable to load claim</CardTitle>
            <CardDescription>The review claim could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">{error || 'No additional information is available.'}</p>
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold leading-tight">Review Claim</h1>
            <p className="text-sm text-muted-foreground">Claim ID: {claim.claim_id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${reviewStatusBadgeClass}`}>
              {claim.review_status || 'Review Pending'}
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-gray-100 text-gray-800">
              Claim: {claim.claim_status || 'Unknown'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Submission: {claim.submission_date ? new Date(claim.submission_date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
        </div>
      </div>

      {/* Summary Cards */}
      {hospitalSummary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <UserCircle className="h-10 w-10 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Patient</p>
                <p className="font-semibold text-sm">{hospitalSummary.patientName}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Building2 className="h-10 w-10 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hospital</p>
                <p className="font-semibold text-sm">{hospitalSummary.hospitalName}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <CreditCard className="h-10 w-10 text-indigo-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Claimed Amount</p>
                <p className="font-semibold text-sm">{hospitalSummary.claimedAmount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <FileText className="h-10 w-10 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payer</p>
                <p className="font-semibold text-sm">{hospitalSummary.payerName}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Action */}
      <Card className="border border-blue-100 bg-blue-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <ShieldQuestion className="h-5 w-5" />
            Review Actions
          </CardTitle>
          <CardDescription>Choose the outcome of the second-level review. Outcomes update the review status and notify the processor team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Review Decision</Label>
              <Select value={reviewAction} onValueChange={(value: ReviewAction) => setReviewAction(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_ACTION_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="text-sm font-medium">{option.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Reason by Payer</Label>
              <Textarea
                placeholder="Enter payer remarks, if any..."
                value={reasonByPayer}
                onChange={e => setReasonByPayer(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Medverve Review Remarks {reviewAction === 'not_found' ? <span className="text-red-600 text-xs align-middle ml-1">Required</span> : null}</Label>
              <Textarea
                placeholder="Enter internal review remarks..."
                value={reviewRemarks}
                onChange={e => setReviewRemarks(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {requiresAmounts && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Total Bill Amount <span className="text-red-600">*</span></Label>
                  <Input
                    type="number"
                    placeholder="Enter total bill amount"
                    value={totalBillAmount}
                    onChange={e => setTotalBillAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid By Patient</Label>
                  <Input
                    type="number"
                    placeholder="Enter patient share"
                    value={patientPaidAmount}
                    onChange={e => setPatientPaidAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter discount amount"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Claimed Amount <span className="text-red-600">*</span></Label>
                  <Input
                    type="number"
                    placeholder="Enter claimed amount"
                    value={claimedAmount}
                    onChange={e => setClaimedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Approved Amount <span className="text-red-600">*</span></Label>
                  <Input
                    type="number"
                    placeholder="Enter approved amount"
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disallowed Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter disallowed amount"
                    value={disallowedAmount}
                    onChange={e => setDisallowedAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Review Requested Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter review request amount"
                    value={reviewRequestAmount}
                    onChange={e => setReviewRequestAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmitReview} disabled={submittingDecision}>
            {submittingDecision ? 'Submitting...' : 'Submit Review Decision'}
          </Button>
        </CardContent>
      </Card>

      {/* Review Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <ClipboardList className="h-5 w-5 text-gray-500" />
              Review Details
            </CardTitle>
            <CardDescription>Reference previous review submissions and remarks.</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedReviewEntries.length > 0 || hasOtherRemarks ? (
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="patient-details">
                  <AccordionTrigger>Show Patient Demographic Details</AccordionTrigger>
                  <AccordionContent>{renderPatientDetails()}</AccordionContent>
                </AccordionItem>
                {sortedReviewEntries.map((entry: any, index: number) => (
                  <AccordionItem key={entry.__key || index} value={`review-${index}`}>
                    <AccordionTrigger>
                      {`Show ${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : 'th'} Review Details`}
                    </AccordionTrigger>
                    <AccordionContent>
                      {renderReviewDetailsContent(entry, 'Review details are not available for this entry.')}
                    </AccordionContent>
                  </AccordionItem>
                ))}
                {hasOtherRemarks && (
                  <AccordionItem value="other-remarks">
                    <AccordionTrigger>Show Review Other Remarks</AccordionTrigger>
                    <AccordionContent>{renderOtherRemarks()}</AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            ) : (
              <p className="text-sm text-muted-foreground">No review history or remarks have been recorded yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <ClipboardList className="h-5 w-5 text-gray-500" />
              Processor Decision
            </CardTitle>
            <CardDescription>Summary of the original processor outcome.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProcessorInfo claim={claim} />
          </CardContent>
        </Card>
      </div>

      {/* Review History */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <History className="h-5 w-5 text-gray-500" />
              Review History
            </CardTitle>
            <CardDescription>All previous review submissions for this claim.</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No previous reviews recorded.</p>
            ) : (
              <div className="space-y-4">
                {reviewHistory
                  .slice()
                  .reverse()
                  .map((entry: any, index: number) => {
                    const sequence = reviewHistory.length - index
                    const reviewedAt = entry?.reviewed_at
                      ? new Date(entry.reviewed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                      : 'Unknown'
                    return (
                      <div key={`${entry.reviewed_at || sequence}-${index}`} className="rounded-lg border border-muted bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Review #{sequence}</Badge>
                          <span className="text-xs text-muted-foreground">{reviewedAt}</span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Decision</p>
                            <p className="font-medium text-gray-900">{entry?.review_action || entry?.review_decision || '—'}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reviewer</p>
                            <p className="font-medium text-gray-900">{entry?.reviewer_name || '—'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Medverve Review Remarks</p>
                            <p className="font-medium text-gray-900 whitespace-pre-line">{entry?.review_remarks || '—'}</p>
                          </div>
                          {entry?.reason_by_payer && (
                            <div className="md:col-span-2">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reason by Payer</p>
                              <p className="font-medium text-gray-900 whitespace-pre-line">{entry.reason_by_payer}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Bill Amount</p>
                            <p className="font-medium text-gray-900">{formatOptionalAmount(entry?.total_bill_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Approved Amount</p>
                            <p className="font-medium text-gray-900">{formatOptionalAmount(entry?.approved_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Disallowed Amount</p>
                            <p className="font-medium text-gray-900">{formatOptionalAmount(entry?.disallowed_amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Review Request Amount</p>
                            <p className="font-medium text-gray-900">{formatOptionalAmount(entry?.review_request_amount)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claim details accordion */}
      <Card className="border-0 shadow-sm">
        <Accordion type="multiple" defaultValue={['patient', 'payer', 'provider', 'bill', 'documents', 'history']} className="w-full">
          <AccordionItem value="patient" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <UserCircle className="h-5 w-5 text-blue-700" />
                </div>
                <span className="font-semibold text-gray-900">Patient Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white">
              <PatientDetailsDisplay data={claim.form_data || {}} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="payer" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <CreditCard className="h-5 w-5 text-emerald-700" />
                </div>
                <span className="font-semibold text-gray-900">Payer Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white">
              <PayerDetailsDisplay data={claim.form_data || {}} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="provider" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                  <Building2 className="h-5 w-5 text-indigo-700" />
                </div>
                <span className="font-semibold text-gray-900">Provider Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white">
              <ProviderDetailsDisplay data={claim.form_data || {}} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bill" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                  <FileText className="h-5 w-5 text-amber-700" />
                </div>
                <span className="font-semibold text-gray-900">Bill Details</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white">
              <BillDetailsDisplay data={claim.form_data || {}} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documents" className="border-b">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-700" />
                </div>
                <span className="font-semibold text-gray-900">Documents</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white space-y-4">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.document_id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                      <div>
                        <p className="font-medium text-sm text-gray-900">{doc.document_name || doc.document_type || doc.document_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.file_type || 'Unknown type'} · {doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Size unknown'}
                        </p>
                      </div>
                      {doc.download_url && (
                        <Button size="sm" variant="outline" onClick={() => window.open(doc.download_url, '_blank')}>
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents available.</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="history">
            <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <History className="h-5 w-5 text-slate-700" />
                </div>
                <span className="font-semibold text-gray-900">Transaction History</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6 bg-white">
              <TransactionHistory transactions={transactions} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

    </div>
  )
}

