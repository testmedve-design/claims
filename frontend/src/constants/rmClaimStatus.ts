export type RMClaimStatusOption = {
  value: string
  label: string
  badgeClass: string
}

export const RM_CLAIM_STATUS_OPTIONS: RMClaimStatusOption[] = [
  { value: 'dispatched', label: 'Dispatched', badgeClass: 'bg-blue-100 text-blue-800' },
  { value: 'received', label: 'Received', badgeClass: 'bg-blue-100 text-blue-800' },
  { value: 'query_raised', label: 'Query Raised', badgeClass: 'bg-orange-100 text-orange-800' },
  { value: 'repudiated', label: 'Repudiated', badgeClass: 'bg-red-100 text-red-800' },
  { value: 'settled', label: 'Settled', badgeClass: 'bg-emerald-100 text-emerald-800' },
  { value: 'approved', label: 'Approved', badgeClass: 'bg-green-100 text-green-800' },
  { value: 'partially_settled', label: 'Partially Settled', badgeClass: 'bg-teal-100 text-teal-800' },
  { value: 'reconciliation', label: 'Reconciliation', badgeClass: 'bg-purple-100 text-purple-800' },
  { value: 'in_progress', label: 'In Progress', badgeClass: 'bg-sky-100 text-sky-800' },
  { value: 'cancelled', label: 'Cancelled', badgeClass: 'bg-gray-100 text-gray-700' },
  { value: 'closed', label: 'Closed', badgeClass: 'bg-slate-200 text-slate-700' },
  { value: 'not_found', label: 'Not Found', badgeClass: 'bg-gray-200 text-gray-700' }
]

export const RM_SETTLEMENT_STATUS_VALUES = ['settled', 'partially_settled', 'reconciliation', 'approved']

export const getRmClaimStatusLabel = (value?: string | null): string => {
  if (!value) return 'Received'
  const normalized = value.toLowerCase()
  const match = RM_CLAIM_STATUS_OPTIONS.find(option => option.value === normalized)
  if (match) return match.label
  return value
}

export const getRmClaimStatusBadgeClass = (value?: string | null): string => {
  if (!value) return 'bg-gray-100 text-gray-700'
  const normalized = value.toLowerCase()
  const match = RM_CLAIM_STATUS_OPTIONS.find(option => option.value === normalized)
  if (match) return match.badgeClass
  return 'bg-gray-100 text-gray-700'
}

