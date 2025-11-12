'use client'

import { UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Specialty, Doctor, Ward } from '@/types/claims'
import type { ClaimFormValues } from '@/schemas/claimSchema'

interface ProviderDetailsSectionProps {
  form: UseFormReturn<ClaimFormValues>
  specialties: Specialty[]
  doctors: Doctor[]
  wards: Ward[]
  watchedSpecialty: string
  loadingData: boolean
  onFetchDoctors: (specialty: string) => void
}

export function ProviderDetailsSection({
  form,
  specialties,
  doctors,
  wards,
  watchedSpecialty,
  loadingData,
  onFetchDoctors,
}: ProviderDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FormField
          control={form.control}
          name="patient_registration_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter registration number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="specialty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialty <span className="text-destructive">*</span></FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue('doctor', '')
                  onFetchDoctors(value)
                }} 
                value={field.value}
                disabled={loadingData}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Loading specialties..." : "Select Specialty"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {specialties.map((spec, index) => (
                    <SelectItem key={`${spec.specialty_id}-${index}`} value={spec.specialty_name}>
                      {spec.specialty_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doctor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Doctor <span className="text-destructive">*</span></FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!watchedSpecialty || doctors.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!watchedSpecialty ? "Select specialty first" : doctors.length === 0 ? "No doctors available" : "Select Doctor"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {doctors.map((doc, index) => (
                    <SelectItem key={`${doc.doctor_id}-${index}`} value={doc.doctor_name}>
                      {doc.doctor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!watchedSpecialty && <FormDescription>Select specialty first</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="treatment_line"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treatment Line <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Treatment Line" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MEDICAL">Medical</SelectItem>
                  <SelectItem value="SURGICAL">Surgical</SelectItem>
                  <SelectItem value="INTENSIVE_CARE">Intensive Care</SelectItem>
                  <SelectItem value="NON_ALLOPATHY">Non Allopathy</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="policy_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Policy Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="FAMILY">Family</SelectItem>
                  <SelectItem value="GROUP">Group</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="claim_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Claim Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INPATIENT">Inpatient</SelectItem>
                  <SelectItem value="DIALYSIS">Dialysis</SelectItem>
                  <SelectItem value="KIMO">Kimo</SelectItem>
                  <SelectItem value="OTHERS">Others</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Start Date <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="service_end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service End Date <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inpatient_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>InPatient Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter inpatient number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="admission_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admission Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Admission Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="CASHLESS">Cashless</SelectItem>
                  <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hospitalization_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospitalization Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DAYCARE">Daycare</SelectItem>
                  <SelectItem value="NON DAYCARE">Non Daycare</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ward_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ward Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Loading wards..." : "Select Ward Type"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {wards.map((ward, index) => (
                    <SelectItem key={`${ward.ward_type_id}-${index}`} value={ward.ward_type_name}>
                      {ward.ward_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="final_diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Diagnosis <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter final diagnosis" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icd_10_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ICD 10 Code</FormLabel>
              <FormControl>
                <Input placeholder="e.g., I21.9" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="treatment_done"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Treatment Done <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter treatment done" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pcs_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PCS Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter PCS code" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}