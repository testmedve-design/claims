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
import { Textarea } from '@/components/ui/textarea'
import type { ClaimFormValues } from '@/schemas/claimSchema'

interface BillDetailsSectionProps {
  form: UseFormReturn<ClaimFormValues>
}

export function BillDetailsSection({ form }: BillDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <FormField
          control={form.control}
          name="bill_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="Enter bill number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bill_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill Date <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="security_deposit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Security Deposit</FormLabel>
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
          name="total_bill_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Bill Amount <span className="text-destructive">*</span></FormLabel>
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
          name="patient_discount_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient Discount</FormLabel>
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
          name="amount_paid_by_patient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Paid By Patient</FormLabel>
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
          name="total_patient_paid_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Patient Paid</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>Auto: Patient Discount + Amount Paid By Patient</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount_charged_to_payer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Charged to Payer</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>Auto: Total Bill - Total Patient Paid</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mou_discount_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MOU Discount</FormLabel>
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
          name="claimed_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Claimed Amount <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>Auto: Amount Charged to Payer - MOU Discount</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="submission_remarks"
          render={({ field }) => (
            <FormItem className="col-span-full">
              <FormLabel>Submission Remarks</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter any additional remarks..." 
                  rows={4}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}