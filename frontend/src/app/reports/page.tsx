'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { claimsApi } from '@/services/claimsApi'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Activity,
  BarChart3,
  RefreshCw,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

interface HospitalClaim {
  claimId: string
  status: string
  claimedAmount: number
  payerName: string
  specialty: string
  createdAt: string | null
  submissionDate: string | null
}

interface StatusSummary {
  status: string
  label: string
  count: number
  amount: number
  color: string
}

interface PayerSummary {
  payer: string
  totalAmount: number
  claimCount: number
}

const STATUS_DISPLAY_MAP: Record<string, { label: string; color: string }> = {
  qc_pending: { label: 'QC Pending', color: 'bg-yellow-500' },
  qc_query: { label: 'QC Query', color: 'bg-orange-500' },
  qc_answered: { label: 'QC Answered', color: 'bg-blue-500' },
  qc_clear: { label: 'QC Clear', color: 'bg-green-500' },
  clear: { label: 'Cleared', color: 'bg-emerald-500' },
  Approved: { label: 'Approved', color: 'bg-lime-500' },
  dispatched: { label: 'Dispatched', color: 'bg-indigo-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
}

const processorRoles = new Set([
  'claim_processor',
  'claim_processor_l1',
  'claim_processor_l2',
  'claim_processor_l3',
  'claim_processor_l4',
])

export default function ReportsPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [claims, setClaims] = useState<HospitalClaim[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }

    if (processorRoles.has(user.role as string)) {
      router.replace('/processor-inbox')
      return
    }

    if (user.role === 'rm' || user.role === 'reconciler') {
      router.replace('/rm-inbox')
      return
    }

    fetchClaims()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await claimsApi.getClaims()

      const mappedClaims: HospitalClaim[] = (data || []).map((claim: any) => ({
        claimId: claim.claim_id,
        status: claim.claim_status || 'unknown',
        claimedAmount: Number(claim.claimed_amount || 0),
        payerName: claim.payer_name || 'Unknown Payer',
        specialty: claim.specialty || claim.specialisation || 'General',
        createdAt: claim.created_at || claim.createdAt || null,
        submissionDate: claim.submission_date || claim.submitted_at || null,
      }))

      setClaims(mappedClaims)
    } catch (err) {
      console.error('Error loading report data:', err)
      const message = err instanceof Error ? err.message : 'Failed to load claims data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const totalClaims = claims.length

  const totalClaimValue = useMemo(
    () => claims.reduce((sum, claim) => sum + (claim.claimedAmount || 0), 0),
    [claims]
  )

  const statusSummaries: StatusSummary[] = useMemo(() => {
    const summaryMap = new Map<string, StatusSummary>()

    claims.forEach((claim) => {
      const statusKey = claim.status || 'unknown'
      const existing = summaryMap.get(statusKey)
      const statusMeta = STATUS_DISPLAY_MAP[statusKey] || {
        label: statusKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        color: 'bg-slate-500',
      }

      if (existing) {
        existing.count += 1
        existing.amount += claim.claimedAmount || 0
      } else {
        summaryMap.set(statusKey, {
          status: statusKey,
          label: statusMeta.label,
          count: 1,
          amount: claim.claimedAmount || 0,
          color: statusMeta.color,
        })
      }
    })

    return Array.from(summaryMap.values()).sort((a, b) => b.count - a.count)
  }, [claims])

  const topStatuses = statusSummaries.slice(0, 5)

  const topPayers: PayerSummary[] = useMemo(() => {
    const payerMap = new Map<string, PayerSummary>()

    claims.forEach((claim) => {
      const payerKey = claim.payerName || 'Unknown Payer'
      const existing = payerMap.get(payerKey)

      if (existing) {
        existing.totalAmount += claim.claimedAmount || 0
        existing.claimCount += 1
      } else {
        payerMap.set(payerKey, {
          payer: payerKey,
          totalAmount: claim.claimedAmount || 0,
          claimCount: 1,
        })
      }
    })

    return Array.from(payerMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5)
  }, [claims])

  const last30DaysCount = useMemo(() => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    return claims.filter((claim) => {
      const dateValue = claim.submissionDate || claim.createdAt
      if (!dateValue) return false

      const date = new Date(dateValue)
      return !Number.isNaN(date.getTime()) && date >= thirtyDaysAgo
    }).length
  }, [claims])

  const averageClaimAmount = totalClaims > 0 ? totalClaimValue / totalClaims : 0

  const pendingClaimCount = statusSummaries
    .filter((status) => ['qc_pending', 'qc_query'].includes(status.status))
    .reduce((sum, status) => sum + status.count, 0)

  const clearedClaimCount = statusSummaries
    .filter((status) => ['qc_clear', 'clear', 'Approved', 'dispatched'].includes(status.status))
    .reduce((sum, status) => sum + status.count, 0)

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    })

  const formatNumber = (value: number) => value.toLocaleString('en-IN')

  const handleRetry = () => {
    fetchClaims()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading hospital reports…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Unable to load reports</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleRetry} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!loading && totalClaims === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No claims to report yet"
        description="Once claims are submitted, you’ll see a comprehensive breakdown of volumes, status distribution, and payer metrics here."
        action={{
          label: 'Go to Claims Inbox',
          onClick: () => router.push('/claims-inbox'),
        }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Reports</h1>
          <p className="text-muted-foreground">
            High-level insights across all claims submitted by your hospital.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchClaims} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh data
          </Button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(totalClaims)}</div>
            <p className="text-xs text-muted-foreground mt-2">Across all statuses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claim Value</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalClaimValue)}</div>
            <p className="text-xs text-muted-foreground mt-2">Sum of claimed amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Claim Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-sky-600">{formatCurrency(averageClaimAmount)}</div>
            <p className="text-xs text-muted-foreground mt-2">Per claim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims (Last 30 Days)</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatNumber(last30DaysCount)}</div>
            <p className="text-xs text-muted-foreground mt-2">Submitted in the past month</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Claims by Status</CardTitle>
            <CardDescription>Distribution of claims across processing stages.</CardDescription>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Pending: {formatNumber(pendingClaimCount)}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Cleared: {formatNumber(clearedClaimCount)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {topStatuses.map((status) => {
            const percentage = totalClaims > 0 ? (status.count / totalClaims) * 100 : 0
            return (
              <div key={status.status} className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${status.color}`} />
                    <span className="font-medium">{status.label}</span>
                    <Badge variant="outline">{formatNumber(status.count)}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(status.amount)} total amount
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
          {statusSummaries.length > topStatuses.length && (
            <p className="text-xs text-muted-foreground">
              Showing top {topStatuses.length} statuses. Full distribution is available via export.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payer Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Top Payers by Claim Value</CardTitle>
          <CardDescription>Identify payers contributing the highest claim amounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Claim Count</TableHead>
                <TableHead className="text-right">Average Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPayers.map((payer) => {
                const averageAmount = payer.claimCount > 0 ? payer.totalAmount / payer.claimCount : 0
                return (
                  <TableRow key={payer.payer}>
                    <TableCell className="font-medium">{payer.payer}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payer.totalAmount)}</TableCell>
                    <TableCell className="text-right">{formatNumber(payer.claimCount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(averageAmount)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {topPayers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Payer information is not available for the fetched claims.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Insights</CardTitle>
          <CardDescription>Snapshot of claim movements to help you prioritise follow-ups.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Pending Follow-ups</h4>
            <Separator className="my-3" />
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold">{formatNumber(pendingClaimCount)}</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                Requires action
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Claims currently waiting for query resolution or processor actions.
            </p>
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            <h4 className="text-sm font-semibold text-muted-foreground">Cleared & Dispatched</h4>
            <Separator className="my-3" />
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-emerald-600">
                {formatNumber(clearedClaimCount)}
              </span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                Good to reconcile
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Claims that have successfully cleared processor review or have been dispatched.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

