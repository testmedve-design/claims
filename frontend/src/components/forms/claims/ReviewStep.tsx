'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Edit2, User, CreditCard, Building2, Receipt, FileText } from 'lucide-react'
import type { ClaimFormValues } from '@/schemas/claimSchema'

interface ReviewStepProps {
  formData: ClaimFormValues
  onEditStep: (sectionId: string) => void
}

const CLAIM_TYPE_LABELS: Record<string, string> = {
  INPATIENT: 'Inpatient',
  DIALYSIS: 'Dialysis',
  KIMO: 'Kimo',
  OTHERS: 'Others',
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  FAMILY: 'Family',
  GROUP: 'Group',
  INDIVIDUAL: 'Individual',
}

const TREATMENT_LINE_LABELS: Record<string, string> = {
  MEDICAL: 'Medical',
  SURGICAL: 'Surgical',
  INTENSIVE_CARE: 'Intensive Care',
  NON_ALLOPATHY: 'Non Allopathy',
}

const AGE_UNIT_LABELS: Record<string, string> = {
  DAYS: 'days',
  MONTHS: 'months',
  YRS: 'yrs',
}

export function ReviewStep({ formData, onEditStep }: ReviewStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getFormattedAge = () => {
    const ageValue = formData.age

    if (ageValue !== undefined && ageValue !== null && ageValue !== '') {
      const label = AGE_UNIT_LABELS[formData.age_unit || 'YRS'] || 'yrs'
      const numericAge = Number(ageValue)
      if (!Number.isNaN(numericAge)) {
        return `${numericAge} ${label}`
      }
      return `${ageValue} ${label}`
    }

    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth)
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Review Your Claim</h2>
        <p className="text-muted-foreground">
          Please review all information before submitting. Click Edit to make changes.
        </p>
      </div>

      {/* Patient Details */}
      <Card className="glass-card border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Patient Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep('patient')}
            className="hover-lift"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <Separator className="opacity-30" />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient Name</p>
              <p className="font-medium">{formData.patient_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {formData.date_of_birth
                  ? new Date(formData.date_of_birth).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="font-medium">{getFormattedAge()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{formData.gender || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Number</p>
              <p className="font-medium">{formData.patient_contact_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID Card Type</p>
              <p className="font-medium">{formData.id_card_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID Card Number</p>
              <p className="font-medium">{formData.id_card_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Beneficiary Type</p>
              <p className="font-medium">{formData.beneficiary_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Relationship</p>
              <p className="font-medium">{formData.relationship || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payer Details */}
      <Card className="glass-card border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Payer Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep('payer')}
            className="hover-lift"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <Separator className="opacity-30" />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Payer Name</p>
              <p className="font-medium">{formData.payer_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payer Type</p>
              <Badge variant="secondary">{formData.payer_type || 'N/A'}</Badge>
            </div>
            {formData.payer_type === 'TPA' && (
              <div>
                <p className="text-sm text-muted-foreground">Insurer Name</p>
                <p className="font-medium">{formData.insurer_name || 'N/A'}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Payer Patient ID</p>
              <p className="font-medium">{formData.payer_patient_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Authorization Number</p>
              <p className="font-medium">{formData.authorization_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Authorized Amount</p>
              <p className="font-semibold text-lg text-primary">
                {formatCurrency(formData.total_authorized_amount || 0)}
              </p>
            </div>
            {formData.policy_number && (
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-medium">{formData.policy_number}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provider Details */}
      <Card className="glass-card border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Provider Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep('provider')}
            className="hover-lift"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <Separator className="opacity-30" />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient Registration Number</p>
              <p className="font-medium">{formData.patient_registration_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specialty</p>
              <p className="font-medium">{formData.specialty || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">{formData.doctor || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Treatment Line</p>
              <p className="font-medium">
                {TREATMENT_LINE_LABELS[formData.treatment_line] || formData.treatment_line || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Policy Type</p>
              <p className="font-medium">{POLICY_TYPE_LABELS[formData.policy_type] || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Claim Type</p>
              <Badge>{CLAIM_TYPE_LABELS[formData.claim_type] || 'N/A'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Period</p>
              <p className="font-medium">
                {formatDate(formData.service_start_date)} - {formatDate(formData.service_end_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inpatient Number</p>
              <p className="font-medium">{formData.inpatient_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ward Type</p>
              <p className="font-medium">{formData.ward_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Type</p>
              <p className="font-medium">{formData.admission_type || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Final Diagnosis</p>
              <p className="font-medium">{formData.final_diagnosis || 'N/A'}</p>
            </div>
            {formData.icd_10_code && (
              <div>
                <p className="text-sm text-muted-foreground">ICD-10 Code</p>
                <p className="font-medium">{formData.icd_10_code}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Treatment Done</p>
              <p className="font-medium">{formData.treatment_done || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Details */}
      <Card className="glass-card border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Bill Details</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditStep('bill')}
            className="hover-lift"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <Separator className="opacity-30" />
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Bill Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bill Number</p>
                <p className="font-medium">{formData.bill_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bill Date</p>
                <p className="font-medium">{formatDate(formData.bill_date)}</p>
              </div>
            </div>

            <Separator className="opacity-30" />

            {/* Bill Breakdown */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Bill Amount</span>
                <span className="font-medium">{formatCurrency(formData.total_bill_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="font-medium">{formatCurrency(formData.security_deposit || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Patient Discount</span>
                <span className="font-medium text-green-600">
                  - {formatCurrency(formData.patient_discount_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount Paid by Patient</span>
                <span className="font-medium">{formatCurrency(formData.amount_paid_by_patient || 0)}</span>
              </div>
              <Separator className="opacity-50" />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Patient Paid</span>
                <span className="font-semibold">{formatCurrency(formData.total_patient_paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Amount Charged to Payer</span>
                <span className="font-semibold">{formatCurrency(formData.amount_charged_to_payer || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">MOU Discount</span>
                <span className="font-medium text-green-600">
                  - {formatCurrency(formData.mou_discount_amount || 0)}
                </span>
              </div>
              <Separator className="opacity-50" />
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold text-lg">Claimed Amount</span>
                <span className="font-bold text-2xl text-primary">
                  {formatCurrency(formData.claimed_amount || 0)}
                </span>
              </div>
            </div>

            {formData.claim_type === 'DIALYSIS' && Array.isArray(formData.dialysis_bills) && formData.dialysis_bills.length > 0 && (
              <>
                <Separator className="opacity-30" />
                <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-blue-900">Dialysis Session Bills</p>
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      {formData.dialysis_bills.length} bills
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {formData.dialysis_bills.map((bill, index) => (
                      <div
                        key={`${bill.bill_number || 'bill'}-${bill.bill_date || index}`}
                        className="flex flex-col justify-between gap-2 rounded-lg bg-white p-3 shadow-sm sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            #{bill.bill_number || `Bill ${index + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {bill.bill_date ? formatDate(bill.bill_date) : 'No date provided'}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-blue-700">
                          {formatCurrency(Number(bill.bill_amount) || 0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Validation Check */}
            {formData.claimed_amount > formData.total_authorized_amount && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg flex items-start gap-2">
                <FileText className="w-5 h-5 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Warning: Claimed amount exceeds authorized amount</p>
                  <p className="text-xs mt-1">
                    Claimed: {formatCurrency(formData.claimed_amount || 0)} |
                    Authorized: {formatCurrency(formData.total_authorized_amount || 0)}
                  </p>
                </div>
              </div>
            )}

            {formData.submission_remarks && (
              <>
                <Separator className="opacity-30" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Submission Remarks</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{formData.submission_remarks}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Final Confirmation */}
      <Card className="glass-card border-0 shadow-none bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Ready to Submit?</p>
              <p className="text-sm text-muted-foreground">
                By clicking "Submit Claim", you confirm that all information provided is accurate and complete.
                The claim will be sent for processing and you will receive a confirmation with the Claim ID.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
