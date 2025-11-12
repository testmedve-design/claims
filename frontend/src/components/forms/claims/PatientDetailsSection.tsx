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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { ClaimFormValues } from '@/schemas/claimSchema'

interface PatientDetailsSectionProps {
  form: UseFormReturn<ClaimFormValues>
  watchedBeneficiaryType: string
}

export function PatientDetailsSection({ form, watchedBeneficiaryType }: PatientDetailsSectionProps) {

  const getRelationshipOptions = () => {
    if (watchedBeneficiaryType === 'SELF' || watchedBeneficiaryType === 'SELF (Individual Policy)') {
      return ['SELF']
    } else if (watchedBeneficiaryType === 'DEPENDANT') {
      return ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'OTHER']
    }
    return ['SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'OTHER']
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FormField
          control={form.control}
          name="patient_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter patient full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  placeholder="YYYY-MM-DD"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value
                    field.onChange(value)

                    if (!value) {
                      form.setValue('age', undefined, { shouldDirty: true, shouldTouch: true })
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Age</FormLabel>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={field.value ?? ''}
                      onChange={event => {
                        const raw = event.target.value
                        if (raw === '') {
                          field.onChange(undefined)
                          return
                        }
                        const parsed = Number(raw)
                        field.onChange(Number.isNaN(parsed) ? undefined : parsed)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="age_unit"
              render={({ field }) => (
                <FormItem className="w-[140px]">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Units" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAYS">Days</SelectItem>
                      <SelectItem value="MONTHS">Months</SelectItem>
                      <SelectItem value="YRS">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER/NA">Other/NA</SelectItem>
                  <SelectItem value="Not Available">Not Available</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="id_card_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Card Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select ID Card Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="AADHAR CARD">Aadhar Card</SelectItem>
                  <SelectItem value="VOTERS ID CARD">Voters ID Card</SelectItem>
                  <SelectItem value="PASSPORT">Passport</SelectItem>
                  <SelectItem value="PAN CARD">PAN Card</SelectItem>
                  <SelectItem value="RATION CARD">Ration Card</SelectItem>
                  <SelectItem value="EMPLOYEE ID CARD">Employee ID Card</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="id_card_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Card Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter ID card number" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="patient_contact_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+91-XXXXXXXXXX" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="patient_email_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email ID</FormLabel>
              <FormControl>
                <Input type="email" placeholder="patient@example.com" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="beneficiary_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beneficiary Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Beneficiary Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="SELF">Self</SelectItem>
                  <SelectItem value="DEPENDANT">Dependant</SelectItem>
                  <SelectItem value="SELF (Individual Policy)">Self (Individual Policy)</SelectItem>
                  <SelectItem value="Not Available">Not Available</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="relationship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Relationship <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!watchedBeneficiaryType}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Relationship" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getRelationshipOptions().map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!watchedBeneficiaryType && <FormDescription>Select beneficiary type first</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}