export interface ClaimFormData {
  // Patient Details
  patient_name: string
  patient_id: string
  date_of_birth: string
  age?: number
  age_unit?: 'DAYS' | 'MONTHS' | 'YRS'
  gender: string
  id_card_type: string
  id_card_number: string
  patient_contact_number: string
  patient_email_id: string
  beneficiary_type: string
  relationship: string
  
  // Payer Details
  payer_patient_id: string
  authorization_number: string
  total_authorized_amount: number
  payer_type: string
  payer_name: string
  insurer_name?: string
  policy_number?: string
  sponsorer_corporate_name?: string
  sponsorer_employee_id?: string
  sponsorer_employee_name?: string
  
  // Provider Details
  patient_registration_number: string
  doctor: string
  treatment_line: string
  policy_type: string
  claim_type: string
  service_start_date: string
  service_end_date: string
  inpatient_number: string
  admission_type: string
  hospitalization_type: string
  ward_type: string
  final_diagnosis: string
  icd_10_code: string
  treatment_done: string
  pcs_code: string
  
  // Bill Details
  bill_number: string
  bill_date: string
  security_deposit: number
  total_bill_amount: number
  patient_discount_amount: number
  amount_paid_by_patient: number
  total_patient_paid_amount: number
  amount_charged_to_payer: number
  mou_discount_amount: number
  claimed_amount: number
  submission_remarks: string
  
  // Legacy fields (for backward compatibility)
  admission_date: string
  discharge_date: string
  diagnosis: string
  treatment: string
  total_amount: number
  specialty: string
  documents: Array<{
    id: string
    name: string
    required: boolean
    uploaded: boolean
    file?: File
  }>
}

export interface Specialty {
  specialty_id: string
  specialty_name: string
  description?: string
  status?: string
}

export interface Payer {
  payer_id: string
  payer_name: string
  payer_type?: string
  description?: string
  status?: string
  contact_info?: {
    phone?: string
    email?: string
    website?: string
  }
}

export interface Insurer {
  insurer_id: string
  insurer_name: string
  description?: string
  status?: string
}

export interface Doctor {
  doctor_id: string
  doctor_name: string
  specialty?: string
  qualification?: string
  experience_years?: number
  hospital_id?: string
  hospital_name?: string
  status?: string
}

export interface Ward {
  ward_type_id: string
  ward_type_name: string
  description?: string
  status?: string
}

export interface ChecklistItem {
  id: string
  name: string
  description: string
  required: boolean
}

export interface ChecklistResponse {
  success: boolean
  checklist: ChecklistItem[]
  payer_name: string
  specialty: string
  is_default: boolean
}