'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, FileText, TrendingUp, Download, RefreshCw, ArrowUpDown, MoreHorizontal } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatsCardSkeleton } from '@/components/ui/card-skeleton'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { API_BASE_URL } from '@/lib/apiConfig'

interface Claim {
  claim_id: string
  patient_name: string
  claim_status: string
  submission_date: string
  amount: number
  payer_name: string
  hospital_name: string
  created_by: string
}

export default function ClaimsInboxPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Statistics
  const totalClaims = claims.length
  const pendingClaims = claims.filter(claim => 
    ['qc_pending', 'qc_query'].includes(claim.claim_status)
  ).length
  const approvedClaims = claims.filter(claim => 
    ['qc_clear', 'clear', 'Approved'].includes(claim.claim_status)
  ).length
  const rejectedClaims = claims.filter(claim => 
    claim.claim_status === 'rejected'
  ).length

  // Check if user has access to claims inbox page
  useEffect(() => {
    const processorRoles = ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4']
    if (user && processorRoles.includes(user.role as string)) {
      router.push('/processor-inbox') // Redirect claim processors to their inbox
    }
  }, [user, router])

  useEffect(() => {
    fetchClaims()
  }, [])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (startDate) {
        params.append('start_date', startDate)
      }
      if (endDate) {
        params.append('end_date', endDate)
      }
      
      const url = `${API_BASE_URL}/v1/claims/get-all-claims${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Map the flat data structure from backend to frontend format
        const mappedClaims = (data.claims || []).map((claim: any) => ({
          claim_id: claim.claim_id,
          patient_name: claim.patient_name || '',
          claim_status: claim.claim_status,
          submission_date: claim.submission_date,
          amount: claim.claimed_amount || 0,
          payer_name: claim.payer_name || '',
          hospital_name: claim.hospital_name || '',
          created_by: claim.created_by_email || ''
        }))
        
        console.log('DEBUG: Mapped claims:', mappedClaims.length, mappedClaims[0])
        setClaims(mappedClaims)
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || 'Failed to fetch claims'
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching claims:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter claims based on status and date filters
  const filteredClaims = useMemo(() => {
    let filtered = claims

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.claim_status === statusFilter)
    }

    return filtered
  }, [claims, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qc_pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200">QC Pending</Badge>
      case 'qc_answered':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">QC Answered</Badge>
      case 'qc_clear':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">QC Clear</Badge>
      case 'qc_query':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200">QC Query</Badge>
      case 'answered':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">Answered</Badge>
      case 'clear':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Clear</Badge>
      case 'Approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewClaim = (claimId: string) => {
    console.log('🔍 Opening claim details for:', claimId)
    // Navigate to claim details
    window.open(`/claims/${claimId}`, '_blank')
  }

  const handleAnswerQuery = (claimId: string) => {
    // Navigate to query response page
    window.open(`/claims/${claimId}?action=answer_query`, '_blank')
  }

  // Define columns for DataTable
  const columns: ColumnDef<Claim>[] = useMemo(() => [
    {
      accessorKey: "claim_id",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Claim ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium text-blue-600">
          {row.getValue("claim_id")}
        </div>
      ),
    },
    {
      accessorKey: "patient_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Patient Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const patientName = row.getValue("patient_name") as string
        return (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-xs font-medium text-blue-600">
                {patientName ? patientName.charAt(0).toUpperCase() : 'P'}
              </span>
            </div>
            <div>
              <div className="font-medium text-gray-900">{patientName}</div>
              <div className="text-sm text-gray-500">Patient</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "payer_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Payer
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const payerName = row.getValue("payer_name") as string
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{payerName}</div>
            <div className="text-gray-500">Payer</div>
          </div>
        )
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">₹{amount.toLocaleString()}</div>
            <div className="text-gray-500">Amount</div>
          </div>
        )
      },
    },
    {
      accessorKey: "claim_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("claim_status") as string
        return getStatusBadge(status)
      },
    },
    {
      accessorKey: "submission_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 p-0 hover:bg-transparent"
          >
            Submitted At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("submission_date") as string
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900">{new Date(date).toLocaleDateString('en-IN')}</div>
            <div className="text-gray-500">{new Date(date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const claim = row.original
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => handleViewClaim(claim.claim_id)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {claim.claim_status === 'qc_query' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleAnswerQuery(claim.claim_id)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Answer Query
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [])


  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Statistics Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCardSkeleton count={4} />
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2"></div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        {/* Table Skeleton */}
        <TableSkeleton rows={5} columns={7} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claims Inbox</h1>
          <p className="text-gray-600">Manage and review submitted claims</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchClaims} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClaims}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingClaims}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Claims</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedClaims}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Claims</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedClaims}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter claims by status or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="qc_pending">QC Pending</SelectItem>
                <SelectItem value="qc_answered">QC Answered</SelectItem>
                <SelectItem value="qc_clear">QC Clear</SelectItem>
                <SelectItem value="qc_query">QC Query</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={fetchClaims}
                className="flex-1"
              >
                Apply Filters
              </Button>
              <Button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                  setStatusFilter('all')
                  fetchClaims()
                }}
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims DataTable */}
      <DataTable
        columns={columns}
        data={filteredClaims}
        searchKey="patient_name"
        searchPlaceholder="Search by patient name..."
        loading={loading}
        showColumnToggle={true}
        showPagination={true}
      />
    </div>
  )
}
