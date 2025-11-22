'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { analyticsApi, AnalyticsFilters } from '@/services/analyticsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { format, subDays } from 'date-fns'
import { convertNumberToWords } from '@/lib/numberToWords'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

// Shared Comprehensive Analytics Component
function ComprehensiveAnalytics({ data }: { data: any }) {
  if (!data) return null
  
  // Calculate percentages
  const totalClaims = data.total_claims || 0
  const outstandingClaims = data.outstanding_claims || 0
  const settledClaims = data.settled_claims || 0
  const totalClaimedAmount = data.total_amount || 0
  const outstandingAmount = data.outstanding_amount || 0
  const settledAmount = data.settled_amount || 0
  
  const outstandingClaimsPercent = totalClaims > 0 ? ((outstandingClaims / totalClaims) * 100).toFixed(2) : '0.00'
  const outstandingAmountPercent = totalClaimedAmount > 0 ? ((outstandingAmount / totalClaimedAmount) * 100).toFixed(2) : '0.00'
  const settledClaimsPercent = totalClaims > 0 ? ((settledClaims / totalClaims) * 100).toFixed(2) : '0.00'
  const settledAmountPercent = totalClaimedAmount > 0 ? ((settledAmount / totalClaimedAmount) * 100).toFixed(2) : '0.00'
  
  // Format amounts
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comprehensive Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Row 1: No. of Claims Created, Total Claimed Amount, Total Billed Amount */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">No. of Claims Created</div>
            <div className="text-2xl font-bold">{(data.claims_created || totalClaims).toLocaleString()}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Total Claimed Amount</div>
            <div className="text-lg font-semibold">{convertNumberToWords(totalClaimedAmount)}</div>
            <div className="text-sm text-muted-foreground">{formatCurrency(totalClaimedAmount)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Total Billed Amount</div>
            <div className="text-lg font-semibold">{convertNumberToWords(data.total_billed_amount || 0)}</div>
            <div className="text-sm text-muted-foreground">{formatCurrency(data.total_billed_amount || 0)}</div>
          </div>
        </div>

        {/* Row 2: Outstanding Claims */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">No. Outstanding Claims</div>
            <div className="text-2xl font-bold">
              {outstandingClaims.toLocaleString()} 
              <span className="text-base font-normal text-muted-foreground ml-2">({outstandingClaimsPercent}%)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Outstanding Amount</div>
            <div className="text-lg font-semibold">
              {convertNumberToWords(outstandingAmount)}
              <span className="text-base font-normal text-muted-foreground ml-2">({outstandingAmountPercent}%)</span>
            </div>
            <div className="text-sm text-muted-foreground">{formatCurrency(outstandingAmount)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Patient Paid / Discount Amount</div>
            <div className="text-lg font-semibold">{formatCurrency(data.total_patient_paid || 0)}</div>
            <div className="text-sm text-muted-foreground">Discount: {formatCurrency(data.total_discount || 0)}</div>
          </div>
        </div>

        {/* Row 3: Settled Cases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">No. Of Settled Case</div>
            <div className="text-2xl font-bold">
              {settledClaims.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-2">({settledClaimsPercent}%)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Total Settled Amount</div>
            <div className="text-lg font-semibold">
              {convertNumberToWords(settledAmount)}
              <span className="text-base font-normal text-muted-foreground ml-2">({settledAmountPercent}%)</span>
            </div>
            <div className="text-sm text-muted-foreground">{formatCurrency(settledAmount)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Total Disallowed Amount</div>
            <div className="text-lg font-semibold">{formatCurrency(data.total_disallowed || 0)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { user, role, initialize } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    hospital_id: '',
    payer_name: '',
    payer_type: ''
  })

  // Initialize store on mount (only once)
  useEffect(() => {
    try {
      initialize()
    } catch (error) {
      console.error('Failed to initialize auth store:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  const fetchAnalytics = useCallback(async () => {
    if (!user || !role) {
      console.log('Analytics: Waiting for user/role', { user: !!user, role })
      setLoading(false)
      return
    }

    console.log('Analytics: Fetching data for role:', role)

    setLoading(true)
    setError(null)
    try {
      let response
      if (role === 'hospital_user') {
        response = await analyticsApi.getHospitalAnalytics(filters)
      } else if (role?.startsWith('claim_processor')) {
        response = await analyticsApi.getProcessorAnalytics(filters)
      } else if (role === 'review_request') {
        response = await analyticsApi.getReviewAnalytics(filters)
      } else if (role === 'rm' || role === 'reconciler') {
        response = await analyticsApi.getRMAnalytics(filters)
      } else {
        setError(`Analytics not available for role: ${role}`)
        setLoading(false)
        return
      }

      if (response?.success) {
        setData(response.data)
      } else {
        setError(response?.error || 'Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [user, role, filters])

  useEffect(() => {
    if (user && role) {
      fetchAnalytics()
    }
  }, [user, role, fetchAnalytics])

  const handleFilterChange = (key: keyof AnalyticsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Add timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !user) {
        console.warn('Analytics: Still loading after 5 seconds, user:', user)
        setError('Unable to load user data. Please refresh the page or login again.')
        setLoading(false)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [loading, user])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium">Loading user data...</div>
          {error && (
            <div className="text-sm text-destructive mt-2">
              {error}
            </div>
          )}
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="text-lg font-medium text-destructive">Unable to determine user role</div>
          <div className="text-sm text-muted-foreground">
            User: {user?.email || 'Unknown'} | Role: {user?.role || 'Not set'}
          </div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">From</span>
            <Input 
              type="date" 
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-[150px]"
            />
            <span className="text-sm font-medium">To</span>
            <Input 
              type="date" 
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-[150px]"
            />
          </div>
          
          {/* Entity Filter for multi-entity users */}
          {user.entity_assignments?.hospitals && user.entity_assignments.hospitals.length > 1 && (
            <Select 
              value={filters.hospital_id || 'all'} 
              onValueChange={(val) => handleFilterChange('hospital_id', val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Hospital" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hospitals</SelectItem>
                {user.entity_assignments.hospitals.map((h: any) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Payer Filters */}
          <Input 
            placeholder="Filter by Payer Name" 
            value={filters.payer_name}
            onChange={(e) => handleFilterChange('payer_name', e.target.value)}
            className="w-[200px]"
          />
          
           <Select 
              value={filters.payer_type || 'all'} 
              onValueChange={(val) => handleFilterChange('payer_type', val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Payer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">-- ALL --</SelectItem>
                <SelectItem value="tpa">TPA</SelectItem>
                <SelectItem value="insurer">Insurer</SelectItem>
                <SelectItem value="corporate">Corporate</SelectItem>
              </SelectContent>
            </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading analytics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg font-medium">Loading analytics data...</div>
          </div>
        </div>
      ) : !error ? (
        <>
          {role === 'hospital_user' && <HospitalDashboard data={data} />}
          {role?.startsWith('claim_processor') && <ProcessorDashboard data={data} />}
          {role === 'review_request' && <ReviewDashboard data={data} />}
          {(role === 'rm' || role === 'reconciler') && <RMDashboard data={data} />}
        </>
      ) : null}
    </div>
  )
}

function HospitalDashboard({ data }: { data: any }) {
  if (!data) return null
  
  const statusData = Object.entries(data.status_distribution || {}).map(([name, value]) => ({ name, value }))
  const timeData = Object.entries(data.claims_over_time || {}).map(([date, count]) => ({ date, count }))
  
  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Section */}
      <ComprehensiveAnalytics data={data} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Claims Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Claims Over Time</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProcessorDashboard({ data }: { data: any }) {
  if (!data) return null

  const decisionData = [
    { name: 'Approved', value: data.decisions?.approved || 0 },
    { name: 'Rejected', value: data.decisions?.rejected || 0 },
    { name: 'Query', value: data.decisions?.query || 0 },
    { name: 'Cleared', value: data.decisions?.cleared || 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Section */}
      <ComprehensiveAnalytics data={data} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Processed" value={data.total_processed} />
        <StatCard title="Pending Workload" value={data.pending_workload} />
        <StatCard title="Approved" value={data.decisions?.approved} />
        <StatCard title="Queried" value={data.decisions?.query} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Decision Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={decisionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {decisionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Could add hospital performance chart here */}
      </div>
    </div>
  )
}

function ReviewDashboard({ data }: { data: any }) {
  if (!data) return null
  
  const statusData = Object.entries(data.status_distribution || {}).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Section */}
      <ComprehensiveAnalytics data={data} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Reviewed" value={data.total_reviewed} />
        <StatCard title="Pending Review" value={data.pending_review} />
        <StatCard title="Escalated" value={data.escalated} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Claimed Amount" value={`₹${data.financials?.claimed?.toLocaleString()}`} />
        <StatCard title="Approved Amount" value={`₹${data.financials?.approved?.toLocaleString()}`} />
        <StatCard title="Disallowed Amount" value={`₹${data.financials?.disallowed?.toLocaleString()}`} />
      </div>

      <Card>
          <CardHeader><CardTitle>Review Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  )
}

function RMDashboard({ data }: { data: any }) {
  if (!data) return null

  const settlementData = Object.entries(data.settlement_status || {}).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      {/* Comprehensive Statistics Section */}
      <ComprehensiveAnalytics data={data} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Active Claims" value={data.active_claims} />
        <StatCard title="Settled Claims" value={data.settled_claims} />
        <StatCard title="Settled Amount" value={`₹${data.financials?.settled?.toLocaleString()}`} />
        <StatCard title="Net Payable" value={`₹${data.financials?.net_payable?.toLocaleString()}`} />
      </div>

      <Card>
          <CardHeader><CardTitle>Settlement Status</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={settlementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
    </div>
  )
}

function StatCard({ title, value }: { title: string, value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}

