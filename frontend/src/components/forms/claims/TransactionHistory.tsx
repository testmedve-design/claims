'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Transaction {
  transaction_id?: string
  transaction_type: string
  previous_status?: string
  new_status?: string
  remarks?: string
  performed_by?: string
  performed_by_name?: string
  performed_by_email?: string
  performed_by_role?: string
  performed_at?: string
  metadata?: any
  claim_id?: string
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

const getStatusLabel = (type: string) => {
  const labels: Record<string, string> = {
    CREATED: 'Created',
    QUERIED: 'Query Raised',
    ANSWERED: 'Query Answered',
    CLEARED: 'QC Clear',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DISPATCHED: 'Dispatched'
  }
  return labels[type] || type
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getRoleLabel = (role?: string) => {
  const roles: Record<string, string> = {
    hospital_user: 'Hospital',
    processor: 'Processor',
    admin: 'Admin'
  }
  return roles[role || ''] || 'System'
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'transaction_type',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 hover:bg-muted/50"
          >
            Action
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const label = getStatusLabel(row.getValue('transaction_type'))
        return (
          <Badge variant="outline" className="text-xs font-medium">
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'performed_by_name',
      header: 'Performed By',
      cell: ({ row }) => {
        const name = row.original.performed_by_name || row.original.performed_by_email || 'System'
        const role = getRoleLabel(row.original.performed_by_role)
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant="secondary" className="text-xs w-fit">
              {role}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'previous_status',
      header: 'Status Change',
      cell: ({ row }) => {
        const prev = row.original.previous_status
        const next = row.original.new_status
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 capitalize">{prev?.replace('_', ' ')}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-900 font-medium capitalize">{next?.replace('_', ' ')}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => {
        const remarks = row.original.remarks
        const metadata = row.original.metadata

        // Show metadata details for specific transaction types
        if (row.original.transaction_type === 'DISPATCHED' && metadata) {
          return (
            <div className="text-sm space-y-1">
              <div className="text-gray-600">Mode: <span className="font-medium capitalize">{metadata.dispatch_mode}</span></div>
              {metadata.acknowledgment_number && (
                <div className="text-xs text-gray-500">Ack: {metadata.acknowledgment_number}</div>
              )}
            </div>
          )
        }

        return <span className="text-sm text-gray-600">{remarks || '-'}</span>
      },
    },
    {
      accessorKey: 'metadata',
      header: 'QC Query Summary',
      cell: ({ row }) => {
        const metadata = row.original.metadata
        if (!metadata || !metadata.query_details) {
          return <span className="text-xs text-gray-400">-</span>
        }

        const details = metadata.query_details
        const issueCategories: string[] = details.issue_categories || []
        const repeatIssue = details.repeat_issue
        const actionRequired = details.action_required

        return (
          <div className="text-xs space-y-2 text-gray-700">
            {issueCategories.length > 0 && (
              <div>
                <span className="font-semibold text-gray-600">Issue Categories:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {issueCategories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatIssue && (
              <div>
                <span className="font-semibold text-gray-600">Repeat Issue:</span>{' '}
                <span className="uppercase">{repeatIssue}</span>
              </div>
            )}
            {actionRequired && (
              <div>
                <span className="font-semibold text-gray-600">Action Required:</span>
                <p className="mt-1 whitespace-pre-line text-gray-600">{actionRequired}</p>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'performed_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 hover:bg-muted/50 float-right"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <div className="text-right text-xs text-gray-500">
            {formatDateTime(row.getValue('performed_at'))}
          </div>
        )
      },
    },
  ]

  if (transactions.length === 0) {
    return <p className="text-gray-500 text-center py-8">No transaction history available</p>
  }

  return (
    <DataTable
      columns={columns}
      data={transactions}
      searchKey="performed_by_name"
      searchPlaceholder="Search by user..."
      showColumnToggle={true}
      showPagination={transactions.length > 10}
    />
  )
}
