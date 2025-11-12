'use client'

interface ProviderDetailsDisplayProps {
  data: any
  hospitalName?: string
}

export function ProviderDetailsDisplay({ data, hospitalName }: ProviderDetailsDisplayProps) {
  const claimTypeLabels: Record<string, string> = {
    INPATIENT: 'Inpatient',
    DIALYSIS: 'Dialysis',
    KIMO: 'Kimo',
    OTHERS: 'Others',
  }

  const policyTypeLabels: Record<string, string> = {
    FAMILY: 'Family',
    GROUP: 'Group',
    INDIVIDUAL: 'Individual',
  }

  const treatmentLineLabels: Record<string, string> = {
    MEDICAL: 'Medical',
    SURGICAL: 'Surgical',
    INTENSIVE_CARE: 'Intensive Care',
    NON_ALLOPATHY: 'Non Allopathy',
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {hospitalName && (
          <div>
            <span className="text-sm font-medium text-gray-500">Hospital</span>
            <p className="mt-1 font-semibold">{hospitalName}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Registration Number</span>
          <p className="mt-1">{data?.patient_registration_number || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Specialty</span>
          <p className="mt-1">{data?.specialty || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Doctor</span>
          <p className="mt-1">{data?.doctor || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Policy Type</span>
          <p className="mt-1">{policyTypeLabels[data?.policy_type] || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Treatment Line</span>
          <p className="mt-1">{treatmentLineLabels[data?.treatment_line] || data?.treatment_line || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Claim Type</span>
          <p className="mt-1">{claimTypeLabels[data?.claim_type] || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Service Start Date</span>
          <p className="mt-1">
            {data?.service_start_date
              ? new Date(data.service_start_date).toLocaleDateString('en-IN')
              : 'N/A'}
          </p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Service End Date</span>
          <p className="mt-1">
            {data?.service_end_date
              ? new Date(data.service_end_date).toLocaleDateString('en-IN')
              : 'N/A'}
          </p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">InPatient Number</span>
          <p className="mt-1">{data?.inpatient_number || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Admission Type</span>
          <p className="mt-1">{data?.admission_type || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Hospitalization Type</span>
          <p className="mt-1">{data?.hospitalization_type || 'N/A'}</p>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Ward Type</span>
          <p className="mt-1">{data?.ward_type || 'N/A'}</p>
        </div>

        <div className="col-span-full">
          <span className="text-sm font-medium text-gray-500">Final Diagnosis</span>
          <p className="mt-1">{data?.final_diagnosis || 'N/A'}</p>
        </div>

        {data?.icd_10_code && (
          <div>
            <span className="text-sm font-medium text-gray-500">ICD 10 Code</span>
            <p className="mt-1">{data.icd_10_code}</p>
          </div>
        )}

        <div className="col-span-full">
          <span className="text-sm font-medium text-gray-500">Treatment Done</span>
          <p className="mt-1">{data?.treatment_done || 'N/A'}</p>
        </div>

        {data?.pcs_code && (
          <div>
            <span className="text-sm font-medium text-gray-500">PCS Code</span>
            <p className="mt-1">{data.pcs_code}</p>
          </div>
        )}
      </div>
    </div>
  )
}
