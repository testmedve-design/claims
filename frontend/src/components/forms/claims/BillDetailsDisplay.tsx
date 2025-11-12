'use client'

interface BillDetailsDisplayProps {
  data: any
}

export function BillDetailsDisplay({ data }: BillDetailsDisplayProps) {
  const dialysisBills = Array.isArray(data?.dialysis_bills) ? data.dialysis_bills : []

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <span className="text-sm font-medium text-gray-500">Bill Number</span>
          <p className="mt-1">{data?.bill_number || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Bill Date</span>
          <p className="mt-1">
            {data?.bill_date
              ? new Date(data.bill_date).toLocaleDateString('en-IN')
              : 'N/A'}
          </p>
        </div>

        {data?.security_deposit > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500">Security Deposit</span>
            <p className="mt-1">₹{data.security_deposit?.toLocaleString() || '0'}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Total Bill Amount</span>
          <p className="mt-1 font-semibold text-lg">
            ₹{data?.total_bill_amount?.toLocaleString() || '0'}
          </p>
        </div>

        {data?.patient_discount_amount > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500">Patient Discount</span>
            <p className="mt-1">₹{data.patient_discount_amount?.toLocaleString() || '0'}</p>
          </div>
        )}

        {data?.amount_paid_by_patient > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500">Amount Paid By Patient</span>
            <p className="mt-1">₹{data.amount_paid_by_patient?.toLocaleString() || '0'}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Total Patient Paid</span>
          <p className="mt-1">₹{data?.total_patient_paid_amount?.toLocaleString() || '0'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Amount Charged to Payer</span>
          <p className="mt-1">₹{data?.amount_charged_to_payer?.toLocaleString() || '0'}</p>
        </div>

        {data?.mou_discount_amount > 0 && (
          <div>
            <span className="text-sm font-medium text-gray-500">MOU Discount</span>
            <p className="mt-1">₹{data.mou_discount_amount?.toLocaleString() || '0'}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Claimed Amount</span>
          <p className="mt-1 font-semibold text-lg text-green-600">
            ₹{data?.claimed_amount?.toLocaleString() || '0'}
          </p>
        </div>

        {data?.submission_remarks && (
          <div className="col-span-full">
            <span className="text-sm font-medium text-gray-500">Submission Remarks</span>
            <p className="mt-1 text-sm bg-gray-50 p-3 rounded-md">{data.submission_remarks}</p>
          </div>
        )}
      </div>

      {dialysisBills.length > 0 && (
        <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <h4 className="text-base font-semibold text-blue-900">Dialysis Session Bills</h4>
          <div className="space-y-2">
            {dialysisBills.map((bill: any, index: number) => (
              <div
                key={`${bill.bill_number || 'bill'}-${bill.bill_date || index}`}
                className="flex flex-col justify-between gap-2 rounded-md bg-white p-3 shadow-sm sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{bill.bill_number || `Bill ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {bill.bill_date
                      ? new Date(bill.bill_date).toLocaleDateString('en-IN')
                      : 'No date provided'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-blue-700">
                  ₹{Number(bill.bill_amount || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
