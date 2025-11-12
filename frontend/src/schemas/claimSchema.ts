import * as z from 'zod'

const dialysisBillSchema = z.object({
  bill_number: z.string().min(1, 'Bill number is required'),
  bill_date: z.string().min(1, 'Bill date is required'),
  bill_amount: z.coerce.number().min(0, 'Bill amount must be 0 or greater'),
})

// Zod schema for claim form validation
export const claimFormSchema = z.object({
  // Patient Details
  patient_name: z.string().min(2, 'Patient name must be at least 2 characters'),
  patient_id: z.string().optional(),
  date_of_birth: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
      z.literal('')
    ])
    .optional(),
  age: z
    .number()
    .min(0, 'Age must be 0 or greater')
    .optional(),
  age_unit: z.enum(['DAYS', 'MONTHS', 'YRS']).optional(),
  gender: z.string().min(1, 'Gender is required'),
  id_card_type: z.string().min(1, 'ID card type is required'),
  id_card_number: z.string().optional(),
  patient_contact_number: z.string().optional(),
  patient_email_id: z.string().email('Invalid email address').optional().or(z.literal('')),
  beneficiary_type: z.string().min(1, 'Beneficiary type is required'),
  relationship: z.string().min(1, 'Relationship is required'),

  // Payer Details
  payer_patient_id: z.string().min(1, 'Payer patient ID is required'),
  authorization_number: z.string().min(1, 'Authorization number is required'),
  total_authorized_amount: z.coerce.number().min(0, 'Total authorized amount must be 0 or greater'),
  payer_type: z.string().min(1, 'Payer type is required'),
  payer_name: z.string().min(1, 'Payer name is required'),
  insurer_name: z.string().optional(),
  policy_number: z.string().optional(),
  sponsorer_corporate_name: z.string().optional(),
  sponsorer_employee_id: z.string().optional(),
  sponsorer_employee_name: z.string().optional(),

  // Provider Details
  patient_registration_number: z.string().min(1, 'Registration number is required'),
  specialty: z.string().min(1, 'Specialty is required'),
  doctor: z.string().min(1, 'Doctor is required'),
  treatment_line: z.string().min(1, 'Treatment line is required'),
  policy_type: z.enum(['FAMILY', 'GROUP', 'INDIVIDUAL']),
  claim_type: z.enum(['INPATIENT', 'DIALYSIS', 'KIMO', 'OTHERS']),
  service_start_date: z.string().min(1, 'Service start date is required'),
  service_end_date: z.string().min(1, 'Service end date is required'),
  inpatient_number: z.string().min(1, 'Inpatient number is required'),
  admission_type: z.string().min(1, 'Admission type is required'),
  hospitalization_type: z.string().min(1, 'Hospitalization type is required'),
  ward_type: z.string().min(1, 'Ward type is required'),
  final_diagnosis: z.string().min(1, 'Final diagnosis is required'),
  icd_10_code: z.string().optional(),
  treatment_done: z.string().min(1, 'Treatment done is required'),
  pcs_code: z.string().optional(),

  // Bill Details
  bill_number: z.string().min(1, 'Bill number is required'),
  bill_date: z.string().min(1, 'Bill date is required'),
  security_deposit: z.coerce.number().min(0, 'Security deposit must be 0 or greater'),
  total_bill_amount: z.coerce.number().min(0, 'Total bill amount must be 0 or greater'),
  patient_discount_amount: z.coerce.number().min(0, 'Patient discount must be 0 or greater'),
  amount_paid_by_patient: z.coerce.number().min(0, 'Amount paid by patient must be 0 or greater'),
  total_patient_paid_amount: z.coerce.number().min(0, 'Total patient paid amount must be 0 or greater'),
  amount_charged_to_payer: z.coerce.number().min(0, 'Amount charged to payer must be 0 or greater'),
  mou_discount_amount: z.coerce.number().min(0, 'MOU discount must be 0 or greater'),
  claimed_amount: z.coerce.number().min(0, 'Claimed amount must be 0 or greater'),
  submission_remarks: z.string().optional(),

  // Legacy fields
  admission_date: z.string().optional(),
  discharge_date: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  total_amount: z.coerce.number().optional(),
  documents: z.array(z.any()).optional(),
  dialysis_bills: z.array(dialysisBillSchema).default([]),
}).refine((data) => {
  // Validation: Claimed Amount should not exceed Total Authorized Amount
  return data.claimed_amount <= data.total_authorized_amount
}, {
  message: 'Claimed amount cannot exceed total authorized amount',
  path: ['claimed_amount'],
}).refine((data) => {
  // Validation: Insurer name required when payer_type is TPA
  if (data.payer_type === 'TPA') {
    return !!data.insurer_name && data.insurer_name.length > 0
  }
  return true
}, {
  message: 'Insurer name is required for TPA payer type',
  path: ['insurer_name'],
}).refine((data) => {
  const hasDob = typeof data.date_of_birth === 'string' && data.date_of_birth.trim() !== ''
  const hasAge = typeof data.age === 'number' && !Number.isNaN(data.age)
  return hasDob || hasAge
}, {
  message: 'Either date of birth or age is required',
  path: ['date_of_birth'],
}).refine((data) => {
  if (typeof data.age === 'number' && !Number.isNaN(data.age)) {
    return !!data.age_unit
  }
  return true
}, {
  message: 'Age unit is required when age is provided',
  path: ['age_unit'],
}).refine((data) => {
  if (data.claim_type === 'DIALYSIS') {
    return Array.isArray(data.dialysis_bills) && data.dialysis_bills.length > 0
  }
  return true
}, {
  message: 'Add at least one dialysis bill entry',
  path: ['dialysis_bills'],
})

export type ClaimFormValues = z.infer<typeof claimFormSchema>

// Default values for the form
export const defaultClaimFormValues: ClaimFormValues = {
  // Patient Details
  patient_name: '',
  patient_id: '',
  date_of_birth: '',
  age: undefined,
  age_unit: 'YRS',
  gender: '',
  id_card_type: '',
  id_card_number: '',
  patient_contact_number: '',
  patient_email_id: '',
  beneficiary_type: '',
  relationship: '',

  // Payer Details
  payer_patient_id: '',
  authorization_number: '',
  total_authorized_amount: 0,
  payer_type: '',
  payer_name: '',
  insurer_name: '',
  policy_number: '',
  sponsorer_corporate_name: '',
  sponsorer_employee_id: '',
  sponsorer_employee_name: '',

  // Provider Details
  patient_registration_number: '',
  specialty: '',
  doctor: '',
  treatment_line: '',
  policy_type: 'FAMILY',
  claim_type: 'INPATIENT',
  service_start_date: '',
  service_end_date: '',
  inpatient_number: '',
  admission_type: '',
  hospitalization_type: '',
  ward_type: '',
  final_diagnosis: '',
  icd_10_code: '',
  treatment_done: '',
  pcs_code: '',

  // Bill Details
  bill_number: '',
  bill_date: '',
  security_deposit: 0,
  total_bill_amount: 0,
  patient_discount_amount: 0,
  amount_paid_by_patient: 0,
  total_patient_paid_amount: 0,
  amount_charged_to_payer: 0,
  mou_discount_amount: 0,
  claimed_amount: 0,
  submission_remarks: '',

  // Legacy fields
  admission_date: '',
  discharge_date: '',
  diagnosis: '',
  treatment: '',
  total_amount: 0,
  documents: [],
  dialysis_bills: []
}
