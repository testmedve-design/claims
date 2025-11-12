'use client'

interface PatientDetailsDisplayProps {
  data: any
}

export function PatientDetailsDisplay({ data }: PatientDetailsDisplayProps) {
  const ageUnitLabels: Record<string, string> = {
    DAYS: 'days',
    MONTHS: 'months',
    YRS: 'yrs',
  }

  const renderAgeValue = () => {
    const ageValue = data?.age
    const unit = data?.age_unit

    if (ageValue !== undefined && ageValue !== null && ageValue !== '') {
      const numericAge = Number(ageValue)
      const label = ageUnitLabels[unit] || 'yrs'
      if (!Number.isNaN(numericAge)) {
        return `${numericAge} ${label}`
      }
      return `${ageValue} ${label}`
    }

    if (data?.date_of_birth) {
      const dob = new Date(data.date_of_birth)
      if (!Number.isNaN(dob.getTime())) {
        const today = new Date()
        let age = today.getFullYear() - dob.getFullYear()
        const monthDiff = today.getMonth() - dob.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age -= 1
        }
        if (age >= 0) {
          return `${age} yrs`
        }
      }
    }

    return 'N/A'
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <span className="text-sm font-medium text-gray-500">Patient Name</span>
          <p className="font-semibold mt-1">{data?.patient_name || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Date of Birth</span>
          <p className="mt-1">
            {data?.date_of_birth
              ? new Date(data.date_of_birth).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A'}
          </p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Age</span>
          <p className="mt-1">{renderAgeValue()}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Gender</span>
          <p className="mt-1">{data?.gender || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">ID Card Type</span>
          <p className="mt-1">{data?.id_card_type || 'N/A'}</p>
        </div>

        {data?.id_card_number && (
          <div>
            <span className="text-sm font-medium text-gray-500">ID Card Number</span>
            <p className="mt-1">{data.id_card_number}</p>
          </div>
        )}

        {data?.patient_contact_number && (
          <div>
            <span className="text-sm font-medium text-gray-500">Contact Number</span>
            <p className="mt-1">{data.patient_contact_number}</p>
          </div>
        )}

        {data?.patient_email_id && (
          <div>
            <span className="text-sm font-medium text-gray-500">Email ID</span>
            <p className="mt-1">{data.patient_email_id}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Beneficiary Type</span>
          <p className="mt-1">{data?.beneficiary_type || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Relationship</span>
          <p className="mt-1">{data?.relationship || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
