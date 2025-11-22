'use client'

import { UseFormReturn, useFieldArray } from 'react-hook-form'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import type { ClaimFormValues } from '@/schemas/claimSchema'
import { useEffect, useMemo } from 'react'

interface BillDetailsSectionProps {
  form: UseFormReturn<ClaimFormValues>
}

export function BillDetailsSection({ form }: BillDetailsSectionProps) {
  const claimType = form.watch('claim_type')
  const dialysisBills = form.watch('dialysis_bills')

  const {
    fields: dialysisBillFields,
    append: appendDialysisBill,
    remove: removeDialysisBill,
  } = useFieldArray({
    control: form.control,
    name: 'dialysis_bills',
  })

  useEffect(() => {
    if (claimType !== 'DIALYSIS' && Array.isArray(dialysisBills) && dialysisBills.length > 0) {
      form.setValue('dialysis_bills', [])
    }
  }, [claimType, dialysisBills, form])

  useEffect(() => {
    if (claimType === 'DIALYSIS' && dialysisBillFields.length === 0) {
      appendDialysisBill({
        bill_number: '',
        bill_date: '',
        bill_amount: 0,
      })
    }
  }, [claimType, dialysisBillFields.length, appendDialysisBill])

  const dialysisTotal = useMemo(() => {
    if (!Array.isArray(dialysisBills)) return 0
    return dialysisBills.reduce((sum, bill) => {
      const amount = Number(bill?.bill_amount) || 0
      return sum + amount
    }, 0)
  }, [dialysisBills])

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
                  readOnly={claimType === 'DIALYSIS'}
                  className={claimType === 'DIALYSIS' ? 'bg-muted/50 cursor-not-allowed' : undefined}
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
              <FormLabel>
                Claimed Amount <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  readOnly={claimType === 'DIALYSIS'}
                  className={claimType === 'DIALYSIS' ? 'bg-muted/50 cursor-not-allowed' : undefined}
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

      {claimType === 'DIALYSIS' && (
        <div className="space-y-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-base font-semibold text-blue-900">Dialysis Session Bills</h4>
              <p className="text-sm text-blue-800/80">
                Add each dialysis session bill with its number, date, and amount. The total will auto-update.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendDialysisBill({
                  bill_number: '',
                  bill_date: '',
                  bill_amount: 0,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Bill
            </Button>
          </div>

          <div className="space-y-4">
            {dialysisBillFields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 rounded-lg border border-blue-100 bg-white p-4 shadow-sm sm:grid-cols-6"
              >
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`dialysis_bills.${index}.bill_number`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter bill number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`dialysis_bills.${index}.bill_date`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name={`dialysis_bills.${index}.bill_amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="sm:col-span-6 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDialysisBill(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={dialysisBillFields.length === 1}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md bg-blue-100/80 px-4 py-3">
            <span className="text-sm font-medium text-blue-900">Dialysis Bills Total</span>
            <Badge variant="secondary" className="bg-blue-600 text-white">
              ₹{dialysisTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}