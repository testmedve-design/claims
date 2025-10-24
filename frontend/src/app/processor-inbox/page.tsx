'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Search, Filter, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface Claim {
  claim_id: string
  patient_name: string
  payer_name: string
  amount: number
  claim_status: string
  submission_date: string
  created_at: string
  updated_at: string
  // Lock information
  locked_by_processor?: string
  locked_by_processor_email?: string
  locked_by_processor_name?: string
  locked_at?: string
  lock_expires_at?: string
}

const API_BASE_URL = 'http://localhost:5002'

export default function ProcessorInboxPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [claims, setClaims] = useState<Claim[]>([])
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'unprocessed' | 'processed'>('unprocessed')

  // Check if user has processor access
  useEffect(() => {
    if (user && user.role !== 'claim_processor' && (user.role as string) !== 'claim_processor_l4') {
      router.push('/claims-inbox') // Redirect to regular claims inbox
    }
  }, [user, router])

  useEffect(() => {
    fetchClaims()
  }, [])

  // Refetch claims when tab changes
  useEffect(() => {
    fetchClaims()
  }, [activeTab])

  useEffect(() => {
    filterClaims()
  }, [claims, searchTerm, statusFilter, startDate, endDate, activeTab])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No authentication token found')
      }

      // Build query parameters
      const params = new URLSearchParams()
      params.append('tab', activeTab) // Add tab parameter
      if (startDate) {
        params.append('start_date', startDate)
      }
      if (endDate) {
        params.append('end_date', endDate)
      }
      
      const url = `http://localhost:5002/api/processor-routes/get-claims-to-process?${params.toString()}`
      
      console.log('🔍 Fetching claims for tab:', activeTab)
      console.log('🔍 API URL:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('🔍 Processor API Response:', data)
      console.log('🔍 Number of claims:', data.claims?.length || 0)
      
      if (data.success) {
        // Transform the data structure from processor API
        const transformedClaims = data.claims.map((claim: any) => ({
          claim_id: claim.claim_id,
          patient_name: claim.patient_name || 'N/A',
          payer_name: claim.payer_name || 'N/A',
          amount: claim.claimed_amount || 0,
          claim_status: claim.claim_status || 'pending',
          submission_date: claim.submission_date,
          created_at: claim.created_at,
          updated_at: claim.created_at // Using created_at as fallback
        }))
        
        setClaims(transformedClaims)
      } else {
        throw new Error(data.error || 'Failed to fetch claims')
      }
    } catch (err: any) {
      console.error('Error fetching claims:', err)
      setError(err.message || 'An error occurred while fetching claims')
    } finally {
      setLoading(false)
    }
  }

  const filterClaims = () => {
    let filtered = claims

    // Filter by tab (unprocessed vs processed)
    if (activeTab === 'unprocessed') {
      filtered = filtered.filter(claim => 
        ['qc_pending', 'need_more_info', 'qc_answered'].includes(claim.claim_status)
      )
    } else if (activeTab === 'processed') {
      filtered = filtered.filter(claim => 
        ['qc_query', 'qc_clear', 'claim_approved', 'claim_denial'].includes(claim.claim_status)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.claim_status === statusFilter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.payer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredClaims(filtered)
  }

  const getUnprocessedCount = () => {
    return claims.filter(claim => 
      ['qc_pending', 'need_more_info', 'qc_answered'].includes(claim.claim_status)
    ).length
  }

  const getProcessedCount = () => {
    const processedClaims = claims.filter(claim => 
      ['qc_query', 'qc_clear', 'claim_approved', 'claim_denial'].includes(claim.claim_status)
    )
    console.log('🔍 getProcessedCount - Total claims:', claims.length)
    console.log('🔍 getProcessedCount - Processed claims:', processedClaims.length)
    console.log('🔍 getProcessedCount - Claims statuses:', claims.map(c => c.claim_status))
    console.log('🔍 getProcessedCount - All claims data:', claims)
    return processedClaims.length
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qc_pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />QC Pending</Badge>
      case 'qc_query':
        return <Badge variant="outline" className="text-orange-600"><AlertCircle className="w-3 h-3 mr-1" />QC Query</Badge>
      case 'need_more_info':
        return <Badge variant="outline" className="text-orange-600"><AlertCircle className="w-3 h-3 mr-1" />Need More Info</Badge>
      case 'qc_answered':
        return <Badge variant="outline" className="text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />QC Answered</Badge>
      case 'qc_clear':
        return <Badge variant="outline" className="text-emerald-600"><CheckCircle className="w-3 h-3 mr-1" />QC Clear</Badge>
      case 'claim_approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Claim Approved</Badge>
      case 'claim_denial':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Claim Denial</Badge>
      default:
        return <Badge variant="outline" className="text-gray-600">{status}</Badge>
    }
  }

  const handleProcessClaim = (claimId: string) => {
    // Navigate to claim processing page
    window.location.href = `/processor-inbox/process/${claimId}`
  }


  // Show access denied for non-processors
  if (user && user.role !== 'claim_processor' && (user.role as string) !== 'claim_processor_l4') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              You don't have permission to access the Processor Inbox. 
              This feature is only available for Claim Processors.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Your current role: <strong>{user.role}</strong>
            </p>
            <Button onClick={() => router.push('/claims-inbox')}>
              Go to Claims Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading claims...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchClaims}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processor Inbox</h1>
          <p className="text-gray-600 mt-2">Process and manage submitted claims</p>
        </div>
        <Button onClick={fetchClaims} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => {
            console.log('🔍 Clicked Unprocessed tab')
            setActiveTab('unprocessed')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'unprocessed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Unprocessed ({getUnprocessedCount()})
        </button>
        <button
          onClick={() => {
            console.log('🔍 Clicked Processed tab')
            setActiveTab('processed')
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'processed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Processed ({getProcessedCount()})
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by patient name, claim ID, or payer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="qc_pending">QC Pending</SelectItem>
                <SelectItem value="qc_query">QC Query</SelectItem>
                <SelectItem value="need_more_info">Need More Info</SelectItem>
                        <SelectItem value="qc_answered">QC Answered</SelectItem>
                <SelectItem value="qc_clear">QC Clear</SelectItem>
                <SelectItem value="claim_approved">Claim Approved</SelectItem>
                <SelectItem value="claim_denial">Claim Denial</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button 
              onClick={fetchClaims} 
              variant="outline" 
              size="sm"
            >
              Apply Filters
            </Button>
            <Button 
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setStatusFilter('all')
                setSearchTerm('')
                fetchClaims()
              }} 
              variant="outline" 
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Claims ({filteredClaims.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">No claims found</h3>
                  <p className="text-gray-500 mt-1">
                    {claims.length === 0 
                      ? "No claims are available for processing."
                      : "No claims match your current filters. Try adjusting your search criteria."
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Payer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow key={claim.claim_id}>
                    <TableCell className="font-mono text-sm">{claim.claim_id}</TableCell>
                    <TableCell>{claim.patient_name}</TableCell>
                    <TableCell>{claim.payer_name}</TableCell>
                    <TableCell>₹{claim.amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(claim.claim_status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{new Date(claim.submission_date).toLocaleDateString('en-IN')}</div>
                        <div className="text-gray-500">{new Date(claim.submission_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {claim.locked_by_processor && claim.locked_by_processor !== user?.uid ? (
                        <div className="flex flex-col items-start space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="opacity-50"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Locked
                          </Button>
                          <div className="text-xs text-gray-500">
                            By: {claim.locked_by_processor_name || claim.locked_by_processor_email}
                          </div>
                          {claim.locked_at && (
                            <div className="text-xs text-gray-400">
                              {new Date(claim.locked_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessClaim(claim.claim_id)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Process
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
