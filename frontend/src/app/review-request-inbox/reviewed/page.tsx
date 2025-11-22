'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { reviewRequestApi, type ReviewClaim } from '@/services/reviewRequestApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, Clock3, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const formatCurrencyINR = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value)
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN')
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

const displayValue = (value?: string | number | null) => {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : '—'
  }
  if (typeof value === 'number' && Number.isNaN(value)) return '—'
  return String(value)
}

const renderReviewStatusBadge = (status?: string) => {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>
  }

  const normalized = status.toUpperCase()

  if (normalized === 'REVIEW PENDING') {
    return (
      <Badge variant="outline" className="text-amber-600 bg-amber-50">
        <Clock3 className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    )
  }

  if (normalized === 'UNDER REVIEW') {
    return (
      <Badge variant="outline" className="text-blue-600 bg-blue-50">
        <Activity className="w-3 h-3 mr-1" />
        Under Review
      </Badge>
    )
  }

  if (normalized === 'REVIEW APPROVED') {
    return (
      <Badge variant="outline" className="text-emerald-600 bg-emerald-50">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    )
  }

  if (normalized === 'REVIEW REJECTED') {
    return (
      <Badge variant="outline" className="text-red-600 bg-red-50">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Rejected
      </Badge>
    )
  }

  if (normalized === 'ADDITIONAL INFO NEEDED') {
    return (
      <Badge variant="outline" className="text-orange-600 bg-orange-50">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Info Needed
      </Badge>
    )
  }

  if (normalized === 'ESCALATED') {
    return (
      <Badge variant="outline" className="text-purple-600 bg-purple-50">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Escalated
      </Badge>
    )
  }

  if (normalized === 'REVIEW COMPLETED') {
    return (
      <Badge variant="outline" className="text-slate-600 bg-slate-50">
        Completed
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-slate-600 bg-slate-50">
      {status}
    </Badge>
  )
}

export default function ReviewedClaimsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [claims, setClaims] = useState<ReviewClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'review_request') {
      router.push('/review-request-inbox')
      return
    }
    if (user?.role === 'review_request') {
      refreshClaims()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  const refreshClaims = async () => {
    try {
      setLoading(true)
      setError(null)
      await fetchReviewedClaims()
    } catch (err: any) {
      setError(err.message || 'Failed to load reviewed claims')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewedClaims = async () => {
    try {
      setIsFetching(true)
      // UNIVERSAL: Simple API call - backend handles all filtering
      const response = await reviewRequestApi.getClaims({ status: 'completed' })
      if (response.success) {
        // UNIVERSAL: Display what backend returns (no frontend filtering)
        setClaims(response.claims)
      } else {
        throw new Error(response.error || 'Failed to fetch reviewed claims')
      }
    } catch (error: any) {
      console.error('[ReviewRequest] Error fetching reviewed claims', error)
      setError(error.message || 'Failed to fetch reviewed claims')
    } finally {
      setIsFetching(false)
    }
  }

  const handleProcess = (claimId: string) => {
    router.push(`/review-request-inbox/process/${claimId}`)
  }

  const formatClaimStatus = (status?: string) => {
    if (!status) return 'Unknown'
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading reviewed claims...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-600">Unable to load reviewed claims</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <Button onClick={refreshClaims}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Reviewed Claims</h1>
          <p className="text-muted-foreground mt-1">
            Claims that have received a final review decision.
          </p>
        </div>
        <Button variant="outline" onClick={refreshClaims} disabled={isFetching}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Completed Reviews ({claims.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No reviewed claims available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Claim ID</TableHead>
                    <TableHead className="whitespace-nowrap">Review Count</TableHead>
                    <TableHead className="whitespace-nowrap">Authorization Number</TableHead>
                    <TableHead className="whitespace-nowrap">Patient Name</TableHead>
                    <TableHead className="whitespace-nowrap">Provider Name</TableHead>
                    <TableHead className="whitespace-nowrap">Payer Type</TableHead>
                    <TableHead className="whitespace-nowrap">Payer Name</TableHead>
                    <TableHead className="whitespace-nowrap">Doctor Name</TableHead>
                    <TableHead className="whitespace-nowrap">Date of Admission</TableHead>
                    <TableHead className="whitespace-nowrap">Date of Discharge</TableHead>
                    <TableHead className="whitespace-nowrap">Billed Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Patient Paid Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Discount Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Claimed Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Approved Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Disallowed Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Review Requested Amount</TableHead>
                    <TableHead className="whitespace-nowrap">Claim Status</TableHead>
                    <TableHead className="whitespace-nowrap">Review Status</TableHead>
                    <TableHead className="whitespace-nowrap">Reviewed By</TableHead>
                    <TableHead className="whitespace-nowrap">Review Time</TableHead>
                    <TableHead className="whitespace-nowrap">Claim Type</TableHead>
                    <TableHead className="whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.claim_id}>
                      <TableCell className="font-mono text-sm whitespace-nowrap">
                        {claim.claim_id}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {claim.review_history_count ?? 0}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {displayValue(claim.authorization_number)}
                      </TableCell>
                      <TableCell>{displayValue(claim.patient_name)}</TableCell>
                      <TableCell>{displayValue(claim.provider_name || claim.hospital_name)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {displayValue(claim.payer_type)}
                      </TableCell>
                      <TableCell>{displayValue(claim.payer_name)}</TableCell>
                      <TableCell>{displayValue(claim.doctor_name)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(claim.date_of_admission)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(claim.date_of_discharge)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.billed_amount ?? claim.claimed_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.patient_paid_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.discount_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.claimed_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.approved_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.disallowed_amount ?? null)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCurrencyINR(claim.review_requested_amount ?? null)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="w-fit">
                          {formatClaimStatus(claim.claim_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderReviewStatusBadge(claim.review_status)}</TableCell>
                      <TableCell>{displayValue(claim.reviewed_by)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(claim.last_reviewed_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {displayValue(claim.claim_type)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button size="sm" onClick={() => handleProcess(claim.claim_id)}>
                          Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

