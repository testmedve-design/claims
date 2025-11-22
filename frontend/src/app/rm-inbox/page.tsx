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
import { FileText, Search, Filter, Clock } from 'lucide-react'
import { rmApi, type RMClaim } from '@/services/rmApi'
import {
  RM_CLAIM_STATUS_OPTIONS,
  getRmClaimStatusBadgeClass,
  getRmClaimStatusLabel
} from '@/constants/rmClaimStatus'

export default function RMInboxPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [claims, setClaims] = useState<RMClaim[]>([])
  const [filteredClaims, setFilteredClaims] = useState<RMClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'settled' | 'all'>('active')

  // Check if user has RM access (RM or Reconciler)
  useEffect(() => {
    if (user && user.role !== 'rm' && user.role !== 'reconciler') {
      router.push('/claims-inbox') // Redirect to regular claims inbox
    }
  }, [user, router])

  useEffect(() => {
    fetchClaims()
  }, [activeTab])

  useEffect(() => {
    filterClaims()
  }, [claims, searchTerm, statusFilter, startDate, endDate])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      
      const data = await rmApi.getClaims({
        tab: activeTab,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      })
      
      console.log('🔍 RM: API Response:', data)
      
      if (data.success) {
        const normalizedClaims = data.claims.map(claim => {
          const normalizedStatus = (claim.claim_status || 'dispatched').toLowerCase()
          return {
            ...claim,
            claim_status: normalizedStatus,
            claim_status_label: getRmClaimStatusLabel(normalizedStatus)
          }
        })
        setClaims(normalizedClaims)
      } else {
        throw new Error(data.error || 'Failed to fetch claims')
      }
    } catch (err: any) {
      console.error('Error fetching RM claims:', err)
      setError(err.message || 'An error occurred while fetching claims')
    } finally {
      setLoading(false)
    }
  }

  const filterClaims = () => {
    let filtered = claims

    // Filter by claim status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        claim => (claim.claim_status || '').toLowerCase() === statusFilter
      )
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.payer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredClaims(filtered)
  }

  const getStatusBadge = (status?: string) => {
    const label = getRmClaimStatusLabel(status)
    const badgeClass = getRmClaimStatusBadgeClass(status)
    return (
      <Badge variant="outline" className={badgeClass}>
        {label}
      </Badge>
    )
  }

  const handleProcessClaim = (claimId: string) => {
    router.push(`/rm-inbox/process/${claimId}`)
  }

  // Determine if a claim can be processed
  // Only back_reconciliation status should NOT show Process button
  // All other statuses (including settled, partially_settled, reconciliation) can be processed
  // Note: settled, partially_settled, and reconciliation statuses allow bank reconciliation
  const canProcessClaim = (status?: string): boolean => {
    if (!status) return true // Allow processing if status is missing
    const normalizedStatus = status.toLowerCase().trim()
    
    // Only back_reconciliation should NOT show Process button
    // All other statuses (settled, partially_settled, reconciliation, etc.) can be processed
    if (normalizedStatus === 'back_reconciliation') {
      return false
    }
    
    // All other statuses can be processed (including settlement statuses for bank recon)
    return true
  }

  // Show access denied for non-RM/Reconciler users
  if (user && user.role !== 'rm' && user.role !== 'reconciler') {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">
              You don't have permission to access the RM Inbox. 
              This feature is only available for Relationship Managers and Reconcilers.
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
          <h1 className="text-3xl font-bold text-gray-900">RM Inbox</h1>
          <p className="text-gray-600 mt-2">Manage dispatched claims and settlements</p>
        </div>
        <Button onClick={fetchClaims} variant="outline">
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Claims
        </button>
        <button
          onClick={() => setActiveTab('settled')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'settled'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Settled Claims
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Claims
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
                  placeholder="Search by patient, claim ID, payer, or hospital..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by claim status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {RM_CLAIM_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
                      ? "No claims are available for RM processing."
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
                  <TableHead>Hospital</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Claim Status</TableHead>
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
                    <TableCell>{claim.hospital_name}</TableCell>
                    <TableCell>₹{claim.claimed_amount?.toLocaleString() || 0}</TableCell>
                    <TableCell>{getStatusBadge(claim.claim_status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{new Date(claim.submission_date).toLocaleDateString('en-IN')}</div>
                        <div className="text-gray-500">{new Date(claim.submission_date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canProcessClaim(claim.claim_status) ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleProcessClaim(claim.claim_id)}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Process
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
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

