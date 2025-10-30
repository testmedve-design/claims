'use client'

import { User, Calendar, Clock } from 'lucide-react'

interface ProcessorInfoProps {
  claim: any
}

export function ProcessorInfo({ claim }: ProcessorInfoProps) {
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

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Submitted by</p>
            <p className="font-medium text-gray-900 truncate">
              {claim.submitted_by_email?.split('@')[0] || claim.submitted_by}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Submission</p>
            <p className="font-medium text-gray-900">
              {new Date(claim.submission_date).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="font-medium text-gray-900">
              {new Date(claim.created_at).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>

        {claim.updated_at && claim.updated_at !== claim.created_at && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">
                {new Date(claim.updated_at).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
