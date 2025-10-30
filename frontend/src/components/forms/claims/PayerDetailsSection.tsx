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
import type { Payer, Insurer } from '@/types/claims'
import type { ClaimFormValues } from '@/schemas/claimSchema'

interface PayerDetailsSectionProps {
  form: UseFormReturn<ClaimFormValues>
  payers: Payer[]
  insurers: Insurer[]
  watchedPayerType: string
  loadingData: boolean
}

export function PayerDetailsSection({ 
  form, 
  payers, 
  insurers, 
  watchedPayerType, 
  loadingData 
}: PayerDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FormField
          control={form.control}
          name="payer_patient_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payer Patient ID <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter payer patient ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="authorization_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authorization Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter authorization number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="total_authorized_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Authorized Amount <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payer_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payer Type <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select Payer Type" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INSURANCE COMPANY">Insurance Company</SelectItem>
                  <SelectItem value="CORPORATE">Corporate</SelectItem>
                  <SelectItem value="TPA">TPA</SelectItem>
                  <SelectItem value="STATE GOVERNMENT">State Government</SelectItem>
                  <SelectItem value="CENTRAL GOVERNMENT">Central Government</SelectItem>
                  <SelectItem value="INTERNATIONAL">International</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payer Name <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={loadingData || !watchedPayerType}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={!watchedPayerType ? "Select payer type first" : loadingData ? "Loading payers..." : "Select Payer"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {payers
                    .filter(p => {
                      if (!watchedPayerType) return true
                      const payerType = p.payer_type?.toUpperCase() || ''
                      const selectedType = watchedPayerType.toUpperCase()
                      return payerType === selectedType || payerType.includes(selectedType)
                    })
                    .map((payer, index) => (
                      <SelectItem key={`${payer.payer_id}-${index}`} value={payer.payer_name || payer.payer_id}>
                        {payer.payer_name || payer.payer_id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!watchedPayerType && <FormDescription>Select payer type first</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedPayerType === 'TPA' && (
          <FormField
            control={form.control}
            name="insurer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurer Name <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''} disabled={loadingData}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingData ? "Loading insurers..." : "Select Insurer"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {insurers.map((insurer, index) => (
                      <SelectItem key={`${insurer.insurer_id}-${index}`} value={insurer.insurer_name}>
                        {insurer.insurer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-destructive">Required for TPA payer type</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="policy_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter policy number" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sponsorer_corporate_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corporate Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter corporate name" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sponsorer_employee_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter employee ID" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sponsorer_employee_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter employee name" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}