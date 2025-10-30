'use client'

interface PayerDetailsDisplayProps {
  data: any
}

export function PayerDetailsDisplay({ data }: PayerDetailsDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <span className="text-sm font-medium text-gray-500">Payer Patient ID</span>
          <p className="mt-1">{data?.payer_patient_id || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Authorization Number</span>
          <p className="mt-1 font-medium">#{data?.authorization_number || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Total Authorized Amount</span>
          <p className="mt-1 font-semibold text-green-600">
            ₹{data?.total_authorized_amount?.toLocaleString() || '0'}
          </p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Payer Type</span>
          <p className="mt-1">{data?.payer_type || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Payer Name</span>
          <p className="mt-1 font-semibold">{data?.payer_name || 'N/A'}</p>
        </div>

        {data?.insurer_name && (
          <div>
            <span className="text-sm font-medium text-gray-500">Insurer Name</span>
            <p className="mt-1">{data.insurer_name}</p>
          </div>
        )}

        {data?.policy_number && (
          <div>
            <span className="text-sm font-medium text-gray-500">Policy Number</span>
            <p className="mt-1">{data.policy_number}</p>
          </div>
        )}

        {data?.sponsorer_corporate_name && (
          <div>
            <span className="text-sm font-medium text-gray-500">Corporate Name</span>
            <p className="mt-1">{data.sponsorer_corporate_name}</p>
          </div>
        )}

        {data?.sponsorer_employee_id && (
          <div>
            <span className="text-sm font-medium text-gray-500">Employee ID</span>
            <p className="mt-1">{data.sponsorer_employee_id}</p>
          </div>
        )}

        {data?.sponsorer_employee_name && (
          <div>
            <span className="text-sm font-medium text-gray-500">Employee Name</span>
            <p className="mt-1">{data.sponsorer_employee_name}</p>
          </div>
        )}
      </div>
    </div>
  )
}
