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
import { Search, Filter, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([])

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

  useEffect(() => {
    filterClaims()
  }, [claims, searchTerm, statusFilter, startDate, endDate])

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
      
      const url = `http://localhost:5002/api/v1/claims/get-all-claims${params.toString() ? `?${params.toString()}` : ''}`
      
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

  const filterClaims = () => {
    console.log('DEBUG: Filtering claims:', {
      totalClaims: claims.length,
      searchTerm,
      statusFilter,
      startDate,
      endDate
    })
    
    let filtered = claims

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.payer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.claim_status === statusFilter)
    }

    console.log('DEBUG: Filtered claims:', filtered.length)
    setFilteredClaims(filtered)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'qc_pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="w-3 h-3 mr-1" />QC Pending</Badge>
      case 'qc_answered':
        return <Badge variant="outline" className="text-blue-600"><Eye className="w-3 h-3 mr-1" />QC Answered</Badge>
      case 'qc_clear':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />QC Clear</Badge>
      case 'qc_query':
        return <Badge variant="outline" className="text-orange-600"><Eye className="w-3 h-3 mr-1" />QC Query</Badge>
      case 'answered':
        return <Badge variant="outline" className="text-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Answered</Badge>
      case 'clear':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Clear</Badge>
      case 'Approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Claims Inbox</h1>
          <p className="text-gray-600">Manage and review submitted claims</p>
        </div>
        <Button onClick={fetchClaims} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
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
                <SelectItem value="qc_answered">QC Answered</SelectItem>
                <SelectItem value="qc_clear">QC Clear</SelectItem>
                <SelectItem value="qc_query">QC Query</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
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
                      ? "No claims have been submitted yet. Submit your first claim to get started."
                      : "No claims match your current filters. Try adjusting your search criteria."
                    }
                  </p>
                </div>
                {claims.length === 0 && (
                  <Button onClick={() => router.push('/claims')} className="mt-4">
                    Submit New Claim
                  </Button>
                )}
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewClaim(claim.claim_id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {claim.claim_status === 'qc_query' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAnswerQuery(claim.claim_id)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Answer Query
                          </Button>
                        )}
                      </div>
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
