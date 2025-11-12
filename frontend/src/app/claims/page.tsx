'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/components/ui/form'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { claimsApi } from '@/services/claimsApi'
import type { Specialty, Doctor, Payer, Insurer, Ward } from '@/types/claims'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import DocumentChecklist from '@/components/forms/DocumentChecklist'
import { claimFormSchema, defaultClaimFormValues, type ClaimFormValues } from '@/schemas/claimSchema'

// Import the modular form section components
import { PatientDetailsSection } from '@/components/forms/claims/PatientDetailsSection'
import { PayerDetailsSection } from '@/components/forms/claims/PayerDetailsSection'
import { ProviderDetailsSection } from '@/components/forms/claims/ProviderDetailsSection'
import { BillDetailsSection } from '@/components/forms/claims/BillDetailsSection'
import { DocumentDisplay } from '@/components/forms/claims/DocumentDisplay'
import { DocumentUpload } from '@/components/forms/claims/DocumentUpload'
import { PageHeader } from '@/components/forms/claims/PageHeader'
import { ReviewStep } from '@/components/forms/claims/ReviewStep'

import { CheckCircle2, AlertCircle, UserCircle, CreditCard, Building2, Receipt, FileCheck } from 'lucide-react'
import { API_BASE_URL } from '@/lib/apiConfig'

export default function ClaimsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)

  // Accordion state - allow multiple sections to be open
  const [openAccordion, setOpenAccordion] = useState<string[]>(['patient'])

  // Initialize React Hook Form with Zod validation
  const form = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema) as any,
    defaultValues: defaultClaimFormValues,
    mode: 'onChange',
  })
  
  // Dynamic data states
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [insurers, setInsurers] = useState<Insurer[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Document checklist states
  const [showDocumentChecklist, setShowDocumentChecklist] = useState(false)
  const [checklistComplete, setChecklistComplete] = useState(true)
  const [checklistMeta, setChecklistMeta] = useState({
    requiredCount: 0,
    checkedRequiredCount: 0,
    totalCount: 0,
    hasChecklist: false
  })
  const [checklistDocuments, setChecklistDocuments] = useState<any[]>([])
  const [manualDocuments, setManualDocuments] = useState<any[]>([])

  const combinedDocuments = useMemo(() => {
    const mergeMap = new Map<string, any>()
    const makeKey = (doc: any) =>
      doc.document_id || doc.id || `${doc.document_type}-${doc.document_name || ''}`

    checklistDocuments.forEach(doc => {
      mergeMap.set(makeKey(doc), doc)
    })
    manualDocuments.forEach(doc => {
      mergeMap.set(makeKey(doc), doc)
    })

    return Array.from(mergeMap.values())
  }, [checklistDocuments, manualDocuments])

  const handleChecklistMetaChange = useCallback((meta: typeof checklistMeta) => {
    setChecklistMeta(meta)
    if (meta.requiredCount === 0) {
      setChecklistComplete(true)
    }
  }, [])
  
  // Get hospital ID from logged-in user
  const hospitalId = (user as any)?.entity_assignments?.hospitals?.[0]?.id || null

  // Check if user has access to claims page
  useEffect(() => {
    if (user) {
      if (user.role === 'claim_processor' || (user.role as string) === 'claim_processor_l4') {
        router.push('/processor-inbox')
      }
    }
  }, [user, router])

  // Check if we're editing an existing draft
  useEffect(() => {
    const draftId = searchParams.get('draft_id')
    if (draftId) {
      setEditingDraftId(draftId)
      setIsEditingDraft(true)
      loadDraftForEditing(draftId)
    }
  }, [searchParams])

  // Fetch initial data when user is loaded
  useEffect(() => {
    if (user) {
      fetchInitialData()
      const draftId = searchParams.get('draft')
      if (draftId) {
        loadDraft(draftId)
      }
    }
  }, [user, hospitalId, searchParams])

  // Watch form values for reactive updates
  const watchedSpecialty = form.watch('specialty')
  const watchedPayerType = form.watch('payer_type')
  const watchedPayerName = form.watch('payer_name')
  const watchedBeneficiaryType = form.watch('beneficiary_type')
  const watchedDateOfBirth = form.watch('date_of_birth')
  const watchedAge = form.watch('age')
  const watchedAgeUnit = form.watch('age_unit')
  const watchedTotalBill = form.watch('total_bill_amount')
  const watchedPatientDiscount = form.watch('patient_discount_amount')
  const watchedAmountPaidByPatient = form.watch('amount_paid_by_patient')
  const watchedTotalPatientPaid = form.watch('total_patient_paid_amount')
  const watchedAmountChargedToPayer = form.watch('amount_charged_to_payer')
  const watchedMouDiscount = form.watch('mou_discount_amount')

  // Fetch doctors when specialty changes
  useEffect(() => {
    if (watchedSpecialty) {
      fetchDoctorsBySpecialty(watchedSpecialty)
      form.setValue('doctor', '')
    }
  }, [watchedSpecialty])

  const calculateAgeDetails = (dob?: string | null) => {
    if (!dob) return undefined
    const dobDate = new Date(dob)
    if (Number.isNaN(dobDate.getTime())) return undefined
    const today = new Date()

    if (dobDate > today) {
      return { value: 0, unit: 'DAYS' as const }
    }

    const diffMs = today.getTime() - dobDate.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays < 30) {
      return { value: diffDays, unit: 'DAYS' as const }
    }

    let years = today.getFullYear() - dobDate.getFullYear()
    let months = today.getMonth() - dobDate.getMonth()
    const days = today.getDate() - dobDate.getDate()

    if (days < 0) {
      months -= 1
    }

    if (months < 0) {
      years -= 1
      months += 12
    }

    if (years <= 0) {
      if (months > 0) {
        return { value: months, unit: 'MONTHS' as const }
      }
      return { value: diffDays, unit: 'DAYS' as const }
    }

    return { value: years, unit: 'YRS' as const }
  }

  const resolveAgeDetails = (values: Pick<ClaimFormValues, 'age' | 'age_unit' | 'date_of_birth'>) => {
    if (typeof values.age === 'number' && !Number.isNaN(values.age)) {
      const unit = values.age_unit && ['DAYS', 'MONTHS', 'YRS'].includes(values.age_unit)
        ? values.age_unit
        : 'YRS'
      return { value: values.age, unit: unit as 'DAYS' | 'MONTHS' | 'YRS' }
    }
    return calculateAgeDetails(values.date_of_birth)
  }

  const calculateDobFromAge = (age?: number | null, unit?: string | null) => {
    if (age === undefined || age === null || Number.isNaN(age)) return undefined
    const ageInt = Math.max(0, Math.floor(age))

    const today = new Date()
    const dob = new Date(today)

    switch (unit) {
      case 'DAYS':
        dob.setDate(dob.getDate() - ageInt)
        break
      case 'MONTHS': {
        dob.setMonth(dob.getMonth() - ageInt)
        break
      }
      case 'YRS':
      default:
        dob.setFullYear(dob.getFullYear() - ageInt)
        break
    }

    const year = dob.getFullYear()
    const month = String(dob.getMonth() + 1).padStart(2, '0')
    const day = String(dob.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    if (!watchedDateOfBirth) return
    const ageDetails = calculateAgeDetails(watchedDateOfBirth)
    if (!ageDetails) return

    const currentAge = form.getValues('age')
    const currentUnit = form.getValues('age_unit')

    if (ageDetails.value !== currentAge) {
      form.setValue('age', ageDetails.value, { shouldDirty: true, shouldTouch: true })
    }
    if (ageDetails.unit !== currentUnit) {
      form.setValue('age_unit', ageDetails.unit, { shouldDirty: true, shouldTouch: true })
    }
  }, [watchedDateOfBirth, form])

  useEffect(() => {
    const hasDob = typeof watchedDateOfBirth === 'string' && watchedDateOfBirth.trim() !== ''
    if (hasDob) return
    if (typeof watchedAge !== 'number' || Number.isNaN(watchedAge) || watchedAge < 0) return

    const dob = calculateDobFromAge(watchedAge, watchedAgeUnit || 'YRS')
    if (dob && dob !== watchedDateOfBirth) {
      form.setValue('date_of_birth', dob, { shouldDirty: true, shouldTouch: true })
    }
  }, [watchedAge, watchedAgeUnit, watchedDateOfBirth, form])

  // Auto-calculate bill amounts
  useEffect(() => {
    const totalPatientPaid = (watchedPatientDiscount || 0) + (watchedAmountPaidByPatient || 0)
    form.setValue('total_patient_paid_amount', totalPatientPaid)
  }, [watchedPatientDiscount, watchedAmountPaidByPatient])

  useEffect(() => {
    const amountChargedToPayer = (watchedTotalBill || 0) - (watchedTotalPatientPaid || 0)
    form.setValue('amount_charged_to_payer', amountChargedToPayer)
  }, [watchedTotalBill, watchedTotalPatientPaid])

  useEffect(() => {
    const claimedAmount = (watchedAmountChargedToPayer || 0) - (watchedMouDiscount || 0)
    form.setValue('claimed_amount', claimedAmount)
  }, [watchedAmountChargedToPayer, watchedMouDiscount])

  useEffect(() => {
    if (watchedPayerType && watchedPayerType !== 'TPA') {
      form.setValue('insurer_name', '')
    }
  }, [watchedPayerType])

  useEffect(() => {
    if (watchedPayerName) {
      setShowDocumentChecklist(true)
    }
  }, [watchedPayerName])

  useEffect(() => {
    if (watchedBeneficiaryType) {
      form.setValue('relationship', '')
    }
  }, [watchedBeneficiaryType])

  // Stepper navigation handlers
  const handleNext = async () => {
    // No validation needed for accordion - users can fill at their own pace
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevious = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleStepChange = (step: string) => {
    setOpenAccordion((prev) => {
      if (prev.includes(step)) {
        return prev.filter((s) => s !== step)
      } else {
        return [...prev, step]
      }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canProceedToNext = () => {
    return !form.formState.isSubmitting
  }

  const fetchInitialData = async () => {
    try {
      setLoadingData(true)
      
      if (!hospitalId) {
        toast({
          title: "Error",
          description: 'No hospital assigned. Please contact administrator.',
          variant: "destructive"
        })
        setLoadingData(false)
        return
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
      
      const [specialtiesRes, payersRes, insurersRes, wardsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/resources/specialties?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/resources/payers?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/resources/insurers?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/resources/ward-types`, { headers })
      ])

      if (!specialtiesRes.ok || !payersRes.ok || !insurersRes.ok || !wardsRes.ok) {
        throw new Error('One or more API calls failed')
      }

      const specialtiesData = await specialtiesRes.json()
      const payersData = await payersRes.json()
      const insurersData = await insurersRes.json()
      const wardsData = await wardsRes.json()

      if (specialtiesData.success) setSpecialties(specialtiesData.specialties || [])
      if (payersData.success) setPayers(payersData.payers || [])
      if (insurersData.success) setInsurers(insurersData.insurers || [])
      
      if (wardsData.success) {
        const normalizedWards = (wardsData.ward_types || []).map((ward: any) => ({
          ward_type_id: ward.ward_type_id || ward.ward_id,
          ward_type_name: ward.ward_type_name || ward.ward_name,
          description: ward.description || '',
          hospital_id: ward.hospital_id || '',
          hospital_name: ward.hospital_name || ''
        }))
        
        const uniqueWards = normalizedWards.filter((ward: Ward, index: number, self: Ward[]) => 
          index === self.findIndex((w: Ward) => w.ward_type_name === ward.ward_type_name)
        )
        
        setWards(uniqueWards)
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast({
        title: "Error",
        description: 'Failed to load form data',
        variant: "destructive"
      })
    } finally {
      setLoadingData(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    try {
      setLoadingDraft(true)

      const response = await fetch(`${API_BASE_URL}/v1/drafts/get-draft/${draftId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to load draft')

      const data = await response.json()

      if (data.success && data.draft) {
        const draftFormData = data.draft.form_data
        form.reset({
          ...defaultClaimFormValues,
          ...draftFormData,
          date_of_birth: draftFormData?.date_of_birth || '',
          age_unit: draftFormData?.age_unit || defaultClaimFormValues.age_unit,
          policy_type: draftFormData?.policy_type || defaultClaimFormValues.policy_type,
        })

        toast({
          title: "Success",
          description: `Draft loaded for patient: ${draftFormData.patient_name || 'N/A'}`
        })
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      toast({
        title: "Error",
        description: 'Failed to load draft',
        variant: "destructive"
      })
    } finally {
      setLoadingDraft(false)
    }
  }

  const fetchDoctorsBySpecialty = async (specialty: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
      
      const response = await fetch(
        `${API_BASE_URL}/resources/doctors?hospital_id=${hospitalId}&specialty=${encodeURIComponent(specialty)}`,
        { headers }
      )
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()

      if (data.success) {
        setDoctors(data.doctors || [])
      } else {
        toast({
          title: "Error",
          description: 'Failed to load doctors',
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast({
        title: "Error",
        description: 'Failed to load doctors',
        variant: "destructive"
      })
      setDoctors([])
    }
  }

  const loadDraftForEditing = async (draftId: string) => {
    try {
      setLoadingDraft(true)

      const response = await fetch(`${API_BASE_URL}/v1/drafts/get-draft/${draftId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.draft) {
          const draftData = data.draft.form_data || {}
          const documents = data.draft.documents || []

          form.reset({
            ...defaultClaimFormValues,
            ...draftData,
            date_of_birth: draftData?.date_of_birth || '',
            age_unit: draftData?.age_unit || defaultClaimFormValues.age_unit,
            policy_type: draftData?.policy_type || defaultClaimFormValues.policy_type,
            documents: documents
          })

          if (draftData.payer_name) {
            setShowDocumentChecklist(true)
          }

          toast({
            title: "Success",
            description: `Resuming: ${draftData.patient_name || 'Untitled Draft'}`
          })
        }
      } else {
        throw new Error('Failed to load draft')
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      toast({
        title: "Error",
        description: 'Failed to load draft for editing',
        variant: "destructive"
      })
    } finally {
      setLoadingDraft(false)
    }
  }

  const handleSaveDraft = async () => {
    if (form.formState.isSubmitting) return

    const formValues = form.getValues()
    const ageDetails = resolveAgeDetails(formValues)
    const normalizedFormValues = {
      ...formValues,
      age: ageDetails?.value ?? undefined,
      age_unit: ageDetails?.unit ?? formValues.age_unit ?? defaultClaimFormValues.age_unit,
    }

    const currentDataHash = JSON.stringify({
      patient_name: normalizedFormValues.patient_name,
      specialty: normalizedFormValues.specialty,
      total_bill_amount: normalizedFormValues.total_bill_amount
    })

    const lastSaveHash = localStorage.getItem('lastDraftSaveHash')
    const lastSaveTime = localStorage.getItem('lastDraftSaveTime')
    const now = Date.now()

    if (lastSaveHash === currentDataHash && lastSaveTime && (now - parseInt(lastSaveTime)) < 5000) {
      toast({
        title: "Error",
        description: 'Please wait before saving again',
        variant: "destructive"
      })
      return
    }

    try {
      const isUpdating = isEditingDraft && editingDraftId
      const url = isUpdating
        ? `${API_BASE_URL}/v1/drafts/update-draft/${editingDraftId}`
        : `${API_BASE_URL}/v1/drafts/save-draft`

      const response = await fetch(url, {
        method: isUpdating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(normalizedFormValues)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Failed to save draft`)
      }

      const result = await response.json()

      localStorage.setItem('lastDraftSaveHash', currentDataHash)
      localStorage.setItem('lastDraftSaveTime', now.toString())

      const action = isUpdating ? 'Updated' : 'Saved'
      const draftId = result.draft_id || editingDraftId

      toast({
        title: `Draft ${action} Successfully`,
        description: `Draft ID: ${draftId}`
      })
    } catch (error) {
      console.error('Draft save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const onSubmit = async (formValues: ClaimFormValues) => {
    try {
      if (checklistMeta.hasChecklist && checklistMeta.requiredCount > 0 && !checklistComplete) {
        toast({
          title: 'Document checklist incomplete',
          description: 'Please upload and mark all required checklist documents before submitting the claim.',
          variant: 'destructive'
        })
        setOpenAccordion((prev) => (prev.includes('documents') ? prev : [...prev, 'documents']))
        return
      }

      const ageDetails = resolveAgeDetails(formValues)

      const submissionData = {
        ...formValues,
        age: ageDetails?.value ?? 0,
        age_unit: ageDetails?.unit ?? formValues.age_unit ?? defaultClaimFormValues.age_unit,
        total_authorized_amount: Number(formValues.total_authorized_amount) || 0,
        security_deposit: Number(formValues.security_deposit) || 0,
        total_bill_amount: Number(formValues.total_bill_amount) || 0,
        patient_discount_amount: Number(formValues.patient_discount_amount) || 0,
        amount_paid_by_patient: Number(formValues.amount_paid_by_patient) || 0,
        total_patient_paid_amount: Number(formValues.total_patient_paid_amount) || 0,
        amount_charged_to_payer: Number(formValues.amount_charged_to_payer) || 0,
        mou_discount_amount: Number(formValues.mou_discount_amount) || 0,
        claimed_amount: Number(formValues.claimed_amount) || 0,
        documents: combinedDocuments
      }

      const result = await claimsApi.submitClaim(submissionData as any)
      
      const documentsToUpload = combinedDocuments.filter(doc => doc.file)

      if (result.claim_id && documentsToUpload.length > 0) {
        try {
          const uploadPromises = documentsToUpload.map(async (doc) => {
            const formData = new FormData()
            formData.append('file', doc.file!)
            formData.append('claim_id', result.claim_id!)
            formData.append('document_type', doc.document_type)
            formData.append('document_name', doc.document_name)

            const response = await fetch(`${API_BASE_URL}/v1/documents/upload`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
              },
              body: formData
            })

            if (!response.ok) throw new Error(`Failed to upload ${doc.document_name}`)
            return await response.json()
          })

          await Promise.all(uploadPromises)
        } catch (error) {
          console.error('Error uploading documents:', error)
          toast({
            title: "Warning",
            description: 'Claim created but some documents failed to upload. You can upload documents later.'
          })
        }
      }
      
      toast({
        title: "Success",
        description: `Claim submitted successfully. Claim ID: ${result.claim_id}`
      })

      form.reset(defaultClaimFormValues)
      setChecklistDocuments([])
      setManualDocuments([])
      setChecklistMeta({
        requiredCount: 0,
        checkedRequiredCount: 0,
        totalCount: 0,
        hasChecklist: false
      })
      setChecklistComplete(true)
      setShowDocumentChecklist(false)
      setOpenAccordion(['patient'])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Claim submission error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to submit claim',
        variant: "destructive"
      })
    }
  }

  if (loadingDraft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p>Loading draft...</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate progress metrics (removed for cleaner UI)
  
  return (
    <div className="space-y-6">
      <PageHeader />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-0 shadow-sm">
              <Accordion
                type="multiple"
                value={openAccordion}
                onValueChange={setOpenAccordion}
                className="w-full"
              >
                {/* Patient Details Accordion */}
                <AccordionItem value="patient" className="border-b">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <UserCircle className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Patient Details</p>
                        <p className="text-xs text-gray-500">Basic patient information</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6">
                    <PatientDetailsSection
                      form={form}
                      watchedBeneficiaryType={watchedBeneficiaryType}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Payer Details Accordion */}
                <AccordionItem value="payer" className="border-b">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <CreditCard className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Payer Details</p>
                        <p className="text-xs text-gray-500">Insurance & authorization</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6">
                    <PayerDetailsSection
                      form={form}
                      payers={payers}
                      insurers={insurers}
                      watchedPayerType={watchedPayerType}
                      loadingData={loadingData}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Provider Details Accordion */}
                <AccordionItem value="provider" className="border-b">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Building2 className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Provider Details</p>
                        <p className="text-xs text-gray-500">Treatment information</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6">
                    <ProviderDetailsSection
                      form={form}
                      specialties={specialties}
                      doctors={doctors}
                      wards={wards}
                      watchedSpecialty={watchedSpecialty}
                      loadingData={loadingData}
                      onFetchDoctors={fetchDoctorsBySpecialty}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Bill Details Accordion */}
                <AccordionItem value="bill" className="border-b">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Receipt className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Bill Details</p>
                        <p className="text-xs text-gray-500">Financial information</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6">
                    <BillDetailsSection form={form} />
                  </AccordionContent>
                </AccordionItem>

                {/* Documents Accordion */}
                <AccordionItem value="documents" className="border-b">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <FileCheck className="h-5 w-5 text-blue-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Documents</p>
                        <p className="text-xs text-gray-500">Upload required files</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6 space-y-6">
                    {watchedPayerName ? (
                      <DocumentChecklist
                        payerName={watchedPayerName}
                        specialty={watchedSpecialty || ''}
                        onChecklistComplete={setChecklistComplete}
                        onChecklistMetaChange={handleChecklistMetaChange}
                        onDocumentsUploaded={setChecklistDocuments}
                      />
                    ) : (
                      <Alert>
                        <AlertDescription>
                          Select a payer to load the required document checklist.
                        </AlertDescription>
                      </Alert>
                    )}
                    <DocumentUpload
                      payerName={watchedPayerName}
                      specialty={watchedSpecialty}
                      onDocumentsUploaded={setManualDocuments}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Review & Submit Accordion */}
                <AccordionItem value="review">
                  <AccordionTrigger className="px-8 py-5 hover:no-underline hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Review & Submit</p>
                        <p className="text-xs text-gray-500">Final confirmation</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 py-6">
                    <ReviewStep
                      formData={form.getValues()}
                      onEditStep={(step) => {
                        setOpenAccordion((prev) => {
                          if (!prev.includes(step)) {
                            return [...prev, step]
                          }
                          return prev
                        })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>

            {/* Form Actions */}
            <div className="sticky bottom-0 z-40 bg-primary/5 backdrop-blur-sm border-t border-primary/20">
              <div className="px-8 py-4 flex items-center justify-between gap-4 max-w-4xl mx-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={form.formState.isSubmitting}
                  className="border-primary/40 text-primary hover:bg-primary/10 font-medium"
                >
                  Save Draft
                </Button>
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/drafts')}
                    className="border-primary/30 text-gray-700 hover:bg-primary/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={form.formState.isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    {form.formState.isSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
    </div>
  )
}
